import { Prisma, PrismaClient } from "@prisma/client";
import { KnowledgeValidationError } from "./areas.js";
import { ChunkPlan, fingerprint, planChunks, prepareDocument, PreparedDocument, SemanticProvider, vector } from "./core.js";

/**
 * chunksUpdated: text, headings, representation or areas changed (record kept).
 * chunksRepositioned: only ordinal/line changed because other blocks were inserted, removed or grew.
 */
export type ChunkCounts = { chunksCreated: number; chunksUpdated: number; chunksRepositioned: number; chunksUnchanged: number; chunksRemoved: number; areaLinksAdded: number; areaLinksRemoved: number };

/** Applies a chunk plan for one document. Must run inside the swap transaction. */
async function applyPlan(tx: Prisma.TransactionClient, doc: PreparedDocument, plan: ChunkPlan, counts: ChunkCounts) {
  if (plan.remove.length) await tx.knowledgeChunk.deleteMany({ where: { id: { in: plan.remove } } });
  // (sourceId, ordinal) is unique. Blocks kept in relative order can move in one pass (upward moves
  // from the highest, downward from the lowest); reordered blocks go through negative temporaries.
  const moves = plan.update.filter(u => u.fields.ordinal !== undefined);
  const byOld = [...moves].sort((a, b) => a.from - b.from);
  const ordered = byOld.every((u, i) => i === 0 || u.index > byOld[i - 1]!.index);
  if (!ordered) for (const [k, u] of moves.entries()) await tx.knowledgeChunk.update({ where: { id: u.id }, data: { ordinal: -(k + 1) } });
  const sequence = ordered
    ? [...byOld.filter(u => u.index > u.from).reverse(), ...byOld.filter(u => u.index < u.from)]
    : moves;
  const first = new Set(sequence.map(u => u.id));
  for (const u of [...sequence, ...plan.update.filter(u => !first.has(u.id))]) {
    if (Object.keys(u.fields).length) await tx.knowledgeChunk.update({ where: { id: u.id }, data: u.fields });
    if (u.removeAreas.length) await tx.knowledgeChunkArea.deleteMany({ where: { chunkId: u.id, area: { in: u.removeAreas } } });
    if (u.addAreas.length) await tx.knowledgeChunkArea.createMany({ data: u.addAreas.map(area => ({ chunkId: u.id, area })) });
    counts.areaLinksAdded += u.addAreas.length; counts.areaLinksRemoved += u.removeAreas.length;
  }
  for (const index of plan.create) {
    const c = doc.chunks[index]!;
    await tx.knowledgeChunk.create({ data: {
      sourceId: doc.sourceId, ordinal: index, chapter: c.chapter, subchapter: c.subchapter, line: c.line,
      content: c.content, embeddingId: c.embeddingId, areas: { create: c.areas.map(area => ({ area })) },
    } });
    counts.areaLinksAdded += c.areas.length;
  }
  const repositioned = plan.update.filter(u => !u.addAreas.length && !u.removeAreas.length && Object.keys(u.fields).every(k => k === "ordinal" || k === "line")).length;
  counts.chunksCreated += plan.create.length; counts.chunksUpdated += plan.update.length - repositioned; counts.chunksRepositioned += repositioned;
  counts.chunksUnchanged += plan.unchanged; counts.chunksRemoved += plan.remove.length;
}

export const LEASE_MS = 300_000;
const lease = () => new Date(Date.now() + LEASE_MS);
export function publicError(error: unknown): Prisma.InputJsonValue {
  if (error instanceof KnowledgeValidationError) return { code: "VALIDATION", issues: JSON.parse(JSON.stringify(error.issues)) };
  const known = ["SOURCE_CHANGED", "LEASE_LOST", "LOCAL_EMBEDDING_UNAVAILABLE", "EMBEDDING_MODEL_MISMATCH", "INVALID_VECTOR", "VECTOR_DIMENSION_MISMATCH"];
  const code = error instanceof Error && known.includes(error.message) ? error.message : "INDEXING_FAILED";
  // Never persist raw SDK/Prisma messages: they may contain connection details or content.
  return { code, mensagem: "Indexação não concluída; corrija a causa e solicite uma nova execução." };
}

export async function requestIndex(db: PrismaClient, requestKey: string) {
  const existing = await db.knowledgeJob.findUnique({ where: { requestKey } });
  if (existing) return existing;
  try {
    return await db.knowledgeJob.create({ data: { requestKey, activeKey: "global" } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const repeated = await db.knowledgeJob.findUnique({ where: { requestKey } });
    if (repeated) return repeated;
    return db.knowledgeJob.findUniqueOrThrow({ where: { activeKey: "global" } });
  }
}

export async function processNextJob(db: PrismaClient, provider: SemanticProvider) {
  await db.knowledgeJob.updateMany({
    where: { status: "processing", leaseUntil: { lt: new Date() } },
    data: { status: "failed", activeKey: null, errors: { code: "WORKER_INTERRUPTED", mensagem: "Lease expirou; solicite uma nova execução." } },
  });
  const job = await db.knowledgeJob.findFirst({ where: { status: "pending" }, orderBy: { createdAt: "asc" } });
  if (!job) return;
  const claimed = await db.knowledgeJob.updateMany({ where: { id: job.id, status: "pending" }, data: { status: "processing", leaseUntil: lease() } });
  if (!claimed.count) return;
  const heartbeat = async () => {
    const renewed = await db.knowledgeJob.updateMany({ where: { id: job.id, status: "processing", leaseUntil: { gt: new Date() } }, data: { leaseUntil: lease() } });
    if (!renewed.count) throw new Error("LEASE_LOST");
  };
  // Long individual embedding requests/chunks must not expire an otherwise active worker.
  const timer = setInterval(() => { void heartbeat().catch(() => {}); }, 30_000);
  timer.unref();
  try {
    // Legacy drafts/reviews are not index sources. Admin save validation remains mandatory.
    const sources = await db.fichaConhecimento.findMany({ where: { status: "PUBLICADA" }, orderBy: { id: "asc" } });
    const previous = await db.knowledgeDocument.findMany();
    const old = new Map(previous.map(d => [d.sourceId, d]));
    const changed: PreparedDocument[] = [];
    let created = 0, reused = 0, unchanged = 0, processed = 0;
    await db.knowledgeJob.update({ where: { id: job.id }, data: { total: sources.length } });
    for (const source of sources) {
      const prev = old.get(source.id);
      if (prev?.fingerprint === fingerprint(source) && prev.model === provider.model) unchanged++;
      else {
        // Full parse recalculates inheritance; embeddings already referenced by this document are not reloaded.
        const known = prev?.model === provider.model
          ? new Set((await db.knowledgeChunk.findMany({ where: { sourceId: source.id }, select: { embeddingId: true } })).map(c => c.embeddingId))
          : new Set<string>();
        const prepared = await prepareDocument(source, provider, {
          known,
          get: async id => { const e = await db.knowledgeEmbedding.findUnique({ where: { id } }); return e ? vector(e.vector) : null; },
          put: async (id, model, v) => { await db.knowledgeEmbedding.upsert({ where: { id }, create: { id, model, dimensions: v.length, vector: v }, update: {} }); },
        }, heartbeat).catch(error => {
          if (error instanceof KnowledgeValidationError) {
            error.issues = error.issues.map(issue => ({ ...issue, origem: `${source.slug}:${issue.origem}` }));
          }
          throw error;
        });
        changed.push(prepared.document); created += prepared.created; reused += prepared.reused;
      }
      processed++;
      await heartbeat();
      await db.knowledgeJob.updateMany({ where: { id: job.id, status: "processing" }, data: { processed } });
    }
    const removed = previous.filter(d => !sources.some(s => s.id === d.sourceId)).map(d => d.sourceId);
    await db.$transaction(async tx => {
      // Fence expired workers before changing the index. Lock retained until commit.
      const fenced = await tx.knowledgeJob.updateMany({ where: { id: job.id, status: "processing", leaseUntil: { gt: new Date() } }, data: { leaseUntil: lease() } });
      if (!fenced.count) throw new Error("LEASE_LOST");
      // Shared Admin writes wait only during this short swap, never during API calls.
      await tx.$queryRaw`SELECT id FROM FichaConhecimento ORDER BY id FOR UPDATE`;
      // Read JSON via Prisma so MySQL and MariaDB use the same decoded shape.
      const current = await tx.fichaConhecimento.findMany({ where: { status: "PUBLICADA" }, orderBy: { id: "asc" } });
      if (current.length !== sources.length || current.some((s, i) => fingerprint(s) !== fingerprint(sources[i]!))) throw new Error("SOURCE_CHANGED");
      const counts: ChunkCounts = { chunksCreated: 0, chunksUpdated: 0, chunksRepositioned: 0, chunksUnchanged: 0, chunksRemoved: 0, areaLinksAdded: 0, areaLinksRemoved: 0 };
      if (removed.length) {
        counts.chunksRemoved += await tx.knowledgeChunk.count({ where: { sourceId: { in: removed } } });
        await tx.knowledgeDocument.deleteMany({ where: { sourceId: { in: removed } } });
      }
      for (const doc of changed) {
        await tx.knowledgeDocument.upsert({ where: { sourceId: doc.sourceId }, create: { sourceId: doc.sourceId, fingerprint: doc.fingerprint, model: doc.model, published: doc.published }, update: { fingerprint: doc.fingerprint, model: doc.model, published: doc.published } });
        // Diff against rows read inside the transaction, so the plan matches what is committed.
        const stored = (await tx.knowledgeChunk.findMany({ where: { sourceId: doc.sourceId }, include: { areas: true }, orderBy: { ordinal: "asc" } }))
          .map(c => ({ ...c, areas: c.areas.map(a => a.area) }));
        await applyPlan(tx, doc, planChunks(stored, doc.chunks), counts);
      }
      await tx.knowledgeJob.update({ where: { id: job.id }, data: {
        status: "completed", activeKey: null, leaseUntil: null,
        result: { changed: changed.length, unchanged, removed: removed.length, embeddingsCreated: created, embeddingsReused: reused, chunks: changed.reduce((sum, d) => sum + d.chunks.length, 0), ...counts },
      } });
    }, { isolationLevel: "Serializable", timeout: 60_000, maxWait: 10_000 });
  } catch (error) {
    await db.knowledgeJob.updateMany({ where: { id: job.id, status: "processing" }, data: { status: "failed", activeKey: null, leaseUntil: null, errors: publicError(error) } });
  } finally { clearInterval(timer); }
}
