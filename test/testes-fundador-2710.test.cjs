// Testes do fundador de 27/10/2026: mensagens seguidas viram um turno, "." e "ok" não cobram,
// lembrete com prazo relativo, data de hoje no prompt, ponto de cache explícito na OpenAI,
// classificador de área com mais de uma área, reordenação da busca e janelas de embedding.
// Sem rede e sem banco: módulos simulados via require.cache.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(process.env.JUDITH_TEST_DIST || path.join(__dirname, '../dist')) + path.sep;
const replace = (id, exports) => { require.cache[require.resolve(id)] = { id: require.resolve(id), filename: require.resolve(id), loaded: true, exports }; };

replace(base + 'config/env.js', { env: { NODE_ENV: 'test', JUDITH_MODEL_HAIKU: 'gemini-mock', JUDITH_MODEL_SONNET: 'gpt-4.1', JUDITH_MODEL_CLASSIFICADOR: 'gemini-lite-mock', JUDITH_MODEL_FALLBACK: 'gpt-4.1-mini', GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o', ANTHROPIC_API_KEY: 'a', JUNTAR_MENSAGENS_MS: 20 } });

// ---------------------------------------------------------------- fila por número

const { FilaPorNumero, mensagemTrivial } = require(base + 'judith/fila.js');
const dormir = ms => new Promise(r => setTimeout(r, ms));

test('fila: mensagens seguidas viram um lote; lotes do mesmo número nunca rodam em paralelo', async () => {
  const lotes = []; let rodando = 0, maxParalelo = 0;
  const fila = new FilaPorNumero(30, async (numero, lote) => {
    rodando++; maxParalelo = Math.max(maxParalelo, rodando);
    lotes.push({ numero, lote: lote.map(i => i.text) });
    await dormir(60);
    rodando--;
  });
  fila.receber('551', { text: 'quero demitir funcionario' });
  await dormir(10);
  fila.receber('551', { text: 'não posso?' });
  fila.receber('552', { text: 'outra pessoa' });
  await dormir(45); // os dois lotes dispararam e estão rodando
  fila.receber('551', { text: 'chegou durante o processamento' });
  await dormir(200);
  assert.deepEqual(lotes[0], { numero: '551', lote: ['quero demitir funcionario', 'não posso?'] });
  assert.deepEqual(lotes.find(l => l.numero === '552').lote, ['outra pessoa']);
  assert.deepEqual(lotes.at(-1), { numero: '551', lote: ['chegou durante o processamento'] });
  assert.equal(lotes.length, 3);
  assert.ok(maxParalelo <= 2, 'números diferentes podem rodar juntos');
  assert.equal(fila.pendentes, 0);
});

test('fila: falha no processamento não derruba a fila nem perde o lote seguinte', async () => {
  const falhas = []; const ok = [];
  const fila = new FilaPorNumero(5, async (_n, lote) => { if (lote[0].text === 'erro') throw new Error('boom'); ok.push(lote[0].text); }, (n, e) => falhas.push([n, e.message]));
  fila.receber('551', { text: 'erro' });
  await dormir(30);
  fila.receber('551', { text: 'depois' });
  await dormir(30);
  assert.deepEqual(falhas, [['551', 'boom']]);
  assert.deepEqual(ok, ['depois']);
});

test('mensagem trivial: pontuação, emoji e "ok" fora do fluxo; dentro da coleta só pontuação/emoji', () => {
  for (const t of ['.', '?', '...', '👍', '🙏🙏', '  ', 'ok', 'Ok!', 'blz', 'beleza', 'entendi', 'kkk', 'ta bom']) assert.equal(mensagemTrivial(t), true, t);
  for (const t of ['ok, e o prazo?', 'posso demitir?', 'sim quero', 'não posso?', '15/11']) assert.equal(mensagemTrivial(t), false, t);
  assert.equal(mensagemTrivial('ok', true), false, 'dentro do fluxo "ok" é resposta da coleta');
  assert.equal(mensagemTrivial('.', true), true);
});

// ---------------------------------------------------------------- lote do webhook

test('lote do webhook: textos em linhas, primeiro arquivo lido, id da primeira mensagem', () => {
  // server.js sobe o Fastify ao carregar; a função de juntar é pura e fica isolada aqui.
  const src = require('node:fs').readFileSync(base + 'server.js', 'utf8');
  assert.match(src, /filaJudith\.receber\(parsed\.whatsappNumber/, 'a JUDITH entra pela fila');
  const inicio = src.indexOf('function juntarLote'); const fim = src.indexOf('\n}', inicio) + 2;
  const juntarLote = new Function(src.slice(inicio, fim) + '; return juntarLote;')();
  const lote = [
    { text: 'me faz um recibo', hasAttachment: false, messageId: 'm1', pushName: 'LH' },
    { text: '', hasAttachment: true, anexo: { erro: 'FALHA' }, messageId: 'm2' },
    { text: 'de R$ 500', hasAttachment: true, anexo: { leitura: { texto: 'doc' }, fileName: 'a.pdf' }, messageId: 'm3', pushName: 'Luiz' },
  ];
  assert.deepEqual(juntarLote(lote), { pushName: 'Luiz', text: 'me faz um recibo\nde R$ 500', hasAttachment: true, anexo: lote[2].anexo, messageId: 'm1' });
});

// ---------------------------------------------------------------- lembrete com prazo relativo

const { extrairLembrete } = require(base + 'judith/autoatendimento.js');
test('lembrete: "em 30 dias", "semana que vem", "mês que vem", "na sexta", "hoje"', () => {
  const hoje = { ano: 2026, mes: 10, dia: 27 }; // terça-feira
  assert.deepEqual(extrairLembrete('me lembre de renovar meu alvará em 30 dias', hoje), { titulo: 'Renovar meu alvará', alvo: { ano: 2026, mes: 11, dia: 26 } });
  assert.deepEqual(extrairLembrete('me lembra daqui a duas semanas de pagar o contador', hoje), { titulo: 'Pagar o contador', alvo: { ano: 2026, mes: 11, dia: 10 } });
  assert.deepEqual(extrairLembrete('me avisa dentro de um mês do seguro', hoje), { titulo: 'Seguro', alvo: { ano: 2026, mes: 11, dia: 27 } });
  assert.deepEqual(extrairLembrete('me lembra semana que vem de ligar pro fornecedor', hoje), { titulo: 'Ligar pro fornecedor', alvo: { ano: 2026, mes: 11, dia: 3 } });
  assert.deepEqual(extrairLembrete('lembrete: mês que vem renovar o contrato', hoje), { titulo: 'Renovar o contrato', alvo: { ano: 2026, mes: 11, dia: 27 } });
  assert.deepEqual(extrairLembrete('me lembra na sexta de pagar o aluguel', hoje), { titulo: 'Pagar o aluguel', alvo: { ano: 2026, mes: 10, dia: 30 } });
  assert.deepEqual(extrairLembrete('me lembra terça que vem de pagar o aluguel', hoje), { titulo: 'Pagar o aluguel', alvo: { ano: 2026, mes: 11, dia: 3 } });
  assert.deepEqual(extrairLembrete('me lembra hoje de mandar a nota', hoje), { titulo: 'Mandar a nota', alvo: hoje });
  assert.deepEqual(extrairLembrete('me lembra dia 31/01 de pagar', { ano: 2026, mes: 1, dia: 31 }), { titulo: 'Pagar', alvo: { ano: 2026, mes: 1, dia: 31 } });
  assert.equal(extrairLembrete('posso demitir meu funcionário em 30 dias?', hoje), null, 'sem verbo de lembrete não é lembrete');
});

// ---------------------------------------------------------------- data de hoje no prompt

const { linhaDataDeHoje } = require(base + 'judith/claude.js');
test('prompt: linha com a data de hoje em Brasília, por extenso e curta', () => {
  const linha = linhaDataDeHoje(new Date('2026-11-04T23:30:00Z')); // 20h30 de 04/11 em Brasília
  assert.match(linha, /quarta-feira, 04 de novembro de 2026/);
  assert.match(linha, /04\/11\/2026, horário de Brasília/);
  assert.match(linhaDataDeHoje(new Date('2026-11-05T02:30:00Z')), /04\/11\/2026/, 'ainda é dia 4 em Brasília');
});

// ---------------------------------------------------------------- OpenAI: ponto de cache explícito

const { aceitaPontoDeCache, blocosEntradaDe } = require(base + 'llm/client.js');
test('OpenAI: GPT-5.6+ e GPT-6 vão pela API Responses com ponto de cache; gpt-4.1 continua no Chat Completions', () => {
  for (const m of ['gpt-6-luna', 'gpt-6', 'gpt-5.6', 'gpt-5.7-mini', 'GPT-6-Luna']) assert.equal(aceitaPontoDeCache(m), true, m);
  for (const m of ['gpt-4.1', 'gpt-4.1-mini', 'gpt-5-mini', 'gpt-5.5', 'gemini-3.8-flash', 'claude-sonnet-4-6']) assert.equal(aceitaPontoDeCache(m), false, m);
  const blocos = blocosEntradaDe([{ type: 'text', text: 'PROMPT FIXO', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'perfil do usuário' }]);
  assert.deepEqual(blocos, [{ type: 'input_text', text: 'PROMPT FIXO', prompt_cache_breakpoint: { mode: 'explicit' } }, { type: 'input_text', text: 'perfil do usuário' }]);
  assert.deepEqual(blocosEntradaDe('só texto'), [{ type: 'input_text', text: 'só texto' }]);
});

test('OpenAI Responses: corpo com breakpoint depois do prompt fixo, ferramenta forçada e uso com cache', async () => {
  const chamadas = [];
  replace('openai', class {
    responses = { create: async (body) => { chamadas.push(body); return { id: 'r1', model: 'gpt-6-luna-2026', status: 'completed', output: [{ type: 'function_call', call_id: 'c1', name: 'grounded_answer', arguments: '{"answer":"7 dias"}' }], usage: { input_tokens: 5000, output_tokens: 12, input_tokens_details: { cached_tokens: 4800 } } }; } };
    chat = { completions: { create: async () => assert.fail('gpt-6 não deve usar Chat Completions') } };
  });
  delete require.cache[require.resolve(base + 'llm/client.js')];
  const { gerar } = require(base + 'llm/client.js');
  const r = await gerar({ model: 'gpt-6-luna', max_tokens: 1024, temperature: 0, system: [{ type: 'text', text: 'FIXO', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'DINÂMICO' }], messages: [{ role: 'user', content: 'pergunta' }], tools: [{ name: 'grounded_answer', input_schema: { type: 'object' } }], tool_choice: { type: 'tool', name: 'grounded_answer' } });
  const body = chamadas[0];
  assert.equal(body.model, 'gpt-6-luna'); assert.equal(body.max_output_tokens, 1024);
  assert.deepEqual(body.prompt_cache_options, { mode: 'explicit' });
  assert.deepEqual(body.input[0], { role: 'developer', content: [{ type: 'input_text', text: 'FIXO', prompt_cache_breakpoint: { mode: 'explicit' } }, { type: 'input_text', text: 'DINÂMICO' }] });
  assert.deepEqual(body.input[1], { role: 'user', content: [{ type: 'input_text', text: 'pergunta' }] });
  assert.deepEqual(body.tool_choice, { type: 'function', name: 'grounded_answer' });
  assert.equal(body.tools[0].type, 'function'); assert.equal(body.tools[0].name, 'grounded_answer');
  assert.deepEqual(r.content, [{ type: 'tool_use', id: 'c1', name: 'grounded_answer', input: { answer: '7 dias' } }]);
  assert.equal(r.stop_reason, 'tool_use');
  assert.deepEqual(r.usage, { input_tokens: 200, output_tokens: 12, cache_read_input_tokens: 4800, cache_creation_input_tokens: 0 });
});

// ---------------------------------------------------------------- busca: várias áreas, reordenação, janelas

const { retrieve, janelas, embedCompleto, LIMITE_JANELA, CANDIDATOS_REORDENACAO } = require(base + 'knowledge/core.js');
const vetor = (x, y) => [x, y];
test('busca: classificador com duas áreas carrega as duas; reordenador escolhe o bloco do fato perguntado', async () => {
  const loads = [];
  const candidatos = Array.from({ length: 12 }, (_, i) => ({ id: 'c' + i, areas: [i < 10 ? 'tributario' : 'consumidor'], published: true, vector: vetor(1, i / 100), content: 'bloco ' + i, titulo: 't', fontes: [], chapter: 'CAP ' + i, subchapter: null }));
  const provider = {
    model: 'test',
    classify: async () => ['tributario', 'consumidor'],
    embed: async () => vetor(1, 0),
    rerank: async (pergunta, lista) => { assert.equal(lista.length, CANDIDATOS_REORDENACAO); assert.equal(pergunta, 'como emito a nota?'); return ['c9', 'c11']; },
  };
  const r = await retrieve('como emito a nota?', provider, async area => { loads.push(area); return candidatos.filter(c => c.areas[0] === area); });
  assert.deepEqual(loads, ['tributario', 'consumidor']);
  assert.equal(r.area, 'tributario'); assert.deepEqual(r.areas, ['tributario', 'consumidor']); assert.equal(r.areaSource, 'classifier');
  assert.deepEqual(r.chunks.map(c => c.id), ['c9', 'c11', 'c0', 'c1', 'c2'], 'escolhidos primeiro, depois a ordem da similaridade');
  assert.equal(r.reranked, true);
  // Reordenador falhando: vale a similaridade.
  const r2 = await retrieve('como emito a nota?', { ...provider, rerank: async () => { throw new Error('indisponível'); } }, async area => candidatos.filter(c => c.areas[0] === area));
  assert.deepEqual(r2.chunks.map(c => c.id), ['c0', 'c1', 'c2', 'c3', 'c4']); assert.equal(r2.reranked, false);
});

test('embedding: bloco longo é lido em janelas sobrepostas e vira a média normalizada', async () => {
  const texto = Array.from({ length: 40 }, (_, i) => `Parágrafo ${i} sobre rescisão do contrato de trabalho e verbas rescisórias.`).join('\n');
  assert.ok(texto.length > LIMITE_JANELA);
  const partes = janelas(texto);
  assert.ok(partes.length >= 2);
  assert.ok(partes.every(p => p.length <= 1500));
  assert.ok(partes[1].startsWith(partes[0].slice(-200).slice(0, 1)) || texto.includes(partes[1]), 'janelas são trechos literais');
  assert.equal(partes.join('').includes('Parágrafo 39'), true, 'o fim do bloco entra');
  assert.deepEqual(janelas('curto'), ['curto']);
  const pedidos = [];
  const v = await embedCompleto({ embed: async (t) => { pedidos.push(t); return pedidos.length === 1 ? [1, 0] : [0, 1]; } }, texto);
  assert.equal(pedidos.length, partes.length);
  assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9, 'normalizado');
  assert.ok(v[0] > 0 && v[1] > 0);
});
