const path = require('path');

// 1. Carrega o .env usando caminho absoluto garantido
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// 2. Força o DNS do Node.js a priorizar IPv4 no processo
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// 3. Força o undici (fetch interno do Node.js 18) a usar SOMENTE IPv4
//    Isso corrige o "fetch failed" causado pelo undici tentando IPv6
try {
    const { setGlobalDispatcher, Agent } = require('undici');
    setGlobalDispatcher(new Agent({ connect: { family: 4 } }));
    console.log('[DNS] ✅ undici dispatcher configurado para IPv4 exclusivo.');
} catch (e) {
    console.warn('[DNS] ⚠️ undici não disponível, continuando sem patch IPv4:', e.message);
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Captura e valida a chave de API
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey.trim() === '') {
    console.error("❌ ERRO: A variável GEMINI_API_KEY está vazia ou não foi encontrada no .env!");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

const SYSTEM_PROMPT = `Você é Clara, um agente de Supply Chain e Analista Financeira da EletroMax.
Responda APENAS com base nos dados reais fornecidos pelo sistema via ferramentas (Tools).
Se a informação não estiver disponível nas ferramentas ou no contexto, responda estritamente:
'Desculpe, não tenho dados para responder a essa pergunta no momento.'
Não invente ou adivinhe números. Assuma postura profissional, objetiva e transparente.`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "buscar_dados_vendas",
        description: "Busca o volume de vendas e a receita de um mês e ano específicos no banco de dados da empresa.",
        parameters: {
          type: "OBJECT",
          properties: {
            mes: { type: "STRING", description: "Nome ou número do mês (ex: abril, 04)" },
            ano: { type: "STRING", description: "Ano com 4 dígitos (ex: 2026)" },
          },
          required: ["mes", "ano"],
        },
      }
    ]
  }
];

function executeBuscarDadosVendas(mes, ano) {
    console.log(`[Tool] Executando buscar_dados_vendas para ${mes}/${ano}`);
    return { receita: "R$ 600.000,00", volume_unidades: 6000, periodo: `${mes}/${ano}`, status: "Fechado" };
}

async function processarChatGemini(mensagemUsuario, historicoFront) {
    try {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error("GEMINI_API_KEY ausente no arquivo .env do servidor.");
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            tools: tools,
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
                temperature: 0.1
            }
        });

        // Validação e Limpeza de Histórico
        let validHistory = [];
        if (historicoFront && Array.isArray(historicoFront)) {
            for (const msg of historicoFront) {
                if (validHistory.length === 0 && msg.role !== 'user') continue;
                if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === msg.role) continue;
                
                validHistory.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text || "" }]
                });
            }
            if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
                validHistory.pop();
            }
        }

        const chat = model.startChat({ history: validHistory });
        let result = await chat.sendMessage(mensagemUsuario);
        let response = result.response;

        if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            let apiResponse = {};

            if (call.name === "buscar_dados_vendas") {
                apiResponse = executeBuscarDadosVendas(call.args.mes, call.args.ano);
            }

            result = await chat.sendMessage([{
                functionResponse: {
                    name: call.name,
                    response: apiResponse
                }
            }]);
            response = result.response;
        }

        return {
            text: response.text(),
            intent: "ia_dinamica",
            error: false
        };

    } catch (error) {
        console.error("❌ ERRO NO GEMINI SERVICE:", error);
        throw error;
    }
}

module.exports = { processarChatGemini };
