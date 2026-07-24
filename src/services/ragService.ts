import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from "../db/connection.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const FALLBACK_FILE = path.join(process.cwd(), "src", "db", "docs_fallback.json");

interface DocItem {
  id: number;
  titulo: string;
  conteudo: string;
  embedding: number[];
  fonte: string;
  criado_em?: string;
}

// Vocabulário para o vetorizador leve local (fallback determinístico de 256 dimensões)
const VOCAB = [
  "prazo", "entrega", "industrial", "dias", "uteis", "urgente", "ruptura", "sla",
  "alcada", "financeira", "50000", "50k", "bloqueado", "assinatura", "diretoria",
  "curva", "abcd", "classe", "cobertura", "estoque", "meses", "reposicao",
  "chamado", "ti", "internet", "computador", "suporte", "alertas", "email",
  "epi", "luvas", "oculos", "capacete", "botas", "almoxarifado", "seguranca",
  "fornecedor", "grupo", "tramontina", "schneider", "cnpj", "dependencia",
  "margem", "bruta", "preco", "venda", "custo", "medio", "sigiloso", "financeiro",
  "suprimentos", "compras", "armazem", "embarque", "pedido", "aprovacao"
];

function generateLocalVector(text: string): number[] {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = normalized.split(/\W+/);
  
  // Vetor fixo de 256 posições para frequências e TF-IDF simples
  const vector = new Array(256).fill(0);
  
  // 1. Frequência dos termos chave do vocabulário
  VOCAB.forEach((term, idx) => {
    const termNorm = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const count = words.filter(w => w.includes(termNorm) || termNorm.includes(w)).length;
    if (count > 0) {
      vector[idx % 256] += count * 2.0;
    }
  });

  // 2. Hash por n-gramas de caracteres para palavras fora do vocabulário
  for (let i = 0; i < normalized.length - 3; i++) {
    const trigram = normalized.substring(i, i + 3);
    let hash = 0;
    for (let j = 0; j < trigram.length; j++) {
      hash = (hash << 5) - hash + trigram.charCodeAt(j);
      hash |= 0;
    }
    const pos = Math.abs(hash) % 256;
    vector[pos] += 0.1;
  }

  // Normalização do vetor
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return norm === 0 ? vector : vector.map(val => val / norm);
}

// Gera embedding. Por padrão usa o gerador vetorial LOCAL (256d, determinístico, sem rede)
// — que é o mesmo formato usado para semear a base (docs_fallback.json) e garante
// respostas instantâneas sem dependência de rede. forceLocal=false tenta a API remota.
export async function getEmbedding(text: string, forceLocal: boolean = true): Promise<number[]> {
  if (forceLocal) {
    return generateLocalVector(text);
  }
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    if (result && result.embedding && result.embedding.values) {
      return result.embedding.values;
    }
  } catch (error: any) {
    console.warn("⚠️ API Gemini text-embedding-004 indisponível. Usando gerador vetorial local.");
  }
  return generateLocalVector(text);
}

// Similaridade de Cosseno
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function readFallbackDocs(): DocItem[] {
  if (fs.existsSync(FALLBACK_FILE)) {
    try {
      const data = fs.readFileSync(FALLBACK_FILE, "utf-8");
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveFallbackDocs(docs: DocItem[]) {
  const dir = path.dirname(FALLBACK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(FALLBACK_FILE, JSON.stringify(docs, null, 2), "utf-8");
}

export async function initDocsTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS docs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        titulo VARCHAR(255) NOT NULL,
        conteudo TEXT NOT NULL,
        embedding JSON NOT NULL,
        fonte VARCHAR(255) DEFAULT 'Manual Emptum',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(sql);
  } catch (e: any) {
    // Silencioso caso MySQL remoto esteja inacessível
  }
}

export async function insertDocument(titulo: string, conteudo: string, fonte: string = 'Manual Emptum') {
  const embedding = await getEmbedding(conteudo);
  
  try {
    await initDocsTable();
    const sql = "INSERT INTO docs (titulo, conteudo, embedding, fonte) VALUES (?, ?, ?, ?)";
    const [result]: any = await pool.query(sql, [titulo, conteudo, JSON.stringify(embedding), fonte]);
    return result.insertId;
  } catch (e) {
    const docs = readFallbackDocs();
    const existingIdx = docs.findIndex(d => d.titulo === titulo);
    const newDoc: DocItem = {
      id: existingIdx >= 0 ? docs[existingIdx].id : docs.length + 1,
      titulo,
      conteudo,
      embedding,
      fonte,
      criado_em: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      docs[existingIdx] = newDoc;
    } else {
      docs.push(newDoc);
    }
    saveFallbackDocs(docs);
    return newDoc.id;
  }
}

export interface SearchResult {
  id: number;
  titulo: string;
  conteudo: string;
  fonte: string;
  similarity: number;
}

export async function searchKnowledge(query: string, topK: number = 5, forceLocal: boolean = true): Promise<SearchResult[]> {
  try {
    const queryEmb = await getEmbedding(query, forceLocal);
    let docsToSearch: DocItem[] = [];

    // Caminho rápido: base local em arquivo (sem round-trip ao MySQL remoto)
    if (forceLocal) {
      docsToSearch = readFallbackDocs();
      if (!docsToSearch || docsToSearch.length === 0) {
        try {
          const [rows]: any = await pool.query("SELECT id, titulo, conteudo, embedding, fonte FROM docs");
          if (rows && rows.length > 0) {
            docsToSearch = rows.map((r: any) => ({
              ...r,
              embedding: typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding
            }));
          }
        } catch (e) { /* mantém vazio */ }
      }
      const localResults: SearchResult[] = (docsToSearch || []).map((doc) => ({
        id: doc.id,
        titulo: doc.titulo,
        conteudo: doc.conteudo,
        fonte: doc.fonte,
        similarity: cosineSimilarity(queryEmb, doc.embedding || [])
      }));
      localResults.sort((a, b) => b.similarity - a.similarity);
      return localResults.filter(r => r.similarity >= 0.15).slice(0, topK);
    }

    try {
      const [rows]: any = await pool.query("SELECT id, titulo, conteudo, embedding, fonte FROM docs");
      if (rows && rows.length > 0) {
        docsToSearch = rows.map((r: any) => ({
          ...r,
          embedding: typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding
        }));
      } else {
        docsToSearch = readFallbackDocs();
      }
    } catch (e) {
      docsToSearch = readFallbackDocs();
    }

    if (!docsToSearch || docsToSearch.length === 0) {
      return [];
    }

    const results: SearchResult[] = docsToSearch.map((doc) => {
      const similarity = cosineSimilarity(queryEmb, doc.embedding || []);
      return {
        id: doc.id,
        titulo: doc.titulo,
        conteudo: doc.conteudo,
        fonte: doc.fonte,
        similarity
      };
    });

    results.sort((a, b) => b.similarity - a.similarity);
    return results.filter(r => r.similarity >= 0.15).slice(0, topK);
  } catch (error: any) {
    console.error("❌ Erro ao buscar conhecimento RAG:", error.message);
    return [];
  }
}
