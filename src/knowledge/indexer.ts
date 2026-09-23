import { Prisma, PrismaClient } from "@prisma/client";
import { KnowledgeValidationError } from "./areas.js";
import { fingerprint, prepareDocument, PreparedDocument, SemanticProvider, vector } from "./core.js";

export const LEASE_MS = 300_000;
const lease = () => new Date(Date.now() + LEASE_MS);
export function publicError(error: unknown): Prisma.InputJsonValue {
  if (error instanceof KnowledgeValidationError) return { code: "VALIDATION", issues: JSON.parse(JSON.stringify(error.issues)) };
  const known = ["SOURCE_CHANGED", "LEASE_LOST", "OPENAI_API_KEY_REQUIRED", "INVALID_VECTOR", "VECTOR_DIMENSION_MISMATCH"];
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
        const prepared = await prepareDocument(source, provider, {
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
      if (removed.length) await tx.knowledgeDocument.deleteMany({ where: { sourceId: { in: removed } } });
      for (const doc of changed) {
        await tx.knowledgeDocument.upsert({ where: { sourceId: doc.sourceId }, create: { sourceId: doc.sourceId, fingerprint: doc.fingerprint, model: doc.model, published: doc.published }, update: { fingerprint: doc.fingerprint, model: doc.model, published: doc.published } });
        await tx.knowledgeChunk.deleteMany({ where: { sourceId: doc.sourceId } });
        for (const [ordinal, c] of doc.chunks.entries()) {
          await tx.knowledgeChunk.create({ data: {
            sourceId: doc.sourceId, ordinal, chapter: c.chapter, subchapter: c.subchapter, line: c.line,
            content: c.content, embeddingId: c.embeddingId, areas: { create: c.areas.map(area => ({ area })) },
          } });
        }
      }
      await tx.knowledgeJob.update({ where: { id: job.id }, data: {
        status: "completed", activeKey: null, leaseUntil: null,
        result: { changed: changed.length, unchanged, removed: removed.length, embeddingsCreated: created, embeddingsReused: reused, chunks: changed.reduce((sum, d) => sum + d.chunks.length, 0) },
      } });
    }, { isolationLevel: "Serializable", timeout: 60_000, maxWait: 10_000 });
  } catch (error) {
    await db.knowledgeJob.updateMany({ where: { id: job.id, status: "processing" }, data: { status: "failed", activeKey: null, leaseUntil: null, errors: publicError(error) } });
  } finally { clearInterval(timer); }
}
