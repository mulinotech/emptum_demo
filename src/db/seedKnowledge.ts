import { insertDocument } from "../services/ragService.js";

const DOCUMENTOS_CONHECIMENTO = [
  {
    titulo: "Política de Prazos de Entrega e SLA",
    fonte: "Manual de Operações Emptum",
    conteudo: `O prazo de entrega padrão para clientes do segmento industrial e grandes contas é de até 15 dias úteis após a confirmação do pedido de compra. Para distribuidoras e varejo regional, o prazo padrão é de 5 a 7 dias úteis. Em casos de pedidos emergenciais de ruptura (linha de produção parada), o SLA de atendimento prioritário é de 48 horas úteis, mediante aprovação do gerente de Supply Chain.`
  },
  {
    titulo: "Regras de Alçada Financeira e Aprovações de Compra",
    fonte: "Diretrizes Financeiras EletroMax",
    conteudo: `Pedidos de compra automatizados para produtos da Classe A da Curva ABCD podem ser gerados até a trava de R$ 50.000,00 (Cinquenta mil reais). Qualquer pedido de reposição ou compra cujo valor total exceder R$ 50.000,00 é automaticamente bloqueado pelo sistema e exige a Assinatura da Diretoria Executiva ou aprovação manual no portal de governança antes da emissão da Ordem de Compra ao fornecedor.`
  },
  {
    titulo: "Metodologia de Curva ABCD e Cobertura de Estoque",
    fonte: "Política de Gestão de Estoque",
    conteudo: `A EletroMax utiliza a metodologia de Curva ABCD para dimensionamento da política de estoque mínimo e reposição:
• Classe A: Itens de altíssimo giro e valor. Meta de cobertura: 6 meses de estoque. Pedidos de compra automáticos até R$ 50k; acima exige aprovação diretoria.
• Classe B: Itens de alto giro e relevância intermediária. Meta de cobertura: 4 meses de estoque. Requer aprovação do analista de compras.
• Classe C: Itens de giro moderado. Meta de cobertura: 3 meses de estoque. Requer validação periódica.
• Classe D: Itens de baixo giro ou sob demanda. Meta de cobertura: 1 mês de estoque.`
  },
  {
    titulo: "Procedimento de Abertura e Escalamento de Chamados de TI",
    fonte: "Manual da Central de Serviços TI",
    conteudo: `Para relatar problemas de tecnologia (como queda de link de internet, computadores inoperantes ou falhas em coletores de dados do armazém), o funcionário pode utilizar a assistente Clara através do comando de abertura de chamado. A Clara gera um número de chamado imediato e envia alertas por e-mail e push notification para ti@empresa.com. Chamados com severidade ALTA têm SLA de resposta inicial de 30 minutos.`
  },
  {
    titulo: "Política de Distribuição e Controle de EPIs",
    fonte: "Normas de Segurança do Trabalho (SST)",
    conteudo: `Os Equipamentos de Proteção Individual (EPIs) como luvas de proteção, óculos de segurança, capacetes e botas com biqueira de aço devem ser requisitados via almoxarifado central. Cada colaborador possui uma ficha de entrega associada ao seu CPF. É obrigatório manter estoque de segurança mínimo de 60 dias para todos os EPIs de uso contínuo nas operações de movimentação de cargas no armazém.`
  },
  {
    titulo: "Política de Fornecedores e Grupos Econômicos",
    fonte: "Diretrizes de Suprimentos",
    conteudo: `Na análise de participação de fornecedores, a Emptum consolida as compras por Grupo Econômico (agrupando diferentes CNPJs de filiais ou distribuidores da mesma fabricante, como no caso do Grupo Tramontina ou Schneider Electric). Nenhum fornecedor único pode ultrapassar 35% de dependência da curva total de compras sem plano de mitigação de risco de suprimentos homologado.`
  },
  {
    titulo: "Cálculo de Margem Bruta e Precificação",
    fonte: "Manual Financeiro EletroMax",
    conteudo: `A margem bruta percentual é calculada com a fórmula: ((Preço de Venda - Custo Médio Ponderado) / Preço de Venda) * 100. Informações sigilosas de margem financeira e custo médio unitário são restritas apenas aos perfis de acesso 'financeiro' e 'diretoria', sendo omitidas automaticamente pela Clara quando a consulta for feita por usuários com perfil 'compras' ou operacional.`
  }
];

export async function seed() {
  console.log("🌱 Iniciando o seed de conhecimento RAG (Gemini text-embedding-004)...");
  
  try {
    for (const doc of DOCUMENTOS_CONHECIMENTO) {
      console.log(`⏳ Gerando embedding Gemini e salvando: "${doc.titulo}"...`);
      const id = await insertDocument(doc.titulo, doc.conteudo, doc.fonte);
      console.log(`  ✅ Inserido com Sucesso (ID/Posição: ${id})`);
    }

    console.log("🚀 Seed de conhecimento RAG concluído com sucesso!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erro ao executar seed de conhecimento:", error.message);
    process.exit(1);
  }
}

seed();
