// Run only against a disposable database. Never points to the shared database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.KNOWLEDGE_ISOLATED_TEST !== 'true' || url.pathname !== '/judith_knowledge_test') {
  throw new Error('Requires KNOWLEDGE_ISOLATED_TEST=true and database judith_knowledge_test');
}
const db = new PrismaClient();
require.cache[require.resolve('../dist/db/client.js')] = { exports: { prisma: db } };
const { requestIndex, processNextJob } = require('../dist/knowledge/indexer.js');
const { loadCandidates } = require('../dist/knowledge/repository.js');
let calls = 0, runId = 0;
const provider = { model: 'isolated-test', embed: async () => { calls++; return [1, 0]; } };
const run = async (p = provider) => {
  const job = await requestIndex(db, `isolated-${runId++}`);
  await processNextJob(db, p);
  return db.knowledgeJob.findUniqueOrThrow({ where: { id: job.id } });
};
async function main() {
  await db.$executeRawUnsafe("CREATE TABLE FichaConhecimento (id VARCHAR(191) PRIMARY KEY, slug VARCHAR(191) UNIQUE NOT NULL, titulo VARCHAR(191) NOT NULL, area VARCHAR(191) NOT NULL, status ENUM('RASCUNHO','EM_REVISAO','PUBLICADA') NOT NULL DEFAULT 'RASCUNHO', fontes JSON NOT NULL, conteudo TEXT NOT NULL, ordem INTEGER NOT NULL DEFAULT 0, createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updatedAt DATETIME(3) NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  const sql = fs.readFileSync(path.join(__dirname, '../prisma/migrations/202609230001_knowledge_index/migration.sql'), 'utf8');
  for (const statement of sql.split(';').filter(s => s.trim())) await db.$executeRawUnsafe(statement);
  console.log('PASS migration on isolated MariaDB');
  const content = Array.from({ length: 117 }, (_, i) => `## Capitulo ${i}\n${'Ação, coração, proteção 🦉. '.repeat(65)}\n`).join('');
  assert.ok(content.length >= 169000);
  const source = await db.fichaConhecimento.create({ data: { slug: 'civil-contratos', titulo: 'Isolated test', area: 'civil', status: 'PUBLICADA', fontes: ['Fonte'], conteudo: content } });
  assert.equal((await db.fichaConhecimento.findUnique({ where: { id: source.id } })).conteudo, content);
  assert.equal((await run()).status, 'completed');
  let candidates = await loadCandidates('civil', provider.model);
  assert.equal(candidates.length, 117);
  assert.equal((await db.knowledgeChunk.findMany({ orderBy: { ordinal: 'asc' } })).map(c => c.content).join(''), content);
  assert.equal((await loadCandidates('lgpd', provider.model)).length, 0);
  console.log('PASS 169k+ characters, accents, emoji, 117 chunks and MariaDB JSON retrieval');
  const beforeCalls = calls;
  assert.equal((await run()).result.unchanged, 1); assert.equal(calls, beforeCalls);
  await db.fichaConhecimento.update({ where: { id: source.id }, data: { area: 'consumidor' } });
  assert.equal((await loadCandidates('civil', provider.model)).length, 0);
  assert.equal((await run()).status, 'completed'); assert.equal(calls, beforeCalls);
  assert.equal((await loadCandidates('consumidor', provider.model)).length, 117);
  await db.fichaConhecimento.update({ where: { id: source.id }, data: { status: 'RASCUNHO' } });
  assert.equal((await loadCandidates('consumidor', provider.model)).length, 0);
  assert.equal((await run()).status, 'completed');
  await db.fichaConhecimento.update({ where: { id: source.id }, data: { status: 'PUBLICADA' } });
  assert.equal((await run()).status, 'completed');
  console.log('PASS idempotency, area reuse, publication and unpublication');
  const previous = await db.knowledgeChunk.findMany({ orderBy: { ordinal: 'asc' } });
  await db.$executeRawUnsafe("CREATE TRIGGER knowledge_test_failure BEFORE INSERT ON KnowledgeChunk FOR EACH ROW BEGIN IF NEW.ordinal = 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'isolated test failure'; END IF; END");
  await db.fichaConhecimento.update({ where: { id: source.id }, data: { conteudo: content + ' changed' } });
  assert.equal((await run()).status, 'failed');
  assert.deepEqual(await db.knowledgeChunk.findMany({ orderBy: { ordinal: 'asc' } }), previous);
  await db.$executeRawUnsafe('DROP TRIGGER knowledge_test_failure');
  assert.equal((await run()).status, 'completed');
  console.log('PASS real transaction rollback and retry');
  await db.fichaConhecimento.update({ where: { id: source.id }, data: { conteudo: content + ' race' } });
  const race = await run({ model: provider.model, embed: async () => {
    await db.fichaConhecimento.update({ where: { id: source.id }, data: { titulo: 'Changed concurrently' } });
    return [1, 0];
  } });
  assert.equal(race.errors.code, 'SOURCE_CHANGED');
  const job = await requestIndex(db, 'concurrent-workers');
  await Promise.all([processNextJob(db, provider), processNextJob(db, provider)]);
  assert.equal((await db.knowledgeJob.findUnique({ where: { id: job.id } })).status, 'completed');
  console.log('PASS source race detection and concurrent workers');
  await db.fichaConhecimento.delete({ where: { id: source.id } });
  assert.equal((await loadCandidates('consumidor', provider.model)).length, 0);
  assert.equal((await run()).status, 'completed');
  assert.equal(await db.knowledgeChunk.count(), 0);
  console.log('PASS deletion reconciliation');
}
main().catch(e => { console.error('ISOLATED_TEST_FAILED', e.code || e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
