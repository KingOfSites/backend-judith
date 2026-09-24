const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(__dirname, '../dist');
const inject = (file, exports) => { require.cache[require.resolve(path.join(base, file))] = { exports }; };
const env = { INTERNAL_API_KEY: 'test-only-key', KNOWLEDGE_WORKER_ENABLED: true, ANTHROPIC_API_KEY: 'test', LOCAL_EMBEDDINGS_URL: 'http://embeddings:8080', JUDITH_MODEL_HAIKU: 'test' };
inject('config/env.js', { env });
const jobs = [];
const prisma = {
  knowledgeJob: {
    findUnique: async ({ where }) => jobs.find(j => Object.entries(where).every(([k, v]) => j[k] === v)) ?? null,
    findUniqueOrThrow: async ({ where }) => jobs.find(j => j.activeKey === where.activeKey),
    create: async ({ data }) => {
      if (jobs.some(j => j.activeKey === data.activeKey)) throw new (require('@prisma/client').Prisma.PrismaClientKnownRequestError)('unique', { code: 'P2002', clientVersion: 'test' });
      const job = { id: 'job-' + jobs.length, status: 'pending', total: 0, processed: 0, result: null, errors: null, ...data }; jobs.push(job); return job;
    },
  },
};
inject('db/client.js', { prisma });

test('Admin HTTP: autenticação, payload, validação, idempotência, progresso, resultado e erro', async () => {
  const app = require('fastify')();
  require('../dist/routes/knowledge.js').registerKnowledgeRoutes(app);
  await app.ready();
  const headers = { 'x-internal-key': env.INTERNAL_API_KEY };
  const validate = '/internal/knowledge/validate', reindex = '/internal/knowledge/reindex';
  try {
    for (const [method, url, payload] of [['POST', validate, {}], ['POST', reindex, {}], ['GET', '/internal/knowledge/jobs/missing', undefined]]) {
      assert.equal((await app.inject({ method, url, payload })).statusCode, 401);
      assert.equal((await app.inject({ method, url, payload, headers: { 'x-internal-key': 'wrong' } })).statusCode, 401);
    }
    assert.equal((await app.inject({ method: 'POST', url: validate, headers, payload: {} })).statusCode, 400);
    for (const conteudo of ['', '# Capa\nSomente apresentação', '## Vazio\n**Área:** civil', '### Sem capítulo\nTexto']) {
      const invalid = await app.inject({ method: 'POST', url: validate, headers, payload: { area: 'civil', conteudo } });
      assert.equal(invalid.statusCode, 422); assert.match(invalid.json().errors[0].mensagem, /capítulo iniciado por ##/);
    }
    let r = await app.inject({ method: 'POST', url: validate, headers, payload: { area: 'civil', conteudo: '## Contratos\n**Área:** financeiro\nErro' } });
    assert.equal(r.statusCode, 422); assert.equal(r.json().errors[0].linha, 2); assert.equal(r.json().errors[0].capitulo, 'Contratos');
    r = await app.inject({ method: 'POST', url: validate, headers, payload: { area: 'civil, consumidor', conteudo: '## Caderno\n' + 'á'.repeat(169000) } });
    assert.equal(r.statusCode, 200); assert.equal(r.json().valid, true);
    assert.equal((await app.inject({ method: 'POST', url: reindex, headers, payload: { requestKey: 'bad key' } })).statusCode, 400);
    r = await app.inject({ method: 'POST', url: reindex, headers, payload: { requestKey: 'request-1' } });
    assert.equal(r.statusCode, 202); const first = r.json();
    assert.equal((await app.inject({ method: 'POST', url: reindex, headers, payload: { requestKey: 'competing-request' } })).statusCode, 409);
    assert.equal((await app.inject({ method: 'POST', url: reindex, headers, payload: { requestKey: 'request-1' } })).json().jobId, first.jobId);
    jobs[0].status = 'processing'; jobs[0].processed = 2; jobs[0].total = 3;
    r = await app.inject({ method: 'GET', url: first.statusUrl, headers }); assert.equal(r.json().processed, 2); assert.equal(r.json().status, 'processing');
    jobs[0].status = 'completed'; jobs[0].result = { changed: 3 };
    r = await app.inject({ method: 'GET', url: first.statusUrl, headers }); assert.deepEqual(r.json().result, { changed: 3 });
    jobs[0].status = 'failed'; jobs[0].errors = { code: 'SOURCE_CHANGED' };
    r = await app.inject({ method: 'GET', url: first.statusUrl, headers }); assert.equal(r.json().errors.code, 'SOURCE_CHANGED');
    assert.equal((await app.inject({ method: 'GET', url: '/internal/knowledge/jobs/unknown', headers })).statusCode, 404);
    env.KNOWLEDGE_WORKER_ENABLED = false;
    assert.equal((await app.inject({ method: 'POST', url: reindex, headers, payload: { requestKey: 'request-2' } })).statusCode, 503);
    env.KNOWLEDGE_WORKER_ENABLED = true;
  } finally { await app.close(); }
});

test('repositório: SQL parametrizado filtra área/publicação; fonte editada ou excluída não entra', async () => {
  const { fingerprint } = require('../dist/knowledge/core.js');
  const source = { id: 'a', slug: 'civil-contratos', titulo: 'Teste', area: 'civil', status: 'PUBLICADA', fontes: [], conteudo: 'Completo', ordem: 0 };
  let current = source;
  const rows = [{ id: 'chunk', sourceId: 'a', fingerprint: fingerprint(source), content: 'Completo', chapter: 'A', subchapter: null, vector: [1, 0] }];
  prisma.$transaction = async (fn, options) => {
    assert.equal(options.isolationLevel, 'RepeatableRead');
    return fn({
      $queryRaw: async query => {
        assert.match(query.sql, /a.area = \?/); assert.match(query.sql, /f.status = 'PUBLICADA'/); assert.match(query.sql, /d.published = true/);
        assert.deepEqual(query.values, ['civil', 'test', 'test']); return rows;
      },
      fichaConhecimento: { findMany: async query => { assert.deepEqual(query.where, { id: { in: ['a'] }, status: 'PUBLICADA' }); return current ? [current] : []; } },
    });
  };
  const { loadCandidates } = require('../dist/knowledge/repository.js');
  assert.equal((await loadCandidates('civil', 'test')).length, 1);
  for (const edit of [{ conteudo: 'Editado' }, { area: 'lgpd' }, { fontes: ['mudou'] }, { status: 'RASCUNHO' }]) {
    current = { ...source, ...edit }; assert.equal((await loadCandidates('civil', 'test')).length, 0);
  }
  current = null; assert.equal((await loadCandidates('civil', 'test')).length, 0);
});

test('provedor: classificação estrita e embeddings locais completos, sem fallback pago', async () => {
  let answer = 'civil'; const inputs = [];
  require.cache[require.resolve('@anthropic-ai/sdk')] = { exports: class { messages = { create: async () => ({ content: [{ type: 'text', text: answer }] }) }; } };
  require.cache[require.resolve('openai')] = { exports: class { constructor() { assert.fail('Paid embedding provider constructed'); } } };
  const { createProvider, LOCAL_EMBEDDING_MODEL } = require('../dist/knowledge/provider.js');
  const provider = createProvider();
  assert.equal(await provider.classify('pergunta'), 'civil');
  answer = 'nenhuma'; assert.equal(await provider.classify('?'), null);
  answer = 'financeiro'; await assert.rejects(provider.classify('?'));
  answer = 'civil, consumidor'; await assert.rejects(provider.classify('?'), /CLASSIFICATION_INVALID/);
  const originalFetch = global.fetch;
  let response = { model: LOCAL_EMBEDDING_MODEL, vector: Array.from({length:1024},(_,i)=>i===0?1:0) };
  global.fetch = async (url, options) => {
    assert.equal(String(url), 'http://embeddings:8080/embed');
    assert.equal(options.redirect, 'error'); inputs.push(JSON.parse(options.body));
    return { ok: true, json: async () => response };
  };
  try {
    const text = 'Ação e proteção 🦉 '.repeat(12000);
    assert.equal((await provider.embed(text, 'passage')).length, 1024);
    assert.deepEqual(inputs[0], {text, kind:'passage'});
    await provider.embed('Pergunta', 'query'); assert.equal(inputs[1].kind, 'query');
    response = { ...response, model: 'wrong' };
    await assert.rejects(provider.embed('texto'), /EMBEDDING_MODEL_MISMATCH/);
    response = { model: LOCAL_EMBEDDING_MODEL, vector: [1,0] };
    await assert.rejects(provider.embed('texto'), /VECTOR_DIMENSION_MISMATCH/);
    global.fetch = async () => ({ ok: false });
    await assert.rejects(provider.embed('texto'), /LOCAL_EMBEDDING_UNAVAILABLE/);
    global.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(provider.embed('texto'), /LOCAL_EMBEDDING_UNAVAILABLE/);
  } finally { global.fetch = originalFetch; }
});
