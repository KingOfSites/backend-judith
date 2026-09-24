const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(__dirname, '../dist');
const replace = (id, exports) => { require.cache[require.resolve(id)] = { exports }; };
let answer = 'civil', generation = 0, loads = 0, classification, empty = false, context = null, rewrite, terms;
replace(path.join(base, 'config/env.js'), { env: { ANTHROPIC_API_KEY: 'fake', JUDITH_MODEL_HAIKU: 'fake', LOCAL_EMBEDDINGS_URL: 'http://isolated.invalid' } });
replace('@anthropic-ai/sdk', class { messages = { create: async req => {
  if (req.max_tokens === 256) { rewrite = req; assert.equal(req.tool_choice.name, 'select_context'); return { content: [{ type: 'tool_use', name: 'select_context', input: { contexto: context, termos: terms ?? [JSON.parse(req.messages[0].content).perguntaAtual, context] } }] }; }
  if (req.max_tokens === 40) { classification = req; return { content: [{ type: 'text', text: answer }] }; }
  generation++; throw new Error('Legal generation must not happen');
} }; });
replace(path.join(base, 'judith/prompts/principal.js'), { getPrincipalSnapshot: async () => ({text:'Preserved prompt',version:'test'}) });
replace(path.join(base, 'knowledge/audit.js'), {writeAudit:async()=>{}});
replace(path.join(base, 'knowledge/repository.js'), { loadCandidates: async area => {
  assert.equal(area, 'civil'); loads++;
  if (empty) return [];
  return [{ id: 'a', areas: ['civil'], published: true, vector: [1, 0], content: 'Reference' }];
} });
const { askJudith } = require('../dist/judith/claude.js');
const { createProvider } = require('../dist/knowledge/provider.js');
const input = { tier: 'HAIKU', funcao: 'duvida', user: null, history: [], userMessage: 'E se recusarem?' };

test('busca: classificação inválida, nenhuma área e embeddings offline impedem geração jurídica', async t => {
  t.mock.method(global, 'fetch', async () => { throw new Error('offline'); });
  for (const value of ['financeiro', 'civil, consumidor', 'civil, civil', 'A área é civil']) {
    answer = value;
    await assert.rejects(askJudith(input), e => e.code === 'CLASSIFICATION_INVALID');
  }
  assert.equal(loads, 0);
  answer = 'nenhuma';
  await assert.rejects(askJudith(input), e => e.code === 'KNOWLEDGE_OUT_OF_SCOPE');
  assert.equal(loads, 0);
  answer = 'civil';
  await assert.rejects(askJudith(input), e => e.code === 'KNOWLEDGE_UNAVAILABLE');
  assert.equal(loads, 1); assert.equal(generation, 0);
  empty = true;
  await assert.rejects(askJudith(input), e => e.code === 'KNOWLEDGE_NO_CONTEXT');
  assert.equal(generation, 0); empty = false;
});

test('continuação: consulta curta é literal; pergunta completa preservada; termos inventados ou só do histórico falham', async () => {
  const provider=createProvider(),question='E qual é o prazo para exercer esse direito?';
  context='comprei um produto pela internet. Posso desistir da compra mesmo sem defeito?';
  const history=[{role:'user',content:context},{role:'assistant',content:'Não use esta resposta como fonte: prazo inventado de 99 dias.'}];
  terms=['prazo','desistir da compra','pela internet'];
  assert.deepEqual(await provider.contextualize(question,history),{searchText:'prazo desistir da compra pela internet',resolvedQuestion:question+'\nContexto informado pelo usuário: '+context});
  assert.ok(!rewrite.messages[0].content.includes('99 dias'));
  for(const bad of [['prazo','desistir','7 dias'],['desistir','pela internet'],['prazo'],['prazo',42]]){
    terms=bad;await assert.rejects(provider.contextualize(question,history),e=>e.code==='CLASSIFICATION_INVALID');
  }
  terms=undefined;context=null;
});

test('classificador: recebe histórico com papéis e pergunta atual, com precedência explícita para assunto novo', async () => {
  answer = 'civil';
  const history = [{ role: 'user', content: 'Meu contrato de locação terminou.' }, { role: 'assistant', content: 'Você pretende renovar?' }];
  await createProvider().classify('E se recusarem?', history);
  assert.deepEqual(JSON.parse(classification.messages[0].content), { historico: history, perguntaAtual: 'E se recusarem?' });
  assert.match(classification.system, /mudança explícita de assunto.*prevalece/);
  empty = true;
  context = history[0].content;
  await assert.rejects(askJudith({ ...input, history }), e => e.code === 'KNOWLEDGE_NO_CONTEXT');
  assert.equal(classification.messages[0].content, input.userMessage + '\nContexto informado pelo usuário: ' + context);
  assert.deepEqual(JSON.parse(rewrite.messages[0].content).perguntasAnteriores, [history[0].content]);
  empty = false;
});

test('consulta extrativa: mudança de assunto usa só pergunta atual; fatos inventados são rejeitados', async () => {
  const provider = createProvider();
  const history = [{ role: 'user', content: 'Quero eliminar meus dados pessoais.' }, { role: 'assistant', content: 'LOCACAO '.repeat(5000) }];
  context = null;
  const question = 'Como calcular férias de um empregado?';
  assert.equal(await provider.contextualize(question, history), question);
  assert.ok(!rewrite.messages[0].content.includes('LOCACAO'));
  context = 'O empregado foi demitido ontem';
  await assert.rejects(provider.contextualize('E agora?', history), e => e.code === 'CLASSIFICATION_INVALID');
  context = history[0].content;
  assert.deepEqual(await provider.contextualize('E agora?', history), {resolvedQuestion:'E agora?\nContexto informado pelo usuário: ' + context,searchText:'E agora? '+context});
});
