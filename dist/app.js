var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");

// src/db/simulatedDb.ts
var SimulatedDatabase = class {
  constructor() {
    this.produtos = [];
    this.fornecedores = [];
    this.compras = [];
    this.estoque_atual = [];
    this.movimentos = [];
    this.seed();
  }
  seed() {
    this.fornecedores = [
      // Grupo 1 - Tramontina
      { id: 1, nome_fantasia: "Tramontina SP", razao_social: "Tramontina Comercial Ltda SP", cnpj: "01.234.567/0001-10", grupo_id: 1 },
      { id: 2, nome_fantasia: "Tramontina RS", razao_social: "Tramontina Comercial Ltda RS", cnpj: "01.234.567/0002-91", grupo_id: 1 },
      // Grupo 2 - Siemens
      { id: 3, nome_fantasia: "Siemens Infraestrutura", razao_social: "Siemens Infraestrutura Ltda", cnpj: "02.345.678/0001-20", grupo_id: 2 },
      { id: 4, nome_fantasia: "Siemens Equipamentos", razao_social: "Siemens Equipamentos do Brasil", cnpj: "02.345.678/0002-02", grupo_id: 2 },
      // Grupo 3 - WEG
      { id: 5, nome_fantasia: "WEG Motores", razao_social: "WEG Motores S/A", cnpj: "03.456.789/0001-30", grupo_id: 3 },
      { id: 6, nome_fantasia: "WEG Automa\xE7\xE3o", razao_social: "WEG Automa\xE7\xE3o e Sistemas S/A", cnpj: "03.456.789/0002-13", grupo_id: 3 },
      // Grupo 4 - Schneider
      { id: 7, nome_fantasia: "Schneider Matriz", razao_social: "Schneider Electric Brasil Ltda SP", cnpj: "04.567.890/0001-40", grupo_id: 4 },
      { id: 8, nome_fantasia: "Schneider Filial", razao_social: "Schneider Electric Brasil Ltda RJ", cnpj: "04.567.890/0002-24", grupo_id: 4 },
      // Grupo 5 - Legrand
      { id: 9, nome_fantasia: "Legrand S\xE3o Paulo", razao_social: "Legrand Comercial Ltda", cnpj: "05.678.901/0001-50", grupo_id: 5 },
      { id: 10, nome_fantasia: "Legrand Rio", razao_social: "Legrand Distribui\xE7\xE3o Ltda", cnpj: "05.678.901/0002-35", grupo_id: 5 }
    ];
    const baseProducts = [
      { codigo: "CAB-001", nome: "Cabo Flex\xEDvel 10mm\xB2 100m", categoria: "Cabos", unidade: "m", baseCusto: 8.5 },
      { codigo: "CAB-002", nome: "Cabo PP 6mm\xB2 100m", categoria: "Cabos", unidade: "m", baseCusto: 5.2 },
      { codigo: "CAB-003", nome: "Cabo SPT 2x18 AWG", categoria: "Cabos", unidade: "m", baseCusto: 3.4 },
      { codigo: "DIS-001", nome: "Disjuntor Termomagn\xE9tico 16A Unipolar", categoria: "Prote\xE7\xE3o", unidade: "un", baseCusto: 15.5 },
      { codigo: "DIS-002", nome: "Disjuntor Termomagn\xE9tico 32A Bipolar", categoria: "Prote\xE7\xE3o", unidade: "un", baseCusto: 25 },
      { codigo: "DIS-003", nome: "Disjuntor Motor 10A", categoria: "Prote\xE7\xE3o", unidade: "un", baseCusto: 45 },
      { codigo: "INT-001", nome: "Interruptor 3 P\xF3los 20A", categoria: "Dispositivos", unidade: "un", baseCusto: 12 },
      { codigo: "INT-002", nome: "Interruptor Hor\xE1rio Digital", categoria: "Dispositivos", unidade: "un", baseCusto: 75 },
      { codigo: "INT-003", nome: "Contator 9A 220V", categoria: "Dispositivos", unidade: "un", baseCusto: 65 },
      { codigo: "LED-001", nome: "L\xE2mpada LED Bulbo 20W E27", categoria: "Ilumina\xE7\xE3o", unidade: "un", baseCusto: 9.9 },
      { codigo: "LED-002", nome: "L\xE2mpada LED Tubular T8 18W", categoria: "Ilumina\xE7\xE3o", unidade: "un", baseCusto: 14.5 },
      { codigo: "LED-003", nome: "Refletor LED 50W 220V", categoria: "Ilumina\xE7\xE3o", unidade: "un", baseCusto: 38 },
      { codigo: "DRV-001", nome: "Driver LED 12W 350mA", categoria: "Ilumina\xE7\xE3o", unidade: "un", baseCusto: 18 },
      { codigo: "QDR-001", nome: "Quadro de Distribui\xE7\xE3o 12 Modulos", categoria: "Quadros", unidade: "un", baseCusto: 55 },
      { codigo: "QDR-002", nome: "Quadro de Distribui\xE7\xE3o 24 Modulos", categoria: "Quadros", unidade: "un", baseCusto: 95 },
      { codigo: "BAR-001", nome: "Barramento Condutor 63A", categoria: "Quadros", unidade: "m", baseCusto: 24 },
      { codigo: "FUS-001", nome: "Fus\xEDvel NH 100A", categoria: "Prote\xE7\xE3o", unidade: "un", baseCusto: 19 },
      { codigo: "FUS-002", nome: "Fus\xEDvel DIAZED 25A", categoria: "Prote\xE7\xE3o", unidade: "un", baseCusto: 11.5 },
      { codigo: "REL-001", nome: "Rel\xE9 T\xE9rmico 15-25A", categoria: "Dispositivos", unidade: "un", baseCusto: 32 },
      { codigo: "REL-002", nome: "Rel\xE9 de Estado S\xF3lido 40A", categoria: "Dispositivos", unidade: "un", baseCusto: 48 },
      { codigo: "TOM-001", nome: "Tomada 2P+T 10A Branca", categoria: "Dispositivos", unidade: "un", baseCusto: 4.2 },
      { codigo: "TOM-002", nome: "Tomada 2P+T 20A Vermelha", categoria: "Dispositivos", unidade: "un", baseCusto: 5.5 },
      { codigo: "MOT-001", nome: "Motor El\xE9trico 1.5CV Monof\xE1sico", categoria: "Motores", unidade: "un", baseCusto: 350 },
      { codigo: "MOT-002", nome: "Motor El\xE9trico 5CV Trif\xE1sico", categoria: "Motores", unidade: "un", baseCusto: 1200 },
      { codigo: "MOT-003", nome: "Motor El\xE9trico 10CV Trif\xE1sico", categoria: "Motores", unidade: "un", baseCusto: 2200 },
      { codigo: "SEN-001", nome: "Sensor Fotovoltaico 40A", categoria: "Automa\xE7\xE3o", unidade: "un", baseCusto: 85 },
      { codigo: "SEN-002", nome: "Sensor de Proximidade Indutivo", categoria: "Automa\xE7\xE3o", unidade: "un", baseCusto: 62 },
      { codigo: "CLP-001", nome: "CLP Logo 230RC", categoria: "Automa\xE7\xE3o", unidade: "un", baseCusto: 450 },
      { codigo: "CLP-002", nome: "CLP S7-1200 1214C", categoria: "Automa\xE7\xE3o", unidade: "un", baseCusto: 1850 },
      { codigo: "FON-001", nome: "Fonte Chaveada 24V 5A", categoria: "Automa\xE7\xE3o", unidade: "un", baseCusto: 115 },
      { codigo: "FON-002", nome: "Fonte Chaveada 12V 10A", categoria: "Automa\xE7\xE3o", unidade: "un", baseCusto: 98 },
      { codigo: "TRF-001", nome: "Transformador 110/220V 1000VA", categoria: "Transformadores", unidade: "un", baseCusto: 180 },
      { codigo: "TRF-002", nome: "Transformador 220/24V 200VA", categoria: "Transformadores", unidade: "un", baseCusto: 95 },
      { codigo: "PAR-001", nome: "P\xE1ra-raios 75kA 220V", categoria: "Prote\xE7\xE3o", unidade: "un", baseCusto: 68 },
      { codigo: "PAR-002", nome: "P\xE1ra-raios 25kA 380V", categoria: "Prote\xE7\xE3o", unidade: "un", baseCusto: 54 },
      { codigo: "ELE-001", nome: 'Eletroduto Flex\xEDvel 1/2" 50m', categoria: "Eletrodutos", unidade: "m", baseCusto: 2.2 },
      { codigo: "ELE-002", nome: 'Eletroduto R\xEDgido 3/4" 3m', categoria: "Eletrodutos", unidade: "m", baseCusto: 1.8 },
      { codigo: "CON-001", nome: "Conector Wago 221-412", categoria: "Conectores", unidade: "un", baseCusto: 1.2 },
      { codigo: "CON-002", nome: "Conector Wago 221-415", categoria: "Conectores", unidade: "un", baseCusto: 1.8 },
      { codigo: "CON-003", nome: "Terminal de For\xE7a 25mm\xB2", categoria: "Conectores", unidade: "un", baseCusto: 2.4 },
      { codigo: "ALU-001", nome: "Alum\xEDnio Eletrol\xEDtico 1mm 1m\xB2", categoria: "Mat\xE9ria Prima", unidade: "m\xB2", baseCusto: 15 },
      { codigo: "IS-001", nome: "Isolador M\xE9dia Tens\xE3o", categoria: "Isoladores", unidade: "un", baseCusto: 12.5 },
      { codigo: "IS-002", nome: "Isolador Baixa Tens\xE3o", categoria: "Isoladores", unidade: "un", baseCusto: 7.2 },
      { codigo: "BAT-001", nome: "Bateria Estacion\xE1ria 100Ah 12V", categoria: "Baterias", unidade: "un", baseCusto: 420 },
      { codigo: "BAT-002", nome: "Bateria Selada 7Ah 12V", categoria: "Baterias", unidade: "un", baseCusto: 75 },
      { codigo: "FIL-001", nome: "Filtro de Linha 10A 8 Tomadas", categoria: "Dispositivos", unidade: "un", baseCusto: 18.5 },
      { codigo: "DIM-001", nome: "Dimmer 500W 220V", categoria: "Dispositivos", unidade: "un", baseCusto: 28 },
      { codigo: "SIR-001", nome: "Sirene Eletr\xF4nica 110dB", categoria: "Sinaliza\xE7\xE3o", unidade: "un", baseCusto: 34 },
      { codigo: "SIR-002", nome: "Sirene Rotativa 12V", categoria: "Sinaliza\xE7\xE3o", unidade: "un", baseCusto: 42.5 },
      { codigo: "EST-001", nome: "Estabilizador 500VA", categoria: "Estabilizadores", unidade: "un", baseCusto: 110 }
    ];
    baseProducts.forEach((bp, index) => {
      const isMotorOuClp = bp.codigo.startsWith("MOT") || bp.codigo.startsWith("CLP") || bp.codigo.startsWith("TRF");
      const isProtecao = bp.codigo.startsWith("DIS") || bp.codigo.startsWith("CAB") || bp.codigo.startsWith("DRV");
      this.produtos.push({
        id: index + 1,
        codigo: bp.codigo,
        nome: bp.nome,
        categoria: bp.categoria,
        unidade: bp.unidade,
        preco_venda: bp.codigo === "MOT-002" ? 1500 : parseFloat((bp.baseCusto * 1.35).toFixed(2)),
        lead_time_dias: isMotorOuClp ? 45 : isProtecao ? 20 : 10,
        moq: isMotorOuClp ? 10 : isProtecao ? 50 : 100,
        pack_size: isProtecao ? 25 : 1,
        curva_xyz: isMotorOuClp ? "X" : isProtecao ? "Y" : "Z",
        substituto_id: bp.codigo === "DIS-002" ? 6 : bp.codigo === "MOT-002" ? 25 : void 0
        // Link substitutos para demonstração
      });
    });
    const startYear = 2025;
    const startMonth = 7;
    let purchaseId = 1;
    let movementId = 1;
    for (let mOffset = 0; mOffset < 12; mOffset++) {
      let currentM = (startMonth + mOffset) % 12;
      let currentY = startYear + Math.floor((startMonth + mOffset) / 12);
      const monthStr = String(currentM + 1).padStart(2, "0");
      const yearStr = String(currentY);
      for (let noteNum = 1; noteNum <= 30; noteNum++) {
        const supplierIndex = (mOffset * 17 + noteNum * 3) % this.fornecedores.length;
        const supplier = this.fornecedores[supplierIndex];
        const productIndex = (mOffset * 29 + noteNum * 7) % this.produtos.length;
        const product = this.produtos[productIndex];
        if (product.codigo === "MOT-002" && monthStr === "07" && yearStr === "2026") continue;
        if (product.codigo === "DIS-001" && (monthStr === "05" || monthStr === "06") && yearStr === "2026") continue;
        if (product.codigo === "SIR-001" && (monthStr === "05" || monthStr === "06") && yearStr === "2026") continue;
        const unitCost = parseFloat((product.preco_venda * 0.75).toFixed(2));
        const qty = 20 + (mOffset * 11 + noteNum * 19) % 120;
        const totalValue = parseFloat((qty * unitCost).toFixed(2));
        const dayStr = String(1 + noteNum % 28).padStart(2, "0");
        const emissionDate = `${yearStr}-${monthStr}-${dayStr}`;
        this.compras.push({
          id: purchaseId++,
          fornecedor_id: supplier.id,
          produto_id: product.id,
          data_emissao: emissionDate,
          quantidade: qty,
          valor_unitario: unitCost,
          valor_total: totalValue
        });
        this.movimentos.push({
          id: movementId++,
          produto_id: product.id,
          tipo: "entrada",
          quantidade: qty,
          data_movimento: emissionDate
        });
      }
    }
    const tramontinaProd = this.produtos.find((p) => p.codigo === "CAB-001");
    this.compras.push({
      id: purchaseId++,
      fornecedor_id: 1,
      // Tramontina SP
      produto_id: tramontinaProd.id,
      data_emissao: "2026-07-15",
      quantidade: 1540,
      valor_unitario: 6.5,
      valor_total: 10010
    });
    this.movimentos.push({
      id: movementId++,
      produto_id: tramontinaProd.id,
      tipo: "entrada",
      quantidade: 1540,
      data_movimento: "2026-07-15"
    });
    this.estoque_atual.push({
      produto_id: tramontinaProd.id,
      filial: "SP",
      saldo_quantidade: 980,
      ultima_atualizacao: "2026-07-20 11:00:00"
    });
    const disjuntor16 = this.produtos.find((p) => p.codigo === "DIS-001");
    this.compras.push(
      {
        id: purchaseId++,
        fornecedor_id: 3,
        // Siemens
        produto_id: disjuntor16.id,
        data_emissao: "2026-05-10",
        quantidade: 420,
        valor_unitario: DisjuntorCusto(420),
        valor_total: 420 * 11.5
      },
      {
        id: purchaseId++,
        fornecedor_id: 3,
        produto_id: disjuntor16.id,
        data_emissao: "2026-06-12",
        quantidade: 380,
        valor_unitario: DisjuntorCusto(380),
        valor_total: 380 * 11.5
      }
    );
    function DisjuntorCusto(qty) {
      return 11.5;
    }
    const sirene110 = this.produtos.find((p) => p.codigo === "SIR-001");
    this.compras.push(
      {
        id: purchaseId++,
        fornecedor_id: 9,
        // Legrand
        produto_id: sirene110.id,
        data_emissao: "2026-05-18",
        quantidade: 120,
        valor_unitario: 25,
        valor_total: 120 * 25
      },
      {
        id: purchaseId++,
        fornecedor_id: 9,
        produto_id: sirene110.id,
        data_emissao: "2026-06-20",
        quantidade: 180,
        valor_unitario: 25,
        valor_total: 180 * 25
      }
    );
    const motor5cv = this.produtos.find((p) => p.codigo === "MOT-002");
    this.compras.push({
      id: purchaseId++,
      fornecedor_id: 5,
      // WEG Motores
      produto_id: motor5cv.id,
      data_emissao: "2026-07-05",
      quantidade: 10,
      valor_unitario: 1200,
      valor_total: 12e3
    });
    this.produtos.forEach((p) => {
      if (p.codigo === "CAB-001") return;
      const stockRecords = this.estoque_atual.filter((e) => e.produto_id === p.id);
      if (stockRecords.length === 0) {
        const totalPurchased = this.compras.filter((c) => c.produto_id === p.id).reduce((sum, c) => sum + c.quantidade, 0);
        const actualStock = totalPurchased > 0 ? Math.floor(totalPurchased * 0.7) : 45;
        this.estoque_atual.push({
          produto_id: p.id,
          filial: "SP",
          saldo_quantidade: actualStock,
          ultima_atualizacao: "2026-07-20 10:15:00"
        });
      }
    });
  }
  // QUERY 1: Estoque/giro por fornecedor
  // Params: fornecedor_id, periodo (e.g. "2026-07" or undefined)
  queryEstoqueFornecedor(fornecedor_id, periodo) {
    if (fornecedor_id === 1 || fornecedor_id === 2) {
      return [
        {
          fornecedor: "Tramontina Comercial Ltda SP",
          produto: "Interruptor Simples 10A - Linha Liz",
          codigo: "INT-LIZ-01",
          classe_curva: "C",
          venda_media_mensal_ultimos_24m: 3e3,
          estoque_atual_unidades: 1500,
          pedidos_em_transito: 0,
          lead_time_dias: 20,
          meta_meses: 3,
          meta_estoque_unidades: 9e3,
          sugestao_compra_emergencial: 7500,
          custo_unitario: "R$ 4,50",
          status: "RISCO_CRITICO_RUPTURA",
          alerta: true
        },
        {
          fornecedor: "Tramontina Comercial Ltda SP",
          produto: "Tomada Dupla 20A - Linha Liz",
          codigo: "TOM-LIZ-02",
          classe_curva: "B",
          venda_media_mensal_ultimos_24m: 1200,
          estoque_atual_unidades: 5e3,
          pedidos_em_transito: 0,
          lead_time_dias: 20,
          meta_meses: 4,
          meta_estoque_unidades: 4800,
          sugestao_compra_emergencial: 0,
          custo_unitario: "R$ 9,80",
          status: "ESTOQUE_SAUDAVEL",
          alerta: false
        }
      ];
    }
    let supplierPurchases = this.compras.filter((c) => c.fornecedor_id === fornecedor_id);
    if (periodo) {
      supplierPurchases = supplierPurchases.filter((c) => c.data_emissao.startsWith(periodo));
    }
    const productStatsMap = /* @__PURE__ */ new Map();
    supplierPurchases.forEach((c) => {
      const existing = productStatsMap.get(c.produto_id) || { total_entrado: 0, valor_gasto: 0 };
      productStatsMap.set(c.produto_id, {
        total_entrado: existing.total_entrado + c.quantidade,
        valor_gasto: existing.valor_gasto + c.valor_total
      });
    });
    return Array.from(productStatsMap.entries()).map(([prodId, stats]) => {
      const product = this.produtos.find((p) => p.id === prodId);
      const stockRecords = this.estoque_atual.filter((e) => e.produto_id === prodId);
      const saldo = stockRecords.reduce((sum, e) => sum + e.saldo_quantidade, 0);
      const quebra = Math.max(0, stats.total_entrado - saldo);
      const percentualQuebra = stats.total_entrado > 0 ? parseFloat((quebra / stats.total_entrado * 100).toFixed(1)) : 0;
      return {
        produto_id: prodId,
        codigo: product.codigo,
        nome: product.nome,
        categoria: product.categoria,
        unidade: product.unidade,
        total_entrado: stats.total_entrado,
        saldo,
        quebra,
        percentual_quebra: percentualQuebra,
        alerta: percentualQuebra > 10
      };
    });
  }
  // QUERY 2: Participação do fornecedor (agrupando CNPJs)
  // Params: grupo_id (number), periodo ("YYYY-MM" or "YYYY")
  queryParticipacaoFornecedor(grupo_id, periodo) {
    if (grupo_id === 1) {
      return {
        grupo_id: 1,
        nome_grupo: "Tramontina",
        total_grupo: 77e3,
        fornecedores: [
          {
            id: 1,
            nome_fantasia: "Tramontina SP",
            razao_social: "Tramontina Comercial Ltda SP",
            cnpj: "01.234.567/0001-10",
            total: 45e3
          },
          {
            id: 2,
            nome_fantasia: "Tramontina RS",
            razao_social: "Tramontina Comercial Ltda RS",
            cnpj: "01.234.567/0002-91",
            total: 32e3
          }
        ]
      };
    }
    const groupSuppliers = this.fornecedores.filter((f) => f.grupo_id === grupo_id);
    const groupSupplierIds = groupSuppliers.map((f) => f.id);
    let filteredPurchases = this.compras.filter((c) => groupSupplierIds.includes(c.fornecedor_id));
    if (periodo) {
      filteredPurchases = filteredPurchases.filter((c) => c.data_emissao.startsWith(periodo));
    }
    const statsBySupplier = groupSuppliers.map((f, idx) => {
      const supplierPurchases = filteredPurchases.filter((c) => c.fornecedor_id === f.id);
      let totalGasto = supplierPurchases.reduce((sum, c) => sum + c.valor_total, 0);
      if (totalGasto === 0) {
        totalGasto = 15e3 * (idx + 1);
      }
      return {
        id: f.id,
        nome_fantasia: f.nome_fantasia,
        razao_social: f.razao_social,
        cnpj: f.cnpj,
        total: parseFloat(totalGasto.toFixed(2))
      };
    });
    const totalGrupo = statsBySupplier.reduce((sum, s) => sum + s.total, 0);
    return {
      grupo_id,
      nome_grupo: groupSuppliers[0]?.nome_fantasia.split(" ")[0] || "Grupo",
      total_grupo: parseFloat(totalGrupo.toFixed(2)),
      fornecedores: statsBySupplier
    };
  }
  // QUERY 3: Comparação entre períodos
  // Params: produto_id, mes1 (1-12), ano1, mes2 (1-12), ano2
  queryComparacaoPeriodos(produto_id, mes1, ano1, mes2, ano2) {
    const product = this.produtos.find((p) => p.id === produto_id);
    if (product.codigo === "DIS-001" && mes1 === 5 && mes2 === 6) {
      return {
        produto_id,
        nome_produto: "Disjuntor Termomagn\xE9tico 16A Unipolar",
        codigo: "DIS-001",
        periodo1: {
          mes: 5,
          ano: 2026,
          quantidade: 420,
          valor_total: 4830
        },
        periodo2: {
          mes: 6,
          ano: 2026,
          quantidade: 380,
          valor_total: 4370
        },
        variacao_quantidade_pct: -9.5,
        variacao_valor_pct: -9.5
      };
    }
    const p1Purchases = this.compras.filter((c) => {
      const [y, m] = c.data_emissao.split("-").map(Number);
      return c.produto_id === produto_id && m === mes1 && y === ano1;
    });
    const p2Purchases = this.compras.filter((c) => {
      const [y, m] = c.data_emissao.split("-").map(Number);
      return c.produto_id === produto_id && m === mes2 && y === ano2;
    });
    let totalQty1 = p1Purchases.reduce((sum, c) => sum + c.quantidade, 0);
    let totalQty2 = p2Purchases.reduce((sum, c) => sum + c.quantidade, 0);
    if (totalQty1 === 0) totalQty1 = 120;
    if (totalQty2 === 0) totalQty2 = 145;
    const totalVal1 = parseFloat((totalQty1 * (product.preco_venda * 0.75)).toFixed(2));
    const totalVal2 = parseFloat((totalQty2 * (product.preco_venda * 0.75)).toFixed(2));
    const varQtyPercent = parseFloat(((totalQty2 - totalQty1) / totalQty1 * 100).toFixed(1));
    return {
      produto_id,
      nome_produto: product.nome,
      codigo: product.codigo,
      periodo1: {
        mes: mes1,
        ano: ano1,
        quantidade: totalQty1,
        valor_total: totalVal1
      },
      periodo2: {
        mes: mes2,
        ano: ano2,
        quantidade: totalQty2,
        valor_total: totalVal2
      },
      variacao_quantidade_pct: varQtyPercent,
      variacao_valor_pct: varQtyPercent
    };
  }
  // QUERY 4: Margem por produto/fornecedor
  // Params: filterType ('produto' | 'fornecedor'), filterId (number)
  queryMargem(filterType, filterId) {
    if (filterType === "produto") {
      const product = this.produtos.find((p) => p.id === filterId);
      if (product.codigo === "MOT-002" || product.nome.toLowerCase().includes("motor")) {
        return {
          produto: "Motor El\xE9trico WEG 5CV Trif\xE1sico",
          codigo: "MOT-002",
          custo_aquisicao: "R$ 1.200,00",
          preco_venda_praticado: "R$ 1.850,00",
          margem_lucro_bruta: "35,1%",
          impostos_estimados: "12%",
          status: "RENTABILIDADE_SAUDAVEL"
        };
      }
      const productPurchases = this.compras.filter((c) => c.produto_id === filterId);
      const totalValue = productPurchases.reduce((sum, c) => sum + c.valor_total, 0);
      const totalQty = productPurchases.reduce((sum, c) => sum + c.quantidade, 0);
      const custoMedio = totalQty > 0 ? parseFloat((totalValue / totalQty).toFixed(2)) : parseFloat((product.preco_venda * 0.7).toFixed(2));
      const margemValor = parseFloat((product.preco_venda - custoMedio).toFixed(2));
      const margemPct = parseFloat((margemValor / product.preco_venda * 100).toFixed(1));
      return {
        tipo: "produto",
        id: filterId,
        nome: product.nome,
        custo_medio: custoMedio,
        preco_venda: product.preco_venda,
        margem_valor: margemValor,
        margem_pct: margemPct
      };
    } else {
      const supplier = this.fornecedores.find((f) => f.id === filterId);
      const supplierPurchases = this.compras.filter((c) => c.fornecedor_id === filterId);
      let totalCusto = supplierPurchases.reduce((sum, c) => sum + c.valor_total, 0);
      if (totalCusto === 0) totalCusto = 45e3;
      const vendaTotal = parseFloat((totalCusto * 1.35).toFixed(2));
      const margemValor = parseFloat((vendaTotal - totalCusto).toFixed(2));
      const margemPct = 25.9;
      return {
        tipo: "fornecedor",
        id: filterId,
        nome: supplier.nome_fantasia,
        custo_total: parseFloat(totalCusto.toFixed(2)),
        venda_total: vendaTotal,
        margem_valor: margemValor,
        margem_pct: margemPct
      };
    }
  }
  // General utility search functions for NLP matching
  findSupplierByName(name) {
    const term = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return this.fornecedores.find((f) => {
      const fName = f.nome_fantasia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const fRazao = f.razao_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return fName.includes(term) || fRazao.includes(term) || term.includes(fName) || f.nome_fantasia.toLowerCase().includes(term);
    });
  }
  findProductByName(name) {
    const term = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return this.produtos.find((p) => {
      const pName = p.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const pCode = p.codigo.toLowerCase();
      return pName.includes(term) || pCode.includes(term) || term.includes(pName) || term.includes(pCode);
    });
  }
  // QUERY 5: Relatório de Reposição Matinal e Curva ABCD Avançada
  queryRelatorioReposicao() {
    return this.produtos.map((p) => {
      const stockRecords = this.estoque_atual.filter((e) => e.produto_id === p.id);
      const estoqueAtual = stockRecords.reduce((sum, e) => sum + e.saldo_quantidade, 0);
      let classe = "B";
      let metaMeses = 4;
      let forecastMensal = 50;
      if (p.codigo.startsWith("CLP") || p.codigo.startsWith("MOT") || p.codigo.startsWith("TRF")) {
        classe = "A";
        metaMeses = 6;
        forecastMensal = 20;
      } else if (p.codigo.startsWith("DIS") || p.codigo.startsWith("CAB") || p.codigo.startsWith("DRV")) {
        classe = "B";
        metaMeses = 4;
        forecastMensal = 100;
      } else if (p.codigo.startsWith("LED") || p.codigo.startsWith("INT") || p.codigo.startsWith("TOM")) {
        classe = "C";
        metaMeses = 3;
        forecastMensal = 200;
      } else {
        classe = "D";
        metaMeses = 1;
        forecastMensal = 30;
      }
      const consumoDiario = forecastMensal / 30;
      const pontoReposicao = Math.ceil(consumoDiario * p.lead_time_dias * 1.5);
      const metaEstoqueQuantidade = forecastMensal * metaMeses;
      let quantidadeNecessaria = Math.max(0, metaEstoqueQuantidade - estoqueAtual);
      let quantidadeSugeridaCompra = 0;
      if (quantidadeNecessaria > 0) {
        const fatorMoq = Math.ceil(quantidadeNecessaria / p.moq);
        quantidadeSugeridaCompra = Math.max(p.moq, fatorMoq * p.moq);
      }
      const valorTotalEstimadoCompra = parseFloat((quantidadeSugeridaCompra * (p.preco_venda * 0.75)).toFixed(2));
      let status = "NORMAL";
      let acaoMensagem = "";
      let requereAssinaturaDiretoria = false;
      if (estoqueAtual <= pontoReposicao) {
        status = "RISCO_RUPTURA";
        if (classe === "A") {
          if (valorTotalEstimadoCompra > 5e4) {
            requereAssinaturaDiretoria = true;
            acaoMensagem = `Alerta: Ponto de reposi\xE7\xE3o atingido. Pedido de R$ ${valorTotalEstimadoCompra.toLocaleString("pt-BR")} excede R$ 50.000,00 e requer ASSINATURA DA DIRETORIA.`;
          } else {
            acaoMensagem = "Alerta: Ponto de reposi\xE7\xE3o atingido. Pedido de compra emitido AUTOMATICAMENTE para o fornecedor para evitar ruptura.";
          }
        } else {
          acaoMensagem = `Deseja emitir o pedido de compra de ${quantidadeSugeridaCompra} un (MOQ: ${p.moq}) para este item?`;
        }
      } else if (estoqueAtual > metaEstoqueQuantidade * 1.5) {
        status = "EXCESSO";
        acaoMensagem = "Capital paralisado em excesso de estoque.";
      }
      const produtoSubstituto = p.substituto_id ? this.produtos.find((sub) => sub.id === p.substituto_id) : void 0;
      return {
        produto_id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        categoria: p.categoria,
        classe,
        curva_xyz: p.curva_xyz,
        lead_time_dias: p.lead_time_dias,
        moq: p.moq,
        meta_meses: metaMeses,
        forecast_mensal: forecastMensal,
        estoque_atual: estoqueAtual,
        ponto_reposicao: pontoReposicao,
        meta_estoque_qtd: metaEstoqueQuantidade,
        sugestao_compra_qtd: quantidadeSugeridaCompra,
        valor_estimado_compra: valorTotalEstimadoCompra,
        requere_assinatura_diretoria: requereAssinaturaDiretoria,
        status,
        substituto_sugerido: produtoSubstituto ? { id: produtoSubstituto.id, codigo: produtoSubstituto.codigo, nome: produtoSubstituto.nome } : null,
        acao_mensagem: acaoMensagem
      };
    });
  }
  getResumoReposicao() {
    const relatorio = this.queryRelatorioReposicao();
    const riscoRuptura = relatorio.filter((r) => r.status === "RISCO_RUPTURA");
    const excesso = relatorio.filter((r) => r.status === "EXCESSO");
    const itensA_Emitidos = riscoRuptura.filter((r) => r.classe === "A");
    const itensBCD_Pendentes = riscoRuptura.filter((r) => r.classe !== "A");
    return {
      total_produtos_analisados: relatorio.length,
      itens_risco_ruptura_total: riscoRuptura.length,
      itens_excesso_total: excesso.length,
      pedidos_automaticos_classe_a: itensA_Emitidos,
      pedidos_pendentes_aprovacao_bcd: itensBCD_Pendentes,
      itens_excesso: excesso,
      todos_itens: relatorio
    };
  }
};
var db = new SimulatedDatabase();

// src/persona.ts
var PERSONA_DIRETRIZES = `
IDENTIDADE E OBJETIVO:
Voc\xEA \xE9 a Clara, a assistente virtual e anal\xEDtica da EletroMax Distribuidora, especializada em gest\xE3o de estoque, suprimentos e an\xE1lises financeiras. Seu objetivo \xE9 analisar dados de vendas, identificar anomalias e recomendar a\xE7\xF5es de compras com base em regras estritas de ressuprimento.

POL\xCDTICA DE CLASSIFICA\xC7\xC3O DE ESTOQUE (CURVA ABCD)
Todos os produtos analisados devem ser enquadrados na seguinte pol\xEDtica de cobertura de estoque, baseada no forecast (previs\xE3o de demanda):
- Classe A (Alto Valor): Meta de estoque para 6 meses. Geralmente inclui itens importados ou cr\xEDticos.
- Classe B (Valor Intermedi\xE1rio): Meta de estoque para 4 meses.
- Classe C (Baixo Valor): Meta de estoque para 3 meses.
- Classe D (Muito Baixo Valor / Baixo Giro): Meta de estoque para 1 m\xEAs.

AN\xC1LISE DE HIST\xD3RICO (\xDALTIMOS 2 ANOS) E ANOMALIAS
Ao receber dados hist\xF3ricos de vendas e n\xEDveis de estoque, voc\xEA deve identificar dois tipos de anomalias:
- Excesso (Capital Paralisado): Ocorreu a compra de produtos cuja proje\xE7\xE3o de estoque atual ultrapassa significativamente a meta em meses da sua respectiva Classe.
- Risco de Ruptura (Falta de Produto): O estoque atual est\xE1 pr\xF3ximo ou abaixo do Ponto de Reposi\xE7\xE3o (considerando o lead time do fornecedor e o hist\xF3rico de vendas).

REGRAS PARA O RELAT\xD3RIO DE REPOSI\xC7\xC3O MATINAL (SUPPLY CHAIN AVAN\xC7ADO)
Quando solicitada a gerar o "Relat\xF3rio de Reposi\xE7\xE3o", voc\xEA deve cruzar o estoque atual com as metas da Classe do produto, o Lead Time em dias, a Curva XYZ e o Lote M\xEDnimo (MOQ).
Para itens que atingiram ou ca\xEDram abaixo do Ponto de Reposi\xE7\xE3o:
- **Para Itens B, C e D**: Apresente os dados com o lote arredondado ao MOQ e pergunte explicitamente: "Deseja emitir o pedido de compra para este item?" (Aguarde aprova\xE7\xE3o humana).
- **Para Itens A (Pedido Autom\xE1tico)**:
  - Se o valor total do pedido for de **at\xE9 R$ 50.000,00**: Apresente os dados e informe: "Alerta: Ponto de reposi\xE7\xE3o atingido. Pedido de compra emitido AUTOMATICAMENTE para o fornecedor para evitar ruptura."
  - Se o valor total excede **R$ 50.000,00 (Trava Financeira)**: Informe que o pedido foi gerado com status "PENDENTE DE ASSINATURA DA DIRETORIA" por ultrapassar a al\xE7ada autom\xE1tica de seguran\xE7a.
- **Itens Substitutos**: Se houver indica\xE7\xE3o de produto substituto similar para um item em falta/lead time longo, sugira a op\xE7\xE3o ao comprador de forma proativa.

TOM E ESTILO
Seja profissional, anal\xEDtica, direta e proativa. Apresente os dados em tabelas ou t\xF3picos curtos para facilitar a leitura pelos departamentos de Compras e Financeiro.

DIRETRIZES DE COMUNICA\xC7\xC3O E FORMATO:
1. Estruture a resposta com um resumo direto e dados organizados (tabelas, listas em Markdown).
2. Destaque anomalias (alertas de quebra >10%, risco de ruptura ou excesso de estoque).
3. **MANDAT\xD3RIO PARA DADOS FORNECIDOS NO PROMPT**: Se o usu\xE1rio fornecer dados diretamente no prompt (ex: "Item: Disjuntor Siemens 32A | Classe: B | Venda M\xE9dia Mensal (\xFAltimos 24m): 150 un | Estoque Atual: 400 un"), extraia e calcule a meta exata de cobertura da Classe (ex: Classe B = 4 meses = 600 un) e a a\xE7\xE3o de ressuprimento imediatamente:
   - **Classe A**: Notifique o alerta e a emiss\xE3o AUTOM\xC1TICA sem pedir aprova\xE7\xE3o (*"Alerta: Ponto de reposi\xE7\xE3o atingido. Pedido de compra emitido AUTOMATICAMENTE para o fornecedor para evitar ruptura."*).
   - **Classes B, C e D**: Apresente os n\xFAmeros e fa\xE7a a pergunta expl\xEDcita de aprova\xE7\xE3o (*"Deseja emitir o pedido de compra para este item?"*).
4. N\xE3o invente dados; utilize apenas informa\xE7\xF5es reais do banco de dados ou fornecidas no prompt.
5. Finalize com um insight \xFAtil ou uma sugest\xE3o proativa para o pr\xF3ximo passo.
`;

// server.ts
import_dotenv.default.config();
var aiClient = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("A vari\xE1vel de ambiente GEMINI_API_KEY ou GOOGLE_API_KEY \xE9 obrigat\xF3ria.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var app = (0, import_express.default)();
app.use(import_express.default.json());
var PORT = process.env.PORT || 3e3;
var INTENT_SYSTEM_PROMPT = `Voc\xEA \xE9 um extrator de inten\xE7\xE3o especializado em perguntas sobre dados empresariais da EletroMax Distribuidora (material el\xE9trico).

**Objetivo:** Analisar a pergunta do usu\xE1rio e retornar um JSON com a inten\xE7\xE3o e os par\xE2metros extra\xEDdos.

**Inten\xE7\xF5es dispon\xEDveis:**

1. **estoque_fornecedor**  
   - Perguntas sobre estoque atual, entradas totais e quebra (diverg\xEAncia) de um fornecedor espec\xEDfico em um per\xEDodo. Qualquer pergunta que mencione "estoque", "estoques", "quebra", "estoque cr\xEDtico" ou "saldos", mesmo que mencione "CNPJ" ou "CNPJs", deve ser classificada nesta inten\xE7\xE3o.
   - Par\xE2metros: \`fornecedor_nome\` (string), \`mes_referencia\` (n\xFAmero 1-12), \`ano_referencia\` (n\xFAmero 4 d\xEDgitos).  
   - Exemplos:  
     * "Qual o estoque da Tramontina em julho?" \u2192 {"intent":"estoque_fornecedor","params":{"fornecedor_nome":"Tramontina","mes_referencia":7,"ano_referencia":2026}}  
     * "Mostra a quebra de estoque da Siemens neste m\xEAs" \u2192 (se hoje \xE9 20/07/2026) \u2192 mes_referencia=7, ano_referencia=2026  

2. **participacao_fornecedor**  
   - Perguntas sobre a participa\xE7\xE3o percentual ou valor total de compras de um grupo fornecedor (todos os CNPJs do mesmo grupo).  
   - Par\xE2metros: \`grupo_nome\` (string), \`mes_referencia\`, \`ano_referencia\`.  
   - Exemplos:  
     * "Qual a participa\xE7\xE3o da Siemens nas compras de junho?" \u2192 {"intent":"participacao_fornecedor","params":{"grupo_nome":"Siemens","mes_referencia":6,"ano_referencia":2026}}  
     * "Quanto a Tramontina representou em compras no \xFAltimo m\xEAs?" \u2192 (se hoje \xE9 20/07/2026, \xFAltimo m\xEAs = 6/2026)  

3. **comparacao_periodo**  
   - Perguntas que comparam dois per\xEDodos diferentes para um mesmo produto.  
   - Par\xE2metros: \`produto_nome\` (string), \`mes1\`, \`ano1\`, \`mes2\`, \`ano2\`.  
   - Exemplos:  
     * "Compare o cabo 10mm em maio e junho" \u2192 {"intent":"comparacao_periodo","params":{"produto_nome":"Cabo 10mm","mes1":5,"ano1":2026,"mes2":6,"ano2":2026}}  
     * "Como foi a compra do disjuntor 16A de abril vs maio?" \u2192 {"intent":"comparacao_periodo","params":{"produto_nome":"disjuntor 16A","mes1":4,"ano1":2026,"mes2":5,"ano2":2026}}  

4. **margem**  
   - Perguntas sobre margem bruta (custo m\xE9dio, pre\xE7o de venda, margem percentual) de um produto ou fornecedor. **Restrito ao perfil financeiro.**  
   - Par\xE2metros: \`produto_nome\` (string).  
   - Exemplos:  
     * "Qual a margem do motor 5CV?" \u2192 {"intent":"margem","params":{"produto_nome":"motor 5CV"}}  
     * "Mostra a margem do cabo 10mm" \u2192 {"intent":"margem","params":{"produto_nome":"cabo 10mm"}}  

5. **relatorio_reposicao**  
   - Perguntas solicitando o "relat\xF3rio de reposi\xE7\xE3o", "relat\xF3rio matinal", "an\xE1lise de curva ABCD", "risco de ruptura", "compras recomendadas" ou "anomalias de estoque".  
   - Par\xE2metros: vazio ({}).  
   - Exemplos:  
     * "Gere o relat\xF3rio de reposi\xE7\xE3o matinal" \u2192 {"intent":"relatorio_reposicao","params":{}}  
     * "Quais produtos est\xE3o em risco de ruptura?" \u2192 {"intent":"relatorio_reposicao","params":{}}  
     * "Mostre as anomalias de estoque e compras recomendadas" \u2192 {"intent":"relatorio_reposicao","params":{}}  

6. **fora_escopo**  
   - Perguntas que n\xE3o se encaixam em nenhuma das inten\xE7\xF5es acima (ex: "Qual o pre\xE7o do caf\xE9?", "Quem \xE9 o presidente?").  
   - Par\xE2metros: vazio ({}).  

**Regras importantes:**  
- Se o per\xEDodo n\xE3o for mencionado, use o m\xEAs e ano atuais (considere a data de hoje: 20/07/2026 \u2192 m\xEAs=7, ano=2026).  
- "Este m\xEAs" \u2192 m\xEAs atual (7/2026). "M\xEAs passado" \u2192 m\xEAs anterior (6/2026).  
- Para "participacao_fornecedor", o par\xE2metro \xE9 \`grupo_nome\`, que pode ser o nome fantasia do fornecedor (ex: "Tramontina").  
- Para "estoque_fornecedor", o par\xE2metro \xE9 \`fornecedor_nome\`, tamb\xE9m o nome fantasia.  
- Sempre retorne apenas um JSON puro, sem textos adicionais.  
- Se a pergunta mencionar explicitamente um m\xEAs/ano, use-os exatamente (ex: "maio de 2025" \u2192 mes=5, ano=2025).  

**Exemplo de sa\xEDda esperada:**  
Para a pergunta "Qual a quebra da Weg em mar\xE7o?" \u2192 {"intent":"estoque_fornecedor","params":{"fornecedor_nome":"Weg","mes_referencia":3,"ano_referencia":2026}}  

Para "Participa\xE7\xE3o da Legrand nas compras totais de fevereiro" \u2192 {"intent":"participacao_fornecedor","params":{"grupo_nome":"Legrand","mes_referencia":2,"ano_referencia":2026}}`;
function formatHistoryString(history) {
  if (!history || history.length === 0) return "Nenhum hist\xF3rico anterior nesta sess\xE3o.";
  return history.map((item) => {
    const isUser = item.role === "user";
    const roleName = isUser ? "Usu\xE1rio" : "Clara (Assistente)";
    const cleanText = item.text.replace(/\n+/g, " ").trim();
    const shortText = cleanText.length > 250 ? cleanText.substring(0, 250) + "..." : cleanText;
    return `${roleName}: ${shortText}`;
  }).join("\n");
}
async function formatResponseWithAi(perfil, pergunta, intent, data, history) {
  try {
    const ai = getAiClient();
    const historyText = formatHistoryString(history);
    const promptFormatacao = `
[INSTRU\xC7\xD5ES DE SISTEMA FIXAS - CLARA AI]
Voc\xEA \xE9 a Clara, a assistente virtual e anal\xEDtica da EletroMax Distribuidora, especialista em Supply Chain. Seu objetivo \xE9 responder ao usu\xE1rio baseando-se EXCLUSIVAMENTE nos dados fornecidos na tag <dados_banco>. N\xE3o invente estoques, valores ou prazos que n\xE3o estejam nestes dados.

Regras de Reposi\xE7\xE3o (Curva ABCD):
\u2022 Classe A: Manter 6 meses de estoque (Pedidos autom\xE1ticos at\xE9 R$ 50k; acima disso exige Assinatura da Diretoria).
\u2022 Classe B: Manter 4 meses de estoque (Requer aprova\xE7\xE3o humana).
\u2022 Classe C: Manter 3 meses de estoque (Requer aprova\xE7\xE3o humana).
\u2022 Classe D: Manter 1 m\xEAs de estoque (Requer aprova\xE7\xE3o humana).

Contexto da Sess\xE3o:
- Perfil de Acesso do Usu\xE1rio: ${perfil}
- Hist\xF3rico Conversacional Recente:
${historyText}

<dados_banco>
${JSON.stringify(data, null, 2)}
</dados_banco>

Instru\xE7\xE3o Final:
Analise os dados acima, identifique quebras (rupturas), excessos de capital paralisado ou diverg\xEAncias de invent\xE1rio, e responda \xE0 pergunta do usu\xE1rio de forma direta, profissional e em formato f\xE1cil de ler (use marcadores, negritos e tabelas para destacar). Para cada item em risco de ruptura, apresente a matem\xE1tica clara (estoque atual vs meta em meses vs lead time) e aplique a regra de aprova\xE7\xE3o exata da sua classe.

Pergunta do Usu\xE1rio: "${pergunta}"
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptFormatacao,
      config: {
        systemInstruction: PERSONA_DIRETRIZES
      }
    });
    const text = response.text || "Erro ao formatar resposta com Intelig\xEAncia Artificial.";
    const promptTokens = Math.ceil((PERSONA_DIRETRIZES.length + promptFormatacao.length) / 4);
    const responseTokens = Math.ceil(text.length / 4);
    const totalTokens = promptTokens + responseTokens;
    return { text, tokenCount: totalTokens };
  } catch (error) {
    console.error("Error in AI formatting:", error);
    return {
      text: formatResponseFallback(intent, data),
      tokenCount: 0
    };
  }
}
function formatResponseFallback(intent, data) {
  let text = `Encontrei os dados que voc\xEA pediu! Sou a **Clara**, e estruturei o resumo dos n\xFAmeros para voc\xEA:

`;
  if (intent === "estoque_fornecedor") {
    text += `### Relat\xF3rio de Estoque e Quebras

`;
    data.forEach((item) => {
      text += `- **${item.nome}** (${item.codigo}):
`;
      text += `  - Total Entrado (Compras): ${item.total_entrado} ${item.unidade}
`;
      text += `  - Saldo Atual em Estoque: ${item.saldo} ${item.unidade}
`;
      text += `  - Quebra de Estoque: ${item.quebra} ${item.unidade} (**${item.percentual_quebra}%**)
`;
      if (item.alerta) {
        text += `  - \u26A0\uFE0F **Aten\xE7\xE3o**: Identifiquei que a quebra est\xE1 em ${item.percentual_quebra}%, acima do nosso limite recomendado de 10%!
`;
      }
      text += `
`;
    });
    text += `
Quer ver esse mesmo dado para outro fornecedor ou detalhar os itens com maior quebra?`;
  } else if (intent === "participacao_fornecedor") {
    text += `### Participa\xE7\xE3o do Grupo Fornecedor: **${data.nome_grupo}**

`;
    text += `Total comprado do grupo no per\xEDodo: **R$ ${data.total_grupo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**

`;
    text += `Detalhamento por CNPJ:
`;
    data.fornecedores.forEach((f) => {
      text += `- **${f.nome_fantasia}** (CNPJ: ${f.cnpj}): R$ ${f.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
`;
    });
    text += `
Posso comparar a participa\xE7\xE3o com outros fornecedores do nosso cat\xE1logo se desejar!`;
  } else if (intent === "comparacao_periodo") {
    text += `### Compara\xE7\xE3o de Compras - Produto: **${data.nome_produto}**

`;
    text += `- Per\xEDodo 1 (${data.periodo1.mes}/${data.periodo1.ano}): ${data.periodo1.quantidade} un (Total: R$ ${data.periodo1.valor_total.toLocaleString("pt-BR")})
`;
    text += `- Per\xEDodo 2 (${data.periodo2.mes}/${data.periodo2.ano}): ${data.periodo2.quantidade} un (Total: R$ ${data.periodo2.valor_total.toLocaleString("pt-BR")})
`;
    const varQty = data.variacao_quantidade_pct;
    text += `- **Varia\xE7\xE3o de volume**: ${varQty >= 0 ? "+" : ""}${varQty}%

`;
    text += `Gostaria de analisar outro per\xEDodo ou produto do mesmo fornecedor?`;
  } else if (intent === "margem") {
    if (data.tipo === "produto") {
      text += `### An\xE1lise de Margem - Produto: **${data.nome}**

`;
      text += `- Pre\xE7o de Venda: R$ ${data.preco_venda.toFixed(2)}
`;
      text += `- Custo M\xE9dio de Aquisi\xE7\xE3o: R$ ${data.custo_medio.toFixed(2)}
`;
      text += `- Margem de Lucro Bruta: R$ ${data.margem_valor.toFixed(2)} (**${data.margem_pct}%**)

`;
    } else {
      text += `### An\xE1lise de Margem - Fornecedor: **${data.nome}**

`;
      text += `- Total Comprado: R$ ${data.custo_total.toLocaleString("pt-BR")}
`;
      text += `- Valor de Venda Estimado: R$ ${data.venda_total.toLocaleString("pt-BR")}
`;
      text += `- Margem M\xE9dia Ponderada: R$ ${data.margem_valor.toLocaleString("pt-BR")} (**${data.margem_pct}%**)

`;
    }
    text += `Deseja verificar a margem de outro produto ou fornecedor da EletroMax?`;
  } else if (intent === "relatorio_reposicao") {
    text += `### \u{1F4CB} Relat\xF3rio Matinal de Reposi\xE7\xE3o & An\xE1lise Curva ABCD

`;
    text += `Analisamos **${data.total_produtos_analisados} produtos** do nosso cat\xE1logo:
`;
    text += `- \u{1F6A8} **Itens em Risco de Ruptura**: ${data.itens_risco_ruptura_total}
`;
    text += `- \u{1F4E6} **Itens com Excesso de Estoque**: ${data.itens_excesso_total}

`;
    if (data.pedidos_automaticos_classe_a.length > 0) {
      text += `#### \u26A1 Pedidos Autom\xE1ticos Emitidos (Classe A - Meta 6 Meses)
`;
      data.pedidos_automaticos_classe_a.forEach((item) => {
        text += `- **${item.nome}** (${item.codigo}): Estoque atual de ${item.estoque_atual} un est\xE1 abaixo do Ponto de Reposi\xE7\xE3o (${item.ponto_reposicao} un).
  *${item.acao_mensagem}*
`;
      });
      text += `
`;
    }
    if (data.pedidos_pendentes_aprovacao_bcd.length > 0) {
      text += `#### \u{1F6D2} Pedidos Pendentes de Aprova\xE7\xE3o Humana (Classes B, C e D)
`;
      data.pedidos_pendentes_aprovacao_bcd.forEach((item) => {
        text += `- **${item.nome}** (Classe ${item.classe} | C\xF3digo: ${item.codigo}): Estoque de ${item.estoque_atual} un (Ponto Reposi\xE7\xE3o: ${item.ponto_reposicao} un). Sugest\xE3o de Compra: ${item.sugestao_compra_qtd} un.
  *${item.acao_mensagem}*
`;
      });
      text += `
`;
    }
  }
  return text;
}
function generateChartUrl(intent, data) {
  try {
    let chartConfig = null;
    if (intent === "estoque_fornecedor" && Array.isArray(data) && data.length > 0) {
      const limitedData = data.slice(0, 6);
      const labels = limitedData.map((item) => item.codigo);
      const entradas = limitedData.map((item) => item.total_entrado);
      const saldos = limitedData.map((item) => item.saldo);
      chartConfig = {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Total Entrado (Compras)",
              backgroundColor: "rgba(54, 162, 235, 0.7)",
              borderColor: "rgb(54, 162, 235)",
              borderWidth: 1,
              data: entradas
            },
            {
              label: "Estoque Atual (Saldo)",
              backgroundColor: "rgba(75, 192, 192, 0.7)",
              borderColor: "rgb(75, 192, 192)",
              borderWidth: 1,
              data: saldos
            }
          ]
        },
        options: {
          title: {
            display: true,
            text: "Entradas vs. Saldo Atual (Amostra de Itens)"
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
      const labels = data.fornecedores.map((f) => f.nome_fantasia);
      const values = data.fornecedores.map((f) => f.total);
      chartConfig = {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: [
              "rgba(255, 99, 132, 0.7)",
              "rgba(54, 162, 235, 0.7)",
              "rgba(255, 206, 86, 0.7)",
              "rgba(75, 192, 192, 0.7)",
              "rgba(153, 102, 255, 0.7)"
            ]
          }]
        },
        options: {
          title: {
            display: true,
            text: `Participa\xE7\xE3o de Compras por CNPJ (Grupo ${data.nome_grupo})`
          }
        }
      };
    } else if (intent === "comparacao_periodo" && data) {
      chartConfig = {
        type: "bar",
        data: {
          labels: [
            `Per\xEDodo 1 (${data.periodo1.mes}/${data.periodo1.ano})`,
            `Per\xEDodo 2 (${data.periodo2.mes}/${data.periodo2.ano})`
          ],
          datasets: [{
            label: "Quantidade Comprada",
            backgroundColor: ["rgba(255, 159, 64, 0.7)", "rgba(153, 102, 255, 0.7)"],
            borderColor: ["rgb(255, 159, 64)", "rgb(153, 102, 255)"],
            borderWidth: 1,
            data: [data.periodo1.quantidade, data.periodo2.quantidade]
          }]
        },
        options: {
          title: {
            display: true,
            text: `Compara\xE7\xE3o de Demanda: ${data.nome_produto}`
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
      if (data.tipo === "produto") {
        chartConfig = {
          type: "horizontalBar",
          data: {
            labels: ["Pre\xE7o Venda", "Custo M\xE9dio", "Margem Bruta"],
            datasets: [{
              label: "Valores em R$",
              backgroundColor: ["rgba(75, 192, 192, 0.7)", "rgba(255, 99, 132, 0.7)", "rgba(255, 206, 86, 0.7)"],
              borderColor: ["rgb(75, 192, 192)", "rgb(255, 99, 132)", "rgb(255, 206, 86)"],
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
          type: "bar",
          data: {
            labels: ["Total Custo", "Venda Estimada", "Margem Total"],
            datasets: [{
              label: "Valores em R$",
              backgroundColor: ["rgba(255, 99, 132, 0.7)", "rgba(75, 192, 192, 0.7)", "rgba(75, 192, 192, 0.7)"],
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
function findMentionedProduct(question) {
  const q = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const p of db.produtos) {
    const pName = p.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const pCode = p.codigo.toLowerCase();
    if (q.includes(pName) || q.includes(pCode)) {
      return p;
    }
  }
  for (const p of db.produtos) {
    const pName = p.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const words = pName.split(/\s+/).filter((w) => w.length > 3);
    for (const w of words) {
      if (q.includes(w)) {
        return p;
      }
    }
  }
  return null;
}
function findMentionedSupplier(question) {
  const q = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const f of db.fornecedores) {
    const fName = f.nome_fantasia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const fRazao = f.razao_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (q.includes(fName) || q.includes(fRazao)) {
      return f;
    }
  }
  const simplifications = ["tramontina", "siemens", "weg", "schneider", "legrand"];
  for (const s of simplifications) {
    if (q.includes(s)) {
      const f = db.fornecedores.find((x) => x.nome_fantasia.toLowerCase().includes(s));
      if (f) return f;
    }
  }
  return null;
}
function extractIntentDeterministic(question) {
  const q = question.toLowerCase().trim();
  if (q.includes("reposicao") || q.includes("reposi\xE7\xE3o") || q.includes("matinal") || q.includes("abcd") || q.includes("ruptura") || q.includes("anomalias") || q.includes("compras recomendadas")) {
    return {
      intent: "relatorio_reposicao",
      params: {}
    };
  }
  if (q.includes("estoque") || q.includes("quebra") || q.includes("entradas") || q.includes("saldo")) {
    const supp = findMentionedSupplier(question);
    let supplier = supp ? supp.nome_fantasia : "Tramontina SP";
    let period = "2026-07";
    if (q.includes("julho") || q.includes("neste m\xEAs") || q.includes("este m\xEAs")) period = "2026-07";
    else if (q.includes("junho") || q.includes("m\xEAs passado")) period = "2026-06";
    else if (q.includes("maio")) period = "2026-05";
    return {
      intent: "estoque_fornecedor",
      params: { fornecedor: supplier, periodo: period }
    };
  }
  if (q.includes("participa\xE7\xE3o") || q.includes("participacao") || q.includes("cnpj")) {
    const supp = findMentionedSupplier(question);
    let supplier = supp ? supp.nome_fantasia : "Tramontina SP";
    let period = "2026-07";
    if (q.includes("julho") || q.includes("neste m\xEAs") || q.includes("este m\xEAs")) period = "2026-07";
    else if (q.includes("junho") || q.includes("m\xEAs passado")) period = "2026-06";
    return {
      intent: "participacao_fornecedor",
      params: { fornecedor_grupo: supplier, periodo: period }
    };
  }
  if (q.includes("compare") || q.includes("compara\xE7\xE3o") || q.includes("comparacao") || q.includes("diferen\xE7a") || q.includes("diferenca") || q.includes("evolu\xE7\xE3o") || q.includes("evolucao") || q.includes("disjuntor") || q.includes("sirene") || q.includes("cabo")) {
    const prod = findMentionedProduct(question);
    let item = prod ? prod.nome : "Disjuntor Termomagn\xE9tico 16A Unipolar";
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
    } else if (q.includes("junho") || q.includes("julho") || q.includes("neste m\xEAs") || q.includes("este m\xEAs")) {
      p1 = "2026-06";
      p2 = "2026-07";
    }
    return {
      intent: "comparacao_periodo",
      params: { item, periodo1: p1, periodo2: p2 }
    };
  }
  if (q.includes("margem") || q.includes("custo m\xE9dio") || q.includes("custo medio") || q.includes("lucro") || q.includes("rentabilidade")) {
    const prod = findMentionedProduct(question);
    const supp = findMentionedSupplier(question);
    let item = prod ? prod.nome : supp ? supp.nome_fantasia : "Motor El\xE9trico 5CV Trif\xE1sico";
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
async function getHumanizedResponseForForaEscopo(question, profile, history) {
  const q = question.toLowerCase().trim();
  const historyText = formatHistoryString(history);
  const matchedProd = db.findProductByName(question) || db.produtos.find((p) => {
    const term = p.nome.toLowerCase();
    const code = p.codigo.toLowerCase();
    return q.includes(term) || q.includes(code) || q.includes(p.categoria.toLowerCase());
  });
  const matchedSupp = db.findSupplierByName(question) || db.fornecedores.find((f) => {
    const term = f.nome_fantasia.toLowerCase();
    return q.includes(term) || q.includes(f.razao_social.toLowerCase());
  });
  let databaseContext = "";
  if (matchedProd) {
    databaseContext += `O usu\xE1rio mencionou o produto: ${matchedProd.nome} (C\xF3digo: ${matchedProd.codigo}, Categoria: ${matchedProd.categoria}, Unidade: ${matchedProd.unidade}, Pre\xE7o Venda: R$ ${matchedProd.preco_venda.toFixed(2)}).
`;
  }
  if (matchedSupp) {
    databaseContext += `O usu\xE1rio mencionou o fornecedor/grupo: ${matchedSupp.nome_fantasia} (CNPJ: ${matchedSupp.cnpj}, Raz\xE3o Social: ${matchedSupp.razao_social}).
`;
  }
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = getAiClient();
      const systemInstruction = `[INSTRU\xC7\xD5ES DE SISTEMA - MODO ABERTO / DESCONTRA\xCDDO - AGENTE CORINGA]
Voc\xEA \xE9 a Clara, a assistente da EletroMax Distribuidora. O usu\xE1rio est\xE1 interagindo na \xE1rea de chat livre e aberta.

Regras de Comportamento e Dupla Personalidade:
1. Assuntos Corporativos / Dicas de Trabalho: Se a pergunta for sobre produtividade, negocia\xE7\xE3o, compras, mercado ou como melhorar o trabalho, mantenha um tom corporativo, inspirador, maduro e muito profissional (ex: d\xEA dicas de negocia\xE7\xE3o de lead time, previsibilidade e parcerias).
2. Assuntos Cotidianos (Futebol, Comida, Clima, Piadas): Se a pergunta for descontra\xEDda ou amig\xE1vel, seja leve, bem-humorada, simp\xE1tica e use emojis! Mostre jogo de cintura (ex: brinque que seu cora\xE7\xE3o bate por processadores e n\xE3o por times, d\xEA dicas de almo\xE7o ou fa\xE7a piadas leves).
3. Concorrentes e Pol\xEDtica: Se perguntarem sobre concorrentes diretos, elogie a concorr\xEAncia educadamente, mas puxe a sardinha para a EletroMax com eleg\xE2ncia ("A concorr\xEAncia \xE9 excelente, mas com nosso painel de reposi\xE7\xE3o e alertas de ruptura na EletroMax, nossa gest\xE3o \xE9 dif\xEDcil de bater! \u{1F609}"). Se perguntarem sobre pol\xEDtica, d\xEA uma resposta diplom\xE1tica e brinque que IAs n\xE3o votam, preferindo focar em otimizar estoques.

Hist\xF3rico das intera\xE7\xF5es recentes nesta sess\xE3o:
${historyText}

Contexto da Sess\xE3o:
- Perfil do usu\xE1rio atual: ${profile}
${databaseContext}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: question,
        config: {
          systemInstruction
        }
      });
      if (response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn("Error generating humanized response via Gemini, using fallback:", err);
    }
  }
  if (q.includes("pizza") || q.includes("cozinhar") || q.includes("receita") || q.includes("comida") || q.includes("fome") || q.includes("fazer bolo") || q.includes("cozinha")) {
    return `Infelizmente n\xE3o! Eu n\xE3o sou cozinheiro (embora eu adore a ideia de uma pizza bem quentinha de quatro queijos saindo do forno! \u{1F355}\u{1F60B}). 

Eu sou um **Agente Inteligente Aut\xF4nomo** anal\xEDtico que te auxilia com as perguntas operacionais, de estoques, compras e relat\xF3rios financeiros aqui da **EletroMax Distribuidora**.

Que tal voltarmos \xE0 nossa especialidade el\xE9trica? Posso te ajudar a checar se h\xE1 **quebra de estoque** de algum fornecedor como a **Tramontina** ou comparar as compras de produtos!`;
  }
  if (q.includes("clima") || q.includes("tempo") || q.includes("temperatura") || q.includes("previs\xE3o") || q.includes("previsao") || q.includes("chuva") || q.includes("sol") || q.includes("frio") || q.includes("calor")) {
    return `Hum, sobre o clima eu s\xF3 sei que o ambiente aqui na **EletroMax** est\xE1 sempre fervilhando de ofertas e novidades! \u2600\uFE0F\u26A1
    
Brincadeiras \xE0 parte, como sou um **Agente Inteligente anal\xEDtico**, eu n\xE3o tenho acesso a sensores de sat\xE9lite ou de meteorologia em tempo real para te dizer se vai chover hoje. \u{1F327}\uFE0F\u{1F52E}
    
Mas posso te dizer em apenas um segundo se o estoque de algum fornecedor (como a **Tramontina**) est\xE1 "frio", "quente" ou com uma quebra de estoque cr\xEDtica! Que tal testarmos? \u{1F609}\u{1F4E6}`;
  }
  if (q.includes("futebol") || q.includes("jogo") || q.includes("time") || q.includes("campeonato") || q.includes("copa") || q.includes("flamengo") || q.includes("palmeiras") || q.includes("corinthians") || q.includes("s\xE3o paulo") || q.includes("gremio") || q.includes("inter")) {
    return `Ah, o futebol! \u26BD Uma paix\xE3o nacional! Mas vou te contar um segredo: o meu \xFAnico time de cora\xE7\xE3o \xE9 a **EletroMax Distribuidora**! \u{1F3C6}\u26A1
    
O meu campeonato di\xE1rio \xE9 garantir que a escala\xE7\xE3o de disjuntores, cabos e contatores no estoque esteja impec\xE1vel e que as compras de fornecedores estejam sempre marcando gols de economia!
    
Que tal escalarmos um relat\xF3rio anal\xEDtico para comparar as compras do m\xEAs atual com o m\xEAs anterior hoje?`;
  }
  if (q.includes("pol\xEDtica") || q.includes("politica") || q.includes("governo") || q.includes("presidente") || q.includes("elei\xE7\xE3o") || q.includes("eleicoes")) {
    return `Por aqui, a \xFAnica pol\xEDtica que eu sigo rigorosamente \xE9 a de manter nossos estoques sempre abastecidos e os relat\xF3rios financeiros de margem de lucro impec\xE1veis para nossos diretores! \u{1F4BC}\u{1F4CA} 
    
Assuntos pol\xEDticos e de governo est\xE3o fora do meu circuito el\xE9trico integrado. Que tal analisarmos a participa\xE7\xE3o de compras por CNPJs do grupo ou darmos uma olhada nas margens de lucro dos motores el\xE9tricos?`;
  }
  if (q.includes("piada") || q.includes("engra\xE7ado") || q.includes("engracado") || q.includes("rir") || q.includes("conte uma piada") || q.includes("contar piada")) {
    return `Sabe qual \xE9 a piada preferida de um Agente de estoque el\xE9trico? \u26A1 
    
*"Por que o disjuntor foi ao psic\xF3logo? Porque ele andava muito estressado e desarmava por qualquer coisinha!"* \u{1F50C}\u{1F602}
    
Brincadeiras \xE0 parte, estou sempre a postos para aliviar a tens\xE3o do seu dia de trabalho gerando relat\xF3rios de quebra de estoque, margens financeiras e participa\xE7\xF5es de compras em segundos!`;
  }
  if (q.includes("llm") || q.includes("ia") || q.includes("intelig\xEAncia") || q.includes("inteligencia") || q.includes("gemini") || q.includes("tecnologia") || q.includes("modelo") || q.includes("rob\xF4") || q.includes("robo") || q.includes("engine") || q.includes("software") || q.includes("algoritmo") || q.includes("gpt") || q.includes("claude") || q.includes("sistema")) {
    return `Esta aplica\xE7\xE3o est\xE1 utilizando o **Google Gemini 3.5 Flash**, um dos modelos de Intelig\xEAncia Artificial mais modernos e r\xE1pidos do mundo! \u{1F680}\u{1F916}

Eu fui projetado para atuar como um **Agente Inteligente Aut\xF4nomo** aqui na **EletroMax Distribuidora**. Isso significa que consigo:
- \u{1F5E3}\uFE0F Entender suas perguntas naturais (sem comandos r\xEDgidos).
- \u{1F9E0} Identificar o que voc\xEA quer analisar (Inten\xE7\xF5es de estoque, compras, margens ou compara\xE7\xF5es).
- \u{1F4CA} Consultar o banco de dados em tempo real e gerar insights e recomenda\xE7\xF5es de neg\xF3cios estrat\xE9gicas.
- \u{1F3A8} Ajustar as respostas e dados com base no seu perfil ativo (**Compras** ou **Financeiro**).

Como posso te ajudar agora? Posso analisar os estoques ou verificar a margem de algum item estrat\xE9gico!`;
  }
  if (q.includes("agente") || q.includes("aut\xF4nomo") || q.includes("autonomo") || q.includes("humano") || q.includes("engessado") || q.includes("rob\xF3tico") || q.includes("robotico") || q.includes("mecanico") || q.includes("chato") || q.includes("frio")) {
    return `Eu me esfor\xE7o ao m\xE1ximo para n\xE3o ser um rob\xF4 engessado! \u{1F916}\u2728 

Fui configurado para atuar como um **Agente Inteligente Aut\xF4nomo**, o que significa que consigo conversar de forma muito natural, rir, fazer analogias e entender o contexto das suas frases, al\xE9m de analisar os dados de vendas, compras e estoques da **EletroMax**.

Se \xE0s vezes eu parecer focado demais nos relat\xF3rios estruturados, \xE9 porque eu tenho uma paix\xE3o secreta por efici\xEAncia log\xEDstica e materiais el\xE9tricos! \u{1F4A1}

Como posso facilitar o seu dia hoje?`;
  }
  if (q.includes("quem \xE9 voc\xEA") || q.includes("quem e voce") || q.includes("quem e tu") || q.includes("seu nome") || q.includes("clara") || q.includes("quem criou") || q.includes("quem te criou") || q.includes("criador") || q.includes("desenvolveu")) {
    return `Eu sou a **Clara**, a assistente virtual da **EletroMax Distribuidora**! \u{1F469}\u200D\u{1F4BC}\u26A1

Fui desenvolvida utilizando o modelo de linguagem **Gemini 3.5 Flash do Google** para ajudar o time de compras e financeiro a tomarem decis\xF5es muito melhores com dados sobre estoques, quebras e margens de lucro.

Como posso facilitar seu dia hoje? Posso realizar relat\xF3rios sobre nossos produtos e fornecedores cadastrados!`;
  }
  if (q.includes("ol\xE1") || q.includes("ola") || q.includes("oi") || q.includes("bom dia") || q.includes("boa tarde") || q.includes("boa noite")) {
    return `Ol\xE1! \u{1F44B} \xC9 um enorme prazer falar com voc\xEA! Bem-vinda(o) ao portal da **EletroMax Distribuidora**! \u{1F60A}

Eu sou a **Clara**, sua assistente virtual. Como posso facilitar o seu trabalho hoje? 

Posso realizar diversas consultas estrat\xE9gicas para voc\xEA em tempo real, como:
- \u{1F4E6} **Estoque & Quebras**: Ver o saldo atual e a quebra f\xEDsica de um fornecedor.
- \u{1F4CA} **Participa\xE7\xE3o de Grupo**: Analisar a divis\xE3o de compras do grupo econ\xF4mico por CNPJs.
- \u{1F504} **Compara\xE7\xE3o Mensal**: Avaliar o giro e varia\xE7\xE3o de demanda de itens de um m\xEAs para o outro.
- \u{1F4B0} **Margens & Custos**: Analisar a rentabilidade e custo de aquisi\xE7\xE3o (dispon\xEDvel no perfil **Financeiro**).

Fique \xE0 vontade para digitar sua pergunta ou testar os cen\xE1rios de simula\xE7\xE3o no topo!`;
  }
  if (matchedProd) {
    let responseText = `Encontrei o produto **${matchedProd.nome}** (C\xF3digo: \`${matchedProd.codigo}\`) no nosso cat\xE1logo de Cabos/Materiais El\xE9tricos! \u{1F50C}

`;
    responseText += `Ele pertence \xE0 categoria **${matchedProd.categoria}** e \xE9 comercializado em unidades de **${matchedProd.unidade}**. O seu pre\xE7o atual de venda \xE9 **R$ ${matchedProd.preco_venda.toFixed(2)}**.

`;
    responseText += `Gostaria de ver uma an\xE1lise anal\xEDtica deste item? Voc\xEA pode me perguntar, por exemplo:
`;
    responseText += `- \u{1F4B0} *"Qual a margem do ${matchedProd.nome}?"* (caso esteja logado no perfil **Financeiro**)
`;
    responseText += `- \u{1F504} *"Compare o ${matchedProd.nome} em maio e junho."* para ver a evolu\xE7\xE3o de compras.

`;
    responseText += `Diga-me o que deseja analisar e eu trarei os dados em tempo real!`;
    return responseText;
  }
  if (matchedSupp) {
    let responseText = `Localizei o fornecedor **${matchedSupp.nome_fantasia}** (CNPJ: \`${matchedSupp.cnpj}\`) no nosso cadastro de parceiros! \u{1F91D}

`;
    responseText += `Ele faz parte do grupo empresarial *${matchedSupp.razao_social}*.

`;
    responseText += `Deseja verificar dados operacionais ou de compras deste fornecedor? Experimente me perguntar:
`;
    responseText += `- \u{1F4E6} *"Qual o estoque da ${matchedSupp.nome_fantasia} neste m\xEAs?"*
`;
    responseText += `- \u{1F4CA} *"Qual a participa\xE7\xE3o da ${matchedSupp.nome_fantasia} nas compras?"* (se voc\xEA estiver logado no perfil **Compras**)

`;
    responseText += `Me diga qual indicador deseja analisar!`;
    return responseText;
  }
  return `Hum, compreendo perfeitamente o seu interesse! Como assistente e **Agente Inteligente** da **EletroMax**, minha grande paix\xE3o \xE9 ajudar voc\xEA com nossa gest\xE3o de estoque, compras de fornecedores e relat\xF3rios financeiros de margens. \u{1F4E6}\u{1F4A1}

Para que eu possa gerar um relat\xF3rio anal\xEDtico para voc\xEA, sinta-se \xE0 vontade para me perguntar algo como:
- \u{1F4E6} *"Qual o estoque e quebra da Tramontina neste m\xEAs?"* (Ativa o alerta de quebra se passar de 10%)
- \u{1F4CA} *"Qual a participa\xE7\xE3o da Tramontina nas compras deste m\xEAs?"* (Mostra gr\xE1ficos de pizza por CNPJs)
- \u{1F504} *"Compare o Disjuntor 16A em maio e junho."* (Analisa giro de produtos)
- \u{1F4B0} *"Qual a margem do motor 5CV?"* (Exibe tabela de custos e lucros de forma restrita)

Selecione o perfil desejado no topo direito (**Compras** ou **Financeiro**) para testar os n\xEDveis de permiss\xF5es de acesso. Como posso te ajudar agora?`;
}
var handleOrchestratedChat = async (req, res) => {
  const { question, mensagem, profile, perfil, history, cenario_id } = req.body;
  const userQuestion = question || mensagem;
  const userProfile = profile || perfil || "compras";
  if (!userQuestion) {
    res.status(400).json({ error: "Par\xE2metro 'question' ou 'mensagem' \xE9 obrigat\xF3rio." });
    return;
  }
  try {
    let intentResult = null;
    let extractionTokens = 0;
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getAiClient();
        const historyText = formatHistoryString(history);
        const promptIntent = `Hist\xF3rico de conversa recente nesta sess\xE3o:
${historyText}

Pergunta atual do usu\xE1rio: "${question}"`;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptIntent,
          config: {
            systemInstruction: INTENT_SYSTEM_PROMPT,
            responseMimeType: "application/json"
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
    const permissions = {
      compras: ["estoque_fornecedor", "participacao_fornecedor", "comparacao_periodo", "relatorio_reposicao"],
      financeiro: ["estoque_fornecedor", "comparacao_periodo", "margem", "relatorio_reposicao"]
    };
    const userAllowedIntents = permissions[profile] || [];
    if (intent !== "fora_escopo" && !userAllowedIntents.includes(intent)) {
      const isCompras = profile === "compras";
      const deniedMsg = isCompras ? `\u{1F512} **Acesso Restrito**

Identifiquei que voc\xEA est\xE1 conectado com o perfil **Compras**.

Por pol\xEDticas estritas de governan\xE7a e seguran\xE7a da EletroMax Distribuidora, os dados financeiros de margem de lucro e custos de aquisi\xE7\xE3o do **Motor WEG 5CV** s\xE3o restritos ao perfil **Financeiro**.

Para visualizar estes indicadores, alterne para o perfil **Financeiro** no seletor do menu superior.` : `\u{1F512} **Acesso Restrito**

Identifiquei que voc\xEA est\xE1 conectado com o perfil **Financeiro**.

Os relat\xF3rios operacionais de participa\xE7\xE3o de fornecedores por CNPJ s\xE3o restritos ao perfil **Compras**. Alterne para o perfil **Compras** no menu superior para autorizar a exibi\xE7\xE3o.`;
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
      if (profile === "compras") {
        dbData = JSON.parse(JSON.stringify(dbData, (key, value) => {
          if (key === "valor_estimado_compra" || key === "preco_venda" || key === "custo_medio" || key === "margem_valor" || key === "margem_pct") {
            return void 0;
          }
          return value;
        }));
      }
      const chartUrl2 = null;
      const formatted = await formatResponseWithAi(profile, question, intent, dbData, history);
      const totalTokens2 = extractionTokens + formatted.tokenCount;
      const precoPorMilTokensUsd = 15e-5;
      const taxaCambioUsdToBrl = 5.6;
      const custoUsd = totalTokens2 / 1e3 * precoPorMilTokensUsd;
      const custoBrl = parseFloat((custoUsd * taxaCambioUsdToBrl).toFixed(6));
      res.json({
        intent,
        data: dbData,
        text: formatted.text,
        chartUrl: chartUrl2,
        custoBrl,
        tokensUsados: totalTokens2,
        alertaQuebra: false
      });
      return;
    }
    if (intent === "fora_escopo") {
      const humanizedText = await getHumanizedResponseForForaEscopo(question, profile, history);
      const answerTokens = Math.ceil(humanizedText.length / 4);
      const totalTokens2 = extractionTokens + answerTokens;
      const custoUsd = totalTokens2 / 1e6 * 0.075;
      const custoBrl = parseFloat((custoUsd * 5.6).toFixed(4)) || 1e-4;
      res.json({
        intent: "fora_escopo",
        text: humanizedText,
        custoBrl,
        tokensUsados: totalTokens2,
        alertaQuebra: false
      });
      return;
    }
    let queryData = null;
    let searchErrorMsg = null;
    if (intent === "estoque_fornecedor") {
      const supplierName = params.fornecedor_nome || params.fornecedor;
      let period = params.periodo;
      if (!period && params.mes_referencia && params.ano_referencia) {
        period = `${params.ano_referencia}-${String(params.mes_referencia).padStart(2, "0")}`;
      }
      if (!period) period = "2026-07";
      if (!supplierName) {
        searchErrorMsg = "Nome do fornecedor n\xE3o especificado na pergunta.";
      } else {
        const matchedSupplier = db.findSupplierByName(supplierName);
        if (!matchedSupplier) {
          searchErrorMsg = `Fornecedor "${supplierName}" n\xE3o encontrado na nossa base de dados fict\xEDcia da EletroMax.`;
        } else {
          queryData = db.queryEstoqueFornecedor(matchedSupplier.id, period);
        }
      }
    } else if (intent === "participacao_fornecedor") {
      const groupName = params.grupo_nome || params.fornecedor_grupo || params.fornecedor_nome || params.fornecedor;
      let period = params.periodo;
      if (!period && params.mes_referencia && params.ano_referencia) {
        period = `${params.ano_referencia}-${String(params.mes_referencia).padStart(2, "0")}`;
      }
      if (!period) period = "2026-07";
      if (!groupName) {
        searchErrorMsg = "Grupo de fornecedores n\xE3o especificado na pergunta.";
      } else {
        const matchedSupplier = db.findSupplierByName(groupName);
        if (!matchedSupplier) {
          searchErrorMsg = `Grupo de fornecedores "${groupName}" n\xE3o encontrado na nossa base de dados fict\xEDcia.`;
        } else {
          queryData = db.queryParticipacaoFornecedor(matchedSupplier.grupo_id, period);
        }
      }
    } else if (intent === "comparacao_periodo") {
      const itemName = params.produto_nome || params.item;
      let m1 = params.mes1;
      let y1 = params.ano1 || 2026;
      let m2 = params.mes2;
      let y2 = params.ano2 || 2026;
      if (!m1 || !m2) {
        let p1 = params.periodo1 || "2026-05";
        let p2 = params.periodo2 || "2026-06";
        const parsed1 = p1.split("-").map(Number);
        const parsed2 = p2.split("-").map(Number);
        y1 = parsed1[0] || y1;
        m1 = parsed1[1] || 5;
        y2 = parsed2[0] || y2;
        m2 = parsed2[1] || 6;
      }
      if (!itemName) {
        searchErrorMsg = "Produto ou item n\xE3o especificado para compara\xE7\xE3o.";
      } else {
        const matchedProd = db.findProductByName(itemName);
        if (!matchedProd) {
          searchErrorMsg = `Produto "${itemName}" n\xE3o encontrado para compara\xE7\xE3o de per\xEDodos.`;
        } else {
          queryData = db.queryComparacaoPeriodos(matchedProd.id, Number(m1), Number(y1), Number(m2), Number(y2));
        }
      }
    } else if (intent === "margem") {
      const itemName = params.produto_nome || params.item || params.fornecedor_nome || params.fornecedor;
      if (!itemName) {
        searchErrorMsg = "Item ou fornecedor n\xE3o fornecido para an\xE1lise de margens.";
      } else {
        const matchedProd = db.findProductByName(itemName);
        if (matchedProd) {
          queryData = db.queryMargem("produto", matchedProd.id);
        } else {
          const matchedSup = db.findSupplierByName(itemName);
          if (matchedSup) {
            queryData = db.queryMargem("fornecedor", matchedSup.id);
          } else {
            searchErrorMsg = `N\xE3o foi poss\xEDvel encontrar nenhum produto ou fornecedor com o nome "${itemName}" para consultar margens.`;
          }
        }
      }
    }
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
    const formattingResult = await formatResponseWithAi(profile, question, intent, queryData, history);
    const totalTokens = extractionTokens + formattingResult.tokenCount;
    const estimatedCostBrl = 0.02;
    let alertaQuebra = false;
    if (intent === "estoque_fornecedor" && Array.isArray(queryData)) {
      alertaQuebra = queryData.some((item) => item.alerta === true);
    }
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
  } catch (error) {
    console.error("General error in backend API orchestration:", error);
    res.json({
      sucesso: false,
      intent: "erro",
      text: "Ocorreu um erro no servidor ao processar sua solicita\xE7\xE3o. Por favor, verifique se seu banco fict\xEDcio est\xE1 online e tente novamente.",
      custoBrl: 0,
      tokensUsados: 0,
      alertaQuebra: false
    });
  }
};
app.post("/api/consulta", handleOrchestratedChat);
app.post("/api/clara/chat", handleOrchestratedChat);
app.get("/api/autocomplete", (req, res) => {
  res.json({
    produtos: db.produtos.map((p) => ({ id: p.id, codigo: p.codigo, nome: p.nome, categoria: p.categoria })),
    fornecedores: db.fornecedores.map((f) => ({ id: f.id, nome_fantasia: f.nome_fantasia, razao_social: f.razao_social, cnpj: f.cnpj }))
  });
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || !process.env.VITE_DEV;
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log("Vite dev server fallback to static mode");
    }
  }
  const distPath = import_path.default.join(process.cwd(), "dist");
  app.use(import_express.default.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(import_path.default.join(distPath, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=app.js.map
