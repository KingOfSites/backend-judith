import { prisma } from "../db/client.js";
import { AreaKeywords, parseAreaKeywords } from "./keywords.js";

// Ajustes editados no Admin (tabela KnowledgeSetting, chave → JSON).
export const AREA_KEYWORDS_KEY = "areaKeywords";
export const BASE_REVISADA_KEY = "baseRevisadaEm";

async function setting(chave: string): Promise<unknown> {
  // A busca não pode cair por causa de um ajuste opcional (ex.: tabela ainda não criada).
  try { return (await prisma.knowledgeSetting.findUnique({ where: { chave } }))?.valor ?? null; }
  catch { return null; }
}

export async function loadAreaKeywords(): Promise<AreaKeywords> {
  return parseAreaKeywords(await setting(AREA_KEYWORDS_KEY));
}

/** "DD/MM" da última revisão da base (formato pedido pelo cliente), ou null se não informada. */
export async function loadBaseRevisadaEm(): Promise<string | null> {
  const value = await setting(BASE_REVISADA_KEY);
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  return match ? `${match[3]}/${match[2]}` : null;
}
