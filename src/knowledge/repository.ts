import { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";
import { Area } from "./areas.js";
import { Candidate, fingerprint, vector } from "./core.js";

export async function loadCandidates(area: Area, model: string): Promise<Candidate[]> {
  // Repeatable-read snapshot; avoid transmitting the entire notebook once per chunk.
  return prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{
      id: string; content: string; chapter: string; subchapter: string | null; vector: unknown;
      fingerprint: string; sourceId: string;
    }>>(Prisma.sql`
      SELECT c.id, c.content, c.chapter, c.subchapter, e.vector, d.fingerprint,
             f.id AS sourceId
      FROM KnowledgeChunkArea a
      JOIN KnowledgeChunk c ON c.id = a.chunkId
      JOIN KnowledgeDocument d ON d.sourceId = c.sourceId
      JOIN FichaConhecimento f ON f.id = d.sourceId
      JOIN KnowledgeEmbedding e ON e.id = c.embeddingId
      WHERE a.area = ${area} AND d.published = true AND f.status = 'PUBLICADA'
        AND d.model = ${model} AND e.model = ${model}
    `);
    const sources = await tx.fichaConhecimento.findMany({ where: { id: { in: [...new Set(rows.map(r => r.sourceId))] }, status: "PUBLICADA" } });
    const current = new Map(sources.map(s => [s.id, { source: s, fingerprint: fingerprint(s) }]));
    return rows.filter(row => {
      return current.get(row.sourceId)?.fingerprint === row.fingerprint;
    }).map(row => ({ id: row.id, sourceId: row.sourceId, version: row.fingerprint, content: row.content, chapter: row.chapter, subchapter: row.subchapter,
      titulo: current.get(row.sourceId)!.source.titulo, fontes: current.get(row.sourceId)!.source.fontes,
      areas: [area], published: true, vector: vector(row.vector) }));
  }, { isolationLevel: "RepeatableRead" });
}
