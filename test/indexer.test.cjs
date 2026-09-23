const { test } = require('node:test');
const assert = require('node:assert/strict');
const { processNextJob, requestIndex } = require('../dist/knowledge/indexer.js');
const { fingerprint } = require('../dist/knowledge/core.js');

// Transactional in-memory adapter: tests production orchestration, not MySQL locking semantics.
function database() {
  const state = { sources: [{ id: 'a', slug: 'civil-contratos', titulo: 'Caderno', area: 'civil', status: 'PUBLICADA', fontes: [], ordem: 0, conteudo: '## Um\nAção.\n## Dois\nProteção.' }], jobs: [], docs: [], chunks: [], embeddings: [], failWrite: false, beforeSwap: null };
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
      deleteMany: async ({ where }) => { state.chunks = state.chunks.filter(c => c.sourceId !== where.sourceId); },
      create: async ({ data }) => { if (state.failWrite) throw new Error('transaction-write-failure'); state.chunks.push(structuredClone(data)); },
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
  assert.deepEqual(state.chunks[0].areas.create, [{ area: 'consumidor' }]);
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
    state.chunks.push({ sourceId: status, content: 'obsolete' });
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
