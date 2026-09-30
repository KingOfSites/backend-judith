// Cota por dúvida (tema), cancelamento pelo WhatsApp, exclusão de dados, leitura de anexo,
// PDF do documento, lembretes do calendário e textos do onboarding. Sem banco real e sem rede.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(process.env.JUDITH_TEST_DIST || path.join(__dirname, '../dist')) + path.sep;
const replace = (id, exports) => { require.cache[require.resolve(id)] = { id: require.resolve(id), filename: require.resolve(id), loaded: true, exports }; };

const deny = () => { throw new Error('External network blocked by test'); };
require('node:net').Socket.prototype.connect = deny;
global.fetch = deny;

// Ambiente e banco simulados ANTES de qualquer módulo do dist.
replace(base + 'config/env.js', { env: { NODE_ENV: 'test', JUDITH_MODEL_HAIKU: 'mock', JUDITH_MODEL_SONNET: 'mock', JUDITH_MODEL_LEITURA: 'mock', ALERTA_WHATSAPP: '5541999999999', JUDITH_DOMAIN: 'judith.invalid', WEB_JUDITH_URL: 'https://site.invalid', INTERNAL_API_KEY: 'k', EVOLUTION_INSTANCE: 'judith', EVOLUTION_API_URL: 'http://evo.invalid', EVOLUTION_API_KEY: 'x' } });
replace(base + 'db/client.js', { get prisma() { return prisma; } });
replace(base + 'evolution/client.js', { sendText: async (numero, texto) => { state.envios.push({ numero, texto }); return 'id'; }, sendTyping: async () => {}, sendDocument: async () => 'doc' });

let state;
function reset(extra = {}) {
  state = {
    user: { id: 'u1', whatsappNumber: '5541000000000', nome: 'Teste', plano: 'ESSENCIAL', onboarding: 'CONCLUIDO', tipoEmpresa: 'MEI', aceitouTermos: true, trialFimEm: null, duvidaPendente: null, cancelamentoPendenteEm: null, exclusaoSolicitadaEm: null },
    session: { id: 's1', fluxo: null, fluxoTipo: null, fluxoOcioso: 0, fluxoCobrado: false, duvidaTema: null, duvidaCobradaEm: null },
    sub: null, payments: [], messages: [], asks: [], alertas: [], envios: [], updates: [], sessionUpdates: [], config: [], tipos: [], usos: [], mesma: null, classificadorChamado: 0, reply: 'RESPOSTA',
    ...extra,
  };
}
reset();
const prisma = {
  user: {
    findUnique: async () => state.user,
    update: async ({ data }) => { state.updates.push(data); Object.assign(state.user, data); return state.user; },
    findUniqueOrThrow: async () => state.user,
  },
  session: { findFirst: async () => state.session, create: async () => state.session, update: async ({ data }) => { state.sessionUpdates.push(data); Object.assign(state.session, data); return state.session; } },
  message: { findMany: async () => state.messages.slice(-16).map(m => ({ ...m })), create: async ({ data }) => { state.messages.push(data); return { id: data.id ?? 'm' + state.messages.length, ...data }; }, findFirst: async () => null },
  adminAlert: { create: async ({ data }) => { state.alertas.push(data); return data; } },
  subscription: { findFirst: async () => state.sub, update: async ({ data }) => { Object.assign(state.sub, data); return state.sub; } },
  payment: { findFirst: async ({ where }) => state.payments.find(p => p.status === 'APPROVED' && p.paidAt >= where.paidAt.gte) ?? null },
  usageEvent: { groupBy: async () => [{ kind: 'DUVIDA', _count: { _all: 3 } }], count: async () => 0, create: async ({ data }) => { state.usos.push(data); } },
  regraDocumento: { findMany: async () => [] },
  tipoDocumento: { findMany: async () => state.tipos },
  regraConfig: { findMany: async () => state.config },
  onboardingTexto: { findMany: async () => state.textos ?? [] },
  tipDicaOnboarding: { count: async () => 1, findMany: async () => [{ id: 'd1', texto: 'DICA', usadoPor: [] }], update: async () => ({}) },
  knowledgeSetting: { findUnique: async () => null },
  knowledgeInteraction: { findMany: async () => [] },
  $transaction: async (fn) => fn(prisma),
};
replace(base + 'judith/quota.js', { checarCota: async () => ({ allowed: true }), registrarUso: async (db, userId, funcao) => { state.usos.push({ userId, funcao }); }, temAcessoAtivo: async () => true });
replace(base + 'judith/claude.js', { askJudith: async (input) => { state.asks.push(input); return { text: state.reply, model: 'mock', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }; } });
replace(base + 'judith/conhecimento.js', { getKnowledgeContext: async () => { throw new Error('nao usado'); } });
replace(base + 'regras/classificador.js', { classificarTipo: async () => ({ tipo: 'outro', origem: 'classificador' }), classificarTurno: async () => 'continua' });
replace(base + 'judith/cota-duvida.js', { ehMesmaDuvida: async () => { state.classificadorChamado++; if (state.mesma === null) throw new Error('nao deveria classificar'); return { mesma: state.mesma, origem: 'classificador' }; } });

const { handleInbound } = require(base + 'judith/conversation.js');
const { limparCacheRegras } = require(base + 'regras/repository.js');
const { limparCacheTextos } = require(base + 'judith/onboarding/textos.js');
let seq = 0;
const enviar = (text, extra = {}) => { limparCacheRegras(); limparCacheTextos(); return handleInbound({ whatsappNumber: '5541000000000', text, hasAttachment: false, messageId: 't' + seq++, ...extra }); };

test('cota por dúvida: a primeira cobra e grava o tema; a continuação não cobra; tema novo cobra de novo', async () => {
  reset();
  const r1 = await enviar('posso demitir na experiência?');
  assert.equal(r1.cota.cobrou, true);
  assert.equal(state.usos.length, 1);
  assert.equal(state.classificadorChamado, 0, 'sem tema anterior não chama o classificador');
  assert.equal(state.session.duvidaTema, 'posso demitir na experiência?');
  assert.ok(state.session.duvidaCobradaEm);

  state.mesma = true;
  const r2 = await enviar('ele tem 45 dias de casa');
  assert.equal(r2.cota.cobrou, false);
  assert.match(r2.cota.motivo, /mesma dúvida/);
  assert.equal(state.usos.length, 1, 'continuação não consome');
  assert.equal(state.session.duvidaTema, 'posso demitir na experiência?', 'o tema não muda na continuação');

  state.mesma = false;
  const r3 = await enviar('e como emito nota fiscal de serviço?');
  assert.equal(r3.cota.cobrou, true);
  assert.equal(state.usos.length, 2);
  assert.equal(state.session.duvidaTema, 'e como emito nota fiscal de serviço?');
  assert.equal(state.messages.at(-1).meta.cotaMotivo, 'dúvida nova (tema diferente)');
});

test('cancelamento: pede confirmação com o uso do mês, SIM cancela e abre alerta, NÃO mantém', async () => {
  reset({ sub: { id: 'sub1', userId: 'u1', plano: 'ESSENCIAL', status: 'ACTIVE', currentPeriodEnd: new Date('2026-10-20T12:00:00Z'), mpSubscriptionId: null } });
  const r1 = await enviar('quero cancelar minha assinatura');
  assert.equal(r1.cancelamento, 'pedido');
  assert.match(r1.replies[0], /3 dúvidas/);
  assert.match(r1.replies[0], /20\/10\/2026/);
  assert.ok(state.user.cancelamentoPendenteEm);
  assert.equal(state.asks.length, 0);

  const r2 = await enviar('não');
  assert.equal(r2.cancelamento, 'desistiu');
  assert.equal(state.user.cancelamentoPendenteEm, null);
  assert.equal(state.sub.status, 'ACTIVE');

  await enviar('quero cancelar');
  const r3 = await enviar('sim');
  assert.equal(r3.cancelamento, 'confirmado');
  assert.equal(state.sub.status, 'CANCELED');
  assert.equal(state.sub.cancelOrigem, 'whatsapp');
  assert.equal(state.alertas.at(-1).kind, 'CANCELAMENTO');
  assert.match(state.envios.at(-1).texto, /cancelou a assinatura/);
  assert.match(r3.replies[0], /acesso até 20\/10\/2026/);
});

test('cancelamento dentro dos 7 dias: alerta de ESTORNO e acesso encerra na hora', async () => {
  const pago = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  reset({ sub: { id: 'sub1', userId: 'u1', plano: 'PROFISSIONAL', status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 25 * 24 * 3600 * 1000), mpSubscriptionId: null }, payments: [{ id: 'p1', status: 'APPROVED', paidAt: pago, valorCentavos: 6090, mpPaymentId: '123' }] });
  const r1 = await enviar('cancelar plano');
  assert.match(r1.replies[0], /art\. 49 do CDC/);
  const r2 = await enviar('confirmo');
  assert.equal(r2.cancelamento, 'confirmado');
  assert.equal(state.alertas.at(-1).kind, 'ESTORNO');
  assert.equal(state.alertas.at(-1).paymentId, 'p1');
  assert.match(r2.replies[0], /devolvido/);
});

test('"cancelar" fora do contexto da JUDITH é dúvida jurídica; sem assinatura explica o trial', async () => {
  reset();
  const r = await enviar('como faço para cancelar um contrato com fornecedor que não entrega?');
  assert.equal(r.cancelamento, undefined);
  assert.equal(state.asks.length, 1);

  reset();
  state.user.plano = 'TRIAL';
  state.user.trialFimEm = new Date(Date.now() + 5 * 24 * 3600 * 1000);
  const t = await enviar('quero cancelar');
  assert.match(t.replies[0], /período de teste/);
  assert.equal(state.user.cancelamentoPendenteEm ?? null, null);
});

test('confirmação pendente expira: outra mensagem segue como dúvida normal', async () => {
  reset({ sub: { id: 'sub1', userId: 'u1', plano: 'ESSENCIAL', status: 'ACTIVE', currentPeriodEnd: null, mpSubscriptionId: null } });
  await enviar('quero cancelar');
  const r = await enviar('meu funcionário pode faltar sem atestado?');
  assert.equal(r.cancelamento, undefined);
  assert.equal(state.user.cancelamentoPendenteEm, null);
  assert.equal(state.asks.length, 1);
});

test('exclusão de dados: registra o pedido, abre alerta e permite desistir', async () => {
  reset();
  const r1 = await enviar('quero excluir meus dados');
  assert.equal(r1.exclusaoDados, 'pedido');
  assert.ok(state.user.exclusaoSolicitadaEm);
  assert.equal(state.alertas[0].kind, 'EXCLUSAO_DADOS');
  assert.match(r1.replies[0], /30 dias/);
  const r2 = await enviar('quero manter meus dados');
  assert.equal(r2.exclusaoDados, 'desistiu');
  assert.equal(state.user.exclusaoSolicitadaEm, null);
});

test('anexo lido vira análise com o texto do documento; anexo não lido avisa sem cota', async () => {
  reset();
  const leitura = { texto: 'CONTRATO DE LOCAÇÃO. Cláusula 1: o locatário paga R$ 1.000.', paginas: 2, caracteres: 58, modelo: 'mock', mimetype: 'application/pdf' };
  const r = await enviar('dá uma olhada nesse contrato', { hasAttachment: true, anexo: { leitura, fileName: 'contrato.pdf' } });
  assert.equal(state.asks.length, 1);
  assert.equal(state.asks[0].funcao, 'analise');
  assert.match(state.asks[0].userMessage, /Documento enviado \(contrato\.pdf\), 2 página\(s\)/);
  assert.match(state.asks[0].userMessage, /locatário paga/);
  assert.deepEqual(state.messages[0].meta.anexo, { tipo: 'application/pdf', paginas: 2, caracteres: 58, arquivo: 'contrato.pdf', modeloLeitura: 'mock' });
  assert.equal(r.replies.at(-1), 'RESPOSTA');

  reset();
  const g = await enviar('', { hasAttachment: true, anexo: { erro: 'GRANDE_DEMAIS' } });
  assert.equal(g.anexoNaoLido, true);
  assert.match(g.replies[0], /20 páginas/);
  assert.equal(state.asks.length, 0);
  assert.equal(state.usos.length, 0);
});

test('documento redigido pronto sai como PDF com a mensagem de encerramento no lugar do texto', async () => {
  const contrato = '# CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\n## CLÁUSULA 1 – DO OBJETO\n\n' + 'O presente contrato tem por objeto a prestação de serviços de manutenção. '.repeat(30) + '\n\nCuritiba, 30 de setembro de 2026.';
  reset({ reply: contrato, config: [{ chave: 'mensagemEntregaDocumento', valor: 'PRONTO OAB' }] });
  const r = await enviar('redige um contrato de prestação de serviços pra mim');
  assert.ok(r.documento, 'gera o documento');
  assert.equal(r.documento.fileName, 'contrato-de-prestacao-de-servicos-judith.pdf');
  assert.equal(r.documento.mensagemEntrega, 'PRONTO OAB');
  assert.equal(r.documento.pdf.subarray(0, 4).toString(), '%PDF');
  assert.deepEqual(r.replies, [], 'o texto não vai como mensagem quando o PDF sai');
  assert.equal(state.messages.at(-1).content, contrato, 'o histórico guarda o texto integral');
  assert.equal(state.messages.at(-1).meta.pdf, r.documento.fileName);

  reset({ reply: 'Pra montar o contrato, me diz: qual o valor mensal e o prazo?' });
  const p = await enviar('redige um contrato de prestação de serviços');
  assert.equal(p.documento, undefined, 'pergunta de coleta não vira PDF');
  assert.deepEqual(p.replies, ['Pra montar o contrato, me diz: qual o valor mensal e o prazo?']);
});

test('trial encerrado aponta para os planos', async () => {
  replace(base + 'judith/quota.js', { checarCota: async () => ({ allowed: false, motivo: 'sem_assinatura_ativa' }), registrarUso: async () => {}, temAcessoAtivo: async () => false });
  delete require.cache[require.resolve(base + 'judith/conversation.js')];
  const { handleInbound: h } = require(base + 'judith/conversation.js');
  reset();
  state.user.plano = 'TRIAL';
  state.user.trialFimEm = new Date(Date.now() - 1000);
  const r = await h({ whatsappNumber: '5541000000000', text: 'posso demitir?', hasAttachment: false, messageId: 'x1' });
  assert.match(r.replies[0], /período de teste terminou/);
  assert.match(r.replies[0], /site\.invalid\/planos/);
});

// ---- módulos puros ----
const { isPedidoCancelamento, isPedidoExclusaoDados, isConfirmacao } = require(base + 'judith/cancelamento.js');
test('detectores de cancelamento e exclusão', () => {
  for (const t of ['quero cancelar', 'cancelar assinatura', 'quero cancelar meu plano', 'como cancelo a JUDITH?', 'quero encerrar minha conta', 'não quero mais pagar'])
    assert.equal(isPedidoCancelamento(t), true, t);
  for (const t of ['como cancelar um contrato de aluguel?', 'cliente quer cancelar a compra, sou obrigado a devolver?', 'posso cancelar o plano de saúde dos funcionários?', 'quero redigir uma notificação de cancelamento de contrato para o fornecedor'])
    assert.equal(isPedidoCancelamento(t), false, t);
  assert.equal(isPedidoExclusaoDados('apaguem todos os meus dados por favor'), true);
  assert.equal(isPedidoExclusaoDados('posso excluir um funcionário do sistema?'), false);
  assert.equal(isConfirmacao('SIM'), true);
});

const { normalizarMime, contarPaginasPdf, montarMensagemComDocumento } = require(base + 'judith/leitura.js');
test('leitura: mime e contagem de páginas', () => {
  assert.equal(normalizarMime('image/jpg'), 'image/jpeg');
  assert.equal(normalizarMime('application/octet-stream', 'x.PDF'), 'application/pdf');
  assert.equal(normalizarMime('application/pdf; charset=binary'), 'application/pdf');
  assert.equal(contarPaginasPdf(Buffer.from('%PDF-1.4 1 0 obj << /Type /Pages /Kids [] >> 2 0 obj << /Type /Page /Parent 1 0 R >> 3 0 obj << /Type /Page >>')), 2);
  assert.match(montarMensagemComDocumento('', { texto: 'X', paginas: null, caracteres: 1 }), /Analisa este documento/);
});

const { ocorrencias, etapaDe, textoLembrete, somarDias } = require(base + 'jobs/lembretes.js');
test('calendário: ocorrências mensais e anuais, etapas D-3/D-1/dia', () => {
  const hoje = { ano: 2026, mes: 5, dia: 28 };
  assert.deepEqual(ocorrencias({ dia: 31, mes: 5 }, hoje), [{ ano: 2026, mes: 5, dia: 31 }], 'DASN 31/05 aparece 3 dias antes');
  assert.deepEqual(ocorrencias({ dia: 20, mes: null }, hoje), [], 'DAS do dia 20 não está no horizonte');
  assert.deepEqual(ocorrencias({ dia: 20, mes: null }, { ano: 2026, mes: 6, dia: 17 }), [{ ano: 2026, mes: 6, dia: 20 }]);
  assert.deepEqual(ocorrencias({ dia: 31, mes: null }, { ano: 2026, mes: 2, dia: 27 }), [{ ano: 2026, mes: 2, dia: 28 }], 'dia 31 em fevereiro cai no último dia');
  assert.deepEqual(ocorrencias({ dia: 1, mes: null }, { ano: 2026, mes: 12, dia: 30 }), [{ ano: 2027, mes: 1, dia: 1 }], 'vira o ano');
  assert.equal(etapaDe({ ano: 2026, mes: 5, dia: 31 }, hoje), 'D3');
  assert.equal(etapaDe({ ano: 2026, mes: 5, dia: 29 }, hoje), 'D1');
  assert.equal(etapaDe(hoje, hoje), 'DIA');
  assert.equal(etapaDe({ ano: 2026, mes: 5, dia: 30 }, hoje), null);
  assert.deepEqual(somarDias({ ano: 2026, mes: 12, dia: 31 }, 1), { ano: 2027, mes: 1, dia: 1 });
  assert.match(textoLembrete('DAS do MEI', 'Pague pelo app.', { ano: 2026, mes: 6, dia: 20 }, 'D1'), /DAS do MEI vence amanhã \(20\/06\)/);
});

const { TEXTOS_RESERVA, preencher, CHAVES_ONBOARDING } = require(base + 'judith/onboarding/textos.js');
test('onboarding: texto salvo no Admin substitui a reserva e os marcadores são preenchidos', async () => {
  assert.equal(preencher('Oi {nome}, veja {termos}. {x}', { nome: 'Ana', termos: 'http://t' }), 'Oi Ana, veja http://t. {x}');
  assert.ok(CHAVES_ONBOARDING.includes('trialD3') && TEXTOS_RESERVA.boasVindas.includes('{termos}'));
  reset({ textos: [{ chave: 'perfilA', valor: 'PERFIL EDITADO {termos}' }] });
  state.user.tipoEmpresa = null;
  const r = await enviar('oi');
  assert.deepEqual(r.replies, ['PERFIL EDITADO https://judith.invalid/termos']);
});
