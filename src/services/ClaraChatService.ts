import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const aiClient = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ""
});

const FINANCE_SYSTEM_PROMPT = `Você é Clara, Analista Financeira e de BI Sênior da EletroMax. 
Seu escopo é ESTRITAMENTE faturamento, volume de vendas, receitas e margens.
PROIBIÇÃO ABSOLUTA: Você NÃO deve mencionar ou explicar regras de logística, Curva ABCD, lead time ou quebras de estoque.
Responda de forma analítica, profissional e direta baseando-se EXCLUSIVAMENTE nos dados financeiros retornados pelas ferramentas do sistema.`;

const LOGISTICS_SYSTEM_PROMPT = `Você é Clara, Especialista em Supply Chain da EletroMax.
Seu escopo é estoque, logística e reposição (Curva ABCD). Baseie-se apenas em dados operacionais.`;

const buscarDadosVendasTool = {
  name: "buscar_dados_vendas",
  description: "Busca o volume de vendas e a receita de um mês e ano específicos no banco de dados da empresa.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      mes: {
        type: Type.STRING,
        description: "O mês da consulta (ex: 'abril', '04', 'janeiro')."
      },
      ano: {
        type: Type.STRING,
        description: "O ano da consulta em formato de 4 dígitos (ex: '2026')."
      }
    },
    required: ["mes", "ano"]
  }
};

async function executeBuscarDadosVendas(mes: string, ano: string) {
  console.log(`[DB] Executando query financeira para: ${mes}/${ano}...`);
  return {
    periodo_consultado: `${mes}/${ano}`,
    receita_total: "R$ 600.000,00",
    volume_unidades_vendidas: 6000,
    status_meta: "Atingida (120%)",
    mensagem_sistema: "Dados consolidados com sucesso."
  };
}

export async function processarMensagemClara(message: string, intent: string = "vendas") {
  const systemInstruction = intent === "vendas" || intent === "financeiro" || intent === "historico_vendas"
    ? FINANCE_SYSTEM_PROMPT 
    : LOGISTICS_SYSTEM_PROMPT;

  const chat = aiClient.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: [buscarDadosVendasTool] }]
    }
  });

  const response = await chat.sendMessage({ message });

  if (response.functionCalls && response.functionCalls.length > 0) {
    const call = response.functionCalls[0];
    
    if (call.name === "buscar_dados_vendas") {
      const args = call.args as { mes: string, ano: string };
      const dbResult = await executeBuscarDadosVendas(args.mes, args.ano);

      const followUpResponse = await chat.sendMessage({
        message: [{
          functionResponse: {
            name: call.name,
            response: dbResult
          }
        }]
      });

      return followUpResponse.text;
    }
  }

  return response.text || "Erro ao processar a resposta analítica.";
}
