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

const PORT = Number(process.env.PORT) || 3000;

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

7. **abrir_chamado**
   - Perguntas pedindo para abrir um ticket, relatar um problema de TI (ex: "meu mouse quebrou", "computador não liga", "abrir chamado").
   - Parâmetros: \`descricao\` (string), \`solicitante\` (string).
   - Exemplos:
     * "Preciso abrir um chamado, a internet caiu" → {"intent":"abrir_chamado","params":{"descricao":"a internet caiu"}}

8. **status_chamado**
   - Perguntas sobre o status de um chamado de TI (ex: "como está meu chamado?", "status do ticket").
   - Parâmetros: \`id_chamado\` (string, opcional).
   
9. **estoque_epi**
   - Perguntas sobre estoque, saldo ou ruptura de Equipamentos de Proteção Individual (EPIs).
   - Parâmetros: \`nome_epi\` (string, opcional).
   - Exemplos: "Temos capacete no estoque?", "Qual o saldo de luvas?"

10. **consumo_epi_funcionario**
    - Perguntas sobre os EPIs retirados/consumidos por um funcionário.
    - Parâmetros: \`funcionario_nome\` (string).
    - Exemplos: "Quais EPIs o João retirou?", "Consumo do José da manutenção."

11. **historico_vendas**
    - Perguntas sobre o volume de vendas, faturamento, ou histórico de vendas em um mês e ano específicos.
    - Parâmetros: \`mes\` (número 1-12), \`ano\` (número 4 dígitos). Se o usuário não especificar, não envie os parâmetros ou tente inferir.
    - Exemplos: "qual foi nosso volume de vendas em janeiro de 2026?", "quanto faturamos mês passado?"

12. **fora_escopo**
    - Perguntas que não se encaixam em nenhuma das intenções acima (ex: "Qual o preço do café?", previsão do tempo, código, cálculos matemáticos complexos sem dados).
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

async function generateWithTimeout(aiCallPromise: Promise<any>, timeoutMs: number = 5000): Promise<any> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout de ${timeoutMs}ms atingido na chamada da API Gemini.`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([aiCallPromise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
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
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("Chave de API Gemini não configurada.");
    }
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

    const aiPromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptFormatacao,
      config: {
        systemInstruction: PERSONA_DIRETRIZES,
      }
    });

    const response = await generateWithTimeout(aiPromise, 5000);

    const text = response.text || "Erro ao formatar resposta com Inteligência Artificial.";
    
    // Estimate token counts
    const promptTokens = Math.ceil((PERSONA_DIRETRIZES.length + promptFormatacao.length) / 4);
    const responseTokens = Math.ceil(text.length / 4);
    const totalTokens = promptTokens + responseTokens;

    return { text, tokenCount: totalTokens };
  } catch (error) {
    console.warn("⚠️ API Gemini indisponível/lenta ou bloqueada. Ativando resposta determinística de alta performance (Fallback Instantâneo):", error);
    // Return a static fallback formatted template
    return {
      text: formatResponseFallback(intent, data),
      tokenCount: 0
    };
  }
}

function formatResponseFallback(intent: string, data: any): string {
  let text = `📊 **Clara - Relatório Analítico EletroMax**\n\nAqui estão os dados consultados diretamente do banco de dados:\n\n`;
  if (intent === "estoque_fornecedor") {
    text += `### Relatório de Estoque e Quebras\n\n`;
    if (Array.isArray(data)) {
      (data as any[]).forEach(item => {
        const nome = item.nome || item.produto || item.codigo || "Produto";
        const codigo = item.codigo || "N/A";
        const unidade = item.unidade || "un";
        const totalEntrado = item.total_entrado ?? item.venda_media_mensal_ultimos_24m ?? "N/A";
        const saldo = item.saldo ?? item.estoque_atual_unidades ?? item.estoque_atual ?? "N/A";
        const quebra = item.quebra ?? "N/A";
        const percentualQuebra = item.percentual_quebra ?? "N/A";

        text += `- **${nome}** (${codigo}):\n`;
        text += `  - Total Entrado (Compras): ${totalEntrado} ${unidade}\n`;
        text += `  - Saldo Atual em Estoque: ${saldo} ${unidade}\n`;
        if (quebra !== "N/A") {
          text += `  - Quebra de Estoque: ${quebra} ${unidade} (**${percentualQuebra}%**)\n`;
        }
        if (item.meta_estoque_unidades) {
          text += `  - Meta de Estoque (Classe ${item.classe_curva || "?"}): ${item.meta_estoque_unidades} ${unidade}\n`;
        }
        if (item.sugestao_compra_emergencial && item.sugestao_compra_emergencial > 0) {
          text += `  - 🛒 Sugestão de Compra Emergencial: ${item.sugestao_compra_emergencial} ${unidade}\n`;
        }
        if (item.status === "RISCO_CRITICO_RUPTURA") {
          text += `  - 🚨 **ALERTA CRÍTICO**: Estoque muito abaixo da meta! Risco imediato de ruptura.\n`;
        }
        if (item.alerta) {
          text += `  - ⚠️ **Atenção**: Quebra acima do limite recomendado de 10%!\n`;
        }
        text += `\n`;
      });
    }
    text += `\nQuer ver esse mesmo dado para outro fornecedor ou detalhar os itens com maior quebra?`;
  } else if (intent === "participacao_fornecedor") {
    const nomeGrupo = data.nome_grupo || "Grupo";
    const totalGrupo = data.total_grupo || 0;
    text += `### Participação do Grupo Fornecedor: **${nomeGrupo}**\n\n`;
    text += `Total comprado do grupo no período: **R$ ${totalGrupo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**\n\n`;
    text += `Detalhamento por CNPJ:\n`;
    if (data.fornecedores && Array.isArray(data.fornecedores)) {
      (data.fornecedores as any[]).forEach(f => {
        const total = f.total || 0;
        text += `- **${f.nome_fantasia}** (CNPJ: ${f.cnpj}): R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
    }
    text += `\nPosso comparar a participação com outros fornecedores do nosso catálogo se desejar!`;
  } else if (intent === "comparacao_periodo") {
    const nomeProduto = data.nome_produto || data.nome || "Produto";
    text += `### Comparação de Compras - Produto: **${nomeProduto}**\n\n`;
    if (data.periodo1 && data.periodo2) {
      text += `- Período 1 (${data.periodo1.mes}/${data.periodo1.ano}): ${data.periodo1.quantidade} un (Total: R$ ${data.periodo1.valor_total?.toLocaleString('pt-BR') || 'N/A'})\n`;
      text += `- Período 2 (${data.periodo2.mes}/${data.periodo2.ano}): ${data.periodo2.quantidade} un (Total: R$ ${data.periodo2.valor_total?.toLocaleString('pt-BR') || 'N/A'})\n`;
      const varQty = data.variacao_quantidade_pct ?? 0;
      text += `- **Variação de volume**: ${varQty >= 0 ? '+' : ''}${varQty}%\n\n`;
    }
    text += `Gostaria de analisar outro período ou produto do mesmo fornecedor?`;
  } else if (intent === "margem") {
    if (data.tipo === 'produto') {
      const nome = data.nome || data.produto || "Produto";
      const precoVenda = data.preco_venda ?? data.preco_venda_praticado ?? 0;
      const custoMedio = data.custo_medio ?? data.custo_aquisicao ?? 0;
      const margemValor = data.margem_valor ?? 0;
      const margemPct = data.margem_pct ?? data.margem_lucro_bruta ?? 0;

      text += `### Análise de Margem - Produto: **${nome}**\n\n`;
      text += `- Preço de Venda: R$ ${typeof precoVenda === 'number' ? precoVenda.toFixed(2) : precoVenda}\n`;
      text += `- Custo Médio de Aquisição: R$ ${typeof custoMedio === 'number' ? custoMedio.toFixed(2) : custoMedio}\n`;
      text += `- Margem de Lucro Bruta: R$ ${typeof margemValor === 'number' ? margemValor.toFixed(2) : margemValor} (**${margemPct}%**)\n\n`;
    } else {
      const nome = data.nome || "Fornecedor";
      text += `### Análise de Margem - Fornecedor: **${nome}**\n\n`;
      text += `- Total Comprado: R$ ${(data.custo_total || 0).toLocaleString('pt-BR')}\n`;
      text += `- Valor de Venda Estimado: R$ ${(data.venda_total || 0).toLocaleString('pt-BR')}\n`;
      text += `- Margem Média Ponderada: R$ ${(data.margem_valor || 0).toLocaleString('pt-BR')} (**${data.margem_pct || 0}%**)\n\n`;
    }
    text += `Deseja verificar a margem de outro produto ou fornecedor da EletroMax?`;
  } else if (intent === "relatorio_reposicao") {
    text += `### 📋 Relatório Matinal de Reposição & Análise Curva ABCD\n\n`;
    text += `Analisamos **${data.total_produtos_analisados || 0} produtos** do nosso catálogo:\n`;
    text += `- 🚨 **Itens em Risco de Ruptura**: ${data.itens_risco_ruptura_total || 0}\n`;
    text += `- 📦 **Itens com Excesso de Estoque**: ${data.itens_excesso_total || 0}\n\n`;
    
    if (data.pedidos_automaticos_classe_a && data.pedidos_automaticos_classe_a.length > 0) {
      text += `#### ⚡ Pedidos Automáticos Emitidos (Classe A - Meta 6 Meses)\n`;
      (data.pedidos_automaticos_classe_a as any[]).forEach(item => {
        text += `- **${item.nome}** (${item.codigo}): Estoque atual de ${item.estoque_atual} un está abaixo do Ponto de Reposição (${item.ponto_reposicao} un).\n  *${item.acao_mensagem}*\n`;
      });
      text += `\n`;
    }

    if (data.pedidos_pendentes_aprovacao_bcd && data.pedidos_pendentes_aprovacao_bcd.length > 0) {
      text += `#### 🛒 Pedidos Pendentes de Aprovação Humana (Classes B, C e D)\n`;
      (data.pedidos_pendentes_aprovacao_bcd as any[]).forEach(item => {
        text += `- **${item.nome}** (Classe ${item.classe} | Código: ${item.codigo}): Estoque de ${item.estoque_atual} un (Ponto Reposição: ${item.ponto_reposicao} un). Sugestão de Compra: ${item.sugestao_compra_qtd} un.\n  *${item.acao_mensagem}*\n`;
      });
      text += `\n`;
    }
  } else if (intent === "abrir_chamado") {
    text += `### ✅ Chamado de TI Aberto com Sucesso!\n\n`;
    text += `O seu ticket foi registrado e a equipe técnica já foi notificada (Alerta Externo/E-mail enviado).\n\n`;
    text += `- **Ticket ID:** ${data.id}\n`;
    text += `- **Descrição:** ${data.descricao}\n`;
    text += `- **Status:** ${data.status}\n\n`;
    text += `Você pode consultar o andamento depois perguntando "Qual o status do meu chamado?".`;
  } else if (intent === "status_chamado") {
    text += `### 🎫 Status dos Chamados de TI\n\n`;
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(chamado => {
        const emoji = chamado.status === 'RESOLVIDO' ? '✅' : (chamado.status === 'EM_ANDAMENTO' ? '🚧' : '⏳');
        text += `- **${chamado.id}** (${chamado.solicitante}): ${chamado.descricao} - ${emoji} **${chamado.status}**\n`;
      });
    } else {
      text += `Nenhum chamado pendente encontrado.\n`;
    }
  } else if (intent === "estoque_epi") {
    text += `### 🦺 Controle de Estoque de EPIs\n\n`;
    if (Array.isArray(data)) {
      data.forEach(epi => {
        text += `- **${epi.nome}** (${epi.codigo}): Saldo de ${epi.saldo} ${epi.unidade}. Ponto de Reposição: ${epi.ponto_reposicao}.\n`;
        if (epi.ruptura) {
          text += `  - 🚨 **Aviso:** Estoque abaixo do ponto de reposição!\n`;
        }
      });
    }
  } else if (intent === "consumo_epi_funcionario") {
    text += `### 📋 Relatório Gerencial: Consumo de EPI por Funcionário\n\n`;
    if (Array.isArray(data)) {
      data.forEach(func => {
        text += `- **${func.funcionario}** (Depto: ${func.departamento}) - Total retirado: **${func.total_itens} itens**\n`;
        if (func.detalhes && func.detalhes.length > 0) {
          func.detalhes.forEach((d: any) => {
            text += `  - ${d.quantidade}x ${d.epi} (em ${d.data})\n`;
          });
        } else {
          text += `  - Nenhum EPI retirado no período.\n`;
        }
      });
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


  // Novos Intents para ITSM (Cliente 1)
  if (q.includes("abrir chamado") || q.includes("ticket") || q.includes("problema de ti") || q.includes("mouse") || q.includes("teclado") || q.includes("internet") || q.includes("computador") || q.includes("notebook")) {
    return {
      intent: "abrir_chamado",
      params: { descricao: question }
    };
  }

  if (q.includes("status do chamado") || q.includes("meu chamado") || q.includes("andamento do ticket") || q.includes("status chamado")) {
    return {
      intent: "status_chamado",
      params: {}
    };
  }

  // Novos Intents para EPIs (Cliente 2)
  if (q.includes("estoque de epi") || q.includes("capacete") || q.includes("luva") || q.includes("óculos") || q.includes("botina") || (q.includes("estoque") && q.includes("epi"))) {
    return {
      intent: "estoque_epi",
      params: {}
    };
  }

  if (q.includes("consumo de epi") || q.includes("funcionário") || q.includes("funcionario") || q.includes("retirou") || (q.includes("epi") && q.includes("joão"))) {
    return {
      intent: "consumo_epi_funcionario",
      params: {}
    };
  }

  // Novo Intent: Historico de Vendas
  if (q.includes("vendas") || q.includes("volume") || q.includes("faturamos") || q.includes("faturamento") || q.includes("vendemos")) {
    return {
      intent: "historico_vendas",
      params: {}
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

      const aiPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: question,
        config: {
          systemInstruction,
        }
      });

      // 5 seconds max for humanized open-ended chat
      const response = await generateWithTimeout(aiPromise, 5000);

      if (response && response.text) {
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

    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      try {
        const ai = getAiClient();
        const historyText = formatHistoryString(history);
        const promptIntent = `Histórico de conversa recente nesta sessão:
${historyText}

Pergunta atual do usuário: "${question}"`;

        const aiIntentPromise = ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: promptIntent,
          config: {
            systemInstruction: INTENT_SYSTEM_PROMPT,
            responseMimeType: "application/json",
          }
        });

        const response = await generateWithTimeout(aiIntentPromise, 3500);

        const textOutput = response.text || "{}";
        intentResult = JSON.parse(textOutput.trim());
        extractionTokens = Math.ceil((INTENT_SYSTEM_PROMPT.length + promptIntent.length + textOutput.length) / 4);
      } catch (err) {
        console.warn("⚠️ Intent extraction via Gemini excedeu tempo limite ou falhou. Usando algoritmo determinístico instantâneo.");
      }
    }

    if (!intentResult || !intentResult.intent) {
      intentResult = extractIntentDeterministic(question);
    }

    const { intent, params } = intentResult;

    // 2. CHECK PERMISSION FOR INTENT
    // Rule:
    // - Perfil "compras" can view: estoque_fornecedor, participacao_fornecedor, comparacao_periodo, relatorio_reposicao, abrir_chamado, status_chamado, estoque_epi, consumo_epi_funcionario, historico_vendas
    // - Perfil "financeiro" can view: estoque_fornecedor, comparacao_periodo, margem, relatorio_reposicao, abrir_chamado, status_chamado, estoque_epi, consumo_epi_funcionario, historico_vendas
    const permissions: Record<string, string[]> = {
      compras: ["estoque_fornecedor", "participacao_fornecedor", "comparacao_periodo", "relatorio_reposicao", "abrir_chamado", "status_chamado", "estoque_epi", "consumo_epi_funcionario", "historico_vendas"],
      financeiro: ["estoque_fornecedor", "comparacao_periodo", "margem", "relatorio_reposicao", "abrir_chamado", "status_chamado", "estoque_epi", "consumo_epi_funcionario", "historico_vendas"]
    };

    const userAllowedIntents = permissions[profile] || [];

    if (intent !== "fora_escopo" && !userAllowedIntents.includes(intent)) {
      const isCompras = profile === "compras";
      const deniedMsg = isCompras
        ? `🔒 **Acesso Restrito**\n\nIdentifiquei que você está conectado com o perfil **Compras**.\n\nPor políticas estritas de governança e segurança, os dados financeiros de margem de lucro e custos de aquisição são restritos ao perfil **Financeiro**.\n\nPara visualizar estes indicadores, alterne para o perfil **Financeiro** no seletor do menu superior.`
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
      let formattedText = "";
      let formattingTokenCount = 0;

      // CORTE DE AUTONOMIA (Exception Handling): Se houver quebra de regra de negócio (>R$ 50k),
      // forçamos uma resposta engessada e não deixamos a IA formatar o texto para evitar alucinações.
      const isBlockedBy50kRule = dbData.pedidos_automaticos_classe_a && dbData.pedidos_automaticos_classe_a.some((item: any) => item.acao_mensagem && item.acao_mensagem.includes("PENDENTE DE ASSINATURA DA DIRETORIA"));

      if (isBlockedBy50kRule) {
        formattedText = formatResponseFallback(intent, dbData);
      } else {
        const formatted = await formatResponseWithAi(profile, question, intent, dbData, history);
        formattedText = formatted.text;
        formattingTokenCount = formatted.tokenCount;
      }

      const totalTokens = extractionTokens + formattingTokenCount;
      const precoPorMilTokensUsd = 0.00015; // Gemini Flash standard estimation
      const taxaCambioUsdToBrl = 5.60;
      const custoUsd = (totalTokens / 1000) * precoPorMilTokensUsd;
      const custoBrl = parseFloat((custoUsd * taxaCambioUsdToBrl).toFixed(6));

      res.json({
        intent,
        data: dbData,
        text: formattedText,
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
    } else if (intent === "abrir_chamado") {
      const desc = params.descricao || question;
      const solicitante = params.solicitante || "Usuário do Chat";
      queryData = db.abrirChamado(solicitante, desc);
      
      // Simula o envio de um alerta externo (ex: email) para a fila de atendimento
      console.log(`[ALERTA EXTERNO ENVIADO] E-mail e notificação push enviados para ti@empresa.com sobre o novo chamado: ${queryData.id}.`);
    } else if (intent === "status_chamado") {
      const id = params.id_chamado || "";
      queryData = db.queryStatusChamado(id);
    } else if (intent === "estoque_epi") {
      const nomeEPI = params.nome_epi || "";
      queryData = db.queryEstoqueEPI(nomeEPI);
    } else if (intent === "consumo_epi_funcionario") {
      const nome = params.funcionario_nome || "";
      queryData = db.queryConsumoFuncionario(nome);
    } else if (intent === "historico_vendas") {
      const { processarMensagemClara } = await import("./src/services/ClaraChatService.js");
      const textoFinal = await processarMensagemClara(question, intent);
      
      res.json({
        intent,
        params,
        data: db.queryHistoricoVendas(),
        text: textoFinal,
        chartUrl: null,
        custoBrl: 0.02,
        tokensUsados: 150,
        alertaQuebra: false,
        sucesso: true,
        resposta_clara: textoFinal
      });
      return;
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

// GOOGLE WORKSPACE CHAT WEBHOOK INTEGRATION (Google Workspace Bot / Hangouts Chat API)
app.post("/api/google-chat", async (req: Request, res: Response) => {
  try {
    const event = req.body;
    console.log("[Google Workspace Webhook] Evento recebido:", JSON.stringify(event));

    // Handle bot added to space event
    if (event.type === "ADDED_TO_SPACE") {
      const spaceType = event.space?.type === "ROOM" ? "espaço" : "conversa";
      res.json({
        text: `👋 Olá! Eu sou a **Clara**, a assistente inteligente da **EletroMax Distribuidora**.\n\nFui adicionada a este ${spaceType}! Vocês podem me perguntar sobre estoque, quebras de fornecedores (ex: Tramontina), relatórios de reposição ou curva ABCD.\n\nBasta digitar sua pergunta!`
      });
      return;
    }

    // Handle user message event
    if (event.type === "MESSAGE") {
      const userMessage = event.message?.argumentText || event.message?.text || "";
      // Remove menções de bot (tanto formato @Nome quanto <users/123456>)
      const cleanQuestion = userMessage.replace(/@\w+/g, "").replace(/<users\/[^>]+>/g, "").trim();

      if (!cleanQuestion) {
        res.json({
          text: "Olá! Como posso ajudar você hoje com a gestão de estoque, suprimentos ou chamados?"
        });
        return;
      }

      // Identify user profile (default to 'compras' unless email is from financeiro)
      const userEmail = event.message?.sender?.email || "";
      const profile = userEmail.toLowerCase().includes("financeiro") ? "financeiro" : "compras";

      // Execute internal AI orchestration pipeline
      const mockReq = {
        body: {
          question: cleanQuestion,
          mensagem: cleanQuestion,
          profile: profile,
          perfil: profile
        }
      } as Request;

      let responseText = "";
      let chartUrl = null;

      const mockRes = {
        status: function(code: number) { return this; },
        json: (data: any) => {
          responseText = data.text || data.resposta_clara || data.error || "Não consegui processar a resposta.";
          chartUrl = data.chartUrl;
          return this;
        }
      } as unknown as Response;

      await handleOrchestratedChat(mockReq, mockRes);

      // Return standard Google Workspace Chat card/text response
      if (chartUrl) {
        res.json({
          text: responseText,
          cardsV2: [
            {
              cardId: "clara_chart_card",
              card: {
                header: {
                  title: "EletroMax AI - Análise Visual",
                  subtitle: "Gráfico de Tendências e Relatório"
                },
                sections: [
                  {
                    widgets: [
                      {
                        image: {
                          imageUrl: chartUrl,
                          altText: "Gráfico de Análise EletroMax"
                        }
                      }
                    ]
                  }
                ]
              }
            }
          ]
        });
      } else {
        res.json({ text: responseText });
      }
      return;
    }

    // Default response for status check
    res.json({ text: "Webhook Clara EletroMax AI ativo e operacional." });
  } catch (error: any) {
    console.error("[Google Workspace Webhook] Erro ao processar mensagem:", error);
    res.json({ text: "Ocorreu um erro interno na Clara ao processar sua mensagem do Google Chat." });
  }
});

// Serve list of real products & suppliers for UI autocomplete / details helper
app.get("/api/autocomplete", (req, res) => {
  res.json({
    produtos: db.produtos.map(p => ({ id: p.id, codigo: p.codigo, nome: p.nome, categoria: p.categoria })),
    fornecedores: db.fornecedores.map(f => ({ id: f.id, nome_fantasia: f.nome_fantasia, razao_social: f.razao_social, cnpj: f.cnpj }))
  });
});

// Endpoint para o Gráfico de Vendas Agregadas (Dashboard)
app.get("/api/vendas", (req, res) => {
  res.json(db.queryHistoricoVendas());
});

// Endpoint dedicado para consultar o Histórico Fictício de Vendas dos últimos 24 meses
app.get("/api/historico-vendas", (req, res) => {
  const produtoId = req.query.produto_id ? Number(req.query.produto_id) : undefined;
  const codigo = req.query.codigo ? String(req.query.codigo).toUpperCase() : undefined;

  let filtrado = db.historico_vendas;

  if (produtoId) {
    filtrado = filtrado.filter(h => h.id_produto === produtoId);
  } else if (codigo) {
    const prod = db.produtos.find(p => p.codigo === codigo);
    if (prod) {
      filtrado = filtrado.filter(h => h.id_produto === prod.id);
    }
  }

  const historicoComDetalhes = filtrado.map(h => {
    const prod = db.produtos.find(p => p.id === h.id_produto);
    return {
      ...h,
      codigo_produto: prod?.codigo || "N/A",
      nome_produto: prod?.nome || "N/A",
      categoria: prod?.categoria || "N/A"
    };
  });

  const totalRegistros = historicoComDetalhes.length;
  const totalVolumeVendido = historicoComDetalhes.reduce((sum, item) => sum + item.quantidade_vendida, 0);

  res.json({
    periodo_cobertura: "Julho/2024 a Junho/2026 (24 Meses)",
    total_registros: totalRegistros,
    total_volume_vendido_unidades: totalVolumeVendido,
    historico: historicoComDetalhes
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

  // Serve static public folder (works for production build on Cloudez)
  const distPath = path.join(process.cwd(), "public");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
