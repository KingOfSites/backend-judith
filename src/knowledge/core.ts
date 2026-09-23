import { createHash } from "node:crypto";
import { Area } from "./areas.js";
import { Chunk, PARSER_VERSION, parseNotebook } from "./parser.js";

export const hash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
export type Source = { id: string; slug: string; titulo: string; area: string; status: string; fontes: unknown; conteudo: string; ordem: number };
export const fingerprint = (s: Source) => hash(JSON.stringify([PARSER_VERSION, s.id, s.slug, s.titulo, s.area, s.status, s.fontes, s.conteudo, s.ordem]));
export type SemanticProvider = { model: string; embed(text: string, kind?: "query" | "passage"): Promise<number[]>; classify(question: string): Promise<Area | null> };
export type PreparedDocument = { sourceId: string; fingerprint: string; model: string; published: boolean; chunks: (Chunk & { embeddingId: string })[] };
export type EmbeddingStore = { get(id: string): Promise<number[] | null>; put(id: string, model: string, vector: number[]): Promise<void> };

export function vector(value: unknown): number[] {
  // MariaDB stores JSON as LONGTEXT; raw queries may return a JSON string.
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { throw new Error("INVALID_VECTOR"); }
  }
  if (!Array.isArray(value) || !value.length || !value.every(n => typeof n === "number" && Number.isFinite(n)) || !value.some(n => n !== 0)) throw new Error("INVALID_VECTOR");
  return value;
}
export function cosine(a: number[], b: number[]): number {
  vector(a); vector(b);
  if (a.length !== b.length) throw new Error("VECTOR_DIMENSION_MISMATCH");
  return a.reduce((sum, n, i) => sum + n * b[i]!, 0) / Math.hypot(...a) / Math.hypot(...b);
}

export async function prepareDocument(source: Source, provider: SemanticProvider, cache: EmbeddingStore, progress: () => Promise<void>) {
  const chunks = parseNotebook(source.conteudo, source.area);
  const document: PreparedDocument = { sourceId: source.id, fingerprint: fingerprint(source), model: provider.model, published: source.status === "PUBLICADA", chunks: [] };
  let created = 0, reused = 0;
  for (const chunk of chunks) {
    // Area, fontes and notebook metadata are not part of the semantic input.
    const semanticText = [chunk.chapter, chunk.subchapter ?? "", chunk.semanticText].join("\n");
    const embeddingId = hash(JSON.stringify([provider.model, semanticText]));
    const cached = await cache.get(embeddingId);
    if (cached) { vector(cached); reused++; }
    else { await cache.put(embeddingId, provider.model, vector(await provider.embed(semanticText, "passage"))); created++; }
    document.chunks.push({ ...chunk, embeddingId });
    await progress();
  }
  return { document, created, reused };
}

export type Candidate = { id: string; content: string; areas: Area[]; published: boolean; vector: number[]; titulo: string; fontes: unknown; chapter: string; subchapter: string | null };
export async function retrieve(question: string, provider: SemanticProvider, load: (area: Area, model: string) => Promise<Candidate[]>) {
  const area = await provider.classify(question);
  if (!area) return { area, chunks: [] };
  // Loader MUST constrain area/publication in the DB, before embeddings/similarity.
  const candidates = (await load(area, provider.model)).filter(c => c.published && c.areas.includes(area));
  if (!candidates.length) return { area, chunks: [] };
  const query = vector(await provider.embed(question, "query"));
  const chunks = candidates.map(c => ({ ...c, score: cosine(query, c.vector) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 5);
  return { area, chunks };
}
