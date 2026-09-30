// Formatação para WhatsApp, pedido de humano, arquivo não lido e perfil de quem entra por cortesia.
// Sem banco real e sem rede.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(process.env.JUDITH_TEST_DIST || path.join(__dirname, '../dist')) + path.sep;
const replace = (id, exports) => { require.cache[require.resolve(id)] = { id: require.resolve(id), filename: require.resolve(id), loaded: true, exports }; };

const deny = () => { throw new Error('External network blocked by test'); };
require('node:net').Socket.prototype.connect = deny;
global.fetch = deny;

// Ambiente e banco simulados ANTES de qualquer módulo do dist: nada aqui pode tocar o banco real.
replace(base + 'config/env.js', { env: { NODE_ENV: 'test', JUDITH_MODEL_HAIKU: 'mock', JUDITH_MODEL_SONNET: 'mock', ALERTA_WHATSAPP: '5541999999999', JUDITH_DOMAIN: 'judith.invalid', EVOLUTION_INSTANCE: 'judith', EVOLUTION_API_URL: 'http://evo.invalid', EVOLUTION_API_KEY: 'x' } });
replace(base + 'db/client.js', { get prisma() { return prisma; } });
replace(base + 'evolution/client.js', { sendText: async (numero, texto) => { state.envios.push({ numero, texto }); return 'id'; }, sendTyping: async () => {} });
const { paraWhatsApp } = require(base + 'evolution/format.js');
const { isPedidoHumano } = require(base + 'judith/humano.js');

test('negrito duplo vira simples e títulos viram negrito', () => {
  assert.equal(paraWhatsApp('Boa pergunta.\n\n**Se você recebe** um pedido, faça **isso**.'), 'Boa pergunta.\n\n*Se você recebe* um pedido, faça *isso*.');
  assert.equal(paraWhatsApp('### Cláusula de foro\n\nTexto'), '*Cláusula de foro*\n\nTexto');
  assert.equal(paraWhatsApp('__forte__ e *itálico* e `código`'), '*forte* e *itálico* e `código`');
});

test('listas, links e linhas em branco', () => {
  assert.equal(paraWhatsApp('- um\n- dois\n* tres\n1. quatro'), '• um\n• dois\n• tres\n1. quatro');
  assert.equal(paraWhatsApp('Veja [os termos](https://x.y/termos).'), 'Veja os termos: https://x.y/termos.');
  assert.equal(paraWhatsApp('a\n\n\n\nb'), 'a\n\nb');
  assert.equal(paraWhatsApp('7 * 3 = 21 e 2*3'), '7 * 3 = 21 e 2*3', 'asterisco solto não é marcação');
});

test('detecta pedido explícito de humano e ignora conversa sobre IA', () => {
  for (const t of ['quero falar com uma pessoa', 'tem atendente?', 'me passa pra um humano por favor', 'consigo falar com alguém de verdade?', 'preciso de atendimento humano'])
    assert.equal(isPedidoHumano(t), true, t);
  for (const t of ['você é um robô?', 'meu funcionário é pessoa jurídica?', 'a pessoa que aluga precisa assinar?', 'não é humano', 'quero redigir um contrato'])
    assert.equal(isPedidoHumano(t), false, t);
});

// ---- fluxo com banco simulado ----
let state;
function reset(extra = {}) {
  state = { user: { id: 'u1', whatsappNumber: '5541000000000', nome: 'Teste', plano: 'ESSENCIAL', onboarding: 'CONCLUIDO', tipoEmpresa: 'MEI', aceitouTermos: true, trialFimEm: null, duvidaPendente: null }, messages: [], asks: [], alertas: [], envios: [], updates: [], config: [], tipos: [], ...extra };
}
reset();
const prisma = {
  user: {
    findUnique: async () => state.user,
    update: async ({ data }) => { state.updates.push(data); Object.assign(state.user, data); return state.user; },
    findUniqueOrThrow: async () => state.user,
  },
  session: { findFirst: async () => ({ id: 's1', fluxo: null, fluxoTipo: null, fluxoOcioso: 0, fluxoCobrado: false }), create: async () => ({ id: 's1' }), update: async () => ({}) },
  message: { findMany: async () => [], create: async ({ data }) => { state.messages.push(data); return { id: data.id ?? 'm' + state.messages.length, ...data }; } },
  adminAlert: { create: async ({ data }) => { state.alertas.push(data); return data; } },
  regraDocumento: { findMany: async () => [] },
  tipoDocumento: { findMany: async () => state.tipos },
  regraConfig: { findMany: async () => state.config },
  tipDicaOnboarding: { count: async () => 1, findMany: async () => [{ id: 'd1', texto: 'DICA', usadoPor: [] }], update: async () => ({}) },
  knowledgeSetting: { findUnique: async () => null },
  knowledgeInteraction: { findMany: async () => [] },
  $transaction: async (fn) => fn(prisma),
};
replace(base + 'judith/quota.js', { checarCota: async () => ({ allowed: true }), registrarUso: async () => {} });
replace(base + 'judith/claude.js', { askJudith: async (input) => { state.asks.push(input); return { text: 'RESPOSTA', model: 'mock', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }; } });
replace(base + 'judith/conhecimento.js', { getKnowledgeContext: async () => { throw new Error('nao usado'); } });
replace(base + 'regras/classificador.js', { classificarTipo: async () => ({ tipo: 'outro', origem: 'classificador' }), classificarTurno: async () => 'continua' });

const { handleInbound } = require(base + 'judith/conversation.js');
const { limparCacheRegras } = require(base + 'regras/repository.js');
let seq = 0;
const enviar = (text, extra = {}) => { limparCacheRegras(); return handleInbound({ whatsappNumber: '5541000000000', text, hasAttachment: false, messageId: 't' + seq++, ...extra }); };

test('pedido de humano: mensagem fixa, alerta no painel, aviso no WhatsApp, sem modelo', async () => {
  reset({ config: [{ chave: 'mensagemAtendimentoHumano', valor: 'CANAL: fale com @judith' }] });
  const r = await enviar('quero falar com uma pessoa de verdade');
  assert.deepEqual(r.replies, ['CANAL: fale com @judith']);
  assert.equal(r.pedidoHumano, true);
  assert.equal(state.asks.length, 0);
  assert.equal(state.alertas.length, 1);
  assert.equal(state.alertas[0].kind, 'HUMAN_REQUEST');
  assert.doesNotMatch(state.alertas[0].detalhe, /pessoa de verdade/, 'o alerta não copia a mensagem do cliente');
  assert.equal(state.envios[0].numero, '5541999999999');
  assert.deepEqual(state.messages.map(m => m.role), ['USER', 'ASSISTANT']);
});

test('sem mensagem configurada vale a reserva', async () => {
  reset();
  const r = await enviar('tem atendente aí?');
  assert.match(r.replies[0], /pessoa da equipe/);
  assert.equal(state.alertas.length, 1);
});

test('foto ou arquivo: aviso fixo, sem modelo e sem cota', async () => {
  reset({ config: [{ chave: 'mensagemAnexoNaoLido', valor: 'COLA O TEXTO' }] });
  const r = await enviar('', { hasAttachment: true });
  assert.deepEqual(r.replies, ['COLA O TEXTO']);
  assert.equal(r.anexoNaoLido, true);
  assert.equal(state.asks.length, 0);
  reset();
  const r2 = await enviar('analisa esse contrato', { hasAttachment: true });
  assert.match(r2.replies[0], /não consigo ler fotos nem arquivos/);
  assert.equal(state.asks.length, 0);
});

test('cortesia sem perfil: pergunta o tipo na primeira conversa e guarda a dúvida', async () => {
  reset();
  state.user.tipoEmpresa = null;
  const r = await enviar('posso demitir na experiência?');
  assert.match(r.replies[0], /MEI, empresa no Simples/);
  assert.equal(state.asks.length, 0);
  assert.equal(state.user.onboarding, 'AGUARDANDO_PERFIL');
  assert.equal(state.user.duvidaPendente, 'posso demitir na experiência?');
  const r2 = await enviar('sou MEI');
  assert.equal(state.user.tipoEmpresa, 'MEI');
  assert.equal(state.user.onboarding, 'CONCLUIDO');
  assert.equal(state.asks.length, 1, 'a dúvida guardada entra no pipeline');
  assert.equal(state.asks[0].userMessage, 'posso demitir na experiência?');
  assert.match(r2.replies[0], /DICA/);
});

test('cortesia sem perfil que só cumprimenta: pergunta o tipo sem guardar dúvida', async () => {
  reset();
  state.user.tipoEmpresa = null;
  const r = await enviar('oi');
  assert.match(r.replies[0], /me conta: você tem MEI/);
  assert.equal(state.user.duvidaPendente, null);
});

test('resposta normal grava os dados técnicos na mensagem', async () => {
  reset();
  await enviar('qual o prazo do aviso prévio?');
  const resposta = state.messages.find(m => m.role === 'ASSISTANT');
  assert.equal(resposta.meta.funcao, 'duvida');
  assert.equal(resposta.meta.modelo, 'mock');
});
