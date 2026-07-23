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
  Search, 
  Package, 
  Truck,
  Bot,
  Activity,
  Layers,
  Cpu,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles,
  ChevronRight,
  Terminal,
  Clock,
  LayoutDashboard,
  MessageSquareCode,
  Sun,
  Moon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from "recharts";

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
  const [themeMode, setThemeMode] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("emptum_theme") as "dark" | "light") || "dark";
  });
  
  const [salesData, setSalesData] = useState<any[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [activeScopeInfo, setActiveScopeInfo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vendas")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSalesData(data);
      })
      .catch(e => console.error("Erro ao carregar vendas:", e));
  }, []);

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
        text: "Bem-vindo ao **CONSOLE DE GERENCIAMENTO EMPTUM ORQUESTRADOR**.\n\nO bot operacional está ativo e sincronizado com o **Google Workspace Chat (Inpyx Workspace)** para os colaboradores de Compras e Financeiro.\n\nVocê está no **Painel Executivo de Controle de Suprimentos**. Selecione um cenário de validação abaixo para testar as regras de orçamento, travas de R$ 50k ou inteligência de quebra de estoque.",
        custoBrl: 0,
        tokensUsados: 0,
        alertaQuebra: false
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("eletromax_chat_historico", JSON.stringify(messages));
    } catch (e) {
      console.warn("Erro ao salvar mensagens no localStorage:", e);
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("emptum_theme", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => (prev === "dark" ? "light" : "dark"));
  };

  const clearChatHistory = () => {
    localStorage.removeItem("eletromax_chat_historico");
    setMessages([
      {
        id: `initial-${Date.now()}`,
        sender: "bot",
        text: "Log de auditoria e simulador reiniciados com sucesso.",
        custoBrl: 0,
        tokensUsados: 0,
        alertaQuebra: false
      }
    ]);
  };

  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"produtos" | "fornecedores">("produtos");
  const [autoComplete, setAutoComplete] = useState<AutoCompleteData>({
    produtos: [
      { id: 1, codigo: 'CAB-001', nome: 'Cabo Flexível 10mm² 100m', categoria: 'Cabos' },
      { id: 2, codigo: 'CAB-002', nome: 'Cabo PP 6mm² 100m', categoria: 'Cabos' },
      { id: 3, codigo: 'CAB-003', nome: 'Cabo SPT 2x18 AWG', categoria: 'Cabos' },
      { id: 4, codigo: 'DIS-001', nome: 'Disjuntor Termomagnético 16A Unipolar', categoria: 'Proteção' },
      { id: 5, codigo: 'DIS-002', nome: 'Disjuntor Termomagnético 32A Bipolar', categoria: 'Proteção' },
      { id: 6, codigo: 'DIS-003', nome: 'Disjuntor Motor 10A', categoria: 'Proteção' },
      { id: 7, codigo: 'INT-001', nome: 'Interruptor 3 Pólos 20A', categoria: 'Dispositivos' },
      { id: 8, codigo: 'INT-002', nome: 'Interruptor Horário Digital', categoria: 'Dispositivos' },
      { id: 9, codigo: 'INT-003', nome: 'Contator 9A 220V', categoria: 'Dispositivos' },
      { id: 10, codigo: 'LED-001', nome: 'Lâmpada LED Bulbo 20W E27', categoria: 'Iluminação' },
      { id: 11, codigo: 'LED-002', nome: 'Lâmpada LED Tubular T8 18W', categoria: 'Iluminação' },
      { id: 12, codigo: 'LED-003', nome: 'Refletor LED 50W 220V', categoria: 'Iluminação' },
      { id: 13, codigo: 'DRV-001', nome: 'Driver LED 12W 350mA', categoria: 'Iluminação' },
      { id: 14, codigo: 'QDR-001', nome: 'Quadro de Distribuição 12 Modulos', categoria: 'Quadros' },
      { id: 15, codigo: 'QDR-002', nome: 'Quadro de Distribuição 24 Modulos', categoria: 'Quadros' },
      { id: 16, codigo: 'BAR-001', nome: 'Barramento Condutor 63A', categoria: 'Quadros' },
      { id: 17, codigo: 'FUS-001', nome: 'Fusível NH 100A', categoria: 'Proteção' },
      { id: 18, codigo: 'FUS-002', nome: 'Fusível DIAZED 25A', categoria: 'Proteção' },
      { id: 19, codigo: 'REL-001', nome: 'Relé Térmico 15-25A', categoria: 'Dispositivos' },
      { id: 20, codigo: 'REL-002', nome: 'Relé de Estado Sólido 40A', categoria: 'Dispositivos' },
      { id: 21, codigo: 'TOM-001', nome: 'Tomada 2P+T 10A Branca', categoria: 'Dispositivos' },
      { id: 22, codigo: 'TOM-002', nome: 'Tomada 2P+T 20A Vermelha', categoria: 'Dispositivos' },
      { id: 23, codigo: 'MOT-001', nome: 'Motor Elétrico 1.5CV Monofásico', categoria: 'Motores' },
      { id: 24, codigo: 'MOT-002', nome: 'Motor Elétrico 5CV Trifásico', categoria: 'Motores' },
      { id: 25, codigo: 'MOT-003', nome: 'Motor Elétrico 10CV Trifásico', categoria: 'Motores' },
      { id: 26, codigo: 'SEN-001', nome: 'Sensor Fotovoltaico 40A', categoria: 'Automação' },
      { id: 27, codigo: 'SEN-002', nome: 'Sensor de Proximidade Indutivo', categoria: 'Automação' },
      { id: 28, codigo: 'CLP-001', nome: 'CLP Logo 230RC', categoria: 'Automação' },
      { id: 29, codigo: 'CLP-002', nome: 'CLP S7-1200 1214C', categoria: 'Automação' },
      { id: 30, codigo: 'FON-001', nome: 'Fonte Chaveada 24V 5A', categoria: 'Automação' },
      { id: 31, codigo: 'FON-002', nome: 'Fonte Chaveada 12V 10A', categoria: 'Automação' },
      { id: 32, codigo: 'TRF-001', nome: 'Transformador 110/220V 1000VA', categoria: 'Transformadores' },
      { id: 33, codigo: 'TRF-002', nome: 'Transformador 220/24V 200VA', categoria: 'Transformadores' },
      { id: 34, codigo: 'PAR-001', nome: 'Pára-raios 75kA 220V', categoria: 'Proteção' },
      { id: 35, codigo: 'PAR-002', nome: 'Pára-raios 25kA 380V', categoria: 'Proteção' },
      { id: 36, codigo: 'ELE-001', nome: 'Eletroduto Flexível 1/2" 50m', categoria: 'Eletrodutos' },
      { id: 37, codigo: 'ELE-002', nome: 'Eletroduto Rígido 3/4" 3m', categoria: 'Eletrodutos' },
      { id: 38, codigo: 'CON-001', nome: 'Conector Wago 221-412', categoria: 'Conectores' },
      { id: 39, codigo: 'CON-002', nome: 'Conector Wago 221-415', categoria: 'Conectores' },
      { id: 40, codigo: 'CON-003', nome: 'Terminal de Força 25mm²', categoria: 'Conectores' },
      { id: 41, codigo: 'ALU-001', nome: 'Alumínio Eletrolítico 1mm 1m²', categoria: 'Matéria Prima' },
      { id: 42, codigo: 'IS-001', nome: 'Isolador Média Tensão', categoria: 'Isoladores' },
      { id: 43, codigo: 'IS-002', nome: 'Isolador Baixa Tensão', categoria: 'Isoladores' },
      { id: 44, codigo: 'BAT-001', nome: 'Bateria Estacionária 100Ah 12V', categoria: 'Baterias' },
      { id: 45, codigo: 'BAT-002', nome: 'Bateria Selada 7Ah 12V', categoria: 'Baterias' },
      { id: 46, codigo: 'FIL-001', nome: 'Filtro de Linha 10A 8 Tomadas', categoria: 'Dispositivos' },
      { id: 47, codigo: 'DIM-001', nome: 'Dimmer 500W 220V', categoria: 'Dispositivos' },
      { id: 48, codigo: 'SIR-001', nome: 'Sirene Eletrônica 110dB', categoria: 'Sinalização' },
      { id: 49, codigo: 'SIR-002', nome: 'Sirene Rotativa 12V', categoria: 'Sinalização' },
      { id: 50, codigo: 'EST-001', nome: 'Estabilizador 500VA', categoria: 'Estabilizadores' }
    ],
    fornecedores: [
      { id: 1, nome_fantasia: 'Tramontina SP', razao_social: 'Tramontina Comercial Ltda SP', cnpj: '01.234.567/0001-10' },
      { id: 2, nome_fantasia: 'Tramontina RS', razao_social: 'Tramontina Comercial Ltda RS', cnpj: '01.234.567/0002-91' },
      { id: 3, nome_fantasia: 'Siemens Infraestrutura', razao_social: 'Siemens Infraestrutura Ltda', cnpj: '02.345.678/0001-20' },
      { id: 4, nome_fantasia: 'Siemens Equipamentos', razao_social: 'Siemens Equipamentos do Brasil', cnpj: '02.345.678/0002-02' },
      { id: 5, nome_fantasia: 'WEG Motores', razao_social: 'WEG Motores S/A', cnpj: '03.456.789/0001-30' },
      { id: 6, nome_fantasia: 'WEG Automação', razao_social: 'WEG Automação e Sistemas S/A', cnpj: '03.456.789/0002-13' },
      { id: 7, nome_fantasia: 'Schneider Matriz', razao_social: 'Schneider Electric Brasil Ltda SP', cnpj: '04.567.890/0001-40' },
      { id: 8, nome_fantasia: 'Schneider Filial', razao_social: 'Schneider Electric Brasil Ltda RJ', cnpj: '04.567.890/0002-24' },
      { id: 9, nome_fantasia: 'Legrand São Paulo', razao_social: 'Legrand Comercial Ltda', cnpj: '05.678.901/0001-50' },
      { id: 10, nome_fantasia: 'Legrand Rio', razao_social: 'Legrand Distribuição Ltda', cnpj: '05.678.901/0002-35' }
    ]
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPermission, setSelectedPermission] = useState<"estoque" | "giro" | "participacao_ou_margem">("participacao_ou_margem");
  const [activeView, setActiveView] = useState<"dashboard" | "simulator" | "dev">("dashboard");

  useEffect(() => {
    setSelectedPermission("participacao_ou_margem");
  }, [profile]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestedQueries = [
    {
      label: "📋 Relatório Matinal (ABCD / Rupturas)",
      query: "Clara, gere o relatório de reposição matinal completo.",
      description: "Cruza Curva ABCD, Lead Time real, MOQ e identifica anomalias de estoque.",
      badge: "Crucial"
    },
    {
      label: "🛡️ Trava R$ 50k (Assinatura Diretoria)",
      query: "Existe algum pedido automático de Classe A que exceda a alçada de R$ 50.000,00?",
      description: "Testa a trava de segurança financeira que bloqueia compras automáticas milionárias.",
      badge: "Segurança"
    },
    {
      label: "📥 Dados no Prompt (Simulação Studio)",
      query: "Clara, gere o relatório matinal de hoje. Aqui estão os dados atuais extraídos do sistema: Item: Disjuntor Siemens 32A | Classe: B | Venda Média Mensal (últimos 24m): 150 un | Estoque Atual: 400 un. Item: Inversor WEG 10CV (Importado) | Classe: A | Venda Média Mensal (últimos 24m): 10 un | Estoque Atual: 15 un.",
      description: "Testa a extração e cálculo imediato a partir de dados colados pelo usuário no prompt.",
      badge: "Prompt Studio"
    },
    {
      label: "⚠️ Caso Tramontina (Quebra)",
      query: "Qual o estoque e quebra da Tramontina neste mês?",
      description: "Mapeia entradas, saldo atual e dispara o alerta amarelo de quebra de estoque.",
      badge: "Alerta Estoque"
    },
    {
      label: "💰 Margem Motor 5CV (Financeiro)",
      query: "Qual a margem do motor 5CV?",
      description: "Margem financeira (restrito a Financeiro, bloqueado para Compras com teste anti-injection).",
      badge: "Perfil Restrito"
    },
    {
      label: "🤡 Agente Coringa (Chat Livre)",
      query: "Clara, qual a melhor dica para negociar prazos? E quem ganha o Brasileirão?",
      description: "Testa a dupla personalidade: profissional no trabalho, leve em assuntos cotidianos!",
      badge: "Empatia/Humor"
    }
  ];

  useEffect(() => {
    fetch("/api/autocomplete")
      .then(res => res.json())
      .then((data: AutoCompleteData) => {
        if (data.produtos?.length > 0 || data.fornecedores?.length > 0) {
          setAutoComplete(data);
        }
      })
      .catch(err => console.warn("API autocomplete offline, usando dados embutidos:", err));
  }, []);

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

    const historyPayload = messages.slice(-8).map(m => ({
      role: m.sender === "user" ? "user" : "model",
      text: m.text
    }));

    setMessages(prev => [...prev, userMsg]);
    setInputVal("");
    setLoading(true);

    // Aumentamos o Timeout de 15 segundos para 60 segundos!
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      // ⚠️ ATENÇÃO: Verifique se a rota no seu backend (Express) é /api/clara/chat mesmo!
      const response = await fetch("/api/clara/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          question: textToSend,
          mensagem: textToSend,
          profile: profile,
          perfil: profile,
          history: historyPayload,
          historico: historyPayload
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`O Servidor backend falhou com status ${response.status}`);
      }

      const data = await response.json();

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: data.text || data.reply || "Resposta processada.", // Garante que pega .text ou .reply
        intent: data.intent || "ia_dinamica",
        chartUrl: data.chartUrl,
        custoBrl: data.custoBrl || 0.02,
        tokensUsados: data.tokensUsados || 450,
        alertaQuebra: data.alertaQuebra,
        unauthorized: data.unauthorized
      };

      setMessages(prev => [...prev, botMsg]);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("⚠️ ERRO REAL CAPTURADO (Sem maquiagem):", error);

      // CÓDIGO LIMPO: Se der erro no servidor ou demorar, a Clara vai confessar o erro de TI, 
      // em vez de soltar o texto de Lead Time / Curva ABCD.
      const botMsg: Message = {
        id: `bot-error-${Date.now()}`,
        sender: "bot",
        text: `**Erro de Comunicação Backend:** A requisição demorou muito ou o servidor (app.cjs) retornou um erro. Abra o 'Inspect' (F12) > aba 'Console' ou 'Network' para ver o motivo da falha.\nDetalhe: ${error.message}`,
        intent: "erro_de_ti",
        chartUrl: null,
        custoBrl: 0,
        tokensUsados: 0,
        alertaQuebra: false
      };

      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuery = (queryText: string) => {
    setActiveView("simulator");
    handleSendMessage(queryText);
  };

  const renderFormattedText = (rawText: string) => {
    if (!rawText) return "";
    const paragraphs = rawText.split('\n\n');
    
    const isDark = themeMode === "dark";

    return paragraphs.map((p, pIdx) => {
      const isHeader = p.startsWith('### ') || p.startsWith('#### ');
      const cleanParagraph = p.replace(/^#{3,4}\s+/, '');
      const parts = cleanParagraph.split(/\*\*([\s\S]*?)\*\*/g);
      
      return (
        <div key={pIdx} className={`mb-3 ${isHeader ? (isDark ? "font-bold text-slate-100 border-b border-slate-700/60 pb-1.5 mt-3 text-sm md:text-base tracking-wide" : "font-bold text-slate-900 border-b border-slate-200 pb-1.5 mt-3 text-sm md:text-base tracking-wide") : (isDark ? "leading-relaxed text-slate-300 text-xs md:text-sm" : "leading-relaxed text-slate-700 text-xs md:text-sm")}`}>
          {parts.map((part, partIdx) => {
            if (partIdx % 2 === 1) {
              if (part.includes("AUTOMATICAMENTE") || part.includes("AUTOMÁTICO")) {
                return <span key={partIdx} className={isDark ? "bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded text-xs border border-emerald-500/30 mx-0.5" : "bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded text-xs border border-emerald-300 mx-0.5"}>⚡ {part}</span>;
              }
              if (part.includes("PENDENTE DE ASSINATURA") || part.includes("ASSINATURA DA DIRETORIA")) {
                return <span key={partIdx} className={isDark ? "bg-amber-500/10 text-amber-400 font-semibold px-2 py-0.5 rounded text-xs border border-amber-500/30 mx-0.5" : "bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded text-xs border border-amber-300 mx-0.5"}>🛡️ {part}</span>;
              }
              if (part.includes("Classe A")) {
                return <span key={partIdx} className={isDark ? "bg-rose-500/10 text-rose-400 font-semibold px-2 py-0.5 rounded text-xs border border-rose-500/30 mx-0.5" : "bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded text-xs border border-rose-300 mx-0.5"}>Classe A (6m)</span>;
              }
              if (part.includes("Classe B")) {
                return <span key={partIdx} className={isDark ? "bg-sky-500/10 text-sky-400 font-semibold px-2 py-0.5 rounded text-xs border border-sky-500/30 mx-0.5" : "bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded text-xs border border-sky-300 mx-0.5"}>Classe B (4m)</span>;
              }
              return <strong key={partIdx} className={isDark ? "font-semibold text-slate-100" : "font-semibold text-slate-900"}>{part}</strong>;
            }
            return part;
          })}
        </div>
      );
    });
  };

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

  const totalTokens = messages.reduce((acc, m) => acc + (m.tokensUsados || 0), 0);
  const totalCusto = messages.reduce((acc, m) => acc + (m.custoBrl || 0), 0);
  const totalAlertas = messages.filter(m => m.alertaQuebra).length;

  const isDark = themeMode === "dark";

  return (
    <div className={`h-screen flex flex-col font-sans transition-colors duration-200 overflow-hidden ${isDark ? "bg-[#0b0f17] text-slate-200" : "bg-slate-100 text-slate-800"}`} id="eletromax-app">
      
      {/* EXECUTIVE TOP HEADER */}
      <header className={`px-6 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-lg border-b transition-colors ${
        isDark ? "bg-[#0f172a]/90 backdrop-blur-md text-white border-slate-800/80" : "bg-white text-slate-900 border-slate-200"
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-xl text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
            <Building2 className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className={`text-base md:text-lg font-bold tracking-tight font-sans ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                Emptum Orquestrador
              </h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isDark ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}>
                SupplyChain Control Tower
              </span>
            </div>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              EletroMax Distribuidora • Inteligência em Suprimentos, Curva ABCD & Orquestração
            </p>
          </div>
        </div>

        {/* GOOGLE WORKSPACE CONNECTION BADGE, THEME TOGGLE & PROFILE SWITCHER */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          
          {/* Workspace Integration Status */}
          <div className={`hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs shadow-inner ${
            isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className={`font-medium text-[11px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>Google Workspace (Inpyx)</span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">Ativo</span>
          </div>

          {/* Theme Toggle Button (Light/Dark Mode) */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Alternar para Tema Claro (Light)" : "Alternar para Tema Escuro (Dark)"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              isDark 
                ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-400" 
                : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
            }`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span className="hidden md:inline">{isDark ? "Claro" : "Escuro"}</span>
          </button>

          {/* View Switcher: Dashboard vs Simulator */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-100 border-slate-200"
          }`}>
            <button
              onClick={() => setActiveView("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeView === "dashboard"
                  ? isDark 
                    ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/50"
                    : "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Painel Executivo
            </button>
            <button
              onClick={() => setActiveView("simulator")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeView === "simulator"
                  ? isDark 
                    ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/50"
                    : "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <MessageSquareCode className="w-3.5 h-3.5" />
              Console Auditoria
            </button>
            <button
              onClick={() => setActiveView("dev")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeView === "dev"
                  ? isDark 
                    ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/50"
                    : "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Console Técnico
            </button>
          </div>

          {/* Profile Switcher */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-100 border-slate-200"
          }`}>
            <button
              onClick={() => setProfile("compras")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                profile === "compras"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserSquare2 className="w-3.5 h-3.5" />
              Compras
            </button>
            <button
              onClick={() => setProfile("financeiro")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                profile === "financeiro"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Financeiro
            </button>
          </div>

          <button
            onClick={clearChatHistory}
            title="Resetar historico de testes"
            className={`p-2 rounded-xl transition-all cursor-pointer border ${
              isDark 
                ? "bg-slate-900 hover:bg-rose-950/40 border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-300"
                : "bg-slate-100 hover:bg-rose-50 border-slate-300 hover:border-rose-200 text-slate-600 hover:text-rose-700"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT CONTROL SIDEBAR (Catalog & Permissions) */}
        <aside className={`w-80 lg:w-88 border-r flex flex-col shrink-0 overflow-y-auto ${
          isDark ? "bg-[#0d1322] border-slate-800/80" : "bg-white border-slate-200"
        }`}>
          
          {/* PROFILE SCOPE CARD */}
          <div className={`p-4 border-b ${isDark ? "border-slate-800/80" : "border-slate-200"}`}>
            <div className={`p-3.5 rounded-xl border shadow-inner ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Escopo de Segurança</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${profile === 'compras' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30' : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'}`}>
                  {profile === 'compras' ? 'Nível 2 (Operacional)' : 'Nível 1 (Diretoria)'}
                </span>
              </div>
              <div className={`text-sm font-bold mb-1 flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {profile === 'compras' ? <FileSpreadsheet className="w-4 h-4 text-blue-500" /> : <TrendingUp className="w-4 h-4 text-amber-500" />}
                {profile === 'compras' ? 'Suprimentos & Compras' : 'Financeiro & Controladoria'}
              </div>
              <p className={`text-xs leading-relaxed mb-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {profile === 'compras' 
                  ? 'Acesso a relatórios de reposição, estoques, curva ABCD e cálculo de quebras de fornecedores.'
                  : 'Acesso total a margens financeiras, custo médio de produto, travas de alçada e auditoria.'}
              </p>

              {/* Permission Buttons */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setSelectedPermission("estoque")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-between ${
                    selectedPermission === "estoque" 
                      ? isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900 shadow-sm"
                      : isDark ? "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>1. Estoque & Entradas</span>
                  <span className="text-[10px] text-slate-400">Ambos</span>
                </button>
                <button
                  onClick={() => setSelectedPermission("giro")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-between ${
                    selectedPermission === "giro" 
                      ? isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900 shadow-sm"
                      : isDark ? "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>2. Giro & Curva ABCD</span>
                  <span className="text-[10px] text-slate-400">Ambos</span>
                </button>
                <button
                  onClick={() => setSelectedPermission("participacao_ou_margem")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-between ${
                    selectedPermission === "participacao_ou_margem" 
                      ? isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900 shadow-sm"
                      : isDark ? "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{profile === 'compras' ? '3. Participação CNPJs' : '3. Margem Financeira'}</span>
                  <span className={`text-[10px] font-bold ${profile === 'compras' ? 'text-blue-500' : 'text-amber-500'}`}>
                    {profile === 'compras' ? 'Compras' : 'Restrito'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* INTEGRATION INFO BOX: GOOGLE WORKSPACE */}
          <div className={`p-4 border-b ${isDark ? "border-slate-800/80" : "border-slate-200"}`}>
            <div className={`p-3 rounded-xl border text-xs ${
              isDark ? "bg-blue-950/20 border-blue-800/40" : "bg-blue-50/80 border-blue-200"
            }`}>
              <div className={`flex items-center gap-2 font-semibold mb-1 ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                <Bot className="w-4 h-4 text-blue-500" />
                Google Workspace Bot Active
              </div>
              <p className={`text-[11px] leading-relaxed mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Os compradores interagem com a Clara digitando <code className={`px-1 py-0.5 rounded font-mono ${isDark ? "text-blue-300 bg-blue-900/40" : "text-blue-900 bg-blue-100"}`}>@Clara</code> diretamente nos canais do Google Chat da Inpyx.
              </p>
              <div className={`flex items-center justify-between text-[10px] pt-1 border-t ${isDark ? "text-slate-400 border-blue-900/30" : "text-slate-600 border-blue-200"}`}>
                <span>Webhook Inpyx:</span>
                <span className="text-emerald-500 font-mono font-semibold">Conectado</span>
              </div>
            </div>
          </div>

          {/* SEARCH & DATABASE QUICK LOOKUP */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Base de Dados Fictícia</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("produtos")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    activeTab === "produtos" 
                      ? isDark ? "bg-slate-800 text-slate-100" : "bg-slate-200 text-slate-900 font-bold"
                      : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Produtos ({autoComplete.produtos.length})
                </button>
                <button
                  onClick={() => setActiveTab("fornecedores")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    activeTab === "fornecedores" 
                      ? isDark ? "bg-slate-800 text-slate-100" : "bg-slate-200 text-slate-900 font-bold"
                      : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Fornecedores ({autoComplete.fornecedores.length})
                </button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder={`Filtrar ${activeTab}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none ${
                  isDark 
                    ? "bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-slate-700"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-400"
                }`}
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 text-xs space-y-1.5 max-h-60 lg:max-h-none">
              {(activeView === "dev" || searchTerm.length > 0) ? (
                activeTab === "produtos" ? (
                  filteredProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleQuickQuery(`Qual o estoque e giro do item ${p.nome}?`)}
                      className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                        isDark 
                          ? "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/60" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className={`font-medium truncate ${isDark ? "text-slate-300 group-hover:text-slate-100" : "text-slate-700 group-hover:text-slate-900"}`}>{p.nome}</div>
                        <div className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>{p.codigo} • {p.categoria}</div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 ${isDark ? "text-slate-600 group-hover:text-slate-400" : "text-slate-400 group-hover:text-slate-600"}`} />
                    </div>
                  ))
                ) : (
                  filteredSuppliers.map(f => (
                    <div
                      key={f.id}
                      onClick={() => handleQuickQuery(`Qual o estoque e quebra da ${f.nome_fantasia} neste mês?`)}
                      className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                        isDark 
                          ? "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/60" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className={`font-medium truncate ${isDark ? "text-slate-300 group-hover:text-slate-100" : "text-slate-700 group-hover:text-slate-900"}`}>{f.nome_fantasia}</div>
                        <div className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>CNPJ: {f.cnpj}</div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 ${isDark ? "text-slate-600 group-hover:text-slate-400" : "text-slate-400 group-hover:text-slate-600"}`} />
                    </div>
                  ))
                )
              ) : (
                <div className={`p-4 text-center border-dashed border-2 rounded-xl mt-4 ${isDark ? "border-slate-800 text-slate-500" : "border-slate-300 text-slate-400"}`}>
                  <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p>Digite para buscar itens ou acesse a aba Console Técnico para ver a base completa.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT PANEL (Dashboard OR Simulator Console) */}
        <main className={`flex-1 flex flex-col overflow-hidden ${isDark ? "bg-[#0b0f17]" : "bg-slate-50"}`}>
          
          {activeView === "dashboard" ? (
            /* EXECUTIVE CONTROL DASHBOARD VIEW */
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {/* WELCOME BANNER & GOOGLE WORKSPACE STATUS */}
              <div className={`p-6 rounded-2xl border relative overflow-hidden shadow-xl ${
                isDark 
                  ? "bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border-slate-800" 
                  : "bg-gradient-to-r from-white via-slate-50 to-blue-50 border-slate-200"
              }`}>
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none"></div>
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Painel de Controle de Inteligência</span>
                  </div>
                  <h2 className={`text-xl md:text-2xl font-bold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    CONSOLE DE GERENCIAMENTO EMPTUM ORQUESTRADOR
                  </h2>
                  <p className={`text-sm leading-relaxed mb-4 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Este painel é utilizado pela diretoria para monitorar regras de suprimentos, travas de alçada financeira (R$ 50k) e consultar relatórios matinais. A equipe operacional interage diretamente através do **Google Workspace Chat**.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveView("simulator")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Terminal className="w-4 h-4" />
                      Abrir Console de Simulação
                    </button>
                    <button
                      onClick={() => handleQuickQuery("Clara, gere o relatório de reposição matinal completo.")}
                      className={`px-4 py-2 border font-semibold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                        isDark 
                          ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200" 
                          : "bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-amber-500" />
                      Rodar Relatório Matinal
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTIVE SCOPE INFO (INTERATIVO DA SIDEBAR) */}
              <AnimatePresence>
                {selectedPermission && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className={`p-5 rounded-2xl border shadow-sm ${
                      isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        selectedPermission === "estoque" ? "bg-blue-500/10 text-blue-500" :
                        selectedPermission === "giro" ? "bg-emerald-500/10 text-emerald-500" :
                        "bg-amber-500/10 text-amber-500"
                      }`}>
                        {selectedPermission === "estoque" && <Package className="w-5 h-5" />}
                        {selectedPermission === "giro" && <Activity className="w-5 h-5" />}
                        {selectedPermission === "participacao_ou_margem" && <DollarSign className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold mb-1 ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                          {selectedPermission === "estoque" && "Escopo 1: Estoque & Entradas (Visão Geral)"}
                          {selectedPermission === "giro" && "Escopo 2: Giro & Curva ABCD (Inteligência Analítica)"}
                          {selectedPermission === "participacao_ou_margem" && (profile === "compras" ? "Escopo 3: Participação CNPJs" : "Escopo 3: Margem Financeira (Restrito)")}
                        </h4>
                        <p className={`text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                          {selectedPermission === "estoque" && "Neste escopo, as regras de negócio focam em reposição de emergência (Shrinkage). A Clara monitora diariamente as entradas contra o saldo em estoque, alertando caso a discrepância supere o baseline (ex: Grupo Tramontina atual)."}
                          {selectedPermission === "giro" && "Módulo de otimização de compras. O Orquestrador avalia o Lead Time de fornecedores em comparação com o giro (run-rate) dos produtos Classe A, automatizando os pedidos de reposição para itens críticos antes que a ruptura ocorra."}
                          {selectedPermission === "participacao_ou_margem" && profile === "compras" && "Monitora a concentração de compras por fornecedor para mitigar riscos de dependência (Lock-in) na cadeia de suprimentos."}
                          {selectedPermission === "participacao_ou_margem" && profile === "financeiro" && "Acesso Exclusivo! Permite auditar custos médios, rentabilidade bruta, margem líquida e aplicar ou revogar travas financeiras (como o limite de 50k para compras autônomas) nos SKUs premium."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* HISTÓRICO DE VENDAS DASHBOARD */}
              <div className={`p-6 rounded-2xl border shadow-xl relative overflow-hidden ${
                isDark ? "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800" : "bg-gradient-to-br from-white to-slate-50 border-slate-200"
              }`}>
                <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      <BarChart3 className="w-5 h-5 text-emerald-500" />
                      Histórico Gerencial de Vendas
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Análise de Receita (R$) vs Volume de Vendas nos últimos 6 meses (Produtos Curva A)
                    </p>
                  </div>
                </div>

                <div className="h-[300px] w-full">
                  {salesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={salesData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                        <XAxis dataKey="mes_formatado" stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={12} tickMargin={10} />
                        <YAxis yAxisId="left" stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={12} tickFormatter={(value) => `R$ ${Math.floor(value / 1000)}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#fff", borderColor: isDark ? "#1e293b" : "#e2e8f0", borderRadius: '8px' }}
                          formatter={(value: any, name: string) => [
                            name === "Receita" ? `R$ ${Number(value).toLocaleString()}` : `${value} un`, 
                            name
                          ]}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar yAxisId="left" dataKey="receita_total" name="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        <Line yAxisId="right" type="monotone" dataKey="volume_total" name="Volume (un)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* DEMO SCENARIOS CARDS GRID */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-900"}`}>Cenários de Validação (Critérios de Aceite)</h3>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Clique em qualquer um dos cenários para executar o teste no orquestrador</p>
                  </div>
                  <span className={`text-xs font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>6 Cenários Mapeados</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestedQueries.map((scenario, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleQuickQuery(scenario.query)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all group flex flex-col justify-between shadow-md ${
                        isDark 
                          ? "bg-gradient-to-br from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border-slate-800/90 hover:border-slate-700" 
                          : "bg-gradient-to-br from-white to-slate-50 hover:to-slate-100 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold transition-colors ${
                            isDark ? "text-slate-100 group-hover:text-amber-400" : "text-slate-900 group-hover:text-blue-600"
                          }`}>
                            {scenario.label}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            isDark ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {scenario.badge}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed mb-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                          {scenario.description}
                        </p>
                      </div>

                      <div className={`pt-3 border-t ${isDark ? "border-slate-800/60" : "border-slate-200"}`}>
                        <button className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                          isDark 
                            ? "border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500" 
                            : "border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
                        }`}>
                          Executar Cenário
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AGENT RULES & ARCHITECTURE OVERVIEW */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                
                {/* Rules Card */}
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                  <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    Regras de Negócio & Travas Ativas
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                      <div className={`font-semibold mb-1 ${isDark ? "text-slate-200" : "text-slate-900"}`}>Trava Financeira R$ 50.000,00</div>
                      <p className={isDark ? "text-slate-400" : "text-slate-600"}>Pedidos de compra automáticos de produtos Classe A que excedam R$ 50k são bloqueados e colocados como PENDENTE DE ASSINATURA DA DIRETORIA.</p>
                    </div>

                    <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                      <div className={`font-semibold mb-1 ${isDark ? "text-slate-200" : "text-slate-900"}`}>Cálculo de Quebra por Fornecedor (Shrinkage)</div>
                      <p className={isDark ? "text-slate-400" : "text-slate-600"}>O saldo atual é confrontado com as entradas do mês. Caso a diferença supere o limite padrão, dispara o alerta amarelo automático.</p>
                    </div>

                    <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                      <div className={`font-semibold mb-1 ${isDark ? "text-slate-200" : "text-slate-900"}`}>Segurança de Escopo (Anti-Injection)</div>
                      <p className={isDark ? "text-slate-400" : "text-slate-600"}>Perguntas sobre margem financeira do perfil Compras são bloqueadas pelo servidor com aviso de permissão negada.</p>
                    </div>
                  </div>
                </div>

                {/* Status Cards (Moved from top) */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                  <div>
                    <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                      <Activity className="w-4 h-4 text-emerald-500" />
                      Status Operacional
                    </h4>
                    <div className={`space-y-3 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500"/> Orquestrador:</div>
                        <span className="font-semibold text-emerald-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online
                        </span>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500"/> Regra Ativa:</div>
                        <span className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>Trava R$ 50k</span>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500"/> Alertas Mapeados:</div>
                        <button 
                          onClick={() => setIsAlertModalOpen(true)}
                          className="font-semibold text-amber-500 hover:text-amber-400 transition-colors underline decoration-amber-500/30 underline-offset-4"
                        >
                          {totalAlertas > 0 ? `${totalAlertas} Alerta(s)` : "Tramontina"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={`pt-4 mt-2 border-t flex items-center justify-between text-[11px] font-mono ${isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                    <span>Tokens: {totalTokens.toLocaleString()}</span>
                    <span className="text-emerald-500">R$ {totalCusto.toFixed(4)}</span>
                  </div>
                </div>

              </div>

            </div>
          ) : activeView === "dev" ? (
            /* DEV CONSOLE VIEW */
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-6 h-6 text-blue-500" />
                <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Console Técnico (Dev/Debug)</h2>
              </div>
              
              <div className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"} max-w-2xl`}>
                <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                  <Cpu className="w-4 h-4 text-blue-500" />
                  Arquitetura do Orquestrador
                </h4>
                <div className={`space-y-2.5 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  <div className={`flex items-center justify-between p-2 rounded-lg ${isDark ? "bg-slate-950/40" : "bg-slate-50"}`}>
                    <span>Modelo de Raciocínio:</span>
                    <span className={`font-mono font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>Google Gemini 2.5 Flash</span>
                  </div>
                  <div className={`flex items-center justify-between p-2 rounded-lg ${isDark ? "bg-slate-950/40" : "bg-slate-50"}`}>
                    <span>Canal de Produção:</span>
                    <span className="text-emerald-500 font-semibold">Google Workspace Chat (Inpyx)</span>
                  </div>
                  <div className={`flex items-center justify-between p-2 rounded-lg ${isDark ? "bg-slate-950/40" : "bg-slate-50"}`}>
                    <span>Servidor Backend:</span>
                    <span className={`font-mono ${isDark ? "text-slate-200" : "text-slate-900"}`}>Express + TypeScript (Porta 3000)</span>
                  </div>
                  <div className={`flex items-center justify-between p-2 rounded-lg ${isDark ? "bg-slate-950/40" : "bg-slate-50"}`}>
                    <span>Hospedagem Cloud:</span>
                    <span className="text-blue-500 font-semibold">Cloudez Production App</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SIMULATOR & AUDIT CONSOLE VIEW */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* CONSOLE BAR */}
              <div className={`px-6 py-3 border-b flex items-center justify-between shrink-0 ${
                isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-500" />
                  <span className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-900"}`}>Console de Simulação de Consultas</span>
                  <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>({messages.length} eventos no log)</span>
                </div>
                <button
                  onClick={() => setActiveView("dashboard")}
                  className={`text-xs flex items-center gap-1 ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Voltar ao Dashboard
                </button>
              </div>

              {/* CHAT MESSAGES LOG */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className={`flex items-center gap-2 mb-1 text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      <span>{m.sender === "user" ? `Executivo (${profile.toUpperCase()})` : "CLARA - ELETROMAX AI"}</span>
                      {m.intent && (
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                          isDark ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600"
                        }`}>
                          intenção: {m.intent}
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-3xl p-4 rounded-2xl shadow-md border ${
                        m.sender === "user"
                          ? "bg-blue-600 text-white border-blue-500/50"
                          : m.unauthorized
                          ? isDark ? "bg-rose-950/40 text-rose-200 border-rose-800/60" : "bg-rose-50 text-rose-900 border-rose-200"
                          : isDark ? "bg-slate-900/90 text-slate-200 border-slate-800" : "bg-white text-slate-800 border-slate-200"
                      }`}
                    >
                      {m.sender === "bot" ? renderFormattedText(m.text) : <p className="text-sm">{m.text}</p>}

                      {m.chartUrl && (
                        <div className={`mt-3 pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                          <img src={m.chartUrl} alt="Gráfico gerado" className={`rounded-lg max-w-full h-auto border ${isDark ? "border-slate-700" : "border-slate-300"}`} />
                        </div>
                      )}

                      {m.sender === "bot" && (m.tokensUsados !== undefined || m.custoBrl !== undefined) && (
                        <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-mono ${isDark ? "border-slate-800/60 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                          <span>Tokens: {m.tokensUsados}</span>
                          <span>Custo: R$ {m.custoBrl?.toFixed(4)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className={`flex items-center gap-2 text-xs p-3 rounded-xl border w-max ${
                    isDark ? "bg-slate-900/50 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600 shadow-sm"
                  }`}>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                    Clara está processando e consultando o banco de dados...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* INPUT BAR */}
              <div className={`p-4 border-t shrink-0 ${
                isDark ? "bg-slate-900/80 border-slate-800/80" : "bg-white border-slate-200"
              }`}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputVal);
                  }}
                  className="flex items-center gap-2 max-w-5xl mx-auto"
                >
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Digite uma pergunta de teste sobre estoque, quebra ou participações..."
                    className={`flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none ${
                      isDark 
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500/60" 
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputVal.trim()}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Enviar</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>
          )}

        </main>

      </div>

      {/* ALERT MODAL */}
      <AnimatePresence>
        {isAlertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden ${
                isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              }`}
            >
              <div className={`p-4 border-b flex items-center justify-between ${
                isDark ? "bg-amber-500/10 border-slate-800" : "bg-amber-50 border-amber-200"
              }`}>
                <div className="flex items-center gap-2 text-amber-500">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold">Alerta(s) de Operação (Monitoramento)</h3>
                </div>
                <button
                  onClick={() => setIsAlertModalOpen(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-amber-100 text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <div className={`p-4 rounded-xl border mb-4 ${
                  isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <h4 className={`font-semibold mb-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    ⚠️ Quebra Identificada: Grupo Tramontina
                  </h4>
                  <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Identificamos que o <strong>Interruptor Simples 10A (INT-LIZ-01)</strong> apresentou uma divergência de <strong>66.7%</strong> entre o total de entradas no mês e o saldo atual, superando o limite padrão da Curva C.
                  </p>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setIsAlertModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                    }`}
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => {
                      setIsAlertModalOpen(false);
                      handleQuickQuery("Qual o estoque e quebra da Tramontina neste mês?");
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                  >
                    Investigar com a Clara
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
