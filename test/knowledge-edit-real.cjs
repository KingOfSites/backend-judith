// Acceptance test for a disposable DB only; uses the deployed code and real providers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, 'judith-accept-db');
assert.equal(url.pathname, '/judith_knowledge_test');
assert.equal(process.env.KNOWLEDGE_ISOLATED_TEST, 'true');
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const db = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
require.cache[require.resolve('/app/dist/db/client.js')] = { exports: { prisma: db } };
const classifierResponses = [];
const SDK = require('/app/node_modules/@anthropic-ai/sdk');
const Anthropic = SDK.default || SDK;
require.cache[require.resolve('/app/node_modules/@anthropic-ai/sdk')] = { exports: class extends Anthropic {
  constructor(...args) {
    super(...args);
    const create = this.messages.create.bind(this.messages);
    this.messages.create = async (...params) => { const r = await create(...params); classifierResponses.push({ maxTokens: params[0].max_tokens, stop: r.stop_reason, text: r.content.filter(b => b.type === 'text').map(b => b.text).join(''), selections: r.content.filter(b => b.type === 'tool_use').map(b => b.input) }); return r; };
  }
} };
const { createProvider } = require('/app/dist/knowledge/provider.js');
const { retrieve } = require('/app/dist/knowledge/core.js');
const { loadCandidates } = require('/app/dist/knowledge/repository.js');
const { requestIndex, processNextJob } = require('/app/dist/knowledge/indexer.js');
const real = createProvider(), events = [], calls = [], queries = [];
db.$on('query', e => { if (e.query.includes('WHERE a.area')) events.push('sql-area-filter'); });
const provider = { ...real, classify: async q => { const a = await real.classify(q); events.push('classified:' + a); return a; }, embed: async (t, k) => { events.push('embed:' + k); calls.push(k); if (k === 'query') queries.push(t); return real.embed(t, k); } };
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const report = { at: new Date().toISOString(), model: real.model, synthetic: true, classifierResponses, jobs: [], searches: [] };
const question = 'Como solicitar a eliminação dos meus dados pessoais pela LGPD?';
const oldText = 'Neste cenário sintético, o pedido de eliminação dos dados pessoais deve ser enviado ao canal Alfa.';
const newText = 'Neste cenário sintético, o pedido de eliminação dos dados pessoais deve ser enviado ao canal Beta atualizado.';
const body = '## Eliminação de dados pessoais\n' + oldText + '\n' + ['Acesso aos dados', 'Correção de dados', 'Portabilidade de dados', 'Revogação do consentimento', 'Segurança de dados'].map((t, i) => `## ${t}\nBloco sintético ${i}: ${t} e proteção de dados pessoais.\n`).join('');
async function index(key) {
  calls.length = 0;
  const j = await requestIndex(db, key); await processNextJob(db, provider);
  const done = await db.knowledgeJob.findUniqueOrThrow({ where: { id: j.id } });
  assert.equal(done.status, 'completed', JSON.stringify(done.errors));
  const r = { id: j.id, status: done.status, result: done.result, passageCalls: calls.filter(k => k === 'passage').length };
  report.jobs.push(r); return r;
}
async function search(expected) {
  events.length = 0;
  const r = await retrieve(question, provider, loadCandidates);
  assert.equal(r.area, 'lgpd'); assert.equal(r.chunks.length, 5);
  assert.ok(r.chunks.some(c => c.content.includes(expected)));
  assert.ok(r.chunks.every(c => c.titulo === 'Aceitação sintética LGPD'));
  assert.ok(events.indexOf('sql-area-filter') > events.indexOf('classified:lgpd'));
  assert.ok(events.indexOf('embed:query') > events.indexOf('sql-area-filter'));
  for (const c of r.chunks) assert.equal(c.content, (await db.knowledgeChunk.findUniqueOrThrow({ where: { id: c.id } })).content);
  report.searches.push({ area: r.area, events: [...events], chunks: r.chunks.map(c => ({ id: c.id, content: c.content, score: c.score })), expectedText: expected });
  return r;
}
async function main() {
  await db.$executeRawUnsafe("CREATE TABLE FichaConhecimento (id VARCHAR(191) PRIMARY KEY, slug VARCHAR(191) UNIQUE NOT NULL, titulo VARCHAR(191) NOT NULL, area VARCHAR(191) NOT NULL, status ENUM('RASCUNHO','EM_REVISAO','PUBLICADA') NOT NULL DEFAULT 'RASCUNHO', fontes JSON NOT NULL, conteudo TEXT NOT NULL, ordem INTEGER NOT NULL DEFAULT 0, createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updatedAt DATETIME(3) NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  for (const s of fs.readFileSync('/app/prisma/migrations/202609230001_knowledge_index/migration.sql', 'utf8').split(';').filter(s => s.trim())) await db.$executeRawUnsafe(s);
  const source = await db.fichaConhecimento.create({ data: { slug: 'accept-lgpd', titulo: 'Aceitação sintética LGPD', area: 'lgpd', conteudo: body, fontes: [], status: 'PUBLICADA' } });
  await db.fichaConhecimento.create({ data: { slug: 'accept-twin', titulo: 'Gêmeo fora da área', area: 'trabalhista', conteudo: body, fontes: [], status: 'PUBLICADA' } });
  await index('initial'); await search(oldText);
  const before = await db.knowledgeChunk.findMany({ where: { sourceId: source.id }, include: { embedding: true }, orderBy: { ordinal: 'asc' } });
  await db.fichaConhecimento.update({ where: { id: source.id }, data: { conteudo: body.replace(oldText, newText) } });
  assert.equal((await loadCandidates('lgpd', real.model)).length, 0);
  report.staleExcludedBeforeReindex = true;
  const edited = await index('edited');
  assert.equal(edited.passageCalls, 1); assert.equal(edited.result.embeddingsCreated, 1); assert.equal(edited.result.embeddingsReused, 5);
  assert.equal(edited.result.chunksUpdated, 1); assert.equal(edited.result.chunksUnchanged, 5);
  const after = await db.knowledgeChunk.findMany({ where: { sourceId: source.id }, include: { embedding: true }, orderBy: { ordinal: 'asc' } });
  report.vectors = before.map((b, i) => {
    const a = after[i]; assert.equal(a.id, b.id);
    if (i) { assert.equal(a.embeddingId, b.embeddingId); assert.equal(hash(a.embedding.vector), hash(b.embedding.vector)); assert.equal(a.content, b.content); }
    else assert.notEqual(a.embeddingId, b.embeddingId);
    return { id: a.id, unchanged: i > 0, beforeEmbedding: b.embeddingId, afterEmbedding: a.embeddingId, beforeVectorHash: hash(b.embedding.vector), afterVectorHash: hash(a.embedding.vector), dimensions: a.embedding.dimensions };
  });
  const found = await search(newText); assert.ok(found.chunks.every(c => !c.content.includes(oldText)));
  const repeated = await index('unchanged'); assert.equal(repeated.passageCalls, 0); assert.equal(repeated.result.unchanged, 2);
  const history = [{ role: 'user', content: question }, { role: 'assistant', content: 'DISTRAÇÃO: férias, rescisão, FGTS. '.repeat(500) }];
  const continuation = await retrieve('E como faço esse pedido?', provider, loadCandidates, history);
  assert.equal(continuation.area, 'lgpd'); assert.ok(continuation.chunks.some(c => c.content.includes(newText)));
  assert.ok(queries.at(-1).startsWith('E como faço esse pedido?')); assert.ok(!queries.at(-1).includes('DISTRAÇÃO')); assert.ok(queries.at(-1).length < 400);
  report.continuation = { query: queries.at(-1), area: continuation.area, rank: continuation.chunks.findIndex(c => c.content.includes(newText)) + 1 };
  await db.fichaConhecimento.create({ data: { slug: 'accept-ferias', titulo: 'Férias sintéticas', area: 'trabalhista', conteudo: '## Férias do empregado\nExemplo sintético sobre direito a férias anuais remuneradas do empregado e adicional de um terço.\n', fontes: [], status: 'PUBLICADA' } });
  await index('topic-fixture');
  const nextQuestion = 'Quais são os direitos de férias anuais remuneradas de um empregado?';
  const direct = await retrieve(nextQuestion, provider, loadCandidates);
  const changed = await retrieve(nextQuestion, provider, loadCandidates, history);
  assert.equal(changed.area, 'trabalhista'); assert.equal(queries.at(-1), nextQuestion);
  assert.deepEqual(changed.chunks.map(c => c.id), direct.chunks.map(c => c.id));
  assert.equal(changed.chunks[0].titulo, 'Férias sintéticas');
  report.topicChange = { query: queries.at(-1), area: changed.area, sameRankingAsNoHistory: true, first: changed.chunks[0].titulo };
  report.parserVersion = require('/app/dist/knowledge/parser.js').PARSER_VERSION;
  report.ok = true;
}
main().catch(e => { report.ok = false; report.error = e.message; process.exitCode = 1; }).finally(async () => { console.log(JSON.stringify(report, null, 2)); await db.$disconnect(); });
