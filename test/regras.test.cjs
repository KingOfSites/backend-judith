// Regras de Composição/Análise: pacote por tipo, teto de 2, desvio antes do modelo,
// cota por documento e troca de fluxo análise → redação. Sem banco real e sem rede.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(process.env.JUDITH_TEST_DIST || path.join(__dirname, '../dist')) + path.sep;
const replace = (id, exports) => { require.cache[require.resolve(id)] = { id: require.resolve(id), filename: require.resolve(id), loaded: true, exports }; };

const deny = () => { throw new Error('External network blocked by test'); };
require('node:net').Socket.prototype.connect = deny;
require('node:http').request = deny;
require('node:https').request = deny;
global.fetch = deny;

const regra = (conjunto, codigo, extra = {}) => ({
  id: `${conjunto}-${codigo}`, conjunto, codigo, titulo: `Regra ${codigo}`, grupo: 'g', entraSempre: false, ativo: true,
  conteudo: `CONTEUDO_${conjunto}_${codigo}`, ordem: 0, updatedAt: new Date(0), ...extra,
});
const tipo = (etiqueta, extra = {}) => ({
  etiqueta, nome: etiqueta, composicao: [], analise: [], composicaoExtras: [], analiseExtras: [],
  desviaRedacao: false, mensagemDesvio: null, ativo: true, ordem: 0, ...extra,
});

const REGRAS = [
  regra('COMPOSICAO', 'regras-gerais', { entraSempre: true }),
  regra('COMPOSICAO', '4'), regra('COMPOSICAO', '7'), regra('COMPOSICAO', '9'), regra('COMPOSICAO', 'grupo2'),
  regra('ANALISE', 'garantia-pessoal', { entraSempre: true }), regra('ANALISE', 'lgpd', { entraSempre: true }),
  regra('ANALISE', '4'), regra('ANALISE', '8'), regra('ANALISE', 'complexos'),
];
const TIPOS = [
  tipo('locacao_comercial', { composicao: ['4'], analise: ['4'] }),
  tipo('prestacao_servico', { composicao: ['7', '9'], composicaoExtras: ['grupo2'] }),
  tipo('estourado', { composicao: ['4', '7', '9'] }),
  tipo('orfao', { composicao: ['nao-existe'] }),
  tipo('franquia', { analise: ['8'], analiseExtras: ['complexos'], desviaRedacao: true, mensagemDesvio: 'MENSAGEM_FRANQUIA' }),
  tipo('societario_formal', { desviaRedacao: true }),
];

let state;
function reset(extra = {}) {
  state = {
    session: { id: 's1', fluxo: null, fluxoTipo: null, fluxoOcioso: 0, fluxoCobrado: false },
    messages: [], asks: [], cotas: [], usos: [], tipos: TIPOS, regras: REGRAS, config: [],
    classificaTipo: [], classificaTurno: [], chamadasTipo: 0, chamadasTurno: 0, ...extra,
  };
}
reset();

const prisma = {
  regraDocumento: { findMany: async () => state.regras },
  tipoDocumento: { findMany: async () => state.tipos },
  regraConfig: { findMany: async () => state.config },
  session: {
    findFirst: async () => state.session,
    create: async () => state.session,
    update: async ({ data }) => Object.assign(state.session, data),
  },
  message: {
    findMany: async ({ take }) => state.messages.slice(-take).reverse(),
    create: async ({ data }) => {
      if (data.id && state.messages.some(m => m.id === data.id)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      const saved = { id: data.id ?? `m${state.messages.length}`, createdAt: new Date(), ...data };
      state.messages.push(saved); return saved;
    },
  },
  knowledgeInteraction: { findMany: async () => [] },
  $transaction: async (fn) => fn(prisma),
};

replace(base + 'db/client.js', { prisma });
replace(base + 'config/env.js', { env: { NODE_ENV: 'test', ANTHROPIC_API_KEY: 'fake', JUDITH_MODEL_HAIKU: 'mock-haiku', JUDITH_MODEL_SONNET: 'mock-sonnet' } });
replace('@anthropic-ai/sdk', class { messages = { create: deny }; });
replace(base + 'regras/classificador.js', {
  classificarTipo: async () => { state.chamadasTipo++; return { tipo: state.classificaTipo.shift() ?? 'outro', origem: 'classificador' }; },
  classificarTurno: async () => { state.chamadasTurno++; return state.classificaTurno.shift() ?? 'continua'; },
});
replace(base + 'judith/onboarding/flow.js', {
  processarOnboarding: async ({ texto }) => ({ user: { id: 'u1', whatsappNumber: '5500000000000', plano: 'TEST' }, resultado: { tipo: 'seguir', mensagemParaIA: texto } }),
});
replace(base + 'judith/quota.js', {
  checarCota: async (_user, funcao) => { state.cotas.push(funcao); return state.semCota ? { allowed: false, motivo: 'sem_assinatura_ativa' } : { allowed: true }; },
  registrarUso: async (_db, _userId, funcao) => { state.usos.push(funcao); },
});
replace(base + 'judith/claude.js', {
  askJudith: async (input) => { state.asks.push(input); return { text: 'RESPOSTA', model: 'mock', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }; },
});

const { montarPacote, desvioDaRedacao, TETO_POR_TIPO } = require(base + 'regras/pacote.js');
const { carregarRegras, limparCacheRegras } = require(base + 'regras/repository.js');
const { handleInbound } = require(base + 'judith/conversation.js');

let seq = 0;
const enviar = (text, extra = {}) => handleInbound({ whatsappNumber: '5500000000000', text, hasAttachment: false, messageId: `t${seq++}`, ...extra });
const snapshot = async () => { limparCacheRegras(); return carregarRegras(); };

test('redação: Regras Gerais sempre + receita do tipo; nada da Análise', async () => {
  reset();
  const p = montarPacote(await snapshot(), 'redacao', 'locacao_comercial');
  assert.match(p.sempre, /CONTEUDO_COMPOSICAO_regras-gerais/);
  assert.match(p.doTipo, /CONTEUDO_COMPOSICAO_4/);
  assert.doesNotMatch(p.sempre + p.doTipo, /CONTEUDO_ANALISE/);
  assert.deepEqual(p.usadas.map(u => `${u.papel}:${u.codigo}`), ['sempre:regras-gerais', 'tipo:4']);
});

test('análise: as duas transversais sempre + ficha do tipo + extras se o tipo pedir', async () => {
  reset();
  const p = montarPacote(await snapshot(), 'analise', 'franquia');
  assert.match(p.sempre, /CONTEUDO_ANALISE_garantia-pessoal/);
  assert.match(p.sempre, /CONTEUDO_ANALISE_lgpd/);
  assert.match(p.doTipo, /CONTEUDO_ANALISE_8/);
  assert.match(p.doTipo, /CONTEUDO_ANALISE_complexos/);
  assert.doesNotMatch(p.sempre + p.doTipo, /CONTEUDO_COMPOSICAO/);
});

test('par de propósito ocupa as duas vagas e o extra fica fora do teto', async () => {
  reset();
  const p = montarPacote(await snapshot(), 'redacao', 'prestacao_servico');
  assert.deepEqual(p.usadas.filter(u => u.papel === 'tipo').map(u => u.codigo), ['7', '9']);
  assert.deepEqual(p.usadas.filter(u => u.papel === 'extra').map(u => u.codigo), ['grupo2']);
  assert.deepEqual(p.cortadas, []);
});

test('teto de 2 é limite: a terceira não sobe e fica registrada', async () => {
  reset();
  const p = montarPacote(await snapshot(), 'redacao', 'estourado');
  assert.equal(TETO_POR_TIPO, 2);
  assert.deepEqual(p.usadas.filter(u => u.papel === 'tipo').map(u => u.codigo), ['4', '7']);
  assert.deepEqual(p.cortadas, ['9']);
  assert.doesNotMatch(p.doTipo, /CONTEUDO_COMPOSICAO_9/);
});

test('tipo "outro" ou sem linha na tabela: só o que entra sempre', async () => {
  reset();
  const s = await snapshot();
  for (const etiqueta of ['outro', 'inexistente', null]) {
    const p = montarPacote(s, 'redacao', etiqueta);
    assert.match(p.sempre, /regras-gerais/);
    assert.equal(p.doTipo, '');
    assert.equal(p.tipo, 'outro');
  }
});

test('código que a tabela pede e não existe aparece como ausente, sem falha muda', async () => {
  reset();
  const p = montarPacote(await snapshot(), 'redacao', 'orfao');
  assert.deepEqual(p.ausentes, ['nao-existe']);
  assert.equal(p.doTipo, '');
});

test('desvio vale só na redação; na análise o mesmo tipo segue com a ficha dele', async () => {
  reset();
  const s = await snapshot();
  assert.deepEqual(desvioDaRedacao(s, 'redacao', 'franquia'), { mensagem: 'MENSAGEM_FRANQUIA' });
  assert.equal(desvioDaRedacao(s, 'analise', 'franquia'), null);
  assert.equal(desvioDaRedacao(s, 'redacao', 'locacao_comercial'), null);
  assert.ok(desvioDaRedacao(s, 'redacao', 'societario_formal').mensagem.length > 20);
});

test('pedido de redação de tipo desviado: não chama o modelo caro nem consome cota', async () => {
  reset({ classificaTipo: ['franquia'] });
  limparCacheRegras();
  const r = await enviar('quero redigir um contrato de franquia');
  assert.deepEqual(r.replies, ['MENSAGEM_FRANQUIA']);
  assert.equal(state.asks.length, 0);
  assert.deepEqual(state.cotas, []);
  assert.deepEqual(state.usos, []);
  assert.equal(r.regras.desvio, true);
  assert.equal(state.session.fluxo, null);
  assert.deepEqual(state.messages.map(m => m.role), ['USER', 'ASSISTANT']);
});

test('redação: cota uma vez por documento; a coleta seguinte continua no fluxo sem cobrar', async () => {
  reset({ classificaTipo: ['locacao_comercial'], classificaTurno: ['continua'] });
  limparCacheRegras();
  await enviar('quero redigir um contrato de aluguel da minha sala');
  assert.equal(state.asks[0].funcao, 'redacao');
  assert.match(state.asks[0].regras.doTipo, /CONTEUDO_COMPOSICAO_4/);
  assert.deepEqual(state.usos, ['redacao']);
  assert.deepEqual([state.session.fluxo, state.session.fluxoTipo, state.session.fluxoCobrado], ['redacao', 'locacao_comercial', true]);

  const r = await enviar('João da Silva, CPF 000.000.000-00, aluguel de R$ 2.000');
  assert.equal(state.asks[1].funcao, 'redacao');
  assert.match(state.asks[1].regras.doTipo, /CONTEUDO_COMPOSICAO_4/);
  assert.deepEqual(state.usos, ['redacao']);
  assert.deepEqual(state.cotas, ['redacao']);
  assert.equal(r.regras.cobrou, false);
  assert.equal(state.chamadasTipo, 1);
});

test('troca de fluxo: análise → "então escreve pra mim" vira redação, mantém tipo e histórico', async () => {
  reset({ classificaTipo: ['locacao_comercial'], classificaTurno: ['redacao'] });
  limparCacheRegras();
  await enviar('analisa esse contrato de aluguel pra mim: CLÁUSULA 1...');
  assert.equal(state.asks[0].funcao, 'analise');
  assert.match(state.asks[0].regras.sempre, /CONTEUDO_ANALISE_garantia-pessoal/);
  assert.match(state.asks[0].regras.doTipo, /CONTEUDO_ANALISE_4/);

  const r = await enviar('então escreve pra mim essa cláusula');
  const ask = state.asks[1];
  assert.equal(ask.funcao, 'redacao');
  assert.match(ask.regras.sempre, /CONTEUDO_COMPOSICAO_regras-gerais/);
  assert.match(ask.regras.doTipo, /CONTEUDO_COMPOSICAO_4/);
  assert.doesNotMatch(ask.regras.sempre + ask.regras.doTipo, /CONTEUDO_ANALISE/);
  assert.deepEqual(ask.history.map(h => h.role), ['user', 'assistant']);
  assert.match(ask.history[0].content, /analisa esse contrato/);
  assert.equal(state.chamadasTipo, 1, 'o tipo do documento é mantido, sem reclassificar');
  assert.equal(r.regras.trocouDeFluxo, true);
  assert.deepEqual(state.usos, ['analise', 'redacao']);
  assert.deepEqual([state.session.fluxo, state.session.fluxoTipo], ['redacao', 'locacao_comercial']);
});

test('troca para redação de tipo desviado também desvia, sem cota', async () => {
  reset({ classificaTipo: ['franquia'], classificaTurno: ['redacao'] });
  limparCacheRegras();
  await enviar('analisa esse contrato de franquia que recebi');
  assert.equal(state.asks[0].funcao, 'analise');
  assert.match(state.asks[0].regras.doTipo, /CONTEUDO_ANALISE_8/);
  const r = await enviar('escreve um contrato desse pra mim');
  assert.deepEqual(r.replies, ['MENSAGEM_FRANQUIA']);
  assert.equal(state.asks.length, 1);
  assert.deepEqual(state.usos, ['analise']);
});

test('dúvida nova no meio do fluxo não derruba o fluxo; ele expira sem retomar', async () => {
  reset({ classificaTipo: ['locacao_comercial'], classificaTurno: ['nova_duvida', 'nova_duvida', 'nova_duvida', 'nova_duvida', 'nova_duvida'] });
  limparCacheRegras();
  await enviar('quero redigir um contrato de aluguel');
  await enviar('qual o prazo do aviso prévio?');
  assert.equal(state.asks[1].funcao, 'duvida');
  assert.equal(state.asks[1].regras, undefined);
  assert.deepEqual([state.session.fluxo, state.session.fluxoOcioso], ['redacao', 1]);
  for (let i = 0; i < 4; i++) await enviar('outra dúvida qualquer sobre imposto');
  assert.equal(state.session.fluxo, null);
});

test('abandono responde dentro do fluxo e fecha em seguida', async () => {
  reset({ classificaTipo: ['locacao_comercial'], classificaTurno: ['abandona'] });
  limparCacheRegras();
  await enviar('quero redigir um contrato de aluguel');
  await enviar('deixa pra lá, não preciso mais');
  assert.equal(state.asks[1].funcao, 'redacao');
  assert.equal(state.session.fluxo, null);
  assert.deepEqual(state.usos, ['redacao']);
});

test('sem tipos cadastrados: comportamento antigo, sem classificador e sem regras', async () => {
  reset({ tipos: [] });
  limparCacheRegras();
  await enviar('quero redigir um contrato de aluguel');
  assert.equal(state.asks[0].funcao, 'redacao');
  assert.equal(state.asks[0].regras, undefined);
  assert.equal(state.chamadasTipo + state.chamadasTurno, 0);
  assert.deepEqual(state.usos, ['redacao']);
  assert.equal(state.session.fluxo, null);
});

test('redação que consulta a base: busca com processual e blocos no fim do pacote; falha da busca não trava', async () => {
  state.tipos = [...TIPOS, tipo('juizado_1inst', { composicao: ['4'], consultaBase: true })];
  reset({ tipos: state.tipos, classificaTipo: ['juizado_1inst', 'juizado_1inst'] });
  limparCacheRegras();
  const chamadas = [];
  replace(base + 'judith/conhecimento.js', { getKnowledgeContext: async (pergunta, historico, previousArea, extraAreas) => {
    chamadas.push({ pergunta, previousArea, extraAreas });
    if (state.buscaFalha) throw new Error('busca indisponível');
    return { text: 'BLOCOS_DA_BASE', chunks: [{ areas: ['consumidor'], chapter: 'Arrependimento' }, { areas: ['processual'], chapter: 'Juizado: valor da causa' }] };
  } });
  delete require.cache[require.resolve(base + 'judith/conversation.js')];
  const { handleInbound: handle } = require(base + 'judith/conversation.js');
  await handle({ whatsappNumber: '5500000000000', text: 'quero redigir uma petição no juizado contra a loja que não devolveu meu dinheiro', hasAttachment: false, messageId: 'jz1' });
  assert.deepEqual(chamadas[0].extraAreas, ['processual']);
  assert.equal(state.asks[0].funcao, 'redacao');
  assert.equal(state.asks[0].regras.contextoBase, 'BLOCOS_DA_BASE');
  assert.match(state.asks[0].regras.doTipo, /CONTEUDO_COMPOSICAO_4/);
  const meta = state.messages.find(m => m.role === 'ASSISTANT').meta;
  assert.deepEqual(meta.blocosBase, ['consumidor · Arrependimento', 'processual · Juizado: valor da causa']);
  assert.match(meta.regras.join(' '), /tipo:4/);

  reset({ tipos: state.tipos, classificaTipo: ['juizado_1inst'], buscaFalha: true });
  limparCacheRegras();
  await handle({ whatsappNumber: '5500000000000', text: 'quero redigir uma petição no juizado', hasAttachment: false, messageId: 'jz2' });
  assert.equal(state.asks[0].regras.contextoBase, undefined, 'segue só com as regras');
  assert.deepEqual(state.messages.find(m => m.role === 'ASSISTANT').meta.blocosBase, []);
  replace(base + 'judith/conhecimento.js', { getKnowledgeContext: async () => { throw new Error('nao usado'); } });
  delete require.cache[require.resolve(base + 'judith/conversation.js')];
});

test('reentrega do mesmo webhook no desvio não duplica a resposta', async () => {
  reset({ classificaTipo: ['franquia', 'franquia'] });
  limparCacheRegras();
  const primeira = await handleInbound({ whatsappNumber: '5500000000000', text: 'redigir contrato de franquia', hasAttachment: false, messageId: 'dup' });
  const segunda = await handleInbound({ whatsappNumber: '5500000000000', text: 'redigir contrato de franquia', hasAttachment: false, messageId: 'dup' });
  assert.deepEqual(primeira.replies, ['MENSAGEM_FRANQUIA']);
  assert.deepEqual(segunda.replies, []);
  assert.equal(state.messages.length, 2);
});
