const { test } = require('node:test');
const assert = require('node:assert/strict');
const { processNextJob, requestIndex } = require('../dist/knowledge/indexer.js');
const { fingerprint } = require('../dist/knowledge/core.js');

// Transactional in-memory adapter: tests production orchestration, not MySQL locking semantics.
function database() {
  const state = { sources: [{ id: 'a', slug: 'civil-contratos', titulo: 'Caderno', area: 'civil', status: 'PUBLICADA', fontes: [], ordem: 0, conteudo: '## Um\nAção.\n## Dois\nProteção.' }], jobs: [], docs: [], chunks: [], embeddings: [], failWrite: false, beforeSwap: null, seq: 0, writes: { create: 0, update: 0 } };
  // Mirrors the (sourceId, ordinal) unique index, so the write order is checked.
  const unique = (sourceId, ordinal, self) => {
    if (state.chunks.some(c => c.sourceId === sourceId && c.ordinal === ordinal && c.id !== self)) throw new Error('P2002 KnowledgeChunk_sourceId_ordinal_key');
  };
  const match = (j, w) => Object.entries(w).every(([k, v]) => {
    if (v && typeof v === 'object') {
      if ('lt' in v) return j[k] != null && j[k] < v.lt;
      if ('gt' in v) return j[k] != null && j[k] > v.gt;
      if ('in' in v) return v.in.includes(j[k]);
    }
    return j[k] === v;
  });
  const db = {
    knowledgeJob: {
      findUnique: async ({ where }) => state.jobs.find(j => match(j, where)) ?? null,
      findFirst: async ({ where }) => state.jobs.find(j => match(j, where)) ?? null,
      create: async ({ data }) => { const j = { id: String(state.jobs.length), status: 'pending', total: 0, processed: 0, result: null, errors: null, ...data }; state.jobs.push(j); return j; },
      updateMany: async ({ where, data }) => { const rows = state.jobs.filter(j => match(j, where)); rows.forEach(j => Object.assign(j, data)); return { count: rows.length }; },
      update: async ({ where, data }) => { const j = state.jobs.find(j => match(j, where)); Object.assign(j, data); return j; },
    },
    fichaConhecimento: { findMany: async ({ where } = {}) => structuredClone(state.sources.filter(s => !where || match(s, where))) },
    knowledgeDocument: {
      findMany: async () => structuredClone(state.docs),
      upsert: async ({ where, create, update }) => { const d = state.docs.find(d => d.sourceId === where.sourceId); if (d) Object.assign(d, update); else state.docs.push(create); },
      deleteMany: async ({ where }) => { state.docs = state.docs.filter(d => !where.sourceId.in.includes(d.sourceId)); state.chunks = state.chunks.filter(c => !where.sourceId.in.includes(c.sourceId)); },
    },
    knowledgeChunk: {
      findMany: async ({ where, select, include }) => structuredClone(state.chunks.filter(c => c.sourceId === where.sourceId).sort((a, b) => a.ordinal - b.ordinal))
        .map(c => select ? { embeddingId: c.embeddingId } : include ? { ...c, areas: c.areas.map(area => ({ area })) } : c),
      count: async ({ where }) => state.chunks.filter(c => where.sourceId.in.includes(c.sourceId)).length,
      deleteMany: async ({ where }) => { state.chunks = state.chunks.filter(c => !where.id.in.includes(c.id)); },
      update: async ({ where, data }) => {
        if (state.failWrite) throw new Error('transaction-write-failure');
        const c = state.chunks.find(c => c.id === where.id);
        unique(c.sourceId, data.ordinal ?? c.ordinal, c.id); Object.assign(c, data); state.writes.update++;
      },
      create: async ({ data }) => {
        if (state.failWrite) throw new Error('transaction-write-failure');
        unique(data.sourceId, data.ordinal);
        state.chunks.push({ id: `chunk-${++state.seq}`, ...structuredClone(data), areas: data.areas.create.map(a => a.area) }); state.writes.create++;
      },
    },
    knowledgeChunkArea: {
      deleteMany: async ({ where }) => { const c = state.chunks.find(c => c.id === where.chunkId); c.areas = c.areas.filter(a => !where.area.in.includes(a)); },
      createMany: async ({ data }) => { for (const { chunkId, area } of data) state.chunks.find(c => c.id === chunkId).areas.push(area); },
    },
    knowledgeEmbedding: {
      findUnique: async ({ where }) => state.embeddings.find(e => e.id === where.id),
      upsert: async ({ create }) => { if (!state.embeddings.some(e => e.id === create.id)) state.embeddings.push(create); },
    },
    $queryRaw: async () => structuredClone(state.sources),
    $transaction: async fn => {
      if (state.beforeSwap) state.beforeSwap();
      const backup = structuredClone({ docs: state.docs, chunks: state.chunks, jobs: state.jobs });
      try { return await fn(db); } catch (e) { Object.assign(state, backup); throw e; }
    },
  };
  return { db, state };
}
test('indexador: criação, repetição idempotente, metadados, área, conteúdo, status e exclusão', async () => {
  const { db, state } = database(); let calls = 0, runId = 0;
  const provider = { model: 'test', embed: async () => { calls++; return [1, 0]; } };
  const run = async () => { await requestIndex(db, `run-${runId++}`); await processNextJob(db, provider); assert.equal(state.jobs.at(-1).status, 'completed'); };
  const job = await requestIndex(db, 'same'); assert.equal((await requestIndex(db, 'same')).id, job.id);
  await processNextJob(db, provider); assert.equal(calls, 2); assert.equal(state.chunks.length, 2);
  await run(); assert.equal(calls, 2); assert.equal(state.jobs.at(-1).result.unchanged, 1);
  state.sources[0].area = 'consumidor'; await run(); assert.equal(calls, 2);
  assert.deepEqual(state.chunks[0].areas, ['consumidor']);
  state.sources[0].fontes = ['nova']; await run(); assert.equal(calls, 2);
  state.sources[0].conteudo += ' Mudou.'; await run(); assert.equal(calls, 3);
  state.sources[0].status = 'RASCUNHO'; await run(); assert.equal(state.docs.length, 0); assert.equal(state.chunks.length, 0); assert.equal(calls, 3);
  state.sources[0].status = 'PUBLICADA'; await run(); assert.equal(state.docs[0].published, true); assert.equal(calls, 3);
  state.sources = []; await run(); assert.equal(state.docs.length, 0); assert.equal(state.chunks.length, 0); assert.equal(state.jobs.at(-1).result.removed, 1);
});
test('indexador: falha de embedding e falha de escrita preservam índice completo anterior', async () => {
  const { db, state } = database();
  const provider = { model: 'test', embed: async () => [1, 0] };
  await requestIndex(db, 'first'); await processNextJob(db, provider);
  const before = structuredClone(state.chunks), beforeDocs = structuredClone(state.docs);
  state.sources[0].conteudo += ' novo';
  await requestIndex(db, 'embed-fail');
  await processNextJob(db, { model: 'test', embed: async () => { throw new Error('secret must not escape'); } });
  assert.equal(state.jobs.at(-1).status, 'failed'); assert.equal(state.jobs.at(-1).errors.code, 'INDEXING_FAILED');
  assert.deepEqual(state.chunks, before); assert.deepEqual(state.docs, beforeDocs);
  state.failWrite = true;
  await requestIndex(db, 'write-fail'); await processNextJob(db, provider);
  assert.equal(state.jobs.at(-1).status, 'failed'); assert.deepEqual(state.chunks, before); assert.deepEqual(state.docs, beforeDocs);
  state.failWrite = false;
  await requestIndex(db, 'retry'); await processNextJob(db, provider);
  assert.equal(state.jobs.at(-1).status, 'completed'); assert.equal(state.jobs.at(-1).result.embeddingsCreated, 0);
});
test('indexador: fonte alterada durante preparação aborta swap', async () => {
  const { db, state } = database();
  state.beforeSwap = () => { state.sources[0].area = 'lgpd'; };
  await requestIndex(db, 'race'); await processNextJob(db, { model: 'test', embed: async () => [1, 0] });
  assert.equal(state.jobs[0].errors.code, 'SOURCE_CHANGED'); assert.equal(state.docs.length, 0);
});
test('indexador: worker expirado, fencing e validação antes de indexar', async () => {
  const { db, state } = database();
  const old = await requestIndex(db, 'old'); old.status = 'processing'; old.leaseUntil = new Date(0);
  await processNextJob(db, { model: 'test' });
  assert.equal(old.status, 'failed'); assert.equal(old.errors.code, 'WORKER_INTERRUPTED'); assert.equal(old.activeKey, null);
  state.sources[0].area = 'financeiro'; await requestIndex(db, 'invalid');
  await processNextJob(db, { model: 'test', embed: async () => assert.fail('invalid source embedded') });
  assert.equal(state.jobs.at(-1).errors.code, 'VALIDATION'); assert.equal(state.docs.length, 0);
  state.sources[0].area = 'civil';
  state.beforeSwap = () => { state.jobs.at(-1).leaseUntil = new Date(0); };
  await requestIndex(db, 'fenced'); await processNextJob(db, { model: 'test', embed: async () => [1, 0] });
  assert.equal(state.jobs.at(-1).errors.code, 'LEASE_LOST'); assert.equal(state.docs.length, 0);
});
test('indexador: legados inválidos em revisão/rascunho não bloqueiam publicado válido', async () => {
  const { db, state } = database();
  for (const status of ['EM_REVISAO', 'RASCUNHO']) {
    state.sources.push({ ...state.sources[0], id: status, slug: status, status, area: 'civil-contratual', conteudo: '## Legado\nÁrea: invalida\nConteúdo legado.' });
    state.docs.push({ sourceId: status, published: true, fingerprint: 'obsolete', model: 'test' });
    state.chunks.push({ id: `obsolete-${status}`, sourceId: status, ordinal: 0, content: 'obsolete', areas: [] });
  }
  const before = structuredClone(state.sources);
  let calls = 0;
  await requestIndex(db, 'legacy');
  await processNextJob(db, { model: 'test', embed: async () => { calls++; return [1, 0]; } });
  assert.equal(state.jobs[0].status, 'completed');
  assert.equal(state.jobs[0].total, 1);
  assert.equal(state.jobs[0].processed, 1);
  assert.equal(state.jobs[0].result.removed, 2);
  assert.equal(calls, 2);
  assert.deepEqual(state.docs.map(d => d.sourceId), ['a']);
  assert.equal(state.chunks.length, 2);
  assert.ok(state.chunks.every(c => c.sourceId === 'a'));
  assert.deepEqual(state.sources, before);
});

test('indexador: publicação ou despublicação durante preparação aborta swap', async () => {
  for (const publish of [true, false]) {
    const { db, state } = database();
    state.sources.push({ ...state.sources[0], id: 'review', slug: 'review', status: 'EM_REVISAO' });
    state.beforeSwap = () => { state.sources[publish ? 1 : 0].status = publish ? 'PUBLICADA' : 'RASCUNHO'; };
    await requestIndex(db, 'publication-race');
    await processNextJob(db, { model: 'test', embed: async () => [1, 0] });
    assert.equal(state.jobs[0].errors.code, 'SOURCE_CHANGED');
    assert.equal(state.docs.length, 0);
    assert.equal(state.chunks.length, 0);
  }
});

test('indexador: dois workers não processam o mesmo job', async () => {
  const { db, state } = database(); let calls = 0;
  await requestIndex(db, 'concurrent');
  const provider = { model: 'test', embed: async () => { calls++; return [1, 0]; } };
  await Promise.all([processNextJob(db, provider), processNextJob(db, provider)]);
  assert.equal(calls, 2); assert.equal(state.jobs[0].status, 'completed'); assert.equal(state.docs[0].fingerprint, fingerprint(state.sources[0]));
});

test('indexador incremental: preserva IDs e grava só os chunks afetados', async () => {
  const { db, state } = database(); let calls = 0, runId = 0;
  const provider = { model: 'test', embed: async () => { calls++; return [1, 0]; } };
  const blocks = ['## Um\n**Área:** civil\nTexto um.\n', '## Dois\nTexto dois.\n', '### Dois A\nSub dois.\n', '## Três\n**Área:** lgpd\nTexto três.\n', '## Quatro\nTexto quatro.\n'];
  state.sources[0].conteudo = blocks.join('');
  const run = async () => {
    Object.assign(state.writes, { create: 0, update: 0 }); const before = calls;
    await requestIndex(db, `inc-${runId++}`); await processNextJob(db, provider);
    const job = state.jobs.at(-1); assert.equal(job.status, 'completed', JSON.stringify(job.errors));
    return { ...job.result, embedCalls: calls - before, ...state.writes };
  };
  const ids = () => state.chunks.slice().sort((a, b) => a.ordinal - b.ordinal).map(c => c.id);
  let r = await run(); assert.equal(r.chunksCreated, 5); assert.equal(r.embedCalls, 5);
  // Carry-over: chapters without a marker keep the last chapter marker.
  assert.deepEqual(state.chunks.map(c => c.areas), [['civil'], ['civil'], ['civil'], ['lgpd'], ['lgpd']]);
  let before = ids();
  r = await run(); assert.equal(r.unchanged, 1); assert.equal(r.embedCalls, 0); assert.equal(r.create + r.update, 0);
  // Text of one chunk: that record is updated in place; nothing else is written.
  state.sources[0].conteudo = state.sources[0].conteudo.replace('Texto dois.', 'Texto dois revisado.');
  r = await run();
  assert.deepEqual([r.chunksUpdated, r.chunksCreated, r.chunksRemoved, r.chunksUnchanged, r.embedCalls, r.update, r.create], [1, 0, 0, 4, 1, 1, 0]);
  assert.deepEqual(ids(), before);
  // Area only: association rows change, embeddings reused, no chunk row rewritten.
  state.sources[0].conteudo = state.sources[0].conteudo.replace('**Área:** lgpd', '**Área:** lgpd, consumidor');
  r = await run();
  assert.equal(r.embedCalls, 0); assert.equal(r.areaLinksAdded, 2); assert.equal(r.areaLinksRemoved, 0);
  assert.equal(r.chunksUpdated, 2); assert.equal(r.update, 1); // content of "Três" holds the marker line
  assert.deepEqual(ids(), before);
  // Default field only matters before the first marker: nothing inherits it here.
  state.sources[0].area = 'ambiental'; r = await run();
  assert.equal(r.chunksUnchanged, 5); assert.equal(r.create + r.update, 0);
  // Insert at the start: one new record, the others keep IDs and only move.
  state.sources[0].conteudo = '## Zero\n**Área:** eca\nTexto zero.\n' + state.sources[0].conteudo;
  r = await run();
  assert.equal(r.chunksCreated, 1); assert.equal(r.embedCalls, 1); assert.equal(r.chunksRemoved, 0);
  assert.equal(r.chunksUpdated, 0); assert.equal(r.chunksRepositioned, 5); // ordinal/line only
  assert.deepEqual(ids().slice(1), before);
  // Remove it again: only that record goes.
  const inserted = ids()[0];
  state.sources[0].conteudo = state.sources[0].conteudo.replace('## Zero\n**Área:** eca\nTexto zero.\n', '');
  r = await run();
  assert.equal(r.chunksRemoved, 1); assert.equal(r.chunksCreated, 0); assert.equal(r.embedCalls, 0);
  assert.deepEqual(ids(), before); assert.ok(!state.chunks.some(c => c.id === inserted));
  // Reorder two chapters: records survive the unique (sourceId, ordinal) constraint.
  const parts = state.sources[0].conteudo.split(/(?=^## )/m);
  state.sources[0].conteudo = [parts[0], parts[2], parts[1], parts[3]].join('');
  r = await run(); assert.equal(r.chunksCreated + r.chunksRemoved + r.embedCalls, 0);
  assert.deepEqual(new Set(ids()), new Set(before));
  // Duplicate blocks and a failing write: rollback keeps the previous index intact.
  const snapshot = structuredClone(state.chunks);
  state.sources[0].conteudo += '## Quatro\nTexto quatro.\n';
  state.failWrite = true; await requestIndex(db, 'inc-fail'); await processNextJob(db, provider);
  assert.equal(state.jobs.at(-1).status, 'failed'); assert.deepEqual(state.chunks, snapshot);
  state.failWrite = false; r = await run(); assert.equal(r.chunksCreated, 1); assert.equal(r.embedCalls, 0);
  // Model change: every representation recalculated, records updated in place.
  provider.model = 'other'; before = ids(); r = await run();
  assert.equal(r.embedCalls, 5); assert.equal(r.chunksCreated, 0); assert.deepEqual(ids(), before);
});
