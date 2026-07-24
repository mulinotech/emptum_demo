import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { db } from "./src/db/simulatedDb.js"; // Using .js for ESM compatibility or Node TS import
import { PERSONA_DIRETRIZES } from "./src/persona.js";
import geminiService from "./geminiService.cjs";
const { processarChatGemini } = geminiService;

dotenv.config();

import dns from "dns";
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

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
app.post("/api/clara/chat", async (req: Request, res: Response) => {
    try {
        const { question, historico, history, profile, perfil } = req.body;
        const mensagemUser = question || req.body.mensagem;
        const userProfile = profile || perfil || "compras";

        if (!mensagemUser) {
          res.status(400).json({ error: "Parâmetro 'question' ou 'mensagem' é obrigatório." });
          return;
        }

        // 1. Trava Financeira Automática (Hard-Stop)
        if (mensagemUser.toLowerCase().includes('50000') || mensagemUser.toLowerCase().includes('50k')) {
            res.json({ 
                text: "⚠️ SISTEMA: Pedido de compra bloqueado. O valor excede a alçada financeira (R$ 50k). Status: PENDENTE DE ASSINATURA DA DIRETORIA.",
                intent: "trava_seguranca",
                custoBrl: 0,
                tokensUsados: 0
            });
            return;
        }

        // 2. Execução da IA rápida através do pipeline direto com contexto RAG
        const userHistory = history || historico || [];
        const { text, data, tokens } = await processarMensagemClara(mensagemUser, userHistory, userProfile);

        const precoPorMilTokensUsd = 0.00015;
        const taxaCambioUsdToBrl = 5.60;
        const custoUsd = ((tokens || 100) / 1000) * precoPorMilTokensUsd;
        const custoBrl = parseFloat((custoUsd * taxaCambioUsdToBrl).toFixed(6));

        res.json({
            text: text,
            resposta_clara: text,
            data: data,
            intent: "ia_dinamica",
            custoBrl: custoBrl || 0.05,
            tokensUsados: tokens || 500,
            sucesso: true
        });
        return;

    } catch (error: any) {
        console.error("❌ ERRO NA ROTA /api/clara/chat:", error);
        
        res.json({ 
            text: "Ops, tive um problema técnico ao processar sua consulta. Por favor, tente novamente em instantes.\n\n*Detalhe técnico: " + (error.message || "Timeout de comunicação") + "*",
            intent: "erro_servidor",
            custoBrl: 0,
            tokensUsados: 0
        });
        return;
    }
});

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

// Middleware de Autenticação Segura para Endpoints de Administração RAG
const requireAdminAuth = (req: Request, res: Response, next: any) => {
  const adminKey = process.env.ADMIN_API_KEY || "emptum_admin_secret";
  const providedKey = req.headers["x-admin-key"] || req.query.admin_key || req.body?.admin_key;

  if (!providedKey || providedKey !== adminKey) {
    res.status(401).json({
      sucesso: false,
      erro: "Acesso Negado: Chave administrativa ('x-admin-key') inválida ou ausente."
    });
    return;
  }
  next();
};

import { insertDocument, searchKnowledge } from "./src/services/ragService.js";

// Endpoint de Administração: Buscar ou testar a base de conhecimento RAG
app.get("/api/admin/docs", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || "politica");
    const resultados = await searchKnowledge(query, 10);
    res.json({
      sucesso: true,
      termo_busca: query,
      total_encontrados: resultados.length,
      documentos: resultados
    });
  } catch (error: any) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Endpoint de Administração: Inserir novo documento de conhecimento no RAG
app.post("/api/admin/docs/insert", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { titulo, conteudo, fonte } = req.body;
    if (!titulo || !conteudo) {
      res.status(400).json({ sucesso: false, erro: "Parâmetros 'titulo' e 'conteudo' são obrigatórios." });
      return;
    }
    const docId = await insertDocument(titulo, conteudo, fonte || "Manual Administrativo");
    res.json({
      sucesso: true,
      mensagem: "Documento vetorizado e inserido na base RAG com sucesso!",
      docId
    });
  } catch (error: any) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
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
