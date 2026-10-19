// Pedidos do fundador de 19/10/2026: classificador de intenção editável (fora do escopo), saudação
// de quem volta, avulso sem plano, entrega em texto, pergunta de funcionário no onboarding,
// autoatendimento (cota, lembretes) e calendário com avisos, feriado, dia útil e ano. Sem rede e sem banco.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(process.env.JUDITH_TEST_DIST || path.join(__dirname, '../dist')) + path.sep;
const replace = (id, exports) => { require.cache[require.resolve(id)] = { id: require.resolve(id), filename: require.resolve(id), loaded: true, exports }; };

const deny = () => { throw new Error('External network blocked by test'); };
require('node:net').Socket.prototype.connect = deny;
global.fetch = deny;

replace(base + 'config/env.js', { env: { NODE_ENV: 'test', JUDITH_MODEL_HAIKU: 'mock', JUDITH_MODEL_SONNET: 'mock', JUDITH_MODEL_LEITURA: 'mock', ALERTA_WHATSAPP: '5541999999999', JUDITH_DOMAIN: 'judith.invalid', WEB_JUDITH_URL: 'https://site.invalid', INTERNAL_API_KEY: 'k', EVOLUTION_INSTANCE: 'judith', EVOLUTION_API_URL: 'http://evo.invalid', EVOLUTION_API_KEY: 'x' } });
replace(base + 'db/client.js', { get prisma() { return prisma; } });
replace(base + 'evolution/client.js', { sendText: async (numero, texto) => { state.envios.push({ numero, texto }); return 'id'; }, sendTyping: async () => {}, sendDocument: async () => 'doc' });

let state;
function reset(extra = {}) {
  state = {
    user: { id: 'u1', whatsappNumber: '5541000000000', nome: 'Maria Souza', plano: 'ESSENCIAL', onboarding: 'CONCLUIDO', tipoEmpresa: 'MEI', temFuncionarios: false, aceitouTermos: true, trialFimEm: null, duvidaPendente: null, cancelamentoPendenteEm: null, exclusaoSolicitadaEm: null },
    session: { id: 's1', fluxo: null, fluxoTipo: null, fluxoOcioso: 0, fluxoCobrado: false, duvidaTema: null, duvidaCobradaEm: null },
    sub: null, messages: [], asks: [], envios: [], updates: [], config: [], textos: [], tipos: [], usos: [], lembretes: [], usageEvents: [], intencao: null, reply: 'RESPOSTA', podeLembrete: true,
    ...extra,
  };
}
reset();
const prisma = {
  user: {
    findUnique: async () => state.user,
    create: async ({ data }) => { state.user = { ...state.user, ...data }; return state.user; },
    update: async ({ data }) => { state.updates.push(data); Object.assign(state.user, data); return state.user; },
    findUniqueOrThrow: async () => state.user,
  },
  session: { findFirst: async () => state.session, create: async () => state.session, update: async ({ data }) => { Object.assign(state.session, data); return state.session; } },
  message: { findMany: async () => state.messages.slice(-16).map(m => ({ ...m })), create: async ({ data }) => { state.messages.push(data); return { id: data.id ?? 'm' + state.messages.length, ...data }; }, findFirst: async () => null },
  adminAlert: { create: async ({ data }) => data },
  subscription: { findFirst: async () => state.sub },
  usageEvent: { groupBy: async () => [{ kind: 'DUVIDA', _count: { _all: 3 } }, { kind: 'REDACAO', _count: { _all: 1 } }], count: async () => 0, create: async ({ data }) => { state.usageEvents.push(data); } },
  planCatalog: { findUnique: async ({ where }) => where.codigo === 'ESSENCIAL' ? { codigo: 'ESSENCIAL', nome: 'Essencial', duvidasMes: 30, analisesMes: 2, redacoesMes: 1, lembretesMes: 30 } : null },
  creditoCortesia: { findMany: async () => [{ servico: 'DUVIDA', saldo: 2 }] },
  avulsoCompra: { findMany: async () => [] },
  reminder: { findMany: async () => state.lembretes, create: async ({ data }) => { state.lembretes.push(data); return data; } },
  regraDocumento: { findMany: async () => [] },
  tipoDocumento: { findMany: async () => state.tipos },
  regraConfig: { findMany: async () => state.config },
  onboardingTexto: { findMany: async () => state.textos },
  tipDicaOnboarding: { count: async () => 1, findMany: async () => [{ id: 'd1', texto: 'DICA', usadoPor: [] }], update: async () => ({}) },
  knowledgeSetting: { findUnique: async () => null },
  knowledgeInteraction: { findMany: async () => [] },
  $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
};
replace(base + 'judith/quota.js', {
  checarCota: async () => state.semPlano ? { allowed: false, motivo: 'sem_assinatura_ativa' } : { allowed: true },
  registrarUso: async (db, userId, funcao) => { state.usos.push({ userId, funcao }); }, temAcessoAtivo: async () => true,
  linkAvulso: async () => 'https://pay.invalid/avulso', SERVICO_LABEL: { duvida: 'dúvida', analise: 'análise de documento', redacao: 'redação de documento' },
  trialVencido: (u) => u.plano === 'TRIAL' && Boolean(u.trialFimEm) && u.trialFimEm <= new Date(), podeCriarLembrete: async () => state.podeLembrete,
});
replace(base + 'judith/claude.js', { askJudith: async (input) => { state.asks.push(input); return { text: state.reply, model: 'mock', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }; } });
replace(base + 'judith/conhecimento.js', { getKnowledgeContext: async () => { throw new Error('nao usado'); } });
replace(base + 'regras/classificador.js', { classificarTipo: async () => ({ tipo: 'outro', origem: 'classificador' }), classificarTurno: async () => 'continua' });
replace(base + 'judith/cota-duvida.js', { ehMesmaDuvida: async () => ({ mesma: false, origem: 'classificador' }) });
replace(base + 'judith/intencao.js', { classificarIntencao: async (config, texto) => { state.intencaoChamadas = (state.intencaoChamadas ?? 0) + 1; state.intencaoPrompt = config.classificadorIntencao; return state.intencao ? { intencao: state.intencao, origem: 'classificador' } : { intencao: 'duvida', origem: 'falha' }; }, MENSAGEM_FORA_DO_ESCOPO_RESERVA: 'FORA DO ESCOPO RESERVA' });

const { handleInbound } = require(base + 'judith/conversation.js');
const { limparCacheRegras } = require(base + 'regras/repository.js');
const { limparCacheTextos } = require(base + 'judith/onboarding/textos.js');
let seq = 0;
const enviar = (text, extra = {}) => { limparCacheRegras(); limparCacheTextos(); return handleInbound({ whatsappNumber: '5541000000000', text, hasAttachment: false, messageId: 'p' + seq++, ...extra }); };

test('classificador de intenção: fora do escopo responde a mensagem editável sem modelo; redação lida pelo classificador vira redação', async () => {
  reset({ intencao: 'fora_do_escopo', config: [{ chave: 'mensagemForaDoEscopo', valor: 'SÓ NEGÓCIO' }, { chave: 'classificadorIntencao', valor: 'PROMPT DO FUNDADOR {"intencao"}' }] });
  const r = await enviar('me passa uma receita de bolo de cenoura');
  assert.deepEqual(r.replies, ['SÓ NEGÓCIO']);
  assert.equal(r.autoatendimento, 'fora_do_escopo');
  assert.equal(state.asks.length, 0);
  assert.equal(state.usos.length, 0);
  assert.equal(state.intencaoPrompt, 'PROMPT DO FUNDADOR {"intencao"}', 'o prompt salvo no painel chega ao classificador');

  reset({ intencao: 'fora_do_escopo' });
  const g = await enviar('qual o resultado do jogo de ontem?');
  assert.deepEqual(g.replies, ['FORA DO ESCOPO RESERVA']);

  reset({ intencao: 'redacao' });
  const d = await enviar('preciso de um documento pro meu cliente assinar sobre a entrega');
  assert.equal(state.asks[0].funcao, 'redacao');
  assert.equal(d.intencao.origem, 'classificador');

  reset({ intencao: 'duvida' });
  await enviar('cliente reclamando do serviço, o que eu faço?');
  assert.equal(state.asks[0].funcao, 'duvida');

  reset();
  const f = await enviar('posso demitir na experiência?');
  assert.equal(f.intencao.origem, 'palavras-chave', 'classificador falhou: valem as palavras-chave');
  assert.equal(state.asks.length, 1);
});

test('saudação de quem volta é editável e usa o primeiro nome', async () => {
  reset();
  const r = await enviar('bom dia');
  assert.match(r.replies[0], /^Oi, Maria! 👋 Que bom te ver de novo/);
  assert.equal(state.asks.length, 0);

  reset({ textos: [{ chave: 'saudacaoRetorno', valor: 'E AÍ{nome}, TUDO CERTO?' }] });
  const e = await enviar('oi');
  assert.deepEqual(e.replies, ['E AÍ, Maria, TUDO CERTO?']);

  reset(); state.user.nome = null;
  const s = await enviar('olá');
  assert.match(s.replies[0], /^Oi! 👋/);
});

test('avulso: quem pergunta por avulso recebe o texto editável com o link; sem plano a dúvida recebe o mesmo caminho', async () => {
  reset({ textos: [{ chave: 'avulsoSemPlano', valor: 'AVULSO {servico}: {avulso} | planos {planos}' }] });
  const r = await enviar('dá pra comprar avulso sem assinar?');
  assert.deepEqual(r.replies, ['AVULSO dúvida: https://pay.invalid/avulso | planos https://site.invalid/planos']);
  assert.equal(r.autoatendimento, 'avulso');
  assert.equal(state.asks.length, 0);

  reset({ semPlano: true });
  const d = await enviar('quero redigir um contrato de prestação de serviços');
  assert.equal(d.autoatendimento, 'sem_plano');
  assert.match(d.replies[0], /ainda não tem um plano ativo/);
  assert.match(d.replies[0], /Pra redação de documento é só pagar/);
  assert.match(d.replies[0], /pay\.invalid\/avulso/);
  assert.equal(state.asks.length, 0);

  reset();
  await enviar('o trabalhador avulso do porto tem direito a FGTS?');
  assert.equal(state.asks.length, 1, 'avulso em contexto jurídico é dúvida');
});

const contrato = '# CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\n## CLÁUSULA 1 – DO OBJETO\n\n' + 'O presente contrato tem por objeto a prestação de serviços de manutenção. '.repeat(30) + '\n\nCuritiba, 19 de outubro de 2026.';

test('entrega do documento: em PDF leva a mensagem editável como legenda; pedido em texto manda o texto e a mensagem em seguida', async () => {
  reset({ reply: contrato, textos: [{ chave: 'entregaDocumento', valor: 'ENTREGA IA' }] });
  const pdf = await enviar('redige um contrato de prestação de serviços');
  assert.ok(pdf.documento);
  assert.equal(pdf.documento.mensagemEntrega, 'ENTREGA IA');
  assert.deepEqual(pdf.replies, []);
  assert.equal(state.messages.at(-1).meta.entrega, 'pdf');

  reset({ reply: contrato });
  const txt = await enviar('redige um contrato de prestação de serviços em texto, pra eu copiar e colar');
  assert.equal(txt.documento, undefined);
  assert.equal(txt.entregaEmTexto, true);
  assert.equal(txt.replies.length, 2);
  assert.equal(txt.replies[0], contrato);
  assert.match(txt.replies[1], /^Pronto, seu documento está aqui! Ele foi preparado com auxílio de inteligência artificial/);
  assert.equal(state.messages.at(-1).meta.entrega, 'texto');

  // pedido de texto feito antes, na coleta, continua valendo
  reset({ reply: contrato, intencao: 'redacao', messages: [{ role: 'USER', content: 'quero um contrato, pode ser aqui na conversa mesmo, sem pdf' }, { role: 'ASSISTANT', content: 'Qual o valor?' }] });
  const antes = await enviar('R$ 2.000 por mês, 12 meses');
  assert.equal(antes.entregaEmTexto, true);

  // a chave antiga de Regras ainda vale quando nada foi salvo em Onboarding
  reset({ reply: contrato, config: [{ chave: 'mensagemEntregaDocumento', valor: 'LEGADO OAB' }] });
  const legado = await enviar('redige um contrato de prestação de serviços');
  assert.equal(legado.documento.mensagemEntrega, 'LEGADO OAB');
});

test('autoatendimento: cota do mês e lembretes (ver e criar) sem modelo e sem cota', async () => {
  reset();
  const c = await enviar('quantas dúvidas ainda tenho?');
  assert.equal(c.autoatendimento, 'cota');
  assert.match(c.replies[0], /Dúvidas: 3 de 30 \(restam 27\)/);
  assert.match(c.replies[0], /Redações: 1 de 1 \(restam 0\)/);
  assert.match(c.replies[0], /2 dúvidas de cortesia/);
  assert.equal(state.asks.length, 0);

  const vazio = await enviar('meus lembretes');
  assert.equal(vazio.autoatendimento, 'lembretes');
  assert.match(vazio.replies[0], /não tem lembretes marcados/);

  const novo = await enviar('me lembra dia 15/11 de pagar o aluguel');
  assert.equal(novo.autoatendimento, 'lembrete_criado');
  assert.match(novo.replies[0], /Te lembro de \*Pagar o aluguel\* em 15\/11\/\d{4}/);
  assert.equal(state.lembretes.length, 1);
  assert.deepEqual(state.lembretes[0].antecedencias, [1, 0]);
  assert.equal(state.usageEvents.at(-1).kind, 'LEMBRETE', 'lembrete criado pelo cliente conta na cota de lembretes');

  state.lembretes[0].dataAlvo = new Date(Date.now() + 5 * 86400000); state.lembretes[0].obrigacaoId = null;
  const lista = await enviar('quais são meus lembretes?');
  assert.match(lista.replies[0], /Pagar o aluguel \(seu\)/);

  state.podeLembrete = false;
  const cheio = await enviar('me lembra dia 20/12 do 13º');
  assert.match(cheio.replies[0], /já usou os lembretes incluídos/);
  assert.equal(state.lembretes.length, 1);

  reset();
  await enviar('quantas horas extras meu funcionário pode fazer?');
  assert.equal(state.asks.length, 1, '"quantas" em pergunta jurídica não é pedido de cota');
});

test('onboarding: depois do perfil pergunta se tem funcionário; SIM/NÃO conclui; dúvida longa não trava', async () => {
  reset(); Object.assign(state.user, { onboarding: 'AGUARDANDO_PERFIL', tipoEmpresa: null, temFuncionarios: null, duvidaPendente: null });
  const p = await enviar('sou MEI');
  assert.match(p.replies[0], /funcionário registrado/);
  assert.equal(state.user.onboarding, 'AGUARDANDO_FUNCIONARIOS');
  const x = await enviar('talvez');
  assert.match(x.replies[0], /Responde SIM ou NÃO/);
  const s = await enviar('tenho sim, dois');
  assert.equal(state.user.temFuncionarios, true);
  assert.equal(state.user.onboarding, 'CONCLUIDO');
  assert.match(s.replies[0], /DICA/);

  reset(); Object.assign(state.user, { onboarding: 'AGUARDANDO_FUNCIONARIOS', temFuncionarios: null, duvidaPendente: 'posso demitir na experiência?' });
  const n = await enviar('não');
  assert.equal(state.user.temFuncionarios, false);
  assert.equal(n.replies.at(-1), 'RESPOSTA', 'a dúvida guardada é respondida em seguida');
  assert.equal(state.asks[0].userMessage, 'posso demitir na experiência?');

  reset(); Object.assign(state.user, { onboarding: 'AGUARDANDO_FUNCIONARIOS', temFuncionarios: null, duvidaPendente: null });
  const d = await enviar('meu cliente não pagou a nota de setembro e sumiu, o que eu posso fazer agora?');
  assert.equal(state.user.onboarding, 'CONCLUIDO');
  assert.equal(state.user.temFuncionarios, null);
  assert.equal(state.asks[0].userMessage, 'meu cliente não pagou a nota de setembro e sumiu, o que eu posso fazer agora?');
  assert.equal(d.replies.at(-1), 'RESPOSTA');

  // cadastro pelo painel já com funcionário respondido: só pergunta o perfil
  reset(); Object.assign(state.user, { onboarding: 'CONCLUIDO', tipoEmpresa: null, temFuncionarios: true });
  await enviar('oi');
  assert.equal(state.user.onboarding, 'AGUARDANDO_PERFIL');
  const c = await enviar('empresa no simples');
  assert.equal(state.user.onboarding, 'CONCLUIDO');
  assert.match(c.replies[0], /DICA/);
});

// ---- módulos puros ----
const { pascoa, feriadosNacionais, ehDiaUtil, ajustarDiaUtil, enesimoDiaUtil } = require(base + 'jobs/feriados.js');
test('feriados nacionais e dias úteis', () => {
  assert.deepEqual(pascoa(2026), { ano: 2026, mes: 4, dia: 5 });
  assert.deepEqual(pascoa(2027), { ano: 2027, mes: 3, dia: 28 });
  const f = feriadosNacionais(2026);
  for (const d of ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04', '2026-11-20', '2026-12-25']) assert.ok(f.has(d), d);
  assert.equal(ehDiaUtil({ ano: 2026, mes: 11, dia: 20 }), false, 'Consciência Negra');
  assert.equal(ehDiaUtil({ ano: 2026, mes: 11, dia: 21 }), false, 'sábado');
  assert.equal(ehDiaUtil({ ano: 2026, mes: 11, dia: 21 }, { sabadoConta: true }), true);
  assert.deepEqual(ajustarDiaUtil({ ano: 2026, mes: 12, dia: 20 }, 'POSTERIOR'), { ano: 2026, mes: 12, dia: 21 }, 'domingo 20/12 → segunda 21/12 (DAS)');
  assert.deepEqual(ajustarDiaUtil({ ano: 2026, mes: 12, dia: 20 }, 'ANTERIOR'), { ano: 2026, mes: 12, dia: 18 }, 'domingo 20/12 → sexta 18/12 (FGTS)');
  assert.deepEqual(ajustarDiaUtil({ ano: 2026, mes: 11, dia: 20 }, 'ANTERIOR'), { ano: 2026, mes: 11, dia: 19 }, 'feriado 20/11 → quinta 19/11');
  assert.deepEqual(ajustarDiaUtil({ ano: 2026, mes: 10, dia: 20 }, 'POSTERIOR'), { ano: 2026, mes: 10, dia: 20 }, 'terça fica');
  assert.deepEqual(enesimoDiaUtil(2026, 11, 5), { ano: 2026, mes: 11, dia: 7 }, '5º dia útil de nov/2026: 2/11 é Finados; 3,4,5,6 e sábado 7');
  assert.deepEqual(enesimoDiaUtil(2027, 1, 5), { ano: 2027, mes: 1, dia: 7 }, 'jan/2027: 1º é feriado; 2 sáb, 4, 5, 6, 7');
});

const { ocorrencias, textoLembrete, antecedenciasDe, dataDaObrigacao } = require(base + 'jobs/lembretes.js');
test('calendário: avisos configuráveis, ajuste de dia útil, N-ésimo dia útil, só um ano', () => {
  assert.deepEqual(antecedenciasDe([0, 1, 1, 3, 99]), [3, 1, 0]);
  assert.deepEqual(antecedenciasDe(null), [3, 1, 0]);
  assert.deepEqual(antecedenciasDe([1]), [1]);
  // DAS dia 20, só 1 aviso (D-1): aparece no horizonte só a partir de 1 dia antes
  assert.deepEqual(ocorrencias({ dia: 20, mes: null, antecedencias: [1] }, { ano: 2026, mes: 10, dia: 17 }), []);
  assert.deepEqual(ocorrencias({ dia: 20, mes: null, antecedencias: [1] }, { ano: 2026, mes: 10, dia: 19 }), [{ ano: 2026, mes: 10, dia: 20 }]);
  // dez/2026: dia 20 é domingo → DAS vai pra 21, FGTS vem pra 18
  assert.deepEqual(dataDaObrigacao({ dia: 20, mes: null, ajusteDiaUtil: 'POSTERIOR' }, 2026, 12), { ano: 2026, mes: 12, dia: 21 });
  assert.deepEqual(dataDaObrigacao({ dia: 20, mes: null, ajusteDiaUtil: 'ANTERIOR' }, 2026, 12), { ano: 2026, mes: 12, dia: 18 });
  assert.deepEqual(ocorrencias({ dia: 20, mes: null, ajusteDiaUtil: 'ANTERIOR', antecedencias: [3, 0] }, { ano: 2026, mes: 12, dia: 15 }), [{ ano: 2026, mes: 12, dia: 18 }]);
  // 5º dia útil do salário
  assert.deepEqual(dataDaObrigacao({ dia: 5, mes: null, diaUtil: true }, 2026, 11), { ano: 2026, mes: 11, dia: 7 });
  // aviso de uma vez só: nota fiscal muda em jan/2027
  assert.deepEqual(ocorrencias({ dia: 1, mes: 1, ano: 2027, antecedencias: [15, 1] }, { ano: 2026, mes: 12, dia: 17 }), [{ ano: 2027, mes: 1, dia: 1 }]);
  assert.deepEqual(ocorrencias({ dia: 1, mes: 1, ano: 2027, antecedencias: [15, 1] }, { ano: 2027, mes: 12, dia: 17 }), [], 'não repete em 2028');
  // texto por antecedência
  assert.match(textoLembrete('FGTS', null, { ano: 2026, mes: 12, dia: 18 }, 7), /vence em 7 dias \(18\/12\)/);
  assert.match(textoLembrete('FGTS', null, { ano: 2026, mes: 12, dia: 18 }, 0), /vence hoje/);
  assert.match(textoLembrete('FGTS', null, { ano: 2026, mes: 12, dia: 18 }, 'D1'), /vence amanhã/);
});

const { extrairLembrete, isPedidoCota, isPedidoAvulso, pediuEmTexto } = require(base + 'judith/autoatendimento.js');
test('detectores do autoatendimento', () => {
  const hoje = { ano: 2026, mes: 10, dia: 19 };
  assert.deepEqual(extrairLembrete('me lembra dia 15/11 de pagar o aluguel', hoje), { titulo: 'Pagar o aluguel', alvo: { ano: 2026, mes: 11, dia: 15 } });
  assert.deepEqual(extrairLembrete('lembrete: 05/01 renovar o alvará', hoje), { titulo: 'Renovar o alvará', alvo: { ano: 2027, mes: 1, dia: 5 } });
  assert.deepEqual(extrairLembrete('me avisa dia 5 de dezembro do 13º', hoje), { titulo: '13º', alvo: { ano: 2026, mes: 12, dia: 5 } });
  assert.deepEqual(extrairLembrete('me lembra amanhã de ligar pro contador', hoje), { titulo: 'Ligar pro contador', alvo: { ano: 2026, mes: 10, dia: 20 } });
  assert.deepEqual(extrairLembrete('anota dia 10 reunião com o fornecedor', hoje), { titulo: 'Reunião com o fornecedor', alvo: { ano: 2026, mes: 11, dia: 10 } });
  assert.equal(extrairLembrete('me lembra de pagar o aluguel', hoje), null, 'sem data não é lembrete');
  assert.equal(extrairLembrete('o que acontece se eu lembrar de pagar só dia 31/02?', hoje), null);
  assert.equal(isPedidoCota('minha cota'), true);
  assert.equal(isPedidoCota('qual é o meu plano?'), true);
  assert.equal(isPedidoCota('quanto tempo tenho pra responder uma notificação?'), false);
  assert.equal(isPedidoAvulso('quanto custa uma dúvida avulsa?'), true);
  assert.equal(isPedidoAvulso('posso contratar um serviço avulso de um autônomo sem contrato?'), false);
  assert.equal(pediuEmTexto('manda em texto mesmo'), true);
  assert.equal(pediuEmTexto('o pdf veio em branco'), false);
});
