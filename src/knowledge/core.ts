import { createHash } from "node:crypto";
import { Area } from "./areas.js";
import { Chunk, PARSER_VERSION, parseNotebook } from "./parser.js";

export const hash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
export type Source = { id: string; slug: string; titulo: string; area: string; status: string; fontes: unknown; conteudo: string; ordem: number };
export const fingerprint = (s: Source) => hash(JSON.stringify([PARSER_VERSION, s.id, s.slug, s.titulo, s.area, s.status, s.fontes, s.conteudo, s.ordem]));
export type SearchTurn = { role: "user" | "assistant"; content: string };
export type SemanticProvider = { model: string; embed(text: string, kind?: "query" | "passage"): Promise<number[]>; classify(question: string, history?: SearchTurn[]): Promise<Area | null>; contextualize?(question: string, history: SearchTurn[]): Promise<string> };
export type PreparedDocument = { sourceId: string; fingerprint: string; model: string; published: boolean; chunks: (Chunk & { embeddingId: string })[] };
/** `known` lists ids already referenced by the indexed document: they exist (FK) and need no reload. */
export type EmbeddingStore = { get(id: string): Promise<number[] | null>; put(id: string, model: string, vector: number[]): Promise<void>; known?: Set<string> };

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
    if (cache.known?.has(embeddingId)) reused++;
    else {
      const cached = await cache.get(embeddingId);
      if (cached) { vector(cached); reused++; }
      else { await cache.put(embeddingId, provider.model, vector(await provider.embed(semanticText, "passage"))); created++; }
    }
    document.chunks.push({ ...chunk, embeddingId });
    await progress();
  }
  return { document, created, reused };
}

export type StoredChunk = { id: string; ordinal: number; line: number; chapter: string; subchapter: string | null; content: string; embeddingId: string; areas: string[] };
export type NextChunk = PreparedDocument["chunks"][number];
export type ChunkUpdate = { id: string; index: number; from: number; fields: Partial<Pick<StoredChunk, "ordinal" | "line" | "chapter" | "subchapter" | "content" | "embeddingId">>; addAreas: string[]; removeAreas: string[] };
export type ChunkPlan = { create: number[]; remove: string[]; update: ChunkUpdate[]; unchanged: number };

/**
 * Pairs stored rows with the new parse without relying on position. Identity is the semantic
 * embedding id (chapter, subchapter and text, without area markers). Unchanged blocks are anchored by
 * longest common subsequence, moved blocks by identity, and remaining blocks between the same anchors
 * are treated as edits of the same record. Only differences produce writes.
 */
export function planChunks(stored: StoredChunk[], next: NextChunk[]): ChunkPlan {
  const oldPair = new Array<number>(stored.length).fill(-1), newPair = new Array<number>(next.length).fill(-1);
  // Longest common subsequence after trimming a common prefix/suffix.
  let start = 0;
  while (start < stored.length && start < next.length && stored[start]!.embeddingId === next[start]!.embeddingId) { oldPair[start] = start; newPair[start] = start; start++; }
  let endOld = stored.length, endNew = next.length;
  while (endOld > start && endNew > start && stored[endOld - 1]!.embeddingId === next[endNew - 1]!.embeddingId) { endOld--; endNew--; oldPair[endOld] = endNew; newPair[endNew] = endOld; }
  const n = endOld - start, m = endNew - start;
  if (n && m) {
    const table = new Uint32Array((n + 1) * (m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
      table[i * (m + 1) + j] = stored[start + i]!.embeddingId === next[start + j]!.embeddingId
        ? table[(i + 1) * (m + 1) + j + 1]! + 1 : Math.max(table[(i + 1) * (m + 1) + j]!, table[i * (m + 1) + j + 1]!);
    }
    for (let i = 0, j = 0; i < n && j < m;) {
      if (stored[start + i]!.embeddingId === next[start + j]!.embeddingId) { oldPair[start + i] = start + j; newPair[start + j] = start + i; i++; j++; }
      else if (table[(i + 1) * (m + 1) + j]! >= table[i * (m + 1) + j + 1]!) i++;
      else j++;
    }
  }
  // Gap = number of order-preserving anchors before the element.
  const gaps = (pairs: number[]) => {
    let count = 0;
    return pairs.map(p => { if (p >= 0) count++; return count; });
  };
  const oldGap = gaps(oldPair), newGap = gaps(newPair);
  // Moved blocks keep their record.
  const byId = new Map<string, number[]>();
  stored.forEach((s, i) => { if (oldPair[i]! < 0) byId.set(s.embeddingId, [...(byId.get(s.embeddingId) ?? []), i]); });
  next.forEach((c, j) => {
    if (newPair[j]! >= 0) return;
    const i = byId.get(c.embeddingId)?.shift();
    if (i !== undefined) { oldPair[i] = j; newPair[j] = i; }
  });
  // Edited blocks: pair leftovers inside the same gap, in order.
  const leftovers = new Map<number, number[]>();
  stored.forEach((_, i) => { if (oldPair[i]! < 0) leftovers.set(oldGap[i]!, [...(leftovers.get(oldGap[i]!) ?? []), i]); });
  next.forEach((_, j) => {
    if (newPair[j]! >= 0) return;
    const i = leftovers.get(newGap[j]!)?.shift();
    if (i !== undefined) { oldPair[i] = j; newPair[j] = i; }
  });
  const plan: ChunkPlan = { create: [], remove: [], update: [], unchanged: 0 };
  stored.forEach((s, i) => { if (oldPair[i]! < 0) plan.remove.push(s.id); });
  next.forEach((c, j) => {
    const i = newPair[j]!;
    if (i < 0) { plan.create.push(j); return; }
    const s = stored[i]!;
    const fields: ChunkUpdate["fields"] = {};
    if (s.ordinal !== j) fields.ordinal = j;
    if (s.line !== c.line) fields.line = c.line;
    if (s.chapter !== c.chapter) fields.chapter = c.chapter;
    if (s.subchapter !== c.subchapter) fields.subchapter = c.subchapter;
    if (s.content !== c.content) fields.content = c.content;
    if (s.embeddingId !== c.embeddingId) fields.embeddingId = c.embeddingId;
    const addAreas = c.areas.filter(a => !s.areas.includes(a)), removeAreas = s.areas.filter(a => !(c.areas as string[]).includes(a));
    if (Object.keys(fields).length || addAreas.length || removeAreas.length) plan.update.push({ id: s.id, index: j, from: s.ordinal, fields, addAreas, removeAreas });
    else plan.unchanged++;
  });
  return plan;
}

export type Candidate ={ id: string; content: string; areas: Area[]; published: boolean; vector: number[]; titulo: string; fontes: unknown; chapter: string; subchapter: string | null };
export async function retrieve(question: string, provider: SemanticProvider, load: (area: Area, model: string) => Promise<Candidate[]>, history: SearchTurn[] = []) {
  const recent = history.filter(t => t.role === "user").slice(-8);
  const searchText = recent.length && provider.contextualize ? await provider.contextualize(question, recent) : question;
  const area = await provider.classify(searchText);
  if (!area) return { area, chunks: [] };
  // Loader MUST constrain area/publication in the DB, before embeddings/similarity.
  const candidates = (await load(area, provider.model)).filter(c => c.published && c.areas.includes(area));
  if (!candidates.length) return { area, chunks: [] };
  const query = vector(await provider.embed(searchText, "query"));
  const chunks = candidates.map(c => ({ ...c, score: cosine(query, c.vector) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 5);
  return { area, chunks };
}
