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

import { processarMensagemClara } from "./src/services/ClaraChatService.js";

// CORE ORCHESTRATION ENDPOINT
const handleOrchestratedChat = async (req: Request, res: Response) => {
  const { question, mensagem, profile, perfil, history } = req.body;
  const userQuestion = question || mensagem;
  const userProfile = profile || perfil || "compras";

  if (!userQuestion) {
    res.status(400).json({ error: "Parâmetro 'question' ou 'mensagem' é obrigatório." });
    return;
  }

  try {
    const { text, data, tokens } = await processarMensagemClara(userQuestion, history, userProfile);

    const precoPorMilTokensUsd = 0.00015;
    const taxaCambioUsdToBrl = 5.60;
    const custoUsd = ((tokens || 100) / 1000) * precoPorMilTokensUsd;
    const custoBrl = parseFloat((custoUsd * taxaCambioUsdToBrl).toFixed(6));

    res.json({
      intent: "processado_via_function_calling",
      params: {},
      data: data,
      text: text,
      chartUrl: null,
      custoBrl,
      tokensUsados: tokens || 100,
      alertaQuebra: false,
      sucesso: true,
      resposta_clara: text
    });
  } catch (error: any) {
    console.error("General error in backend API orchestration:", error);
    res.json({
      sucesso: false,
      intent: "erro",
      text: "Ocorreu um erro no servidor ao processar sua solicitação. Por favor, tente novamente.",
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
