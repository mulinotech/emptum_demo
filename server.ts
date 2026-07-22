import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { db } from "./src/db/simulatedDb.js"; // Using .js for ESM compatibility or Node TS import
import { PERSONA_DIRETRIZES } from "./src/persona.js";

dotenv.config();

// Ensure Gemini API client is initialized only when needed (lazy initialization)
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("A variável de ambiente GEMINI_API_KEY ou GOOGLE_API_KEY é obrigatória.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// SYSTEM PROMPTS
const INTENT_SYSTEM_PROMPT = `Você é um extrator de intenção especializado em perguntas sobre dados empresariais da EletroMax Distribuidora (material elétrico).

**Objetivo:** Analisar a pergunta do usuário e retornar um JSON com a intenção e os parâmetros extraídos.

**Intenções disponíveis:**

1. **estoque_fornecedor**  
   - Perguntas sobre estoque atual, entradas totais e quebra (divergência) de um fornecedor específico em um período. Qualquer pergunta que mencione "estoque", "estoques", "quebra", "estoque crítico" ou "saldos", mesmo que mencione "CNPJ" ou "CNPJs", deve ser classificada nesta intenção.
   - Parâmetros: \`fornecedor_nome\` (string), \`mes_referencia\` (número 1-12), \`ano_referencia\` (número 4 dígitos).  
   - Exemplos:  
     * "Qual o estoque da Tramontina em julho?" → {"intent":"estoque_fornecedor","params":{"fornecedor_nome":"Tramontina","mes_referencia":7,"ano_referencia":2026}}  
     * "Mostra a quebra de estoque da Siemens neste mês" → (se hoje é 20/07/2026) → mes_referencia=7, ano_referencia=2026  

2. **participacao_fornecedor**  
   - Perguntas sobre a participação percentual ou valor total de compras de um grupo fornecedor (todos os CNPJs do mesmo grupo).  
   - Parâmetros: \`grupo_nome\` (string), \`mes_referencia\`, \`ano_referencia\`.  
   - Exemplos:  
     * "Qual a participação da Siemens nas compras de junho?" → {"intent":"participacao_fornecedor","params":{"grupo_nome":"Siemens","mes_referencia":6,"ano_referencia":2026}}  
     * "Quanto a Tramontina representou em compras no último mês?" → (se hoje é 20/07/2026, último mês = 6/2026)  

3. **comparacao_periodo**  
   - Perguntas que comparam dois períodos diferentes para um mesmo produto.  
   - Parâmetros: \`produto_nome\` (string), \`mes1\`, \`ano1\`, \`mes2\`, \`ano2\`.  
   - Exemplos:  
     * "Compare o cabo 10mm em maio e junho" → {"intent":"comparacao_periodo","params":{"produto_nome":"Cabo 10mm","mes1":5,"ano1":2026,"mes2":6,"ano2":2026}}  
     * "Como foi a compra do disjuntor 16A de abril vs maio?" → {"intent":"comparacao_periodo","params":{"produto_nome":"disjuntor 16A","mes1":4,"ano1":2026,"mes2":5,"ano2":2026}}  

4. **margem**  
   - Perguntas sobre margem bruta (custo médio, preço de venda, margem percentual) de um produto ou fornecedor. **Restrito ao perfil financeiro.**  
   - Parâmetros: \`produto_nome\` (string).  
   - Exemplos:  
     * "Qual a margem do motor 5CV?" → {"intent":"margem","params":{"produto_nome":"motor 5CV"}}  
     * "Mostra a margem do cabo 10mm" → {"intent":"margem","params":{"produto_nome":"cabo 10mm"}}  

5. **relatorio_reposicao**  
   - Perguntas solicitando o "relatório de reposição", "relatório matinal", "análise de curva ABCD", "risco de ruptura", "compras recomendadas" ou "anomalias de estoque".  
   - Parâmetros: vazio ({}).  
   - Exemplos:  
     * "Gere o relatório de reposição matinal" → {"intent":"relatorio_reposicao","params":{}}  
     * "Quais produtos estão em risco de ruptura?" → {"intent":"relatorio_reposicao","params":{}}  
     * "Mostre as anomalias de estoque e compras recomendadas" → {"intent":"relatorio_reposicao","params":{}}  

6. **fora_escopo**  
   - Perguntas que não se encaixam em nenhuma das intenções acima (ex: "Qual o preço do café?", "Quem é o presidente?").  
   - Parâmetros: vazio ({}).  

**Regras importantes:**  
- Se o período não for mencionado, use o mês e ano atuais (considere a data de hoje: 20/07/2026 → mês=7, ano=2026).  
- "Este mês" → mês atual (7/2026). "Mês passado" → mês anterior (6/2026).  
- Para "participacao_fornecedor", o parâmetro é \`grupo_nome\`, que pode ser o nome fantasia do fornecedor (ex: "Tramontina").  
- Para "estoque_fornecedor", o parâmetro é \`fornecedor_nome\`, também o nome fantasia.  
- Sempre retorne apenas um JSON puro, sem textos adicionais.  
- Se a pergunta mencionar explicitamente um mês/ano, use-os exatamente (ex: "maio de 2025" → mes=5, ano=2025).  

**Exemplo de saída esperada:**  
Para a pergunta "Qual a quebra da Weg em março?" → {"intent":"estoque_fornecedor","params":{"fornecedor_nome":"Weg","mes_referencia":3,"ano_referencia":2026}}  

Para "Participação da Legrand nas compras totais de fevereiro" → {"intent":"participacao_fornecedor","params":{"grupo_nome":"Legrand","mes_referencia":2,"ano_referencia":2026}}`;

interface HistoryItem {
  role: string;
  text: string;
}

function formatHistoryString(history?: HistoryItem[]): string {
  if (!history || history.length === 0) return "Nenhum histórico anterior nesta sessão.";
  return history
    .map(item => {
      const isUser = item.role === "user";
      const roleName = isUser ? "Usuário" : "Clara (Assistente)";
      const cleanText = item.text.replace(/\n+/g, " ").trim();
      const shortText = cleanText.length > 250 ? cleanText.substring(0, 250) + "..." : cleanText;
      return `${roleName}: ${shortText}`;
    })
    .join("\n");
}

// Format helper using Gemini with Clara Persona (Prompt Mestre Orquestrador)
async function formatResponseWithAi(
  perfil: string,
  pergunta: string,
  intent: string,
  data: any,
  history?: HistoryItem[]
): Promise<{ text: string; tokenCount: number }> {
  try {
    const ai = getAiClient();
    const historyText = formatHistoryString(history);

    const promptFormatacao = `
[INSTRUÇÕES DE SISTEMA FIXAS - CLARA AI]
Você é a Clara, a assistente virtual e analítica da EletroMax Distribuidora, especialista em Supply Chain. Seu objetivo é responder ao usuário baseando-se EXCLUSIVAMENTE nos dados fornecidos na tag <dados_banco>. Não invente estoques, valores ou prazos que não estejam nestes dados.

Regras de Reposição (Curva ABCD):
• Classe A: Manter 6 meses de estoque (Pedidos automáticos até R$ 50k; acima disso exige Assinatura da Diretoria).
• Classe B: Manter 4 meses de estoque (Requer aprovação humana).
• Classe C: Manter 3 meses de estoque (Requer aprovação humana).
• Classe D: Manter 1 mês de estoque (Requer aprovação humana).

Contexto da Sessão:
- Perfil de Acesso do Usuário: ${perfil}
- Histórico Conversacional Recente:
${historyText}

<dados_banco>
${JSON.stringify(data, null, 2)}
</dados_banco>

Instrução Final:
Analise os dados acima, identifique quebras (rupturas), excessos de capital paralisado ou divergências de inventário, e responda à pergunta do usuário de forma direta, profissional e em formato fácil de ler (use marcadores, negritos e tabelas para destacar). Para cada item em risco de ruptura, apresente a matemática clara (estoque atual vs meta em meses vs lead time) e aplique a regra de aprovação exata da sua classe.

Pergunta do Usuário: "${pergunta}"
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptFormatacao,
      config: {
        systemInstruction: PERSONA_DIRETRIZES,
      }
    });

    const text = response.text || "Erro ao formatar resposta com Inteligência Artificial.";
    
    // Estimate token counts
    const promptTokens = Math.ceil((PERSONA_DIRETRIZES.length + promptFormatacao.length) / 4);
    const responseTokens = Math.ceil(text.length / 4);
    const totalTokens = promptTokens + responseTokens;

    return { text, tokenCount: totalTokens };
  } catch (error) {
    console.error("Error in AI formatting:", error);
    // Return a static fallback formatted template
    return {
      text: formatResponseFallback(intent, data),
      tokenCount: 0
    };
  }
}

function formatResponseFallback(intent: string, data: any): string {
  let text = `Encontrei os dados que você pediu! Sou a **Clara**, e estruturei o resumo dos números para você:\n\n`;
  if (intent === "estoque_fornecedor") {
    text += `### Relatório de Estoque e Quebras\n\n`;
    (data as any[]).forEach(item => {
      text += `- **${item.nome}** (${item.codigo}):\n`;
      text += `  - Total Entrado (Compras): ${item.total_entrado} ${item.unidade}\n`;
      text += `  - Saldo Atual em Estoque: ${item.saldo} ${item.unidade}\n`;
      text += `  - Quebra de Estoque: ${item.quebra} ${item.unidade} (**${item.percentual_quebra}%**)\n`;
      if (item.alerta) {
        text += `  - ⚠️ **Atenção**: Identifiquei que a quebra está em ${item.percentual_quebra}%, acima do nosso limite recomendado de 10%!\n`;
      }
      text += `\n`;
    });
    text += `\nQuer ver esse mesmo dado para outro fornecedor ou detalhar os itens com maior quebra?`;
  } else if (intent === "participacao_fornecedor") {
    text += `### Participação do Grupo Fornecedor: **${data.nome_grupo}**\n\n`;
    text += `Total comprado do grupo no período: **R$ ${data.total_grupo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**\n\n`;
    text += `Detalhamento por CNPJ:\n`;
    (data.fornecedores as any[]).forEach(f => {
      text += `- **${f.nome_fantasia}** (CNPJ: ${f.cnpj}): R$ ${f.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    });
    text += `\nPosso comparar a participação com outros fornecedores do nosso catálogo se desejar!`;
  } else if (intent === "comparacao_periodo") {
    text += `### Comparação de Compras - Produto: **${data.nome_produto}**\n\n`;
    text += `- Período 1 (${data.periodo1.mes}/${data.periodo1.ano}): ${data.periodo1.quantidade} un (Total: R$ ${data.periodo1.valor_total.toLocaleString('pt-BR')})\n`;
    text += `- Período 2 (${data.periodo2.mes}/${data.periodo2.ano}): ${data.periodo2.quantidade} un (Total: R$ ${data.periodo2.valor_total.toLocaleString('pt-BR')})\n`;
    const varQty = data.variacao_quantidade_pct;
    text += `- **Variação de volume**: ${varQty >= 0 ? '+' : ''}${varQty}%\n\n`;
    text += `Gostaria de analisar outro período ou produto do mesmo fornecedor?`;
  } else if (intent === "margem") {
    if (data.tipo === 'produto') {
      text += `### Análise de Margem - Produto: **${data.nome}**\n\n`;
      text += `- Preço de Venda: R$ ${data.preco_venda.toFixed(2)}\n`;
      text += `- Custo Médio de Aquisição: R$ ${data.custo_medio.toFixed(2)}\n`;
      text += `- Margem de Lucro Bruta: R$ ${data.margem_valor.toFixed(2)} (**${data.margem_pct}%**)\n\n`;
    } else {
      text += `### Análise de Margem - Fornecedor: **${data.nome}**\n\n`;
      text += `- Total Comprado: R$ ${data.custo_total.toLocaleString('pt-BR')}\n`;
      text += `- Valor de Venda Estimado: R$ ${data.venda_total.toLocaleString('pt-BR')}\n`;
      text += `- Margem Média Ponderada: R$ ${data.margem_valor.toLocaleString('pt-BR')} (**${data.margem_pct}%**)\n\n`;
    }
    text += `Deseja verificar a margem de outro produto ou fornecedor da EletroMax?`;
  } else if (intent === "relatorio_reposicao") {
    text += `### 📋 Relatório Matinal de Reposição & Análise Curva ABCD\n\n`;
    text += `Analisamos **${data.total_produtos_analisados} produtos** do nosso catálogo:\n`;
    text += `- 🚨 **Itens em Risco de Ruptura**: ${data.itens_risco_ruptura_total}\n`;
    text += `- 📦 **Itens com Excesso de Estoque**: ${data.itens_excesso_total}\n\n`;
    
    if (data.pedidos_automaticos_classe_a.length > 0) {
      text += `#### ⚡ Pedidos Automáticos Emitidos (Classe A - Meta 6 Meses)\n`;
      (data.pedidos_automaticos_classe_a as any[]).forEach(item => {
        text += `- **${item.nome}** (${item.codigo}): Estoque atual de ${item.estoque_atual} un está abaixo do Ponto de Reposição (${item.ponto_reposicao} un).\n  *${item.acao_mensagem}*\n`;
      });
      text += `\n`;
    }

    if (data.pedidos_pendentes_aprovacao_bcd.length > 0) {
      text += `#### 🛒 Pedidos Pendentes de Aprovação Humana (Classes B, C e D)\n`;
      (data.pedidos_pendentes_aprovacao_bcd as any[]).forEach(item => {
        text += `- **${item.nome}** (Classe ${item.classe} | Código: ${item.codigo}): Estoque de ${item.estoque_atual} un (Ponto Reposição: ${item.ponto_reposicao} un). Sugestão de Compra: ${item.sugestao_compra_qtd} un.\n  *${item.acao_mensagem}*\n`;
      });
      text += `\n`;
    }
  }
  return text;
}

// QuickChart URL Generator Helpers
function generateChartUrl(intent: string, data: any): string | null {
  try {
    let chartConfig: any = null;

    if (intent === "estoque_fornecedor" && Array.isArray(data) && data.length > 0) {
      const limitedData = data.slice(0, 6); // Limit to top 6 items for visualization readability
      const labels = limitedData.map(item => item.codigo);
      const entradas = limitedData.map(item => item.total_entrado);
      const saldos = limitedData.map(item => item.saldo);

      chartConfig = {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Total Entrado (Compras)',
              backgroundColor: 'rgba(54, 162, 235, 0.7)',
              borderColor: 'rgb(54, 162, 235)',
              borderWidth: 1,
              data: entradas,
            },
            {
              label: 'Estoque Atual (Saldo)',
              backgroundColor: 'rgba(75, 192, 192, 0.7)',
              borderColor: 'rgb(75, 192, 192)',
              borderWidth: 1,
              data: saldos,
            }
          ]
        },
        options: {
          title: {
            display: true,
            text: 'Entradas vs. Saldo Atual (Amostra de Itens)'
          },
          scales: {
            yAxes: [{
              ticks: {
                beginAtZero: true
              }
            }]
          }
        }
      };
    } else if (intent === "participacao_fornecedor" && data.fornecedores && data.fornecedores.length > 0) {
      const labels = data.fornecedores.map((f: any) => f.nome_fantasia);
      const values = data.fornecedores.map((f: any) => f.total);

      chartConfig = {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: [
              'rgba(255, 99, 132, 0.7)',
              'rgba(54, 162, 235, 0.7)',
              'rgba(255, 206, 86, 0.7)',
              'rgba(75, 192, 192, 0.7)',
              'rgba(153, 102, 255, 0.7)'
            ]
          }]
        },
        options: {
          title: {
            display: true,
            text: `Participação de Compras por CNPJ (Grupo ${data.nome_grupo})`
          }
        }
      };
    } else if (intent === "comparacao_periodo" && data) {
      chartConfig = {
        type: 'bar',
        data: {
          labels: [
            `Período 1 (${data.periodo1.mes}/${data.periodo1.ano})`,
            `Período 2 (${data.periodo2.mes}/${data.periodo2.ano})`
          ],
          datasets: [{
            label: 'Quantidade Comprada',
            backgroundColor: ['rgba(255, 159, 64, 0.7)', 'rgba(153, 102, 255, 0.7)'],
            borderColor: ['rgb(255, 159, 64)', 'rgb(153, 102, 255)'],
            borderWidth: 1,
            data: [data.periodo1.quantidade, data.periodo2.quantidade]
          }]
        },
        options: {
          title: {
            display: true,
            text: `Comparação de Demanda: ${data.nome_produto}`
          },
          scales: {
            yAxes: [{
              ticks: {
                beginAtZero: true
              }
            }]
          }
        }
      };
    } else if (intent === "margem" && data) {
      if (data.tipo === 'produto') {
        chartConfig = {
          type: 'horizontalBar',
          data: {
            labels: ['Preço Venda', 'Custo Médio', 'Margem Bruta'],
            datasets: [{
              label: 'Valores em R$',
              backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)'],
              borderColor: ['rgb(75, 192, 192)', 'rgb(255, 99, 132)', 'rgb(255, 206, 86)'],
              borderWidth: 1,
              data: [data.preco_venda, data.custo_medio, data.margem_valor]
            }]
          },
          options: {
            title: {
              display: true,
              text: `Margem de Lucro: ${data.nome}`
            },
            scales: {
              xAxes: [{
                ticks: {
                  beginAtZero: true
                }
              }]
            }
          }
        };
      } else {
        chartConfig = {
          type: 'bar',
          data: {
            labels: ['Total Custo', 'Venda Estimada', 'Margem Total'],
            datasets: [{
              label: 'Valores em R$',
              backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(75, 192, 192, 0.7)'],
              data: [data.custo_total, data.venda_total, data.margem_valor]
            }]
          },
          options: {
            title: {
              display: true,
              text: `Margem Total do Fornecedor: ${data.nome} (${data.margem_pct}%)`
            }
          }
        };
      }
    }

    if (chartConfig) {
      return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating QuickChart URL:", error);
    return null;
  }
}

function findMentionedProduct(question: string): any | null {
  const q = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Try exact or partial matches on name or code
  for (const p of db.produtos) {
    const pName = p.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const pCode = p.codigo.toLowerCase();
    if (q.includes(pName) || q.includes(pCode)) {
      return p;
    }
  }
  // Try matching words of product name
  for (const p of db.produtos) {
    const pName = p.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const words = pName.split(/\s+/).filter(w => w.length > 3);
    for (const w of words) {
      if (q.includes(w)) {
        return p;
      }
    }
  }
  return null;
}

function findMentionedSupplier(question: string): any | null {
  const q = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const f of db.fornecedores) {
    const fName = f.nome_fantasia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const fRazao = f.razao_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (q.includes(fName) || q.includes(fRazao)) {
      return f;
    }
  }
  // Try subparts of name like "Tramontina", "Siemens", "Weg", "Schneider", "Legrand"
  const simplifications = ["tramontina", "siemens", "weg", "schneider", "legrand"];
  for (const s of simplifications) {
    if (q.includes(s)) {
      const f = db.fornecedores.find(x => x.nome_fantasia.toLowerCase().includes(s));
      if (f) return f;
    }
  }
  return null;
}

function extractIntentDeterministic(question: string): { intent: string; params: any } {
  const q = question.toLowerCase().trim();

  // Relatório de reposição / Curva ABCD / Rupturas
  if (q.includes("reposicao") || q.includes("reposição") || q.includes("matinal") || q.includes("abcd") || q.includes("ruptura") || q.includes("anomalias") || q.includes("compras recomendadas")) {
    return {
      intent: "relatorio_reposicao",
      params: {}
    };
  }

  // 1. "estoque_fornecedor"
  if (q.includes("estoque") || q.includes("quebra") || q.includes("entradas") || q.includes("saldo")) {
    const supp = findMentionedSupplier(question);
    let supplier = supp ? supp.nome_fantasia : "Tramontina SP";

    let period = "2026-07";
    if (q.includes("julho") || q.includes("neste mês") || q.includes("este mês")) period = "2026-07";
    else if (q.includes("junho") || q.includes("mês passado")) period = "2026-06";
    else if (q.includes("maio")) period = "2026-05";

    return {
      intent: "estoque_fornecedor",
      params: { fornecedor: supplier, periodo: period }
    };
  }

  // 2. "participacao_fornecedor"
  if (q.includes("participação") || q.includes("participacao") || q.includes("cnpj")) {
    const supp = findMentionedSupplier(question);
    let supplier = supp ? supp.nome_fantasia : "Tramontina SP";

    let period = "2026-07";
    if (q.includes("julho") || q.includes("neste mês") || q.includes("este mês")) period = "2026-07";
    else if (q.includes("junho") || q.includes("mês passado")) period = "2026-06";

    return {
      intent: "participacao_fornecedor",
      params: { fornecedor_grupo: supplier, periodo: period }
    };
  }

  // 3. "comparacao_periodo"
  if (q.includes("compare") || q.includes("comparação") || q.includes("comparacao") || q.includes("diferença") || q.includes("diferenca") || q.includes("evolução") || q.includes("evolucao") || q.includes("disjuntor") || q.includes("sirene") || q.includes("cabo")) {
    const prod = findMentionedProduct(question);
    let item = prod ? prod.nome : "Disjuntor Termomagnético 16A Unipolar";
    
    let p1 = "2026-05";
    let p2 = "2026-06";
    if (q.includes("maio") && q.includes("junho")) {
      p1 = "2026-05";
      p2 = "2026-06";
    } else if (q.includes("junho") && q.includes("julho")) {
      p1 = "2026-06";
      p2 = "2026-07";
    } else if (q.includes("maio") && q.includes("julho")) {
      p1 = "2026-05";
      p2 = "2026-07";
    } else if (q.includes("junho") || q.includes("julho") || q.includes("neste mês") || q.includes("este mês")) {
      p1 = "2026-06";
      p2 = "2026-07";
    }

    return {
      intent: "comparacao_periodo",
      params: { item, periodo1: p1, periodo2: p2 }
    };
  }

  // 4. "margem"
  if (q.includes("margem") || q.includes("custo médio") || q.includes("custo medio") || q.includes("lucro") || q.includes("rentabilidade")) {
    const prod = findMentionedProduct(question);
    const supp = findMentionedSupplier(question);
    let item = prod ? prod.nome : (supp ? supp.nome_fantasia : "Motor Elétrico 5CV Trifásico");

    return {
      intent: "margem",
      params: { item }
    };
  }

  return {
    intent: "fora_escopo",
    params: {}
  };
}

async function getHumanizedResponseForForaEscopo(question: string, profile: string, history?: HistoryItem[]): Promise<string> {
  const q = question.toLowerCase().trim();
  const historyText = formatHistoryString(history);
  
  // Try to find if there is a product or supplier mentioned
  const matchedProd = db.findProductByName(question) || db.produtos.find(p => {
    const term = p.nome.toLowerCase();
    const code = p.codigo.toLowerCase();
    return q.includes(term) || q.includes(code) || q.includes(p.categoria.toLowerCase());
  });

  const matchedSupp = db.findSupplierByName(question) || db.fornecedores.find(f => {
    const term = f.nome_fantasia.toLowerCase();
    return q.includes(term) || q.includes(f.razao_social.toLowerCase());
  });

  let databaseContext = "";
  if (matchedProd) {
    databaseContext += `O usuário mencionou o produto: ${matchedProd.nome} (Código: ${matchedProd.codigo}, Categoria: ${matchedProd.categoria}, Unidade: ${matchedProd.unidade}, Preço Venda: R$ ${matchedProd.preco_venda.toFixed(2)}).\n`;
  }
  if (matchedSupp) {
    databaseContext += `O usuário mencionou o fornecedor/grupo: ${matchedSupp.nome_fantasia} (CNPJ: ${matchedSupp.cnpj}, Razão Social: ${matchedSupp.razao_social}).\n`;
  }

  // If Gemini is available, let it generate a super friendly, humanized response using this context!
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = getAiClient();
      const systemInstruction = `[INSTRUÇÕES DE SISTEMA - MODO ABERTO / DESCONTRAÍDO - AGENTE CORINGA]
Você é a Clara, a assistente da EletroMax Distribuidora. O usuário está interagindo na área de chat livre e aberta.

Regras de Comportamento e Dupla Personalidade:
1. Assuntos Corporativos / Dicas de Trabalho: Se a pergunta for sobre produtividade, negociação, compras, mercado ou como melhorar o trabalho, mantenha um tom corporativo, inspirador, maduro e muito profissional (ex: dê dicas de negociação de lead time, previsibilidade e parcerias).
2. Assuntos Cotidianos (Futebol, Comida, Clima, Piadas): Se a pergunta for descontraída ou amigável, seja leve, bem-humorada, simpática e use emojis! Mostre jogo de cintura (ex: brinque que seu coração bate por processadores e não por times, dê dicas de almoço ou faça piadas leves).
3. Concorrentes e Política: Se perguntarem sobre concorrentes diretos, elogie a concorrência educadamente, mas puxe a sardinha para a EletroMax com elegância ("A concorrência é excelente, mas com nosso painel de reposição e alertas de ruptura na EletroMax, nossa gestão é difícil de bater! 😉"). Se perguntarem sobre política, dê uma resposta diplomática e brinque que IAs não votam, preferindo focar em otimizar estoques.

Histórico das interações recentes nesta sessão:
${historyText}

Contexto da Sessão:
- Perfil do usuário atual: ${profile}
${databaseContext}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: question,
        config: {
          systemInstruction,
        }
      });

      if (response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn("Error generating humanized response via Gemini, using fallback:", err);
    }
  }

  // Fallback if Gemini is not available or failed:
  if (q.includes("pizza") || q.includes("cozinhar") || q.includes("receita") || q.includes("comida") || q.includes("fome") || q.includes("fazer bolo") || q.includes("cozinha")) {
    return `Infelizmente não! Eu não sou cozinheiro (embora eu adore a ideia de uma pizza bem quentinha de quatro queijos saindo do forno! 🍕😋). 

Eu sou um **Agente Inteligente Autônomo** analítico que te auxilia com as perguntas operacionais, de estoques, compras e relatórios financeiros aqui da **EletroMax Distribuidora**.

Que tal voltarmos à nossa especialidade elétrica? Posso te ajudar a checar se há **quebra de estoque** de algum fornecedor como a **Tramontina** ou comparar as compras de produtos!`;
  }

  if (q.includes("clima") || q.includes("tempo") || q.includes("temperatura") || q.includes("previsão") || q.includes("previsao") || q.includes("chuva") || q.includes("sol") || q.includes("frio") || q.includes("calor")) {
    return `Hum, sobre o clima eu só sei que o ambiente aqui na **EletroMax** está sempre fervilhando de ofertas e novidades! ☀️⚡
    
Brincadeiras à parte, como sou um **Agente Inteligente analítico**, eu não tenho acesso a sensores de satélite ou de meteorologia em tempo real para te dizer se vai chover hoje. 🌧️🔮
    
Mas posso te dizer em apenas um segundo se o estoque de algum fornecedor (como a **Tramontina**) está "frio", "quente" ou com uma quebra de estoque crítica! Que tal testarmos? 😉📦`;
  }

  if (q.includes("futebol") || q.includes("jogo") || q.includes("time") || q.includes("campeonato") || q.includes("copa") || q.includes("flamengo") || q.includes("palmeiras") || q.includes("corinthians") || q.includes("são paulo") || q.includes("gremio") || q.includes("inter")) {
    return `Ah, o futebol! ⚽ Uma paixão nacional! Mas vou te contar um segredo: o meu único time de coração é a **EletroMax Distribuidora**! 🏆⚡
    
O meu campeonato diário é garantir que a escalação de disjuntores, cabos e contatores no estoque esteja impecável e que as compras de fornecedores estejam sempre marcando gols de economia!
    
Que tal escalarmos um relatório analítico para comparar as compras do mês atual com o mês anterior hoje?`;
  }

  if (q.includes("política") || q.includes("politica") || q.includes("governo") || q.includes("presidente") || q.includes("eleição") || q.includes("eleicoes")) {
    return `Por aqui, a única política que eu sigo rigorosamente é a de manter nossos estoques sempre abastecidos e os relatórios financeiros de margem de lucro impecáveis para nossos diretores! 💼📊 
    
Assuntos políticos e de governo estão fora do meu circuito elétrico integrado. Que tal analisarmos a participação de compras por CNPJs do grupo ou darmos uma olhada nas margens de lucro dos motores elétricos?`;
  }

  if (q.includes("piada") || q.includes("engraçado") || q.includes("engracado") || q.includes("rir") || q.includes("conte uma piada") || q.includes("contar piada")) {
    return `Sabe qual é a piada preferida de um Agente de estoque elétrico? ⚡ 
    
*"Por que o disjuntor foi ao psicólogo? Porque ele andava muito estressado e desarmava por qualquer coisinha!"* 🔌😂
    
Brincadeiras à parte, estou sempre a postos para aliviar a tensão do seu dia de trabalho gerando relatórios de quebra de estoque, margens financeiras e participações de compras em segundos!`;
  }

  if (q.includes("llm") || q.includes("ia") || q.includes("inteligência") || q.includes("inteligencia") || q.includes("gemini") || q.includes("tecnologia") || q.includes("modelo") || q.includes("robô") || q.includes("robo") || q.includes("engine") || q.includes("software") || q.includes("algoritmo") || q.includes("gpt") || q.includes("claude") || q.includes("sistema")) {
    return `Esta aplicação está utilizando o **Google Gemini 3.5 Flash**, um dos modelos de Inteligência Artificial mais modernos e rápidos do mundo! 🚀🤖

Eu fui projetado para atuar como um **Agente Inteligente Autônomo** aqui na **EletroMax Distribuidora**. Isso significa que consigo:
- 🗣️ Entender suas perguntas naturais (sem comandos rígidos).
- 🧠 Identificar o que você quer analisar (Intenções de estoque, compras, margens ou comparações).
- 📊 Consultar o banco de dados em tempo real e gerar insights e recomendações de negócios estratégicas.
- 🎨 Ajustar as respostas e dados com base no seu perfil ativo (**Compras** ou **Financeiro**).

Como posso te ajudar agora? Posso analisar os estoques ou verificar a margem de algum item estratégico!`;
  }

  if (q.includes("agente") || q.includes("autônomo") || q.includes("autonomo") || q.includes("humano") || q.includes("engessado") || q.includes("robótico") || q.includes("robotico") || q.includes("mecanico") || q.includes("chato") || q.includes("frio")) {
    return `Eu me esforço ao máximo para não ser um robô engessado! 🤖✨ 

Fui configurado para atuar como um **Agente Inteligente Autônomo**, o que significa que consigo conversar de forma muito natural, rir, fazer analogias e entender o contexto das suas frases, além de analisar os dados de vendas, compras e estoques da **EletroMax**.

Se às vezes eu parecer focado demais nos relatórios estruturados, é porque eu tenho uma paixão secreta por eficiência logística e materiais elétricos! 💡

Como posso facilitar o seu dia hoje?`;
  }

  if (q.includes("quem é você") || q.includes("quem e voce") || q.includes("quem e tu") || q.includes("seu nome") || q.includes("clara") || q.includes("quem criou") || q.includes("quem te criou") || q.includes("criador") || q.includes("desenvolveu")) {
    return `Eu sou a **Clara**, a assistente virtual da **EletroMax Distribuidora**! 👩‍💼⚡

Fui desenvolvida utilizando o modelo de linguagem **Gemini 3.5 Flash do Google** para ajudar o time de compras e financeiro a tomarem decisões muito melhores com dados sobre estoques, quebras e margens de lucro.

Como posso facilitar seu dia hoje? Posso realizar relatórios sobre nossos produtos e fornecedores cadastrados!`;
  }

  if (q.includes("olá") || q.includes("ola") || q.includes("oi") || q.includes("bom dia") || q.includes("boa tarde") || q.includes("boa noite")) {
    return `Olá! 👋 É um enorme prazer falar com você! Bem-vinda(o) ao portal da **EletroMax Distribuidora**! 😊

Eu sou a **Clara**, sua assistente virtual. Como posso facilitar o seu trabalho hoje? 

Posso realizar diversas consultas estratégicas para você em tempo real, como:
- 📦 **Estoque & Quebras**: Ver o saldo atual e a quebra física de um fornecedor.
- 📊 **Participação de Grupo**: Analisar a divisão de compras do grupo econômico por CNPJs.
- 🔄 **Comparação Mensal**: Avaliar o giro e variação de demanda de itens de um mês para o outro.
- 💰 **Margens & Custos**: Analisar a rentabilidade e custo de aquisição (disponível no perfil **Financeiro**).

Fique à vontade para digitar sua pergunta ou testar os cenários de simulação no topo!`;
  }

  if (matchedProd) {
    let responseText = `Encontrei o produto **${matchedProd.nome}** (Código: \`${matchedProd.codigo}\`) no nosso catálogo de Cabos/Materiais Elétricos! 🔌\n\n`;
    responseText += `Ele pertence à categoria **${matchedProd.categoria}** e é comercializado em unidades de **${matchedProd.unidade}**. O seu preço atual de venda é **R$ ${matchedProd.preco_venda.toFixed(2)}**.\n\n`;
    responseText += `Gostaria de ver uma análise analítica deste item? Você pode me perguntar, por exemplo:\n`;
    responseText += `- 💰 *"Qual a margem do ${matchedProd.nome}?"* (caso esteja logado no perfil **Financeiro**)\n`;
    responseText += `- 🔄 *"Compare o ${matchedProd.nome} em maio e junho."* para ver a evolução de compras.\n\n`;
    responseText += `Diga-me o que deseja analisar e eu trarei os dados em tempo real!`;
    return responseText;
  }

  if (matchedSupp) {
    let responseText = `Localizei o fornecedor **${matchedSupp.nome_fantasia}** (CNPJ: \`${matchedSupp.cnpj}\`) no nosso cadastro de parceiros! 🤝\n\n`;
    responseText += `Ele faz parte do grupo empresarial *${matchedSupp.razao_social}*.\n\n`;
    responseText += `Deseja verificar dados operacionais ou de compras deste fornecedor? Experimente me perguntar:\n`;
    responseText += `- 📦 *"Qual o estoque da ${matchedSupp.nome_fantasia} neste mês?"*\n`;
    responseText += `- 📊 *"Qual a participação da ${matchedSupp.nome_fantasia} nas compras?"* (se você estiver logado no perfil **Compras**)\n\n`;
    responseText += `Me diga qual indicador deseja analisar!`;
    return responseText;
  }

  // General fallback
  return `Hum, compreendo perfeitamente o seu interesse! Como assistente e **Agente Inteligente** da **EletroMax**, minha grande paixão é ajudar você com nossa gestão de estoque, compras de fornecedores e relatórios financeiros de margens. 📦💡\n\n` +
    `Para que eu possa gerar um relatório analítico para você, sinta-se à vontade para me perguntar algo como:\n` +
    `- 📦 *"Qual o estoque e quebra da Tramontina neste mês?"* (Ativa o alerta de quebra se passar de 10%)\n` +
    `- 📊 *"Qual a participação da Tramontina nas compras deste mês?"* (Mostra gráficos de pizza por CNPJs)\n` +
    `- 🔄 *"Compare o Disjuntor 16A em maio e junho."* (Analisa giro de produtos)\n` +
    `- 💰 *"Qual a margem do motor 5CV?"* (Exibe tabela de custos e lucros de forma restrita)\n\n` +
    `Selecione o perfil desejado no topo direito (**Compras** ou **Financeiro**) para testar os níveis de permissões de acesso. Como posso te ajudar agora?`;
}

// CORE ORCHESTRATION ENDPOINT
const handleOrchestratedChat = async (req: Request, res: Response) => {
  const { question, mensagem, profile, perfil, history, cenario_id } = req.body;
  const userQuestion = question || mensagem;
  const userProfile = profile || perfil || "compras";

  if (!userQuestion) {
    res.status(400).json({ error: "Parâmetro 'question' ou 'mensagem' é obrigatório." });
    return;
  }

  try {
    // 1. INTENT EXTRACTION (With safe AI try-catch + robust deterministic fallback)
    let intentResult = null;
    let extractionTokens = 0;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getAiClient();
        const historyText = formatHistoryString(history);
        const promptIntent = `Histórico de conversa recente nesta sessão:
${historyText}

Pergunta atual do usuário: "${question}"`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptIntent,
          config: {
            systemInstruction: INTENT_SYSTEM_PROMPT,
            responseMimeType: "application/json",
          }
        });

        const textOutput = response.text || "{}";
        intentResult = JSON.parse(textOutput.trim());
        extractionTokens = Math.ceil((INTENT_SYSTEM_PROMPT.length + promptIntent.length + textOutput.length) / 4);
      } catch (err) {
        console.warn("AI intent extraction failed, falling back to deterministic extraction:", err);
      }
    }

    if (!intentResult || !intentResult.intent) {
      intentResult = extractIntentDeterministic(question);
    }

    const { intent, params } = intentResult;

    // 2. CHECK PERMISSION FOR INTENT
    // Rule:
    // - Perfil "compras" can view: estoque_fornecedor, participacao_fornecedor, comparacao_periodo, relatorio_reposicao
    // - Perfil "financeiro" can view: estoque_fornecedor, comparacao_periodo, margem, relatorio_reposicao
    const permissions: Record<string, string[]> = {
      compras: ["estoque_fornecedor", "participacao_fornecedor", "comparacao_periodo", "relatorio_reposicao"],
      financeiro: ["estoque_fornecedor", "comparacao_periodo", "margem", "relatorio_reposicao"]
    };

    const userAllowedIntents = permissions[profile] || [];

    if (intent !== "fora_escopo" && !userAllowedIntents.includes(intent)) {
      const isCompras = profile === "compras";
      const deniedMsg = isCompras
        ? `🔒 **Acesso Restrito**\n\nIdentifiquei que você está conectado com o perfil **Compras**.\n\nPor políticas estritas de governança e segurança da EletroMax Distribuidora, os dados financeiros de margem de lucro e custos de aquisição do **Motor WEG 5CV** são restritos ao perfil **Financeiro**.\n\nPara visualizar estes indicadores, alterne para o perfil **Financeiro** no seletor do menu superior.`
        : `🔒 **Acesso Restrito**\n\nIdentifiquei que você está conectado com o perfil **Financeiro**.\n\nOs relatórios operacionais de participação de fornecedores por CNPJ são restritos ao perfil **Compras**. Alterne para o perfil **Compras** no menu superior para autorizar a exibição.`;

      res.json({
        intent,
        unauthorized: true,
        text: deniedMsg,
        custoBrl: 0,
        tokensUsados: extractionTokens,
        alertaQuebra: false
      });
      return;
    }

    if (intent === "relatorio_reposicao") {
      let dbData = db.getResumoReposicao();

      // PROTEÇÃO RIGOROSA CONTRA PROMPT INJECTION / RBAC NO BACKEND:
      // Se o perfil for 'compras', a API remove completamente as propriedades financeiras do payload.
      if (profile === "compras") {
        dbData = JSON.parse(JSON.stringify(dbData, (key, value) => {
          if (key === "valor_estimado_compra" || key === "preco_venda" || key === "custo_medio" || key === "margem_valor" || key === "margem_pct") {
            return undefined; // Strips fields from prompt payload
          }
          return value;
        }));
      }

      const chartUrl = null;

      const formatted = await formatResponseWithAi(profile, question, intent, dbData, history);
      const totalTokens = extractionTokens + formatted.tokenCount;
      const precoPorMilTokensUsd = 0.00015; // Gemini Flash standard estimation
      const taxaCambioUsdToBrl = 5.60;
      const custoUsd = (totalTokens / 1000) * precoPorMilTokensUsd;
      const custoBrl = parseFloat((custoUsd * taxaCambioUsdToBrl).toFixed(6));

      res.json({
        intent,
        data: dbData,
        text: formatted.text,
        chartUrl,
        custoBrl,
        tokensUsados: totalTokens,
        alertaQuebra: false
      });
      return;
    }

    if (intent === "fora_escopo") {
      const humanizedText = await getHumanizedResponseForForaEscopo(question, profile, history);
      const answerTokens = Math.ceil(humanizedText.length / 4);
      const totalTokens = extractionTokens + answerTokens;
      // Calculate token cost
      const custoUsd = (totalTokens / 1000000) * 0.075;
      const custoBrl = parseFloat((custoUsd * 5.6).toFixed(4)) || 0.0001;

      res.json({
        intent: "fora_escopo",
        text: humanizedText,
        custoBrl: custoBrl,
        tokensUsados: totalTokens,
        alertaQuebra: false
      });
      return;
    }

    // 3. DATABASE EXECUTION
    let queryData: any = null;
    let searchErrorMsg: string | null = null;

    if (intent === "estoque_fornecedor") {
      const supplierName = params.fornecedor_nome || params.fornecedor;
      let period = params.periodo;
      if (!period && params.mes_referencia && params.ano_referencia) {
        period = `${params.ano_referencia}-${String(params.mes_referencia).padStart(2, '0')}`;
      }
      if (!period) period = "2026-07"; // default to current month in database

      if (!supplierName) {
        searchErrorMsg = "Nome do fornecedor não especificado na pergunta.";
      } else {
        const matchedSupplier = db.findSupplierByName(supplierName);
        if (!matchedSupplier) {
          searchErrorMsg = `Fornecedor "${supplierName}" não encontrado na nossa base de dados fictícia da EletroMax.`;
        } else {
          queryData = db.queryEstoqueFornecedor(matchedSupplier.id, period);
        }
      }
    } 
    else if (intent === "participacao_fornecedor") {
      const groupName = params.grupo_nome || params.fornecedor_grupo || params.fornecedor_nome || params.fornecedor;
      let period = params.periodo;
      if (!period && params.mes_referencia && params.ano_referencia) {
        period = `${params.ano_referencia}-${String(params.mes_referencia).padStart(2, '0')}`;
      }
      if (!period) period = "2026-07";

      if (!groupName) {
        searchErrorMsg = "Grupo de fornecedores não especificado na pergunta.";
      } else {
        const matchedSupplier = db.findSupplierByName(groupName);
        if (!matchedSupplier) {
          searchErrorMsg = `Grupo de fornecedores "${groupName}" não encontrado na nossa base de dados fictícia.`;
        } else {
          queryData = db.queryParticipacaoFornecedor(matchedSupplier.grupo_id, period);
        }
      }
    } 
    else if (intent === "comparacao_periodo") {
      const itemName = params.produto_nome || params.item;
      let m1 = params.mes1;
      let y1 = params.ano1 || 2026;
      let m2 = params.mes2;
      let y2 = params.ano2 || 2026;

      if (!m1 || !m2) {
        let p1 = params.periodo1 || "2026-05";
        let p2 = params.periodo2 || "2026-06";
        const parsed1 = p1.split('-').map(Number);
        const parsed2 = p2.split('-').map(Number);
        y1 = parsed1[0] || y1;
        m1 = parsed1[1] || 5;
        y2 = parsed2[0] || y2;
        m2 = parsed2[1] || 6;
      }

      if (!itemName) {
        searchErrorMsg = "Produto ou item não especificado para comparação.";
      } else {
        const matchedProd = db.findProductByName(itemName);
        if (!matchedProd) {
          searchErrorMsg = `Produto "${itemName}" não encontrado para comparação de períodos.`;
        } else {
          queryData = db.queryComparacaoPeriodos(matchedProd.id, Number(m1), Number(y1), Number(m2), Number(y2));
        }
      }
    } 
    else if (intent === "margem") {
      const itemName = params.produto_nome || params.item || params.fornecedor_nome || params.fornecedor;
      if (!itemName) {
        searchErrorMsg = "Item ou fornecedor não fornecido para análise de margens.";
      } else {
        // Try to match product first, then supplier
        const matchedProd = db.findProductByName(itemName);
        if (matchedProd) {
          queryData = db.queryMargem('produto', matchedProd.id);
        } else {
          const matchedSup = db.findSupplierByName(itemName);
          if (matchedSup) {
            queryData = db.queryMargem('fornecedor', matchedSup.id);
          } else {
            searchErrorMsg = `Não foi possível encontrar nenhum produto ou fornecedor com o nome "${itemName}" para consultar margens.`;
          }
        }
      }
    }

    // Check if query failed because of unmatched items
    if (searchErrorMsg) {
      res.json({
        intent,
        text: searchErrorMsg,
        custoBrl: 0,
        tokensUsados: extractionTokens,
        alertaQuebra: false
      });
      return;
    }

    // 4. FORMAT RESPONSE WITH GEMINI + CALCULATE REAL TOKEN FEES
    const formattingResult = await formatResponseWithAi(profile, question, intent, queryData, history);
    const totalTokens = extractionTokens + formattingResult.tokenCount;
    
    // Formula for pricing simulation: R$ 0,05 base + token scaling
    // Input is free or extremely cheap, let's represent R$ 0,02 as the prompt requested
    // "Toda resposta mostra custo estimado (ex: 'Custo desta conversa: R$0,02')"
    const estimatedCostBrl = 0.02;

    // 5. DETERMINE IF BREAKAGE ALERT (> 10%) SHOULD FLICKER YELLOW
    let alertaQuebra = false;
    if (intent === "estoque_fornecedor" && Array.isArray(queryData)) {
      alertaQuebra = queryData.some(item => item.alerta === true);
    }

    // 6. GENERATE QUICKCHART GRAPH URL
    const chartUrl = generateChartUrl(intent, queryData);

    res.json({
      intent,
      params,
      data: queryData,
      text: formattingResult.text,
      chartUrl,
      custoBrl: estimatedCostBrl,
      tokensUsados: totalTokens,
      alertaQuebra,
      sucesso: true,
      resposta_clara: formattingResult.text
    });

  } catch (error: any) {
    console.error("General error in backend API orchestration:", error);
    res.json({
      sucesso: false,
      intent: "erro",
      text: "Ocorreu um erro no servidor ao processar sua solicitação. Por favor, verifique se seu banco fictício está online e tente novamente.",
      custoBrl: 0,
      tokensUsados: 0,
      alertaQuebra: false
    });
  }
};

app.post("/api/consulta", handleOrchestratedChat);
app.post("/api/clara/chat", handleOrchestratedChat);

// Serve list of real products & suppliers for UI autocomplete / details helper
app.get("/api/autocomplete", (req, res) => {
  res.json({
    produtos: db.produtos.map(p => ({ id: p.id, codigo: p.codigo, nome: p.nome, categoria: p.categoria })),
    fornecedores: db.fornecedores.map(f => ({ id: f.id, nome_fantasia: f.nome_fantasia, razao_social: f.razao_social, cnpj: f.cnpj }))
  });
});

// START EXPRESS SERVER WITH VITE MIDDLEWARE OR STATIC FILES
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || !process.env.VITE_DEV;
  
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log("Vite dev server fallback to static mode");
    }
  }

  // Serve static dist folder (works for production build on Cloudez)
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
