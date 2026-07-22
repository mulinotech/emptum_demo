import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, 
  Send, 
  ShieldAlert, 
  RefreshCw, 
  FileSpreadsheet, 
  UserSquare2, 
  TrendingUp, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Coins, 
  Layers, 
  ArrowLeftRight, 
  Search, 
  Package, 
  Truck 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  profileUsed?: string;
  intent?: string;
  chartUrl?: string | null;
  custoBrl?: number;
  tokensUsados?: number;
  alertaQuebra?: boolean;
  unauthorized?: boolean;
}

interface AutoCompleteData {
  produtos: Array<{ id: number; codigo: string; nome: string; categoria: string }>;
  fornecedores: Array<{ id: number; nome_fantasia: string; razao_social: string; cnpj: string }>;
}

export default function App() {
  const [profile, setProfile] = useState<"compras" | "financeiro">("compras");
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("eletromax_chat_historico");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Erro ao carregar historico do localStorage:", e);
    }
    return [
      {
        id: "initial",
        sender: "bot",
        text: "Olá! Bem-vindo ao portal **EletroMax Distribuidora**. Eu sou a Clara, sua assistente virtual e analítica.\n\nComo posso ajudar você hoje com a nossa gestão de estoque e compras? Escolha um de nossos cenários de teste abaixo ou digite sua pergunta no chat.",
        custoBrl: 0,
        tokensUsados: 0,
        alertaQuebra: false
      }
    ];
  });

  // Persist messages in localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("eletromax_chat_historico", JSON.stringify(messages));
    } catch (e) {
      console.warn("Erro ao salvar mensagens no localStorage:", e);
    }
  }, [messages]);

  const clearChatHistory = () => {
    localStorage.removeItem("eletromax_chat_historico");
    setMessages([
      {
        id: `initial-${Date.now()}`,
        sender: "bot",
        text: "Histórico de conversa reiniciado! Como posso ajudar você hoje?",
        custoBrl: 0,
        tokensUsados: 0,
        alertaQuebra: false
      }
    ]);
  };

  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"produtos" | "fornecedores">("produtos");
  const [autoComplete, setAutoComplete] = useState<AutoCompleteData>({ produtos: [], fornecedores: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPermission, setSelectedPermission] = useState<"estoque" | "giro" | "participacao_ou_margem">("participacao_ou_margem");

  // Keep selectedPermission in sync when profile changes
  useEffect(() => {
    setSelectedPermission("participacao_ou_margem");
  }, [profile]);

  // Automatically switch tabs when permission changes to guide the user
  useEffect(() => {
    if (selectedPermission === "estoque") {
      setActiveTab("fornecedores");
    } else if (selectedPermission === "giro") {
      setActiveTab("produtos");
    } else if (selectedPermission === "participacao_ou_margem") {
      if (profile === "compras") {
        setActiveTab("fornecedores");
      } else {
        setActiveTab("produtos");
      }
    }
  }, [selectedPermission, profile]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Suggested quick scenario questions matching the Demo Acceptance Criteria
  const suggestedQueries = [
    {
      label: "📋 Relatório Matinal (ABCD / Rupturas)",
      query: "Clara, gere o relatório de reposição matinal completo.",
      description: "Cruza Curva ABCD, Lead Time real, MOQ e identifica anomalias de estoque."
    },
    {
      label: "🛡️ Trava R$ 50k (Assinatura Diretoria)",
      query: "Existe algum pedido automático de Classe A que exceda a alçada de R$ 50.000,00?",
      description: "Testa a trava de segurança financeira que bloqueia compras automáticas milionárias."
    },
    {
      label: "📥 Dados no Prompt (Simulação Studio)",
      query: "Clara, gere o relatório matinal de hoje. Aqui estão os dados atuais extraídos do sistema: Item: Disjuntor Siemens 32A | Classe: B | Venda Média Mensal (últimos 24m): 150 un | Estoque Atual: 400 un. Item: Inversor WEG 10CV (Importado) | Classe: A | Venda Média Mensal (últimos 24m): 10 un | Estoque Atual: 15 un.",
      description: "Testa a extração e cálculo imediato a partir de dados colados pelo usuário no prompt."
    },
    {
      label: "⚠️ Caso Tramontina (Quebra)",
      query: "Qual o estoque e quebra da Tramontina neste mês?",
      description: "Mapeia entradas, saldo atual e dispara o alerta amarelo de quebra de estoque."
    },
    {
      label: "💰 Margem Motor 5CV (Financeiro)",
      query: "Qual a margem do motor 5CV?",
      description: "Margem financeira (restrito a Financeiro, bloqueado para Compras com teste anti-injection)."
    },
    {
      label: "🤡 Agente Coringa (Chat Livre)",
      query: "Clara, qual a melhor dica para negociar prazos? E quem ganha o Brasileirão?",
      description: "Testa a dupla personalidade: profissional no trabalho, leve em assuntos cotidianos!"
    }
  ];

  // Fetch autocomplete metadata from backend on mount
  useEffect(() => {
    fetch("/api/autocomplete")
      .then(res => res.json())
      .then((data: AutoCompleteData) => {
        setAutoComplete(data);
      })
      .catch(err => console.error("Erro ao carregar dados de autocomplete:", err));
  }, []);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      profileUsed: profile
    };

    // Prepare conversational history (up to last 8 messages)
    const historyPayload = messages.slice(-8).map(m => ({
      role: m.sender === "user" ? "user" : "model",
      text: m.text
    }));

    setMessages(prev => [...prev, userMsg]);
    setInputVal("");
    setLoading(true);

    try {
      const response = await fetch("/api/clara/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: textToSend,
          mensagem: textToSend,
          profile: profile,
          perfil: profile,
          history: historyPayload,
          historico: historyPayload
        })
      });

      const data = await response.json();

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: data.text,
        intent: data.intent,
        chartUrl: data.chartUrl,
        custoBrl: data.custoBrl,
        tokensUsados: data.tokensUsados,
        alertaQuebra: data.alertaQuebra,
        unauthorized: data.unauthorized
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Erro na consulta:", error);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: "bot",
        text: "Ocorreu um erro ao consultar o servidor da EletroMax. Verifique sua conexão e tente novamente.",
        custoBrl: 0,
        tokensUsados: 0,
        alertaQuebra: false
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to run query immediately by clicking an item or badge
  const handleQuickQuery = (queryText: string) => {
    handleSendMessage(queryText);
  };

  // Helper to parse double asterisks to bold text tags for a clean formatting feel
  const renderFormattedText = (rawText: string) => {
    if (!rawText) return "";
    
    // Split into paragraphs first
    const paragraphs = rawText.split('\n\n');
    
    return paragraphs.map((p, pIdx) => {
      // Handle lines starting with bullet points or headers
      const isHeader = p.startsWith('### ') || p.startsWith('#### ');
      const cleanParagraph = p.replace(/^#{3,4}\s+/, '');
      
      const parts = cleanParagraph.split(/\*\*([\s\S]*?)\*\*/g);
      
      return (
        <div key={pIdx} className={`mb-3 ${isHeader ? "font-bold text-slate-900 border-b border-slate-200 pb-1 mt-2 text-base" : "leading-relaxed text-slate-700 text-sm md:text-base"}`}>
          {parts.map((part, partIdx) => {
            if (partIdx % 2 === 1) {
              // Highlight special Supply Chain terms
              if (part.includes("AUTOMATICAMENTE") || part.includes("AUTOMÁTICO")) {
                return <span key={partIdx} className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-xs border border-emerald-300 mx-0.5">⚡ {part}</span>;
              }
              if (part.includes("PENDENTE DE ASSINATURA") || part.includes("ASSINATURA DA DIRETORIA")) {
                return <span key={partIdx} className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-xs border border-amber-400 mx-0.5">🛡️ {part}</span>;
              }
              if (part.includes("Classe A")) {
                return <span key={partIdx} className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-xs border border-red-200 mx-0.5">Classe A (6m)</span>;
              }
              if (part.includes("Classe B")) {
                return <span key={partIdx} className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-xs border border-blue-200 mx-0.5">Classe B (4m)</span>;
              }
              if (part.includes("MOQ")) {
                return <span key={partIdx} className="bg-indigo-100 text-indigo-800 font-medium px-1.5 py-0.5 rounded text-xs border border-indigo-200 mx-0.5">{part}</span>;
              }
              return <strong key={partIdx} className="font-bold text-slate-900">{part}</strong>;
            }
            return part;
          })}
        </div>
      );
    });
  };

  // Filter local data in helper panels
  const filteredProducts = autoComplete.produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = autoComplete.fornecedores.filter(f => 
    f.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.cnpj.includes(searchTerm)
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-800 overflow-hidden" id="eletromax-app">
      {/* HEADER SECTION */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500 rounded-lg text-slate-950 flex items-center justify-center shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">EletroMax Distribuidora</h1>
            <p className="text-xs text-slate-400">Materiais Elétricos, Automação & Iluminação • Consola Inteligente de Estoque</p>
          </div>
        </div>

        {/* PROFILE TOGGLE & RESET BUTTON */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-slate-800 p-1.5 rounded-xl border border-slate-700 shadow-inner flex-1 md:flex-none">
            <div className="text-xs text-slate-400 font-medium px-3 hidden lg:block">Perfil Ativo:</div>
            <button
              onClick={() => setProfile("compras")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                profile === "compras"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-300 hover:bg-slate-750 hover:text-white"
              }`}
            >
              <UserSquare2 className="w-4 h-4" />
              Compras
            </button>
            <button
              onClick={() => setProfile("financeiro")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                profile === "financeiro"
                  ? "bg-amber-600 text-white shadow"
                  : "text-slate-300 hover:bg-slate-750 hover:text-white"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Financeiro
            </button>
          </div>

          <button
            onClick={clearChatHistory}
            title="Resetar conversa da demonstração"
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-red-900/60 border border-slate-700 hover:border-red-700 text-slate-300 hover:text-red-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resetar Chat</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT SIDE PANEL: Catalog & Autocomplete Data */}
        <aside className="w-full h-72 md:h-full md:w-80 lg:w-96 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto md:overflow-hidden">
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className={`p-1.5 rounded-full shrink-0 ${profile === 'compras' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {profile === 'compras' ? <FileSpreadsheet className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Permissões do Perfil</div>
                <div className="text-xs font-bold text-slate-800 truncate">
                  {profile === 'compras' ? 'Suprimentos & Compras' : 'Financeiro & Controladoria'}
                </div>
                <div className="flex flex-wrap gap-1 mt-1" id="perfil-permissoes-botoes">
                  <button
                    onClick={() => setSelectedPermission("estoque")}
                    title="Ver permissão de Estoques"
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                      selectedPermission === "estoque"
                        ? profile === "compras"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    Estoques
                  </button>
                  <button
                    onClick={() => setSelectedPermission("giro")}
                    title="Ver permissão de Giro"
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                      selectedPermission === "giro"
                        ? profile === "compras"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    Giro
                  </button>
                  {profile === 'compras' ? (
                    <button
                      onClick={() => setSelectedPermission("participacao_ou_margem")}
                      title="Ver permissão de Participação CNPJs"
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                        selectedPermission === "participacao_ou_margem"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Participação CNPJs
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedPermission("participacao_ou_margem")}
                      title="Ver permissão de Margem e Custo Médio"
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                        selectedPermission === "participacao_ou_margem"
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Margem e Custo Médio
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CATALOG OF QUERY CONSTRAINTS */}
          <div className="p-3 border-b border-slate-200 shrink-0">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Catálogo de Consultas Mapeadas
            </h3>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => setSelectedPermission("estoque")}
                title="Foco em shrinkage (quebra) por fornecedor."
                className={`text-left p-1.5 rounded-lg border transition-all flex justify-between items-center cursor-pointer ${
                  selectedPermission === "estoque"
                    ? profile === "compras"
                      ? "bg-blue-50/80 border-blue-200 ring-2 ring-blue-500/15"
                      : "bg-amber-50/80 border-amber-200 ring-2 ring-amber-500/15"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className={`font-bold truncate ${selectedPermission === "estoque" ? (profile === "compras" ? "text-blue-800" : "text-amber-800") : "text-slate-700"}`}>1. Estoques</span>
                <span className="px-1 bg-slate-200 text-slate-600 rounded text-[8px] font-semibold scale-90 shrink-0 ml-1">Ambos</span>
              </button>

              <button
                onClick={() => {
                  setProfile("compras");
                  setSelectedPermission("participacao_ou_margem");
                }}
                title="Soma grupo econômico fornecedor."
                className={`text-left p-1.5 rounded-lg border transition-all flex justify-between items-center cursor-pointer ${
                  selectedPermission === "participacao_ou_margem" && profile === "compras"
                    ? "bg-blue-50/80 border-blue-200 ring-2 ring-blue-500/15"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className={`font-bold truncate ${selectedPermission === "participacao_ou_margem" && profile === "compras" ? "text-blue-800" : "text-slate-700"}`}>2. Participação</span>
                <span className="px-1 bg-blue-100 text-blue-700 rounded text-[8px] font-semibold scale-90 shrink-0 ml-1">Compr</span>
              </button>

              <button
                onClick={() => setSelectedPermission("giro")}
                title="Volume de compras mês atual vs anterior."
                className={`text-left p-1.5 rounded-lg border transition-all flex justify-between items-center cursor-pointer ${
                  selectedPermission === "giro"
                    ? profile === "compras"
                      ? "bg-blue-50/80 border-blue-200 ring-2 ring-blue-500/15"
                      : "bg-amber-50/80 border-amber-200 ring-2 ring-amber-500/15"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className={`font-bold truncate ${selectedPermission === "giro" ? (profile === "compras" ? "text-blue-800" : "text-amber-800") : "text-slate-700"}`}>3. Comparação</span>
                <span className="px-1 bg-slate-200 text-slate-600 rounded text-[8px] font-semibold scale-90 shrink-0 ml-1">Ambos</span>
              </button>

              <button
                onClick={() => {
                  setProfile("financeiro");
                  setSelectedPermission("participacao_ou_margem");
                }}
                title="Rentabilidade e custos médios."
                className={`text-left p-1.5 rounded-lg border transition-all flex justify-between items-center cursor-pointer ${
                  selectedPermission === "participacao_ou_margem" && profile === "financeiro"
                    ? "bg-amber-50/80 border-amber-200 ring-2 ring-amber-500/15"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className={`font-bold truncate ${selectedPermission === "participacao_ou_margem" && profile === "financeiro" ? "text-amber-800" : "text-slate-700"}`}>4. Margens</span>
                <span className="px-1 bg-amber-100 text-amber-700 rounded text-[8px] font-semibold scale-90 shrink-0 ml-1">Finan</span>
              </button>
            </div>
          </div>

          {/* INTERACTIVE DATA REFERENCE AUTOCOMPLETE */}
          <div className="flex-1 flex flex-col min-h-[150px] overflow-hidden">
            <div className="p-3 pb-1.5 shrink-0">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Search className="w-3 h-3" />
                Consulta de Entidades Ativas
              </h3>
              
              {/* Search input for filter */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar produtos ou fornecedores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-slate-200 text-xs">
                <button
                  onClick={() => setActiveTab("produtos")}
                  className={`flex-1 pb-2 font-semibold border-b-2 text-center transition-all ${
                    activeTab === "produtos"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Produtos (50)
                </button>
                <button
                  onClick={() => setActiveTab("fornecedores")}
                  className={`flex-1 pb-2 font-semibold border-b-2 text-center transition-all ${
                    activeTab === "fornecedores"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Fornecedores (8)
                </button>
              </div>
            </div>

            {/* List items with click-to-query helper */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {activeTab === "produtos" ? (
                <div className="space-y-1.5">
                  {filteredProducts.map(p => {
                    let queryText = `Comparação de ${p.codigo} entre 2026-06 e 2026-07`;
                    let badgeLabel = "Comparar";
                    
                    if (selectedPermission === "participacao_ou_margem" && profile === "financeiro") {
                      queryText = `Qual a margem do ${p.nome}?`;
                      badgeLabel = "Ver Margem";
                    }

                    return (
                      <div 
                        key={p.id}
                        onClick={() => handleQuickQuery(queryText)}
                        className="p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Package className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-all" />
                          <div>
                            <div className="text-xs font-semibold text-slate-700">{p.nome}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.codigo} • {p.categoria}</div>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 font-medium transition-all bg-slate-100 px-1.5 py-0.5 rounded">
                          {badgeLabel}
                        </span>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-4">Nenhum produto correspondente.</div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredSuppliers.map(f => {
                    let queryText = `Qual o estoque e quebra da ${f.nome_fantasia} neste mês?`;
                    let badgeLabel = "Ver Estoque";

                    if (selectedPermission === "participacao_ou_margem" && profile === "compras") {
                      queryText = `Qual a participação da ${f.nome_fantasia} nas compras deste mês?`;
                      badgeLabel = "Ver Participação";
                    }

                    return (
                      <div 
                        key={f.id}
                        onClick={() => handleQuickQuery(queryText)}
                        className="p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-all" />
                          <div>
                            <div className="text-xs font-semibold text-slate-700">{f.nome_fantasia}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{f.razao_social}</div>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 font-medium transition-all bg-slate-100 px-1.5 py-0.5 rounded">
                          {badgeLabel}
                        </span>
                      </div>
                    );
                  })}
                  {filteredSuppliers.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-4">Nenhum fornecedor correspondente.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN PANEL: Interactive Chat area & Scenarios */}
        <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
          
          {/* SCENARIOS / SUGGESTIONS DRAWER */}
          <div className="bg-white border-b border-slate-200 p-4 shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-1.5 mb-2.5">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cenários Prontos para Demonstração (Critérios de Aceite)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {suggestedQueries.map((item, index) => {
                // Determine if this scenario corresponds to the selected permission
                let isSelected = false;
                if (selectedPermission === "estoque" && item.label.includes("Caso Tramontina")) {
                  isSelected = true;
                } else if (selectedPermission === "giro" && item.label.includes("Comparação Disjuntor")) {
                  isSelected = true;
                } else if (selectedPermission === "participacao_ou_margem") {
                  if (profile === "compras" && item.label.includes("Participação Tramontina")) {
                    isSelected = true;
                  } else if (profile === "financeiro" && item.label.includes("Margem Motor")) {
                    isSelected = true;
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (item.label.includes("Caso Tramontina")) {
                        setSelectedPermission("estoque");
                      } else if (item.label.includes("Comparação Disjuntor")) {
                        setSelectedPermission("giro");
                      } else if (item.label.includes("Participação Tramontina") || item.label.includes("Margem Motor")) {
                        setSelectedPermission("participacao_ou_margem");
                      }

                      // Insert scenario transition visual divider
                      setMessages(prev => [
                        ...prev,
                        {
                          id: `divider-${Date.now()}`,
                          sender: "bot",
                          text: `📌 **Cenário Carregado**: ${item.label}`,
                          custoBrl: 0,
                          tokensUsados: 0,
                          alertaQuebra: false
                        }
                      ]);

                      handleSendMessage(item.query);
                    }}
                    className={`p-2 text-left border rounded-xl shadow-sm transition-all group flex flex-col justify-between h-20 cursor-pointer ${
                      isSelected
                        ? profile === "compras"
                          ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/15"
                          : "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/15"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <div className={`text-xs font-bold line-clamp-1 ${
                      isSelected 
                        ? profile === "compras" ? "text-blue-900" : "text-amber-900"
                        : "text-slate-700 group-hover:text-slate-900"
                    }`}>{item.label}</div>
                    <div className="text-[10px] text-slate-400 leading-tight line-clamp-2 mt-1">{item.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHAT HEADER WITH CONDITIONAL RESET BUTTON */}
          <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex justify-between items-center shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">CLARA - ELETROMAX AI</h3>
              <span className="text-[10px] text-slate-400 font-mono">| Orquestrador Ativo</span>
            </div>

            {messages.length > 0 && (
              <button
                onClick={clearChatHistory}
                title="Resetar demonstração e limpar histórico"
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1.5 border border-slate-200 hover:border-red-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer bg-slate-50 hover:bg-red-50"
              >
                <RefreshCw className="w-3 h-3 text-slate-400 hover:text-red-500" />
                <span className="font-semibold">🔄 Nova Conversa</span>
              </button>
            )}
          </div>

          {/* CHAT TIMELINE */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isBot = msg.sender === "bot";
                const showsWarning = msg.alertaQuebra === true;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-3xl w-full p-4 md:p-5 rounded-2xl shadow-sm border transition-all ${
                        !isBot
                          ? "bg-slate-900 text-white border-slate-800 ml-auto max-w-lg"
                          : showsWarning
                          ? "bg-yellow-50 text-slate-900 border-yellow-400 glow-warning"
                          : msg.unauthorized
                          ? "bg-red-50 text-slate-950 border-red-200"
                          : "bg-white text-slate-800 border-slate-200"
                      }`}
                    >
                      {/* Message sender tags */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            !isBot 
                              ? "bg-slate-800 text-slate-300" 
                              : showsWarning 
                              ? "bg-yellow-500 text-slate-950" 
                              : msg.unauthorized 
                              ? "bg-red-200 text-red-800" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {!isBot ? `Você (${msg.profileUsed})` : "Clara - EletroMax AI"}
                          </span>
                          
                          {isBot && msg.intent && msg.intent !== "fora_escopo" && (
                            <span className="text-[10px] text-slate-400 font-mono font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                              Consulta Mapeada: {msg.intent}
                            </span>
                          )}
                        </div>

                        {/* Cost Tag */}
                        {isBot && (msg.tokensUsados !== undefined && msg.tokensUsados > 0) && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono font-medium">
                            <Coins className="w-3 h-3 text-slate-400" />
                            <span>Custo: R$ {(msg.custoBrl ?? 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* MESSAGE TEXT CONTENT */}
                      <div className={`prose prose-sm max-w-none ${!isBot ? "text-white prose-invert" : "text-slate-800"}`}>
                        {isBot ? renderFormattedText(msg.text) : <p className="text-sm md:text-base text-white font-medium">{msg.text}</p>}
                      </div>

                      {/* INVENTARY WARNING BANNER */}
                      {isBot && showsWarning && (
                        <div className="mt-3.5 p-3 bg-yellow-100 border border-yellow-300 rounded-xl text-xs text-yellow-900 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Divergência Crítica Detectada!</span>
                            <p className="mt-0.5 text-yellow-800">Há uma quebra de estoque superior a 10% do total comprado neste mês para alguns itens. Recomenda-se realizar uma auditoria de inventário imediata nas filiais indicadas.</p>
                          </div>
                        </div>
                      )}

                      {/* ACCESS DENIED BANNER */}
                      {isBot && msg.unauthorized && (
                        <div className="mt-3.5 p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-900 flex items-start gap-2.5">
                          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Acesso Bloqueado</span>
                            <p className="mt-0.5 text-red-800">Seu perfil atual de **{profile === "compras" ? "Compras" : "Financeiro"}** não permite visualizar essa métrica restrita. Mude para o perfil **{profile === "compras" ? "Financeiro" : "Compras"}** no menu superior para autorizar a visualização.</p>
                          </div>
                        </div>
                      )}

                      {/* QUICKCHART GRAPHICS DISPLAY */}
                      {isBot && msg.chartUrl && (
                        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-inner">
                          <div className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                            Relatório Gráfico Integrado (QuickChart)
                          </div>
                          <div className="relative flex justify-center bg-white rounded-lg p-2 overflow-hidden border border-slate-100 min-h-[180px]">
                            <img
                              src={msg.chartUrl}
                              alt="Gráfico de dados EletroMax"
                              className="max-h-72 w-auto object-contain rounded transition-all"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      )}

                      {/* FOOTER METADATA */}
                      {isBot && msg.tokensUsados !== undefined && msg.tokensUsados > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-150 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <div>EletroMax Engine v2.5-flash</div>
                          <div>Tokens consumidos: {msg.tokensUsados}</div>
                        </div>
                      )}

                    </div>
                  </motion.div>
                );
              })}

              {/* LOADING INDICATOR CHAT BUBBLE */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl max-w-md shadow-sm flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">Processando intenção e consultando EletroMax DB...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>

          {/* CHAT INPUT FORM */}
          <div className="bg-white border-t border-slate-200 p-4 shadow-md shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputVal);
              }}
              className="max-w-4xl mx-auto flex gap-3"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={
                  profile === "compras"
                    ? "Pergunte sobre estoque, quebra ou participações (ex: 'Estoque da Tramontina')"
                    : "Pergunte sobre estoque, quebras, períodos ou margens (ex: 'Margem do item LED20')"
                }
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || loading}
                className={`px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold tracking-wide shadow-md transition-all ${
                  !inputVal.trim() || loading
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200"
                    : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                }`}
              >
                <span>Enviar</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-[10px] text-center text-slate-400 mt-2">
              Assistente inteligente EletroMax. Consultas ao banco de dados fictício são simuladas localmente com persistência em tempo de execução.
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
