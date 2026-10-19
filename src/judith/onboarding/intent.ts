import { TipoEmpresa } from "@prisma/client";

const SAUDACOES = [
  "oi",
  "ola",
  "olá",
  "bom dia",
  "boa tarde",
  "boa noite",
  "eai",
  "e aí",
  "opa",
  "salve",
  "hello",
  "hi",
];

const ACEITES = ["sim", "s", "aceito", "concordo", "ok", "okay", "blz", "beleza", "claro"];
const NEGATIVAS = ["não", "nao", "n", "recuso", "discordo"];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[!?.,;:]+$/g, "")
    .trim();
}

export function isSaudacao(text: string): boolean {
  const n = normalize(text);
  if (n.length === 0) return false;
  if (SAUDACOES.includes(n)) return true;
  // "oi judith", "boa tarde, tudo bem?"
  return SAUDACOES.some((s) => n.startsWith(s + " ") || n.startsWith(s + ","));
}

export function isAceiteTermos(text: string): boolean {
  const n = normalize(text);
  return ACEITES.includes(n);
}

export function isRecusaTermos(text: string): boolean {
  const n = normalize(text);
  return NEGATIVAS.includes(n);
}

// Mapeia resposta livre do usuário para o enum TipoEmpresa.
export function parseTipoEmpresa(text: string): TipoEmpresa | null {
  const n = normalize(text);
  // Ordem importa: testa o mais específico primeiro.
  if (n.includes("mei")) return "MEI";
  if (
    n.includes("autonom") ||
    n.includes("autônom") ||
    n.includes("sem cnpj") ||
    n.includes("freela")
  ) {
    return "AUTONOMO";
  }
  if (n.includes("epp")) return "EPP";
  if (n.includes("simples") || n.includes("micro empresa") || n === "me" || n.includes(" me ")) {
    return "ME";
  }
  if (n.includes("empresa")) return "ME";
  return null;
}

// Resposta SIM/NÃO livre ("tenho sim", "não tenho nenhum", "2 funcionários"). null = não entendeu.
export function parseSimNao(text: string): boolean | null {
  const n = normalize(text).replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
  if (!n) return null;
  if (NEGATIVAS.includes(n) || /^(nao|não)\b/.test(n) || /\b(nenhum|ninguem|sem funcionario|sem empregado|sozinh)/.test(n)) return false;
  if (ACEITES.includes(n) || /^(sim|tenho|isso|positivo|afirmativo)\b/.test(n) || /\b(tenho|temos)\b/.test(n) || /\b\d+ (funcionario|empregado|colaborador)/.test(n)) return true;
  return null;
}
