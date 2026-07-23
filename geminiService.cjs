// geminiService.cjs
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inicia o SDK com a chave do .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `Você é Clara, um agente de Supply Chain e Analista Financeira da EletroMax. 
Responda APENAS com base nos dados fornecidos pelo sistema via Function Calling. 
Se perguntarem algo fora de compras, estoque ou vendas, responda estritamente: 
'Desculpe, não tenho dados para responder a essa pergunta no momento.'
Não alucine números. Se identificar intenção de vendas/financeiro, assuma postura de Analista Financeira e traga os números exatos.`;

// Declaração da ferramenta (Function Calling)
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

// Mock da função real (No futuro conectaremos ao seu BD/ERP)
function executeBuscarDadosVendas(mes, ano) {
    console.log(`[Tool Executed] Buscando vendas para: ${mes}/${ano}`);
    return { receita: "R$ 600k", volume_unidades: 6000, periodo: `${mes}/${ano}`, status: "Fechado" };
}

async function processarChatGemini(mensagemUsuario, historicoFront) {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            tools: tools,
            systemInstruction: SYSTEM_PROMPT
        });

        // Formata o histórico do front-end para o padrão do Gemini
        let formatadoParaGemini = [];
        if (historicoFront && Array.isArray(historicoFront)) {
            formatadoParaGemini = historicoFront.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));
        }

        const chat = model.startChat({ history: formatadoParaGemini });

        // Envia a mensagem do usuário
        let result = await chat.sendMessage(mensagemUsuario);
        let response = result.response;

        // Verifica se a IA pediu para chamar a função (Function Calling)
        if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            let apiResponse = {};

            if (call.name === "buscar_dados_vendas") {
                apiResponse = executeBuscarDadosVendas(call.args.mes, call.args.ano);
            }

            // Devolve os dados reais para a IA montar a frase
            result = await chat.sendMessage([{
                functionResponse: {
                    name: call.name,
                    response: apiResponse
                }
            }]);
            response = result.response;
        }

        // Retorna o texto final gerado pela Clara
        return {
            text: response.text(),
            intent: "ia_dinamica",
            error: false
        };

    } catch (error) {
        console.error("❌ ERRO NO GEMINI SERVICE:", error);
        throw error; // Repassa o erro para o app.cjs capturar
    }
}

module.exports = { processarChatGemini };
