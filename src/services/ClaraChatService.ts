import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { db } from "../db/simulatedDb.js";

dotenv.config();

const aiClient = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ""
});

// Tools Declarations
const buscarEstoqueFornecedorTool = {
  name: "buscar_estoque_fornecedor",
  description: "Busca o saldo atual, total de entradas e quebra de estoque de um fornecedor específico.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fornecedor_nome: { type: Type.STRING, description: "Nome fantasia do fornecedor" },
      mes_referencia: { type: Type.NUMBER, description: "Mês da consulta (1-12)" },
      ano_referencia: { type: Type.NUMBER, description: "Ano com 4 dígitos" }
    },
    required: ["fornecedor_nome"]
  }
};

const participacaoFornecedorTool = {
  name: "participacao_fornecedor",
  description: "Busca a participação percentual ou valor total de compras de um grupo fornecedor (agrupando CNPJs).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      grupo_nome: { type: Type.STRING, description: "Nome do grupo fornecedor" },
      mes_referencia: { type: Type.NUMBER, description: "Mês da consulta (1-12)" },
      ano_referencia: { type: Type.NUMBER, description: "Ano com 4 dígitos" }
    },
    required: ["grupo_nome"]
  }
};

const comparacaoPeriodoTool = {
  name: "comparacao_periodo",
  description: "Compara dois períodos diferentes para um mesmo produto.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      produto_nome: { type: Type.STRING, description: "Nome do produto" },
      mes1: { type: Type.NUMBER, description: "Mês 1 (1-12)" },
      ano1: { type: Type.NUMBER, description: "Ano 1 com 4 dígitos" },
      mes2: { type: Type.NUMBER, description: "Mês 2 (1-12)" },
      ano2: { type: Type.NUMBER, description: "Ano 2 com 4 dígitos" }
    },
    required: ["produto_nome", "mes1", "ano1", "mes2", "ano2"]
  }
};

const buscarMargemTool = {
  name: "buscar_margem",
  description: "Busca a margem bruta (custo médio, preço de venda, margem percentual) de um produto ou fornecedor.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      nome: { type: Type.STRING, description: "Nome do produto ou fornecedor" }
    },
    required: ["nome"]
  }
};

const relatorioReposicaoTool = {
  name: "relatorio_reposicao",
  description: "Gera o relatório matinal de reposição, análise de curva ABCD, risco de ruptura e compras recomendadas.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const abrirChamadoTool = {
  name: "abrir_chamado",
  description: "Abre um ticket ou relata um problema de TI (ex: internet caiu, computador não liga).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      descricao: { type: Type.STRING, description: "Descrição do problema" },
      solicitante: { type: Type.STRING, description: "Nome de quem está solicitando" }
    },
    required: ["descricao"]
  }
};

const statusChamadoTool = {
  name: "status_chamado",
  description: "Verifica o status de um ou mais chamados de TI.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id_chamado: { type: Type.STRING, description: "ID do chamado (opcional)" }
    }
  }
};

const estoqueEpiTool = {
  name: "estoque_epi",
  description: "Verifica o estoque, saldo ou ruptura de Equipamentos de Proteção Individual (EPIs).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      nome_epi: { type: Type.STRING, description: "Nome do EPI (opcional)" }
    }
  }
};

const consumoEpiFuncionarioTool = {
  name: "consumo_epi_funcionario",
  description: "Lista os EPIs retirados/consumidos por um funcionário.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      funcionario_nome: { type: Type.STRING, description: "Nome do funcionário" }
    },
    required: ["funcionario_nome"]
  }
};

const buscarDadosVendasTool = {
  name: "buscar_dados_vendas",
  description: "Busca o volume de vendas, faturamento ou histórico de vendas em um mês e ano específicos.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

// Handlers for DB Calls resolving names
async function handleBuscarEstoqueFornecedor(args: any) {
  const supplier = db.findSupplierByName(args.fornecedor_nome);
  if (!supplier) return { error: `Fornecedor '${args.fornecedor_nome}' não encontrado.` };
  let period = "";
  if (args.ano_referencia && args.mes_referencia) {
    period = `${args.ano_referencia}-${String(args.mes_referencia).padStart(2, '0')}`;
  } else {
    period = "2026-07"; // default
  }
  return db.queryEstoqueFornecedor(supplier.id, period);
}

async function handleParticipacaoFornecedor(args: any) {
  const supplier = db.findSupplierByName(args.grupo_nome);
  if (!supplier) return { error: `Grupo '${args.grupo_nome}' não encontrado.` };
  let period = "";
  if (args.ano_referencia && args.mes_referencia) {
    period = `${args.ano_referencia}-${String(args.mes_referencia).padStart(2, '0')}`;
  } else {
    period = "2026-07"; // default
  }
  return db.queryParticipacaoFornecedor(supplier.grupo_id, period);
}

async function handleComparacaoPeriodos(args: any) {
  const product = db.findProductByName(args.produto_nome);
  if (!product) return { error: `Produto '${args.produto_nome}' não encontrado.` };
  return db.queryComparacaoPeriodos(product.id, args.mes1, args.ano1, args.mes2, args.ano2);
}

async function handleBuscarMargem(args: any) {
  const product = db.findProductByName(args.nome);
  if (product) return db.queryMargem('produto', product.id);
  const supplier = db.findSupplierByName(args.nome);
  if (supplier) return db.queryMargem('fornecedor', supplier.id);
  return { error: `Item/Fornecedor '${args.nome}' não encontrado.` };
}

async function handleRelatorioReposicao(args: any) {
  return db.getResumoReposicao();
}

async function handleAbrirChamado(args: any) {
  const solicitante = args.solicitante || "Usuário do Chat";
  const res = db.abrirChamado(solicitante, args.descricao);
  console.log(`[ALERTA EXTERNO ENVIADO] E-mail e notificação push enviados para ti@empresa.com sobre o novo chamado: ${res.id}.`);
  return res;
}

async function handleStatusChamado(args: any) {
  return db.queryStatusChamado(args.id_chamado || "");
}

async function handleEstoqueEpi(args: any) {
  return db.queryEstoqueEPI(args.nome_epi || "");
}

async function handleConsumoEpiFuncionario(args: any) {
  return db.queryConsumoFuncionario(args.funcionario_nome || "");
}

async function handleBuscarDadosVendas(args: any) {
  return db.queryHistoricoVendas();
}

// Map handlers
const toolHandlers: Record<string, Function> = {
  buscar_estoque_fornecedor: handleBuscarEstoqueFornecedor,
  participacao_fornecedor: handleParticipacaoFornecedor,
  comparacao_periodo: handleComparacaoPeriodos,
  buscar_margem: handleBuscarMargem,
  relatorio_reposicao: handleRelatorioReposicao,
  abrir_chamado: handleAbrirChamado,
  status_chamado: handleStatusChamado,
  estoque_epi: handleEstoqueEpi,
  consumo_epi_funcionario: handleConsumoEpiFuncionario,
  buscar_dados_vendas: handleBuscarDadosVendas
};

export async function processarMensagemClara(message: string, history: any[], userProfile: string) {
  let historyText = "Nenhum histórico anterior nesta sessão.";
  if (history && history.length > 0) {
    historyText = history.map(item => {
      const isUser = item.role === "user";
      return `${isUser ? "Usuário" : "Clara (Assistente)"}: ${item.text}`;
    }).join("\n");
  }

  const isCompras = userProfile.toLowerCase() === "compras";

  const systemInstruction = `Você é Clara, a assistente virtual e analítica da EletroMax Distribuidora, especialista em Supply Chain e Finanças.
Sempre use as ferramentas disponíveis para consultar o banco de dados antes de responder.
Baseie-se EXCLUSIVAMENTE nos dados retornados pelas ferramentas. Não invente números, produtos ou estoques.
Se uma ferramenta retornar erro ou dados vazios, informe ao usuário que não encontrou os dados na base.
O mês atual é Julho de 2026.
O perfil de acesso do usuário é: ${userProfile}.

Regras de Reposição (Curva ABCD):
• Classe A: Manter 6 meses de estoque (Pedidos automáticos até R$ 50k; acima disso exige Assinatura da Diretoria).
• Classe B: Manter 4 meses de estoque (Requer aprovação humana).
• Classe C: Manter 3 meses de estoque (Requer aprovação humana).
• Classe D: Manter 1 mês de estoque (Requer aprovação humana).

Seja direta, profissional e formate a resposta com tabelas, marcadores e negritos para leitura dinâmica. Para análises de ruptura, faça a matemática clara considerando a meta da classe.
Se um relatório de reposição requerer assinatura da diretoria, NÃO crie os pedidos, apenas exiba o alerta.

Histórico Recente da Conversa:
${historyText}`;

  // Ferramentas permitidas de acordo com o perfil
  const allowedTools = [
    buscarEstoqueFornecedorTool,
    participacaoFornecedorTool,
    comparacaoPeriodoTool,
    relatorioReposicaoTool,
    abrirChamadoTool,
    statusChamadoTool,
    estoqueEpiTool,
    consumoEpiFuncionarioTool,
    buscarDadosVendasTool
  ];

  if (!isCompras) {
    // Financeiro / Outros podem ver a margem
    allowedTools.push(buscarMargemTool);
  }

  const chat = aiClient.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: allowedTools }]
    }
  });

  let response = await chat.sendMessage({ message });

  let ultimaDataBuscada: any = null; // Armazena o último dado pra compatibilidade com o retorno do frontend
  let countTokens = 0;

  while (response.functionCalls && response.functionCalls.length > 0) {
    const functionResponses = [];

    for (const call of response.functionCalls) {
      console.log(`[ClaraChatService] IA decidiu chamar a função: ${call.name}`);
      
      const handler = toolHandlers[call.name];
      let dbResult;
      
      if (handler) {
         try {
           dbResult = await handler(call.args);
         } catch (error: any) {
           dbResult = { error: `Erro na execução da função: ${error.message}` };
         }
      } else {
         dbResult = { error: "Função não encontrada." };
      }

      ultimaDataBuscada = dbResult; // Salva pra retornar

      // Tratamento especial para o perfil de 'compras' não receber os dados de margem/lucro
      if (isCompras && call.name === "relatorio_reposicao") {
         dbResult = JSON.parse(JSON.stringify(dbResult, (key, value) => {
            if (["valor_estimado_compra", "preco_venda", "custo_medio", "margem_valor", "margem_pct"].includes(key)) {
              return undefined;
            }
            return value;
         }));
      }

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: dbResult
        }
      });
    }

    response = await chat.sendMessage({ message: functionResponses });
    countTokens += 150; // estimate of tool call tokens
  }

  const finalTokens = countTokens + Math.ceil((response.text || "").length / 4);

  return { text: response.text || "Sem resposta.", data: ultimaDataBuscada, tokens: finalTokens };
}
