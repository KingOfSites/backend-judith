// No real writes or external APIs. Optional read-only production prompt check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = require('node:path').resolve(process.env.JUDITH_TEST_DIST || require('node:path').join(__dirname, '../dist')) + '/';
const replace = (id, exports) => { require.cache[require.resolve(id)] = { exports }; };
const passed = [], findings = [];
async function main() {
  let row = { secaoA: 'A'.repeat(1001), secaoB: 'B'.repeat(1001), secaoC: 'C'.repeat(1001), versao: 'synthetic' };
  if (process.env.JUDITH_TEST_READ_DB === '1') {
  const real = require(base + 'db/client.js').prisma;
  try {
    row = await real.promptConfig.findUnique({ where: { chave: 'PRINCIPAL' } });
    assert.ok(row && [row.secaoA, row.secaoB, row.secaoC].every(x => x.length > 1000));
    passed.push('Real database: PRINCIPAL and all three populated sections');
  } finally { await real.$disconnect(); }
  }
  // No network is allowed beyond the preceding read-only query.
  const deny = () => { throw new Error('External network blocked by smoke test'); };
  require('node:net').Socket.prototype.connect = deny;
  require('node:http').request = deny;
  require('node:https').request = deny;
  global.fetch = deny;
  let state;
  function reset(extra = {}) {
    state = { user: { id: 'smoke-user', whatsappNumber: '0000000000000', nome: 'Synthetic Test', plano: 'TEST', onboarding: 'CONCLUIDO', trialFimEm: null }, subscription: { status: 'ACTIVE' }, credit: null, limit: 2, used: 0, messages: [], calls: [], sends: [], consumed: 0, usages: [], payments: [], paymentFail: false, aiFail: false, ...extra };
  }
  reset();
  let transactionTail = Promise.resolve();
  const prisma = {
    promptConfig: { findUnique: async () => row },
    fichaConhecimento: { findMany: async (q) => { assert.equal(q.where.status, 'PUBLICADA'); return [{ titulo: 'Synthetic published reference', area: 'test', fontes: [], conteudo: 'PUBLISHED_KNOWLEDGE_TEST' }]; } },
    user: { findUnique: async () => state.user, findUniqueOrThrow: async () => state.user, update: async ({ data }) => Object.assign(state.user, data) },
    subscription: { findFirst: async () => state.subscription },
    avulsoCompra: { findFirst: async () => state.consumed ? null : state.credit, updateMany: async ({ where }) => { assert.equal(where.consumidoEm, null); assert.equal(where.status, 'APPROVED'); if (state.consumed || state.race) return { count: 0 }; state.consumed++; return { count: 1 }; } },
    planCatalog: { findUnique: async () => ({ duvidasMes: state.limit, analisesMes: state.limit, redacoesMes: state.limit }) },
    usageEvent: { count: async () => state.used + state.usages.length, create: async ({ data }) => { state.usages.push(data); return data; } },
    session: { findFirst: async () => null, create: async () => ({ id: 'smoke-session' }), update: async () => ({}) },
    message: { findMany: async () => [], create: async ({ data }) => { if (state.historyFail) throw new Error('mock history failure'); state.messages.push(data); return data; } },
    $queryRaw: async (strings, id) => { assert.match(strings.join('?'), /FOR UPDATE/); assert.equal(id, state.user.id); state.locked = true; return [{ id }]; },
    $transaction: async (fn, options) => {
      assert.equal(options.isolationLevel, 'ReadCommitted');
      const previous = transactionTail;
      let release;
      transactionTail = new Promise(resolve => { release = resolve; });
      await previous;
      const backup = structuredClone({ consumed: state.consumed, usages: state.usages, messages: state.messages });
      try { const result = await fn(prisma); assert.equal(state.locked, true); return result; }
      catch (e) { Object.assign(state, backup); throw e; }
      finally { release(); }
    },
  };
  replace(base + 'db/client.js', { prisma });
  replace(base + 'config/env.js', { env: { NODE_ENV: 'test', LOG_LEVEL: 'silent', PORT: 0, EVOLUTION_INSTANCE: 'judith', ANTHROPIC_API_KEY: 'fake', JUDITH_MODEL_HAIKU: 'mock-haiku', JUDITH_MODEL_SONNET: 'mock-sonnet', WEB_JUDITH_URL: 'https://checkout.invalid', INTERNAL_API_KEY: 'fake' } });
  replace('axios', { post: async (url, data) => { state.payments.push({ url, data }); if (state.paymentFail) throw new Error('mock checkout unavailable'); return { data: { url: 'https://checkout.invalid/synthetic' } }; } });
  replace('@anthropic-ai/sdk', class { messages = { create: async (req) => { assert.equal(state.consumed, 0); state.calls.push(req); if (state.aiFail) throw new Error('mock AI unavailable'); return { content: [{ type: 'text', text: state.aiEmpty ? '  ' : 'SIMULATED RESPONSE' }], usage: { input_tokens: 1, output_tokens: 1 } }; } }; });
  replace(base + 'evolution/client.js', { sendTyping: async () => {}, sendText: async (number, text) => { state.sends.push({ number, text }); } });
  replace(base + 'evolution/media.js', { downloadMediaBase64: deny });
  replace(base + 'judith/whisper.js', { transcreverAudio: deny });
  replace(base + 'bot/handler.js', { processarMensagemBot: deny });
  const Fastify = require('fastify');
  let app;
  replace('fastify', (opts) => { app = Fastify(opts); app.listen = async () => {}; return app; });
  require(base + 'server.js');
  await app.ready();
  async function webhook(text, extra = {}) {
    const payload = { event: 'messages.upsert', instance: 'judith', data: { key: { remoteJid: '0000000000000@s.whatsapp.net', fromMe: false, id: 'synthetic-smoke' }, message: { conversation: text } }, ...extra };
    const response = await app.inject({ method: 'POST', url: '/webhook/evolution', payload });
    assert.equal(response.statusCode, 200);
    for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve));
    return response;
  }
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().versao, row.versao);
  passed.push('HTTP health loads deployed prompt version');
  for (const [text, kind, section, model] of [
    ['Qual o prazo?', 'DUVIDA', null, 'mock-haiku'],
    ['redigir um contrato', 'REDACAO', row.secaoB, 'mock-sonnet'],
    ['analisa este contrato', 'ANALISE', row.secaoC, 'mock-sonnet'],
  ]) {
    reset(); await webhook(text);
    assert.equal(state.calls.length, 1);
    assert.equal(state.calls[0].system[0].text, row.secaoA);
    if (section) assert.equal(state.calls[0].system[1].text, section);
    assert.equal(state.calls[0].model, model);
    assert.ok(state.calls[0].system.some(block => block.text.includes('PUBLISHED_KNOWLEDGE_TEST')));
    assert.equal(state.sends[0].text, 'SIMULATED RESPONSE');
    assert.equal(state.messages.length, 2);
    assert.equal(state.usages[0].kind, kind);
    passed.push('Webhook -> prompt/model -> simulated AI -> history/usage -> captured reply: ' + kind);
  }
  reset({ subscription: { status: 'CANCELED' } }); await webhook('Qual o prazo?');
  assert.equal(state.calls.length, 0); assert.equal(state.usages.length, 0); assert.equal(state.sends.length, 1);
  passed.push('Inactive subscription blocks AI without recording usage');
  reset({ used: 2 }); await webhook('Qual o prazo?');
  assert.equal(state.calls.length, 0); assert.equal(state.payments.length, 1); assert.match(state.sends[0].text, /checkout.invalid/);
  passed.push('Exhausted quota returns simulated purchase link, without calling AI');
  reset({ used: 2, credit: { id: 'synthetic-credit' } }); await webhook('Qual o prazo?');
  assert.equal(state.calls.length, 1); assert.equal(state.consumed, 1); assert.equal(state.usages.length, 1);
  passed.push('Approved one-off credit allows reply and records simulated consumption');
  reset(); state.user.onboarding = 'AGUARDANDO_TERMOS'; await webhook('oi');
  assert.equal(state.calls.length, 0); assert.equal(state.sends.length, 1);
  passed.push('Onboarding replies without AI');
  reset(); await webhook('ignored', { event: 'messages.update' });
  assert.equal(state.calls.length, 0); assert.equal(state.sends.length, 0);
  await webhook('ignored', { data: { key: { remoteJid: '0000000000000@s.whatsapp.net', fromMe: true, id: 'self' }, message: { conversation: 'ignore' } } });
  assert.equal(state.calls.length, 0); assert.equal(state.sends.length, 0);
  await webhook('ignored', { data: { key: { remoteJid: 'synthetic@g.us', fromMe: false, id: 'group' }, message: { conversation: 'ignore' } } });
  assert.equal(state.calls.length, 0); assert.equal(state.sends.length, 0);
  passed.push('Other events, self-messages and groups are ignored');
  reset({ aiFail: true }); await webhook('Qual o prazo?');
  assert.equal(state.calls.length, 1); assert.equal(state.messages.length, 0); assert.equal(state.usages.length, 0); assert.equal(state.sends.length, 1);
  passed.push('AI failure returns fallback without successful usage/history');
  reset({ used: 2, paymentFail: true }); await webhook('Qual o prazo?');
  assert.equal(state.calls.length, 0); assert.equal(state.consumed, 0); assert.match(state.sends[0].text, /Tente novamente/);
  passed.push('Checkout failure keeps exhausted quota blocked');
  reset({ used: 0, credit: { id: 'synthetic-credit' } }); await webhook('Qual o prazo?');
  assert.equal(state.consumed, 0); assert.equal(state.usages.length, 1);
  passed.push('Plan quota is used before one-off credit');
  reset({ used: 2, credit: { id: 'synthetic-credit' }, aiFail: true }); await webhook('Qual o prazo?');
  assert.equal(state.consumed, 0); assert.equal(state.usages.length, 0);
  passed.push('AI failure preserves one-off credit');
  for (const flag of ['aiEmpty', 'historyFail', 'race']) {
    reset({ used: 2, credit: { id: 'synthetic-credit' }, [flag]: true }); await webhook('Qual o prazo?');
    assert.equal(state.consumed, 0); assert.equal(state.usages.length, 0); assert.equal(state.messages.length, 0);
    assert.notEqual(state.sends[0].text, 'SIMULATED RESPONSE');
    passed.push('No consumption/history on ' + flag);
  }
  reset({ subscription: { status: 'CANCELED' }, credit: { id: 'synthetic-credit' } }); await webhook('Qual o prazo?');
  assert.equal(state.consumed, 1); assert.equal(state.usages.length, 1);
  passed.push('Approved one-off credit works without active subscription');
  reset({ used: 2, credit: { id: 'synthetic-credit' } });
  await Promise.all([webhook('Qual o prazo?'), webhook('Qual o prazo?')]);
  assert.equal(state.consumed, 1); assert.equal(state.usages.length, 1); assert.equal(state.messages.length, 2);
  assert.equal(state.sends.filter(x => x.text === 'SIMULATED RESPONSE').length, 1);
  passed.push('Concurrent replies cannot spend the same one-off credit twice');
  reset({ used: 1 });
  await Promise.all([webhook('Qual o prazo?'), webhook('Qual o prazo?')]);
  assert.equal(state.usages.length, 1); assert.equal(state.messages.length, 2);
  passed.push('Concurrent replies cannot confirm beyond remaining plan quota');
  await app.close();
  console.log(JSON.stringify({ passed, findings, isolation: 'Only initial prompt SELECT used real database; all writes, AI, checkout and WhatsApp simulated; network blocked afterwards' }, null, 2));
}
main().then(() => process.exit(0)).catch(e => { console.error(e.stack); process.exit(1); });
