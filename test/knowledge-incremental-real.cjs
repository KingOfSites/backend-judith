// Isolated validation: disposable MariaDB (host judith-val-db, database judith_knowledge_test) + real local embeddings.
// Never points to the shared database. Run in the backend image with dist mounted at /app/dist, connected to the
// embeddings network. KNOWLEDGE_VALIDATION_DATA must hold derived copies of base-guias/base-propaganda (not versioned).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const url = new URL(process.env.DATABASE_URL);
assert.equal(url.pathname, '/judith_knowledge_test'); assert.equal(url.hostname, 'judith-val-db');
assert.equal(process.env.KNOWLEDGE_ISOLATED_TEST, 'true');
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const db = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
const sql = { chunkInsert: 0, chunkUpdate: 0, chunkDelete: 0, areaInsert: 0, areaDelete: 0, embeddingInsert: 0, log: [] };
db.$on('query', e => {
  const q = e.query;
  if (/^INSERT INTO .*`KnowledgeChunk`\s/.test(q)) sql.chunkInsert++;
  else if (/^UPDATE .*`KnowledgeChunk`\s/.test(q)) sql.chunkUpdate++;
  else if (/^DELETE FROM .*`KnowledgeChunk`\s/.test(q)) sql.chunkDelete++;
  else if (/^INSERT INTO .*`KnowledgeChunkArea`/.test(q)) sql.areaInsert++;
  else if (/^DELETE FROM .*`KnowledgeChunkArea`/.test(q)) sql.areaDelete++;
  else if (/^INSERT INTO .*`KnowledgeEmbedding`/.test(q)) sql.embeddingInsert++;
  if (sql.trace) sql.log.push(q.replace(/\s+/g, ' ').slice(0, 400));
});
require.cache[require.resolve('/app/dist/db/client.js')] = { exports: { prisma: db } };
const { env } = require('/app/dist/config/env.js');
const { requestIndex, processNextJob } = require('/app/dist/knowledge/indexer.js');
const { createProvider } = require('/app/dist/knowledge/provider.js');
const { retrieve, cosine, hash } = require('/app/dist/knowledge/core.js');
const { loadCandidates } = require('/app/dist/knowledge/repository.js');
const { PARSER_VERSION } = require('/app/dist/knowledge/parser.js');

const real = createProvider();
let embedCalls = 0, embedMs = 0, beforeEmbed = null;
const provider = { model: real.model, classify: async () => { throw new Error('classifier not used in isolated run'); },
  embed: async (text, kind) => { embedCalls++; if (beforeEmbed) await beforeEmbed(); const t = performance.now(); try { return await real.embed(text, kind); } finally { embedMs += performance.now() - t; } } };
const report = { parserVersion: PARSER_VERSION, model: real.model, steps: [], searches: [], checks: [] };
const check = (name, ok, detail) => { report.checks.push({ name, ok: !!ok, detail }); assert.ok(ok, name + ' ' + JSON.stringify(detail ?? '')); };

async function snapshot() {
  const rows = await db.knowledgeChunk.findMany({ include: { areas: true }, orderBy: [{ sourceId: 'asc' }, { ordinal: 'asc' }] });
  return new Map(rows.map(r => [r.id, { sourceId: r.sourceId, ordinal: r.ordinal, line: r.line, embeddingId: r.embeddingId, contentHash: hash(r.content), areas: r.areas.map(a => a.area).sort().join(',') }]));
}
let runId = 0;
async function step(label, mutate, expect = 'completed', afterJob) {
  if (mutate) await mutate();
  const before = await snapshot();
  Object.assign(sql, { chunkInsert: 0, chunkUpdate: 0, chunkDelete: 0, areaInsert: 0, areaDelete: 0, embeddingInsert: 0 });
  embedCalls = 0; embedMs = 0;
  const t = performance.now();
  const requested = await requestIndex(db, `val-${runId++}`);
  await processNextJob(db, provider);
  if (afterJob) afterJob();
  const job = await db.knowledgeJob.findUniqueOrThrow({ where: { id: requested.id } });
  const after = await snapshot();
  const kept = [...after.keys()].filter(id => before.has(id));
  const row = {
    step: label, status: job.status, error: job.errors?.code, issues: job.errors?.issues?.map(i => `${i.origem} L${i.linha ?? '-'} ${i.valor}`),
    notebooks: `${job.processed}/${job.total}`, ms: Math.round(performance.now() - t), embedMs: Math.round(embedMs), ...job.result,
    realEmbedCalls: embedCalls, sql: { ...sql, log: undefined, trace: undefined },
    ids: { before: before.size, after: after.size, kept: kept.length,
      keptUntouched: kept.filter(id => JSON.stringify(before.get(id)) === JSON.stringify(after.get(id))).length,
      keptTextChanged: kept.filter(id => before.get(id).embeddingId !== after.get(id).embeddingId).length,
      keptAreasChanged: kept.filter(id => before.get(id).areas !== after.get(id).areas).length,
      new: [...after.keys()].filter(id => !before.has(id)).length, gone: [...before.keys()].filter(id => !after.has(id)).length },
  };
  report.steps.push(row);
  console.log(JSON.stringify(row));
  assert.equal(job.status, expect, JSON.stringify(job.errors));
  await integrity(label);
  return { row, before, after };
}
// After every operation: filter, publication, <=5, complete content.
const probes = [['consumidor', 'Posso fazer sorteio de prêmios no Instagram da minha loja sem pedir autorização?'], ['tributario', 'Quais regimes tributários posso escolher ao abrir uma empresa?'], ['lgpd', 'A empresa pode monitorar o e-mail corporativo dos empregados?'], ['trabalhista', 'Como calcular férias proporcionais na rescisão?']];
async function integrity(label) {
  for (const [area, q] of probes) {
    const r = await retrieve(q, { ...provider, classify: async () => area }, loadCandidates);
    assert.ok(r.chunks.length <= 5);
    for (const c of r.chunks) {
      const row = await db.knowledgeChunk.findUniqueOrThrow({ where: { id: c.id }, include: { areas: true } });
      const src = await db.fichaConhecimento.findUniqueOrThrow({ where: { id: row.sourceId } });
      assert.ok(row.areas.some(a => a.area === area), `${label}: area leak ${c.id}`);
      assert.equal(src.status, 'PUBLICADA', `${label}: unpublished source`);
      assert.equal(c.content, row.content); assert.ok(src.conteudo.includes(c.content), `${label}: content not integral`);
    }
  }
}

const read = f => fs.readFileSync((process.env.KNOWLEDGE_VALIDATION_DATA || '/app/validation/data/') + f, 'utf8');
const guias = read('derived-JUDITH-base-guias-v1.md'), prop = read('derived-JUDITH-base-propaganda-v1.md');
const para = 'Conteúdo SINTÉTICO de validação — não é o caderno trabalhista original. Rescisão, aviso prévio, férias proporcionais, décimo terceiro, FGTS e horas extras: ação, atenção, obrigação, informação. ';
const large = Array.from({ length: 117 }, (_, i) => `## Capítulo sintético ${i + 1}\n\nTema ${i + 1}: ${para.repeat(7)}\n\n`).join('');
const twin = '## Monitoramento de e-mail corporativo\nO empregador pode monitorar o e-mail corporativo fornecido ao empregado para o trabalho, desde que haja política clara, finalidade legítima e proporcionalidade; mensagens pessoais e dados sensíveis exigem cuidado adicional.\n';

async function main() {
  await db.$executeRawUnsafe("CREATE TABLE FichaConhecimento (id VARCHAR(191) PRIMARY KEY, slug VARCHAR(191) UNIQUE NOT NULL, titulo VARCHAR(191) NOT NULL, area VARCHAR(191) NOT NULL, status ENUM('RASCUNHO','EM_REVISAO','PUBLICADA') NOT NULL DEFAULT 'RASCUNHO', fontes JSON NOT NULL, conteudo TEXT NOT NULL, ordem INTEGER NOT NULL DEFAULT 0, createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updatedAt DATETIME(3) NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  for (const s of fs.readFileSync('/app/prisma/migrations/202609230001_knowledge_index/migration.sql', 'utf8').split(';').filter(s => s.trim())) await db.$executeRawUnsafe(s);
  const create = (slug, titulo, area, conteudo, status = 'PUBLICADA') => db.fichaConhecimento.create({ data: { slug, titulo, area, status, fontes: [], conteudo } });
  const g = await create('val-base-guias', 'Guias (cópia derivada v1)', 'administrativo', guias);
  const p = await create('val-base-propaganda', 'Propaganda (cópia derivada v1)', 'consumidor', prop);
  const big = await create('val-trabalhista-sintetico', 'Trabalhista SINTÉTICO', 'trabalhista', large);
  const tl = await create('val-twin-lgpd', 'Gêmeo LGPD', 'lgpd', twin);
  const tt = await create('val-twin-trabalhista', 'Gêmeo trabalhista', 'trabalhista', twin);
  report.inputs = { guias: guias.length, propaganda: prop.length, largeChars: large.length, largeBytes: Buffer.byteLength(large) };
  const upd = (id, data) => db.fichaConhecimento.update({ where: { id }, data });
  const cur = async id => (await db.fichaConhecimento.findUniqueOrThrow({ where: { id } })).conteudo;
  const idsOf = async sourceId => (await db.knowledgeChunk.findMany({ where: { sourceId }, orderBy: { ordinal: 'asc' } })).map(c => c.id);

  let r = await step('0 indexação inicial');
  check('initial: embeddings created for distinct texts', r.row.embeddingsCreated > 0 && r.row.chunksCreated === r.row.ids.after, r.row);
  r = await step('a sem alterações');
  check('a: nothing written', r.row.realEmbedCalls === 0 && r.row.sql.chunkInsert + r.row.sql.chunkUpdate + r.row.sql.chunkDelete === 0 && r.row.ids.keptUntouched === r.row.ids.before, r.row);

  r = await step('b1 texto de 1 chunk, mesma quantidade de linhas', async () => upd(g.id, { conteudo: (await cur(g.id)).replace('Taxa de resolução: ~80%.', 'Taxa de resolução: cerca de 80% (texto revisado).') }));
  check('b1: exactly one UPDATE, one embedding, no insert/delete', r.row.realEmbedCalls === 1 && r.row.sql.chunkUpdate === 1 && r.row.sql.chunkInsert === 0 && r.row.sql.chunkDelete === 0 && r.row.ids.gone === 0 && r.row.ids.new === 0 && r.row.ids.keptTextChanged === 1 && r.row.chunksUpdated === 1 && r.row.chunksRepositioned === 0, r.row);
  r = await step('b2 texto de 1 chunk com linha nova (ANATEL)', async () => upd(g.id, { conteudo: (await cur(g.id)).replace('### ANATEL — Telecomunicações\n', '### ANATEL — Telecomunicações\nFrase nova de validação.\n') }));
  check('b2: one content update, later chunks only change line', r.row.realEmbedCalls === 1 && r.row.chunksUpdated === 1 && r.row.chunksRepositioned > 0 && r.row.sql.chunkInsert === 0 && r.row.sql.chunkDelete === 0 && r.row.ids.keptTextChanged === 1 && r.row.ids.new === 0, r.row);

  r = await step('c área de 1 chunk (Módulo 6 -> lgpd)', async () => { const s = await cur(g.id); const i = s.lastIndexOf('**Área:** civil, empresarial'); await upd(g.id, { conteudo: s.slice(0, i) + '**Área:** lgpd' + s.slice(i + '**Área:** civil, empresarial'.length) }); });
  check('c: area links only, embeddings reused, IDs kept', r.row.realEmbedCalls === 0 && r.row.ids.keptAreasChanged === 1 && r.row.ids.new === 0 && r.row.ids.gone === 0 && r.row.sql.chunkInsert === 0, r.row);

  r = await step('d1 campo área padrão (administrativo -> ambiental)', async () => upd(g.id, { area: 'ambiental' }));
  check('d1: only blocks inheriting the field change', r.row.realEmbedCalls === 0 && r.row.ids.keptAreasChanged === 1 && r.row.ids.new === 0, r.row);
  r = await step('d2 marcação do Módulo 4 (herdada por 11 capítulos)', async () => upd(g.id, { conteudo: (await cur(g.id)).replace('**Área:** empresarial, tributario, administrativo', '**Área:** tributario') }));
  check('d2: 12 chunks change areas, no embedding', r.row.realEmbedCalls === 0 && r.row.ids.keptAreasChanged === 12 && r.row.ids.new === 0, r.row);

  const bigBefore = await idsOf(big.id);
  r = await step('e inserir chunk no início (117 existentes)', async () => upd(big.id, { conteudo: '## Capítulo inserido\n\nConteúdo novo inserido no início do caderno sintético.\n\n' + (await cur(big.id)) }));
  const bigAfter = await idsOf(big.id);
  check('e: 117 IDs preserved, 1 created, 1 embedding', r.row.realEmbedCalls === 1 && r.row.sql.chunkInsert === 1 && r.row.sql.chunkDelete === 0 && JSON.stringify(bigAfter.slice(1)) === JSON.stringify(bigBefore), { ...r.row, preserved: bigAfter.slice(1).length });
  r = await step('f remover o chunk inserido', async () => upd(big.id, { conteudo: (await cur(big.id)).replace('## Capítulo inserido\n\nConteúdo novo inserido no início do caderno sintético.\n\n', '') }));
  check('f: only that record removed', r.row.realEmbedCalls === 0 && r.row.sql.chunkDelete === 1 && r.row.sql.chunkInsert === 0 && JSON.stringify(await idsOf(big.id)) === JSON.stringify(bigBefore), r.row);

  // Search: SQL filter by area happens before similarity; similar content in another area never leaks.
  sql.trace = true; sql.log = [];
  const order = [];
  const traced = { ...provider, embed: async (t, k) => { order.push({ kind: k, sqlBefore: sql.log.length }); return provider.embed(t, k); } };
  const leak = await retrieve('A empresa pode monitorar o e-mail corporativo dos empregados?', { ...traced, classify: async () => 'lgpd' }, loadCandidates);
  sql.trace = false;
  const filterIndex = sql.log.findIndex(q => q.includes('KnowledgeChunkArea'));
  const filterSql = sql.log[filterIndex];
  const qv = await real.embed('A empresa pode monitorar o e-mail corporativo dos empregados?', 'query');
  const twinRow = await db.knowledgeChunk.findFirstOrThrow({ where: { sourceId: tt.id }, include: { embedding: true } });
  const twinScore = cosine(qv, typeof twinRow.embedding.vector === 'string' ? JSON.parse(twinRow.embedding.vector) : twinRow.embedding.vector);
  report.leak = { returned: leak.chunks.map(c => ({ titulo: c.titulo, capitulo: c.chapter, score: c.score })), excludedTwinScore: twinScore, filterSql, filterIndex, order };
  check('filter before similarity: area SQL precedes the only (query) embedding', filterIndex >= 0 && /a\.area = \?/.test(filterSql) && order.length === 1 && order[0].kind === 'query' && order[0].sqlBefore > filterIndex, report.leak);
  // The trabalhista twin has the same text (same vector) but must never appear for lgpd.
  check('no cross-area leak with identical text', leak.chunks[0]?.titulo === 'Gêmeo LGPD' && leak.chunks.every(c => c.titulo !== 'Gêmeo trabalhista') && Math.abs(twinScore - leak.chunks[0].score) < 1e-9, report.leak);

  const questions = [
    ['consumidor', 'Como registro uma reclamação no consumidor.gov.br contra uma empresa?', 'MÓDULO 1 — PLATAFORMA CONSUMIDOR.GOV.BR'],
    ['consumidor', 'Posso fazer sorteio de prêmios no Instagram da minha loja sem pedir autorização?', 'MÓDULO 4 — SORTEIOS'],
    ['consumidor', 'O cliente comprou pelo site e quer devolver em 7 dias. Sou obrigado a aceitar?', 'MÓDULO 5 — VENDA ONLINE'],
    ['tributario', 'Quais regimes tributários posso escolher ao abrir uma empresa?', 'Regimes tributários'],
    ['tributario', 'Como parcelar dívidas de impostos da minha empresa?', 'Parcelamento de dívidas fiscais'],
    ['empresarial', 'Como fechar minha ME que ainda tem dívidas?', 'MÓDULO 5 — ENCERRAMENTO'],
    ['civil', 'Como protestar em cartório um cheque que voltou sem fundos?', 'MÓDULO 3 — PROTESTO'],
  ];
  for (const [area, q, expected] of questions) {
    const res = await retrieve(q, { ...provider, classify: async () => area }, loadCandidates);
    const all = await loadCandidates(area, provider.model);
    const rows = res.chunks.map(c => ({ caderno: c.titulo, capitulo: c.chapter, sub: c.subchapter, score: Number(c.score.toFixed(4)), chars: c.content.length }));
    const rank = rows.findIndex(x => x.capitulo.startsWith(expected) || x.sub?.startsWith(expected)) + 1;
    report.searches.push({ area, pergunta: q, esperado: expected, candidatosDaArea: all.length, rank, top5: rows });
    console.log(JSON.stringify(report.searches.at(-1)));
    check(`search ${area}: <=5 complete chunks from area`, res.chunks.length === Math.min(5, all.length), { area, n: res.chunks.length, all: all.length });
  }

  // Unpublish: excluded from search immediately, derived rows removed by the next job.
  await upd(p.id, { status: 'RASCUNHO' });
  const unpublishedHidden = (await loadCandidates('consumidor', provider.model)).every(c => c.titulo !== 'Propaganda (cópia derivada v1)');
  check('unpublish hides before reindex', unpublishedHidden);
  r = await step('g1 despublicar propaganda');
  check('g1: document and its chunks removed', r.row.removed === 1 && r.row.chunksRemoved === 24 && r.row.realEmbedCalls === 0 && (await db.knowledgeDocument.count({ where: { sourceId: p.id } })) === 0, r.row);
  await db.fichaConhecimento.delete({ where: { id: tt.id } });
  check('delete hides before reindex', (await loadCandidates('trabalhista', provider.model)).every(c => c.titulo !== 'Gêmeo trabalhista'));
  r = await step('g2 excluir caderno gêmeo trabalhista');
  check('g2: deleted notebook removed', r.row.removed === 1 && r.row.chunksRemoved === 1, r.row);
  r = await step('g3 republicar propaganda', async () => upd(p.id, { status: 'PUBLICADA' }));
  check('g3: republish reuses all embeddings', r.row.realEmbedCalls === 0 && r.row.embeddingsReused === 24 && r.row.chunksCreated === 24, r.row);

  // Invalid notebook in review does not block; invalid published fails atomically with every issue.
  const bad = await create('val-invalido', 'Inválido', 'civil-contratual', '## A\n**Área:** penal\nx\n## B\n**Área:** tributário\ny\n', 'EM_REVISAO');
  r = await step('h1 inválido em revisão + válidos publicados');
  check('h1: completed, invalid untouched', r.row.status === 'completed' && (await db.knowledgeDocument.count({ where: { sourceId: bad.id } })) === 0, r.row);
  const snapBad = await snapshot();
  await upd(big.id, { conteudo: (await cur(big.id)) + '## Pendente\nMudança válida pendente.\n' });
  r = await step('h2 inválido PUBLICADO + válido alterado', async () => upd(bad.id, { status: 'PUBLICADA' }), 'failed');
  check('h2: VALIDATION lists every issue; index unchanged', r.row.error === 'VALIDATION' && r.row.issues.length === 3 && JSON.stringify([...(await snapshot())]) === JSON.stringify([...snapBad]), r.row);
  await db.fichaConhecimento.delete({ where: { id: bad.id } });
  await step('h3 inválido removido; alteração válida aplicada');

  // Real failures: local model unreachable, then DB write failure inside the swap.
  const beforeFail = await snapshot();
  await upd(g.id, { conteudo: (await cur(g.id)) + '\n## Falha de modelo\nTexto que exige novo embedding.\n' });
  const original = env.LOCAL_EMBEDDINGS_URL; env.LOCAL_EMBEDDINGS_URL = 'http://judith-val-unreachable.invalid:8080';
  r = await step('i1 serviço de embeddings inacessível', null, 'failed', () => { env.LOCAL_EMBEDDINGS_URL = original; });
  check('i1: LOCAL_EMBEDDING_UNAVAILABLE, index intact', r.row.error === 'LOCAL_EMBEDDING_UNAVAILABLE' && JSON.stringify([...(await snapshot())]) === JSON.stringify([...beforeFail]), r.row);
  const hiddenWhileStale = (await loadCandidates('ambiental', provider.model)).every(c => c.titulo !== 'Guias (cópia derivada v1)');
  check('stale source excluded from search while not reindexed', hiddenWhileStale);
  await db.$executeRawUnsafe("CREATE TRIGGER val_fail BEFORE UPDATE ON KnowledgeChunk FOR EACH ROW BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'isolated failure'; END");
  await upd(g.id, { conteudo: (await cur(g.id)).replace('### ANATEL — Telecomunicações\n', '### ANATEL — Telecomunicações\nOutra frase.\n') });
  r = await step('i2 falha de escrita no swap', null, 'failed');
  check('i2: real rollback, index intact', JSON.stringify([...(await snapshot())]) === JSON.stringify([...beforeFail]), r.row);
  await db.$executeRawUnsafe('DROP TRIGGER val_fail');
  r = await step('i3 nova solicitação após falhas');
  check('i3: recovery reuses embeddings computed before the failed swap', r.row.status === 'completed' && r.row.realEmbedCalls === 0 && r.row.embeddingsCreated === 0, r.row);

  // Concurrency: source edited during preparation, and two workers on the same job.
  beforeEmbed = async () => { beforeEmbed = null; await upd(g.id, { titulo: 'Guias editado durante indexação' }); };
  r = await step('j1 edição durante preparação', async () => upd(g.id, { conteudo: (await cur(g.id)) + '\n## Corrida\nTexto concorrente.\n' }), 'failed');
  check('j1: SOURCE_CHANGED', r.row.error === 'SOURCE_CHANGED', r.row);
  const job = await requestIndex(db, 'val-two-workers');
  await Promise.all([processNextJob(db, provider), processNextJob(db, provider)]);
  const jj = await db.knowledgeJob.findUniqueOrThrow({ where: { id: job.id } });
  check('j2: two workers, one completed job', jj.status === 'completed', jj.result);
  const dup = await db.$queryRawUnsafe('SELECT sourceId, ordinal, COUNT(*) n FROM KnowledgeChunk GROUP BY sourceId, ordinal HAVING n > 1');
  check('no duplicated positions', dup.length === 0);
  await integrity('final');
  report.final = { documents: await db.knowledgeDocument.count(), chunks: await db.knowledgeChunk.count(), embeddings: await db.knowledgeEmbedding.count() };
}
main().then(() => { report.ok = true; }).catch(e => { report.ok = false; report.failure = String(e.message).slice(0, 2000); process.exitCode = 1; })
  .finally(async () => { fs.writeFileSync((process.env.KNOWLEDGE_VALIDATION_OUT || '/app/validation/out') + '/report.json', JSON.stringify(report, null, 1)); console.log('REPORT_WRITTEN ok=' + report.ok); await db.$disconnect(); });
