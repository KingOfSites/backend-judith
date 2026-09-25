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
    state = { user: { id: 'smoke-user', whatsappNumber: '0000000000000', nome: 'Synthetic Test', plano: 'TEST', onboarding: 'CONCLUIDO', trialFimEm: null }, subscription: { status: 'ACTIVE' }, credit: null, courtesy: 0, courtesyKind: 'DUVIDA', limit: 2, used: 0, messages: [], calls: [], sends: [], consumed: 0, usages: [], payments: [], paymentFail: false, aiFail: false, ...extra };
  }
  reset();
  let transactionTail = Promise.resolve();
  const prisma = {
    promptConfig: { findUnique: async () => row },
    fichaConhecimento: { findMany: async (q) => { assert.equal(q.where.status, 'PUBLICADA'); return [{ titulo: 'Synthetic published reference', area: 'test', fontes: [], conteudo: 'PUBLISHED_KNOWLEDGE_TEST' }]; } },
    user: { findUnique: async ({ where } = {}) => where?.whatsappNumber && where.whatsappNumber !== state.user.whatsappNumber ? null : state.user, findUniqueOrThrow: async () => state.user, update: async ({ data }) => Object.assign(state.user, data) },
    subscription: { findFirst: async () => state.subscription },
    creditoCortesia: {
      findFirst: async ({ where }) => {
        assert.equal(where.userId, state.user.id);
        assert.equal(where.saldo.gt, 0);
        return state.courtesy > 0 && where.servico === state.courtesyKind ? { id: 'courtesy-test' } : null;
      },
      updateMany: async ({ where, data }) => {
        assert.equal(where.id, 'courtesy-test');
        assert.equal(where.userId, state.user.id);
        assert.equal(where.servico, state.courtesyKind);
        assert.equal(where.saldo.gt, 0);
        assert.equal(data.saldo.decrement, 1);
        if (state.courtesy < 1 || state.race) return { count: 0 };
        state.courtesy--; return { count: 1 };
      },
    },
    avulsoCompra: { findFirst: async () => state.consumed ? null : state.credit, updateMany: async ({ where }) => { assert.equal(where.consumidoEm, null); assert.equal(where.status, 'APPROVED'); if (state.consumed || state.race) return { count: 0 }; state.consumed++; return { count: 1 }; } },
    planCatalog: { findUnique: async () => ({ duvidasMes: state.limit, analisesMes: state.limit, redacoesMes: state.limit }) },
    usageEvent: { count: async () => state.used + state.usages.length, create: async ({ data }) => { state.usages.push(data); return data; } },
    session: { findFirst: async () => null, create: async () => ({ id: 'smoke-session' }), update: async () => ({}) },
    message: { findMany: async ({ take, orderBy }) => { assert.deepEqual(orderBy, { createdAt: 'desc' }); return state.messages.slice(-take).reverse(); }, create: async ({ data }) => { if (state.historyFail) throw new Error('mock history failure'); if (data.id && state.messages.some(m => m.id === data.id)) throw Object.assign(new Error('duplicate'), { code: 'P2002' }); state.messages.push(data); return data; } },
    knowledgeInteraction: { findMany: async () => state.traces ?? [] },
    knowledgeFeedback: {
      create: async ({ data }) => { state.feedback = { ...(state.feedback || {}), [data.replyId]: { ...data, helpful: null, reaction: null } }; return data; },
      findUnique: async ({ where }) => state.feedback?.[where.replyId] ?? null,
      update: async ({ where, data }) => Object.assign(state.feedback[where.replyId], data),
    },
    knowledgeSetting: { findUnique: async ({ where }) => state.settings && where.chave in state.settings ? { valor: state.settings[where.chave] } : null },
    $queryRaw: async (strings, id) => { assert.match(strings.join('?'), /FOR UPDATE/); assert.equal(id, state.user.id); state.locked = true; return [{ id }]; },
    $transaction: async (fn, options) => {
      assert.equal(options.isolationLevel, 'ReadCommitted');
      const previous = transactionTail;
      let release;
      transactionTail = new Promise(resolve => { release = resolve; });
      await previous;
      const backup = structuredClone({ consumed: state.consumed, courtesy: state.courtesy, usages: state.usages, messages: state.messages });
      try { const result = await fn(prisma); assert.equal(state.locked, true); return result; }
      catch (e) { Object.assign(state, backup); throw e; }
      finally { release(); }
    },
  };
  replace(base + 'db/client.js', { prisma });
  replace(base + 'config/env.js', { env: { NODE_ENV: 'test', LOG_LEVEL: 'silent', PORT: 0, EVOLUTION_INSTANCE: 'judith', ANTHROPIC_API_KEY: 'fake', JUDITH_MODEL_HAIKU: 'mock-haiku', JUDITH_MODEL_SONNET: 'mock-sonnet', WEB_JUDITH_URL: 'https://checkout.invalid', INTERNAL_API_KEY: 'fake', URL_TERMOS: 'https://judith.invalid/termos' } });
  replace('axios', { post: async (url, data) => { state.payments.push({ url, data }); if (state.paymentFail) throw new Error('mock checkout unavailable'); return { data: { url: 'https://checkout.invalid/synthetic' } }; } });
  replace('@anthropic-ai/sdk', class { messages = { create: async (req) => { assert.equal(state.consumed, 0); state.calls.push(req); if (state.aiFail || state.generationSecondFail && state.calls.length === 2) throw new Error('mock AI unavailable'); return { content: req.tools ? [{type:'tool_use',name:'grounded_answer',input:{scopeAnalysis:'mock scope',unsupported:false,answer:state.aiEmpty ? '  ' : 'SIMULATED RESPONSE'}}] : [{type:'text',text:state.aiEmpty ? '  ' : 'SIMULATED RESPONSE'}], usage: { input_tokens: 1, output_tokens: 1 } }; } }; });
  replace(base + 'evolution/client.js', { sendTyping: async () => {}, sendText: async (number, text) => { state.sends.push({ number, text }); return 'sent-' + state.sends.length; } });
  replace(base + 'evolution/media.js', { downloadMediaBase64: deny });
  replace(base + 'judith/whisper.js', { transcreverAudio: deny });
  replace(base + 'knowledge/audit.js', {writeAudit:async(id,payload)=>{ if(state.traceFail || state.traceLateFail && payload.stage==='support_passed') throw new (require(base+'knowledge/errors.js').KnowledgeSearchError)('TRACE_UNAVAILABLE'); }});
  replace(base + 'knowledge/support.js', {SUPPORT_POLICY_VERSION:'test',verifySupport:async()=>{
    state.verifications = (state.verifications || 0) + 1;
    if(state.supportFail || state.supportSecondFail && state.verifications === 2) throw new (require(base+'knowledge/errors.js').KnowledgeSearchError)('SUPPORT_UNAVAILABLE');
    return {supported:!state.supportRejected && !(state.supportRejectedOnce && state.verifications === 1)};
  }});
  replace(base + 'judith/conhecimento.js', { getKnowledgeContext: async (question, history, previousArea) => {
    state.previousAreas = [...(state.previousAreas || []), previousArea];
    if (state.knowledgeFailure) throw new (require(base + 'knowledge/errors.js').KnowledgeSearchError)(state.knowledgeFailure);
    return {text:'PUBLISHED_KNOWLEDGE_TEST',area:'lgpd',searchText:'synthetic query',chunks:[]};
  } });
  replace(base + 'bot/handler.js', { processarMensagemBot: deny });
  const Fastify = require('fastify');
  let app;
  replace('fastify', (opts) => { app = Fastify(opts); app.listen = async () => {}; return app; });
  require(base + 'server.js');
  await app.ready();
  let transportId = 0;
  async function webhook(text, extra = {}) {
    const payload = { event: 'messages.upsert', instance: 'judith', data: { key: { remoteJid: '0000000000000@s.whatsapp.net', fromMe: false, id: 'synthetic-smoke-' + transportId++ }, message: { conversation: text } }, ...extra };
    const response = await app.inject({ method: 'POST', url: '/webhook/evolution', payload });
    assert.equal(response.statusCode, 200);
    for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve));
    return response;
  }
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().versao, row.versao);
  passed.push('HTTP health loads deployed prompt version');
  for(const failure of ['supportFail','supportRejected','traceFail','traceLateFail']) {
    reset({[failure]:true,limit:0,courtesy:2});
    await webhook('Pela LGPD, um cliente pode pedir a eliminação de dados?');
    assert.equal(state.courtesy,2);assert.equal(state.usages.length,0);assert.equal(state.consumed,0);
    assert.equal(state.messages.filter(m=>m.role==='USER').length,1);
    assert.equal(state.messages.filter(m=>m.role==='ASSISTANT').length,0);
    assert.equal(state.sends.length,1);assert.match(state.sends[0].text,/Nenhum crédito foi consumido/);
    await webhook('E se a empresa se recusar a apagar?');
    assert.equal(state.courtesy,2);assert.equal(state.usages.length,0);
    passed.push('Support/audit failure preserves courtesy and incoming history: '+failure);
  }
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
    assert.equal(state.calls[0].system.some(block => block.text.includes('PUBLISHED_KNOWLEDGE_TEST')), kind === 'DUVIDA');
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
  assert.equal(state.calls.length, 1); assert.equal(state.messages.length, 1); assert.equal(state.usages.length, 0); assert.equal(state.sends.length, 1);
  passed.push('AI failure returns fallback without successful usage/history');

  for (const code of ['CLASSIFICATION_INVALID', 'KNOWLEDGE_UNAVAILABLE', 'KNOWLEDGE_NO_CONTEXT', 'KNOWLEDGE_OUT_OF_SCOPE']) {
    reset({ knowledgeFailure: code, subscription: null, credit: { id: 'credit-test' } });
    await webhook('Tenho uma dúvida sobre meu contrato');
    assert.equal(state.calls.length, 0); assert.equal(state.consumed, 0);
    assert.equal(state.usages.length, 0); assert.equal(state.messages.length, 1);
    assert.equal(state.messages[0].content, 'Tenho uma dúvida sobre meu contrato');
    assert.equal(state.sends.length, 1); assert.match(state.sends[0].text, /Nenhum crédito/);
    assert.equal(/Tente novamente/.test(state.sends[0].text), ['CLASSIFICATION_INVALID', 'KNOWLEDGE_UNAVAILABLE'].includes(code));
    passed.push('Knowledge failure is explicit and preserves credit: ' + code);
  }
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
    assert.equal(state.consumed, 0); assert.equal(state.usages.length, 0); assert.equal(state.messages.length, flag === 'historyFail' ? 0 : 1);
    assert.notEqual(state.sends[0].text, 'SIMULATED RESPONSE');
    passed.push('No consumption/history on ' + flag);
  }
  reset({ subscription: { status: 'CANCELED' }, credit: { id: 'synthetic-credit' } }); await webhook('Qual o prazo?');
  assert.equal(state.consumed, 1); assert.equal(state.usages.length, 1);
  passed.push('Approved one-off credit works without active subscription');
  reset({ used: 2, credit: { id: 'synthetic-credit' } });
  await Promise.all([webhook('Qual o prazo?'), webhook('Qual o prazo?')]);
  assert.equal(state.consumed, 1); assert.equal(state.usages.length, 1); assert.ok([2, 3].includes(state.messages.length));
  assert.equal(state.sends.filter(x => x.text === 'SIMULATED RESPONSE').length, 1);
  passed.push('Concurrent replies cannot spend the same one-off credit twice');
  reset({ used: 1 });
  await Promise.all([webhook('Qual o prazo?'), webhook('Qual o prazo?')]);
  assert.equal(state.usages.length, 1); assert.ok([2, 3].includes(state.messages.length));
  passed.push('Concurrent replies cannot confirm beyond remaining plan quota');
  reset({ subscription: { status: 'CANCELED' }, courtesy: 2 }); await webhook('Qual o prazo?');
  assert.equal(state.courtesy, 1); assert.equal(state.usages.length, 1); assert.equal(state.payments.length, 0);
  passed.push('Courtesy works without subscription and without payment');
  reset({ courtesy: 2 }); await webhook('Qual o prazo?');
  assert.equal(state.courtesy, 2); assert.equal(state.usages.length, 1);
  passed.push('Plan quota is used before courtesy');
  reset({ used: 2, courtesy: 2, credit: { id: 'synthetic-credit' } }); await webhook('Qual o prazo?');
  assert.equal(state.courtesy, 1); assert.equal(state.consumed, 0);
  passed.push('Courtesy is used before paid one-off credits');
  reset({ subscription: { status: 'CANCELED' }, courtesy: 2, courtesyKind: 'ANALISE' }); await webhook('Qual o prazo?');
  assert.equal(state.courtesy, 2); assert.equal(state.calls.length, 0);
  passed.push('Courtesy is specific to the granted service');
  for (const flag of ['aiFail', 'aiEmpty', 'historyFail', 'race']) {
    reset({ used: 2, courtesy: 2, [flag]: true }); await webhook('Qual o prazo?');
    assert.equal(state.courtesy, 2); assert.equal(state.usages.length, 0); assert.equal(state.messages.length, flag === 'historyFail' ? 0 : 1);
    passed.push('Courtesy preserved on ' + flag);
  }
  reset({ used: 2, courtesy: 1 });
  await Promise.all([webhook('Qual o prazo?'), webhook('Qual o prazo?')]);
  assert.equal(state.courtesy, 0); assert.equal(state.usages.length, 1);
  assert.equal(state.sends.filter(x => x.text === 'SIMULATED RESPONSE').length, 1);
  passed.push('Concurrent responses cannot spend the same courtesy twice');
  for (const text of ['Oi', 'obrigado', 'qual seu nome?']) {
    reset({ subscription: null, used: 2, knowledgeFailure: 'KNOWLEDGE_UNAVAILABLE' }); await webhook(text);
    assert.equal(state.calls.length, 0); assert.equal(state.payments.length, 0); assert.equal(state.usages.length, 0);
    assert.equal(state.sends.length, 1); assert.ok(!/Tente novamente|crédito|base/.test(state.sends[0].text));
    passed.push('Smalltalk without search or credit: ' + text);
  }
  reset({ knowledgeFailure: 'KNOWLEDGE_UNAVAILABLE' });
  const duplicate = { data: { key: { remoteJid: '0000000000000@s.whatsapp.net', fromMe: false, id: 'same-delivery' }, message: { conversation: 'Minha pergunta jurídica' } } };
  await webhook('', duplicate); await webhook('', duplicate);
  assert.equal(state.messages.length, 1); assert.equal(state.messages[0].content, 'Minha pergunta jurídica');
  assert.equal(state.sends.length, 1); assert.equal(state.usages.length, 0);
  state.knowledgeFailure = null; await webhook('Minha pergunta jurídica');
  assert.equal(state.messages.length, 3); assert.equal(state.usages.length, 1);
  passed.push('Failed inbound preserved once; redelivery deduplicated; new message can retry');
  reset({ limit: 50 });
  await webhook('Dúvida respondida inicial');
  state.knowledgeFailure = 'KNOWLEDGE_UNAVAILABLE';
  await webhook('Dúvida preservada após falha');
  state.knowledgeFailure = null;
  for (let i = 1; i <= 7; i++) await webhook('Dúvida respondida seguinte ' + i);
  assert.equal(state.messages.length, 17); assert.equal(state.usages.length, 8);
  const saved = structuredClone(state.messages);
  assert.equal(saved.slice(-16)[0].role, 'ASSISTANT');
  const lastEvent = { data: { key: { remoteJid: '0000000000000@s.whatsapp.net', fromMe: false, id: 'history-window-current' }, message: { conversation: 'Pergunta atual da janela' } } };
  await webhook('', lastEvent);
  const sent = state.calls.at(-1).messages;
  assert.equal(sent[0].role, 'user'); assert.equal(sent[0].content, 'Pergunta atual da janela');
  assert.equal(sent.length, 1);
  assert.equal(sent.filter(m => m.content === 'Pergunta atual da janela').length, 1);
  assert.deepEqual(state.messages.slice(0, 17), saved);
  assert.equal(state.usages.length, 9);
  await webhook('', lastEvent);
  assert.equal(state.messages.length, 19); assert.equal(state.usages.length, 9);
  passed.push('16-message window drops orphan answer after one answered, one failed and seven answered questions');

  reset({ limit: 50 });
  await webhook('Meu cliente não pagou a duplicata');
  state.traces = [{ id: state.messages[0].id, payload: { area: 'empresarial' } }];
  await webhook('E se ele não pagar?');
  assert.deepEqual(state.previousAreas, [null, 'empresarial']);
  passed.push('Follow-up question receives the area of the previous question in the session');

  reset({ limit: 50 });
  await webhook('Pergunta respondida pela base');
  const replyId = 'sent-' + state.sends.length;
  assert.deepEqual(Object.keys(state.feedback), [replyId]);
  assert.equal(state.feedback[replyId].interactionId, state.messages[0].id);
  const react = (emoji, from = '0000000000000', target = replyId, fromMe = true) => webhook('', { data: { key: { remoteJid: from + '@s.whatsapp.net', fromMe: false, id: 'reaction-' + transportId++ }, message: { reactionMessage: { key: { remoteJid: '0000000000000@s.whatsapp.net', fromMe, id: target }, text: emoji } } } });
  const before = { sends: state.sends.length, usages: state.usages.length, messages: state.messages.length };
  await react('👎🏽');
  assert.equal(state.feedback[replyId].helpful, false); assert.equal(state.feedback[replyId].reaction, '👎🏽');
  await react('👍', '5511999999999');
  assert.equal(state.feedback[replyId].helpful, false, 'another number cannot rate this answer');
  await react('👍', '0000000000000', 'unknown-reply');
  await react('👍', '0000000000000', replyId, false);
  assert.equal(state.feedback[replyId].helpful, false, 'reaction to own message is ignored');
  await react('👍');
  assert.equal(state.feedback[replyId].helpful, true);
  await react('');
  assert.equal(state.feedback[replyId].helpful, null); assert.equal(state.feedback[replyId].reaction, null);
  assert.deepEqual({ sends: state.sends.length, usages: state.usages.length, messages: state.messages.length }, before);
  passed.push('Reaction 👍/👎 on a base answer is recorded for its question, without reply or credit');

  const { comRevisaoDaBase } = require(base + 'judith/onboarding/flow.js');
  const welcome = ['Oi!\n\nApresentação.\n\nLeia os termos: https://judith.invalid/termos\n\nAceita?'];
  reset({ settings: { baseRevisadaEm: '2026-09-25' } });
  assert.deepEqual(await comRevisaoDaBase(welcome), ['Oi!\n\nApresentação.\n\n📚 Base jurídica revisada em 25/09.\n\nLeia os termos: https://judith.invalid/termos\n\nAceita?']);
  passed.push('Onboarding shows the base revision date before the terms paragraph');
  reset({ settings: {} });
  assert.deepEqual(await comRevisaoDaBase(welcome), welcome);
  reset({ settings: { baseRevisadaEm: 'invalida' } });
  assert.deepEqual(await comRevisaoDaBase(welcome), welcome);
  passed.push('Onboarding unchanged without a valid base revision date');

  reset({ limit: 50 });
  await webhook('Primeira pergunta sem histórico');
  assert.deepEqual(state.calls[0].messages, [{ role: 'user', content: 'Primeira pergunta sem histórico' }]);
  passed.push('Empty history sends current question once');
  reset({ limit: 50, knowledgeFailure: 'KNOWLEDGE_UNAVAILABLE' });
  for (let i = 1; i <= 3; i++) await webhook('Pergunta sem resposta ' + i);
  assert.equal(state.usages.length, 0);
  state.knowledgeFailure = null; await webhook('Nova pergunta após falhas');
  assert.deepEqual(state.calls[0].messages.map(m => m.role), ['user']);
  assert.deepEqual(state.calls[0].messages.map(m => m.content), ['Nova pergunta após falhas']);
  assert.equal(state.messages.length, 5); assert.equal(state.usages.length, 1);
  passed.push('Consecutive unanswered questions preserved without fabricated assistant turns');
  for (const scenario of ['repair-success', 'generationSecondFail', 'supportSecondFail', 'supportRejected']) {
    reset({ limit: 0, subscription: null, courtesy: 2, supportRejectedOnce: true, ...(scenario === 'repair-success' ? {} : { [scenario]: true }) });
    await webhook('Pergunta jurídica para testar reformulação');
    const accepted = scenario === 'repair-success';
    assert.equal(state.calls.length, 2);
    assert.equal(state.courtesy, accepted ? 1 : 2);
    assert.equal(state.usages.length, accepted ? 1 : 0);
    assert.equal(state.messages.length, accepted ? 2 : 1);
    assert.equal(state.verifications, scenario === 'generationSecondFail' ? 1 : 2);
    passed.push('One bounded repair, one charge only on success: ' + scenario);
  }
  await app.close();
  console.log(JSON.stringify({ passed, findings, isolation: process.env.JUDITH_TEST_READ_DB === '1' ? 'Optional initial read-only prompt SELECT; all writes and APIs mocked' : 'All database access, AI, checkout and WhatsApp mocked; network blocked' }, null, 2));
}
main().then(() => process.exit(0)).catch(e => { console.error(e.stack); process.exit(1); });
