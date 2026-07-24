import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { db } from "../db/simulatedDb.js";
import { searchKnowledge } from "./ragService.js";
import { PERSONA_DIRETRIZES } from "../persona.js";

dotenv.config();

/* -------------------------------------------------------------------------- */
/*  Cliente Gemini (config de rede que funciona no ambiente Cloudez)          */
/* -------------------------------------------------------------------------- */
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        // Header que destrava o acesso à API no runtime gerenciado + timeout p/ nunca travar
        headers: { "User-Agent": "aistudio-build" },
        timeout: 30000
      }
    });
  }
  return aiClient;
}

const MODEL = "gemini-2.5-flash";

/* -------------------------------------------------------------------------- */
/*  Ferramentas (Function Calling) — a IA decide sozinha o que chamar          */
/* -------------------------------------------------------------------------- */
const functionDeclarations = [
  {
    name: "relatorio_reposicao",
    description: "Relatório de reposição de estoque / Curva ABCD. Retorna itens em risco de ruptura, itens em excesso (capital paralisado), pedidos automáticos classe A e pendências de aprovação. Use para perguntas sobre estoque, reposição, ruptura, curva ABCD, o que comprar hoje.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: "historico_vendas",
    description: "Histórico agregado de vendas dos últimos 24 meses com receita e volume por mês. Use para perguntas sobre vendas, receita, faturamento, tendência ou desempenho de um mês.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: "analise_fornecedor",
    description: "Analisa o desempenho e o estoque dos produtos de um fornecedor: total entrado, saldo, quebra (%) e alertas de ruptura. Use para perguntas sobre um fornecedor específico (ex: Tramontina, Siemens, WEG, Schneider, Legrand).",
    parameters: {
      type: Type.OBJECT,
      properties: { nome_fornecedor: { type: Type.STRING, description: "Nome do fornecedor, ex: Tramontina" } },
      required: ["nome_fornecedor"]
    }
  },
  {
    name: "participacao_grupo_fornecedor",
    description: "Mostra a participação (compras por CNPJ) dentro de um grupo econômico de fornecedores e o total consolidado. Use para dependência de grupo, concentração de compras ou soma por grupo.",
    parameters: {
      type: Type.OBJECT,
      properties: { nome_grupo: { type: Type.STRING, description: "Nome do grupo, ex: Tramontina, WEG" } },
      required: ["nome_grupo"]
    }
  },
  {
    name: "comparar_periodos",
    description: "Compara as compras de um produto entre dois meses distintos e calcula a variação percentual.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        nome_produto: { type: Type.STRING, description: "Nome ou código do produto" },
        mes1: { type: Type.NUMBER, description: "Mês inicial (1-12)" },
        ano1: { type: Type.NUMBER, description: "Ano inicial (ex 2026)" },
        mes2: { type: Type.NUMBER, description: "Mês final (1-12)" },
        ano2: { type: Type.NUMBER, description: "Ano final (ex 2026)" }
      },
      required: ["nome_produto", "mes1", "ano1", "mes2", "ano2"]
    }
  },
  {
    name: "margem",
    description: "Calcula a margem bruta (custo médio, preço de venda, margem em R$ e %) de um produto ou de um fornecedor.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tipo: { type: Type.STRING, description: "'produto' ou 'fornecedor'" },
        nome: { type: Type.STRING, description: "Nome/código do produto ou nome do fornecedor" }
      },
      required: ["tipo", "nome"]
    }
  },
  {
    name: "detalhes_produto",
    description: "Detalhes cadastrais e de estoque de um produto: código, categoria, preço, lead time, MOQ, curva XYZ e saldo atual.",
    parameters: {
      type: Type.OBJECT,
      properties: { nome_ou_codigo: { type: Type.STRING, description: "Nome ou código do produto" } },
      required: ["nome_ou_codigo"]
    }
  },
  {
    name: "status_chamado_ti",
    description: "Consulta o status de chamados de TI (ITSM). Sem parâmetro retorna todos os chamados.",
    parameters: {
      type: Type.OBJECT,
      properties: { id_ou_texto: { type: Type.STRING, description: "ID do chamado (ex TI-002) ou texto de busca. Opcional." } }
    }
  },
  {
    name: "abrir_chamado_ti",
    description: "Abre um novo chamado de TI para o usuário.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        descricao: { type: Type.STRING, description: "Descrição do problema" },
        solicitante: { type: Type.STRING, description: "Nome do solicitante. Opcional." }
      },
      required: ["descricao"]
    }
  },
  {
    name: "estoque_epi",
    description: "Consulta o estoque de EPIs (capacete, luva, óculos, botina) no almoxarifado e alerta de ruptura.",
    parameters: {
      type: Type.OBJECT,
      properties: { nome_epi: { type: Type.STRING, description: "Nome do EPI. Opcional (vazio = todos)." } }
    }
  },
  {
    name: "consumo_epi_funcionario",
    description: "Relatório de consumo de EPIs por funcionário.",
    parameters: {
      type: Type.OBJECT,
      properties: { nome_funcionario: { type: Type.STRING, description: "Nome do funcionário. Opcional." } }
    }
  },
  {
    name: "buscar_politica",
    description: "Busca na base de conhecimento interna políticas e regras da empresa: prazos/SLA de entrega, alçada financeira e aprovações, metodologia da curva ABCD, escalamento de chamados de TI, política de EPIs, política de fornecedores/grupos e cálculo de margem. Use para perguntas sobre 'regra', 'política', 'prazo', 'SLA', 'alçada', 'como funciona'.",
    parameters: {
      type: Type.OBJECT,
      properties: { consulta: { type: Type.STRING, description: "O tema/pergunta a buscar" } },
      required: ["consulta"]
    }
  }
];

/* -------------------------------------------------------------------------- */
/*  Execução das ferramentas                                                   */
/* -------------------------------------------------------------------------- */
const GRUPOS: Record<string, number> = {
  tramontina: 1, siemens: 2, weg: 3, schneider: 4, legrand: 5
};

function norm(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function executeTool(name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case "relatorio_reposicao":
        return db.getResumoReposicao();

      case "historico_vendas":
        return db.queryHistoricoVendas();

      case "analise_fornecedor": {
        const f = db.findSupplierByName(args?.nome_fornecedor || "");
        if (!f) return { erro: `Fornecedor '${args?.nome_fornecedor}' não encontrado.` };
        return { fornecedor: f.nome_fantasia, itens: db.queryEstoqueFornecedor(f.id, "") };
      }

      case "participacao_grupo_fornecedor": {
        const key = norm(args?.nome_grupo || "");
        let grupoId = 0;
        for (const g of Object.keys(GRUPOS)) if (key.includes(g)) grupoId = GRUPOS[g];
        if (!grupoId) {
          const f = db.findSupplierByName(args?.nome_grupo || "");
          grupoId = f?.grupo_id || 0;
        }
        if (!grupoId) return { erro: `Grupo '${args?.nome_grupo}' não encontrado.` };
        return db.queryParticipacaoFornecedor(grupoId, "");
      }

      case "comparar_periodos": {
        const p = db.findProductByName(args?.nome_produto || "");
        if (!p) return { erro: `Produto '${args?.nome_produto}' não encontrado.` };
        return db.queryComparacaoPeriodos(p.id, Number(args.mes1), Number(args.ano1), Number(args.mes2), Number(args.ano2));
      }

      case "margem": {
        const tipo = norm(args?.tipo).includes("fornec") ? "fornecedor" : "produto";
        if (tipo === "produto") {
          const p = db.findProductByName(args?.nome || "");
          if (!p) return { erro: `Produto '${args?.nome}' não encontrado.` };
          return db.queryMargem("produto", p.id);
        } else {
          const f = db.findSupplierByName(args?.nome || "");
          if (!f) return { erro: `Fornecedor '${args?.nome}' não encontrado.` };
          return db.queryMargem("fornecedor", f.id);
        }
      }

      case "detalhes_produto": {
        const p = db.findProductByName(args?.nome_ou_codigo || "");
        if (!p) return { erro: `Produto '${args?.nome_ou_codigo}' não encontrado.` };
        const saldo = db.estoque_atual.filter(e => e.produto_id === p.id).reduce((s, e) => s + e.saldo_quantidade, 0);
        return { ...p, saldo_estoque_atual: saldo };
      }

      case "status_chamado_ti":
        return db.queryStatusChamado(args?.id_ou_texto || "");

      case "abrir_chamado_ti":
        return db.abrirChamado(args?.solicitante || "Usuário do Chat", args?.descricao || "");

      case "estoque_epi":
        return db.queryEstoqueEPI(args?.nome_epi || undefined);

      case "consumo_epi_funcionario":
        return db.queryConsumoFuncionario(args?.nome_funcionario || undefined);

      case "buscar_politica": {
        const r = await searchKnowledge(args?.consulta || "", 3, true);
        return r.length ? r.map(d => ({ titulo: d.titulo, conteudo: d.conteudo, fonte: d.fonte }))
                        : { aviso: "Nenhuma política específica encontrada na base." };
      }

      default:
        return { erro: `Ferramenta desconhecida: ${name}` };
    }
  } catch (e: any) {
    return { erro: `Falha ao executar ${name}: ${e?.message || e}` };
  }
}

/* -------------------------------------------------------------------------- */
/*  System instruction                                                         */
/* -------------------------------------------------------------------------- */
function buildSystemInstruction(userProfile: string) {
  return `${PERSONA_DIRETRIZES}

CONTEXTO OPERACIONAL:
- Data atual: Julho de 2026. Empresa: EletroMax Distribuidora.
- Perfil de acesso do usuário: ${userProfile}.

COMO AGIR (AGENTE AUTÔNOMO):
- Você é um agente autônomo. Para QUALQUER pergunta sobre dados (estoque, vendas, fornecedores, margem, chamados, EPIs, políticas), CHAME as ferramentas disponíveis para obter os números REAIS antes de responder. Nunca invente dados.
- Você pode chamar mais de uma ferramenta, inclusive em sequência, para montar uma resposta completa.
- Após obter os dados, responda de forma humanizada, clara e natural (como o ChatGPT/Gemini): frase de abertura curta + dados organizados em **negrito**, listas ou tabelas Markdown + um insight ou próximo passo proativo.
- Para saudações ou conversa leve, responda de forma cordial e natural, sem chamar ferramentas, e ofereça ajuda com Supply Chain.
- Se a informação realmente não existir nas ferramentas, diga isso com transparência e sugira o que você consegue responder.
- Responda sempre em português do Brasil, de forma objetiva e sem enrolação.`;
}

/* -------------------------------------------------------------------------- */
/*  Loop agêntico principal                                                    */
/* -------------------------------------------------------------------------- */
export async function processarMensagemClara(message: string, history: any[], userProfile: string) {
  const ai = getAiClient();

  const contents: any[] = [];
  if (Array.isArray(history)) {
    for (const h of history) {
      const text = (h?.text ?? h?.content ?? "").toString();
      if (!text) continue;
      contents.push({ role: h?.role === "user" ? "user" : "model", parts: [{ text }] });
    }
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  const config = {
    systemInstruction: buildSystemInstruction(userProfile),
    temperature: 0.4,
    tools: [{ functionDeclarations }]
  };

  let finalText = "";
  let collectedData: any = null;

  const run = async () => {
    for (let step = 0; step < 6; step++) {
      const response: any = await ai.models.generateContent({ model: MODEL, contents, config });

      const calls = response.functionCalls;
      if (calls && calls.length > 0) {
        // registra a jogada do modelo (functionCall)
        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) contents.push(modelContent);

        const responseParts: any[] = [];
        for (const call of calls) {
          const result = await executeTool(call.name, call.args || {});
          collectedData = result;
          responseParts.push({ functionResponse: { name: call.name, response: { result } } });
        }
        contents.push({ role: "user", parts: responseParts });
        continue;
      }

      finalText = (response.text || "").trim();
      return;
    }
    // Excedeu o número de passos — pede um fechamento textual
    const closing: any = await ai.models.generateContent({
      model: MODEL,
      contents: [...contents, { role: "user", parts: [{ text: "Resuma a resposta final para o usuário com os dados já coletados." }] }],
      config: { systemInstruction: config.systemInstruction, temperature: 0.4 }
    });
    finalText = (closing.text || "").trim();
  };

  // Blindagem de tempo: nunca deixa a requisição travar
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Tempo limite ao gerar resposta")), 45000)
  );

  try {
    await Promise.race([run(), timeout]);
  } catch (error: any) {
    console.error("❌ Erro no ClaraChatService:", error?.message || error);
    if (!finalText) throw error;
  }

  if (!finalText) {
    finalText = "Não consegui gerar uma resposta agora. Pode reformular a pergunta?";
  }

  const tokensEstimados = Math.ceil(finalText.length / 4) + 150;
  return { text: finalText, data: collectedData, tokens: tokensEstimados };
}
