// Camada de modelos: despacho por fornecedor, tradução do formato, saída estruturada,
// novas tentativas e troca de fornecedor. Fornecedores simulados, sem rede.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(process.env.JUDITH_TEST_DIST || path.join(__dirname, '../dist')) + path.sep;
const replace = (id, exports) => { require.cache[require.resolve(id)] = { id: require.resolve(id), filename: require.resolve(id), loaded: true, exports }; };

let state;
const reset = (extra = {}) => { state = { google: [], openai: [], anthropic: [], googleRespostas: [], openaiRespostas: [], ...extra }; };
reset();

const okGoogle = (parts, extra = {}) => ({ status: 200, body: { responseId: 'g-1', modelVersion: 'gemini-3.8-flash', candidates: [{ finishReason: 'STOP', content: { parts } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 7, cachedContentTokenCount: 40 }, ...extra } });
const erroGoogle = (status) => ({ status, body: { error: { code: status, message: 'simulado' } } });

global.fetch = async (url, init) => {
  assert.match(String(url), /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/[^/]+:generateContent$/);
  assert.equal(init.headers['x-goog-api-key'], 'chave-gemini');
  state.google.push({ url: String(url), body: JSON.parse(init.body) });
  const r = state.googleRespostas.shift() ?? okGoogle([{ text: 'RESPOSTA GEMINI' }]);
  return { ok: r.status === 200, status: r.status, text: async () => JSON.stringify(r.body) };
};

replace(base + 'config/env.js', { env: { GEMINI_API_KEY: 'chave-gemini', OPENAI_API_KEY: 'chave-openai', DEEPSEEK_API_KEY: 'chave-deepseek', ANTHROPIC_API_KEY: 'chave-claude', JUDITH_MODEL_HAIKU: 'gemini-3.8-flash', JUDITH_MODEL_SONNET: 'gpt-4.1', JUDITH_MODEL_FALLBACK: 'gpt-4.1-mini', JUDITH_DEEPSEEK_RACIOCINIO: 'low' } });
replace('openai', class {
  constructor(o) {
    // O mesmo SDK atende a OpenAI (sem baseURL) e a DeepSeek (baseURL própria, chave própria).
    this.baseURL = o.baseURL ?? null;
    assert.equal(o.apiKey, this.baseURL ? 'chave-deepseek' : 'chave-openai'); assert.equal(o.maxRetries, 0);
  }
  chat = { completions: { create: async (req) => {
    state.openai.push({ ...req, _baseURL: this.baseURL });
    const r = state.openaiRespostas.shift();
    if (r instanceof Error) throw r;
    return r ?? { id: 'o-1', model: req.model + '-2025', choices: [{ finish_reason: 'stop', message: { content: 'RESPOSTA OPENAI' } }], usage: { prompt_tokens: 200, completion_tokens: 9, prompt_tokens_details: { cached_tokens: 150 } } };
  } } };
});
replace('@anthropic-ai/sdk', class { messages = { create: async (req) => { state.anthropic.push(req); return { id: 'a-1', model: req.model, content: [{ type: 'text', text: 'RESPOSTA CLAUDE' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }; } }; });

const { Llm, gerar, fornecedorDe, schemaParaGemini, retry, MARGEM_RACIOCINIO_GEMINI, DEEPSEEK_URL, MIN_SAIDA_DEEPSEEK } = require(base + 'llm/client.js');
retry.esperasMs = [0, 0];

const FERRAMENTA = { name: 'grounded_answer', description: 'd', input_schema: { type: 'object', properties: { answer: { type: 'string' }, ctx: { anyOf: [{ type: 'string' }, { type: 'null' }] }, itens: { type: 'array', items: { type: 'object', properties: { n: { type: 'integer', minimum: 0 } }, required: ['n'], additionalProperties: false } } }, required: ['answer'], additionalProperties: false } };

test('despacho pelo id do modelo', () => {
  assert.equal(fornecedorDe('gemini-3.8-flash'), 'google');
  assert.equal(fornecedorDe('gpt-4.1'), 'openai');
  assert.equal(fornecedorDe('gpt-4.1-mini'), 'openai');
  assert.equal(fornecedorDe('deepseek-v4-pro'), 'deepseek');
  assert.equal(fornecedorDe('deepseek-flash'), 'deepseek');
  assert.equal(fornecedorDe('claude-haiku-4-5-20251001'), 'anthropic');
  assert.equal(fornecedorDe('mock-haiku'), 'anthropic');
});

test('schema para Gemini: tira additionalProperties em todos os níveis e converte "ou null"', () => {
  const s = schemaParaGemini(FERRAMENTA.input_schema);
  assert.equal(JSON.stringify(s).includes('additionalProperties'), false);
  assert.deepEqual(s.properties.ctx, { type: 'string', nullable: true });
  assert.equal(s.properties.itens.items.properties.n.minimum, 0);
  assert.deepEqual(s.required, ['answer']);
  assert.ok(JSON.stringify(FERRAMENTA.input_schema).includes('additionalProperties'), 'o schema original não é alterado');
});

test('Gemini: system em blocos na ordem, turnos seguidos unidos, thinking zerado', async () => {
  reset();
  const r = await gerar({
    model: 'gemini-3.8-flash', max_tokens: 1024, temperature: 0,
    system: [{ type: 'text', text: 'SECAO A', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'PERFIL' }],
    messages: [{ role: 'user', content: 'um' }, { role: 'user', content: 'dois' }, { role: 'assistant', content: 'resp' }, { role: 'user', content: 'tres' }],
  });
  const b = state.google[0].body;
  assert.match(state.google[0].url, /models\/gemini-3\.8-flash:generateContent/);
  assert.equal(b.systemInstruction.parts[0].text, 'SECAO A\n\nPERFIL');
  assert.deepEqual(b.contents.map(c => c.role), ['user', 'model', 'user']);
  assert.equal(b.contents[0].parts[0].text, 'um\n\ndois');
  // O limite pedido (1024) ganha a margem do raciocínio residual, que conta na saída.
  assert.deepEqual(b.generationConfig, { maxOutputTokens: 1024 + MARGEM_RACIOCINIO_GEMINI, temperature: 0, thinkingConfig: { thinkingBudget: 0 } });
  assert.ok(MARGEM_RACIOCINIO_GEMINI >= 256);
  assert.equal(b.tools, undefined);
  assert.deepEqual(r.content, [{ type: 'text', text: 'RESPOSTA GEMINI' }]);
  assert.equal(r.stop_reason, 'end_turn');
  assert.deepEqual(r.usage, { input_tokens: 60, output_tokens: 7, cache_read_input_tokens: 40, cache_creation_input_tokens: 0 });
  assert.equal(r.fallback, undefined);
});

test('Gemini flash-lite: raciocínio mínimo por nível, porque recusa thinkingBudget 0 com 400', async () => {
  reset();
  const r = await gerar({ model: 'gemini-3.5-flash-lite', max_tokens: 40, temperature: 0, messages: [{ role: 'user', content: 'p' }] });
  assert.match(state.google[0].url, /models\/gemini-3\.5-flash-lite:generateContent/);
  assert.deepEqual(state.google[0].body.generationConfig.thinkingConfig, { thinkingLevel: 'minimal' });
  assert.deepEqual(r.content, [{ type: 'text', text: 'RESPOSTA GEMINI' }]);
});

test('Gemini: 400 de argumento repete uma vez sem thinkingConfig em vez de derrubar a função', async () => {
  reset({ googleRespostas: [{ status: 400, body: { error: { code: 400, message: 'Request contains an invalid argument.', status: 'INVALID_ARGUMENT' } } }] });
  const r = await gerar({ model: 'gemini-3.8-flash', max_tokens: 40, temperature: 0, messages: [{ role: 'user', content: 'p' }] });
  assert.equal(state.google.length, 2);
  assert.deepEqual(state.google[0].body.generationConfig.thinkingConfig, { thinkingBudget: 0 });
  assert.deepEqual(state.google[1].body.generationConfig, { maxOutputTokens: 40 + MARGEM_RACIOCINIO_GEMINI, temperature: 0 });
  assert.deepEqual(r.content, [{ type: 'text', text: 'RESPOSTA GEMINI' }]);
  assert.equal(r.fallback, undefined);
});

test('Gemini: ferramenta forçada vira chamada de função obrigatória e volta como tool_use', async () => {
  reset({ googleRespostas: [okGoogle([{ functionCall: { name: 'grounded_answer', args: { answer: 'sim', unsupported: false } } }])] });
  const r = await new Llm().messages.create({ model: 'gemini-3.8-flash', max_tokens: 100, messages: [{ role: 'user', content: 'p' }], tools: [FERRAMENTA], tool_choice: { type: 'tool', name: 'grounded_answer' } });
  const b = state.google[0].body;
  assert.equal(b.tools[0].functionDeclarations[0].name, 'grounded_answer');
  assert.deepEqual(b.toolConfig, { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['grounded_answer'] } });
  assert.equal(r.content.length, 1);
  assert.equal(r.content[0].type, 'tool_use');
  assert.equal(r.content[0].name, 'grounded_answer');
  assert.deepEqual(r.content[0].input, { answer: 'sim', unsupported: false });
  assert.equal(r.stop_reason, 'tool_use');
});

test('Gemini: corte por limite de tokens é sinalizado', async () => {
  reset({ googleRespostas: [okGoogle([{ text: 'pela met' }], { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'pela met' }] } }] })] });
  const r = await gerar({ model: 'gemini-3.8-flash', max_tokens: 5, messages: [{ role: 'user', content: 'p' }] });
  assert.equal(r.stop_reason, 'max_tokens');
});

test('OpenAI: system único no começo, ferramenta forçada e uso com cache', async () => {
  reset({ openaiRespostas: [{ id: 'o-2', model: 'gpt-4.1-2025-04-14', choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'grounded_answer', arguments: '{"answer":"ok"}' } }] } }], usage: { prompt_tokens: 5000, completion_tokens: 30, prompt_tokens_details: { cached_tokens: 4096 } } }] });
  const r = await gerar({
    model: 'gpt-4.1', max_tokens: 4096,
    system: [{ type: 'text', text: 'SECAO A' }, { type: 'text', text: 'SECAO B' }, { type: 'text', text: 'REGRAS' }],
    messages: [{ role: 'user', content: 'redige' }], tools: [FERRAMENTA], tool_choice: { type: 'tool', name: 'grounded_answer' },
  });
  const q = state.openai[0];
  assert.equal(q.model, 'gpt-4.1');
  assert.equal(q.max_tokens, 4096);
  assert.equal('temperature' in q, false);
  assert.deepEqual(q.messages[0], { role: 'system', content: 'SECAO A\n\nSECAO B\n\nREGRAS' });
  assert.deepEqual(q.tool_choice, { type: 'function', function: { name: 'grounded_answer' } });
  assert.deepEqual(q.tools[0].function.parameters, FERRAMENTA.input_schema);
  assert.deepEqual(r.content, [{ type: 'tool_use', id: 'call_1', name: 'grounded_answer', input: { answer: 'ok' } }]);
  assert.deepEqual(r.usage, { input_tokens: 904, output_tokens: 30, cache_read_input_tokens: 4096, cache_creation_input_tokens: 0 });
  assert.equal(state.google.length, 0);
});

test('Claude continua atendido, com o pedido intacto', async () => {
  reset();
  const req = { model: 'claude-haiku-4-5-20251001', max_tokens: 10, system: [{ type: 'text', text: 's', cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: 'p' }] };
  const r = await gerar(req);
  assert.deepEqual(state.anthropic[0], req);
  assert.equal(r.content[0].text, 'RESPOSTA CLAUDE');
});

test('503 do Gemini: tenta de novo e, esgotando, troca para o gpt-4.1-mini', async () => {
  reset({ googleRespostas: [erroGoogle(503), erroGoogle(503), erroGoogle(429)] });
  const r = await gerar({ model: 'gemini-3.8-flash', max_tokens: 50, temperature: 0, system: 'S', messages: [{ role: 'user', content: 'p' }] });
  assert.equal(state.google.length, 3, 'uma chamada mais duas novas tentativas');
  assert.equal(state.openai.length, 1);
  assert.equal(state.openai[0].model, 'gpt-4.1-mini');
  assert.deepEqual(state.openai[0].messages, [{ role: 'system', content: 'S' }, { role: 'user', content: 'p' }]);
  assert.equal(r.content[0].text, 'RESPOSTA OPENAI');
  assert.equal(r.fallback.from, 'gemini-3.8-flash');
});

test('instabilidade passageira se resolve na nova tentativa, sem trocar de fornecedor', async () => {
  reset({ googleRespostas: [erroGoogle(503)] });
  const r = await gerar({ model: 'gemini-3.8-flash', max_tokens: 50, messages: [{ role: 'user', content: 'p' }] });
  assert.equal(state.google.length, 2);
  assert.equal(state.openai.length, 0);
  assert.equal(r.fallback, undefined);
});

test('sem novas tentativas configuradas: vai direto para o fallback', async () => {
  reset({ googleRespostas: [erroGoogle(503)] });
  await new Llm({ maxRetries: 0 }).messages.create({ model: 'gemini-3.8-flash', max_tokens: 50, messages: [{ role: 'user', content: 'p' }] });
  assert.equal(state.google.length, 1);
  assert.equal(state.openai.length, 1);
});

test('erro de pedido (400) não repete nem troca de fornecedor', async () => {
  reset({ googleRespostas: [erroGoogle(400)] });
  await assert.rejects(gerar({ model: 'gemini-3.8-flash', max_tokens: 50, messages: [{ role: 'user', content: 'p' }] }), /Gemini 400/);
  assert.equal(state.google.length, 1);
  assert.equal(state.openai.length, 0);
});

test('resposta vazia ou bloqueada do Gemini é falha, nunca resposta inventada', async () => {
  reset({ googleRespostas: [{ status: 200, body: { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] } }, { status: 200, body: { candidates: [] } }, { status: 200, body: {} }] });
  const r = await gerar({ model: 'gemini-3.8-flash', max_tokens: 50, messages: [{ role: 'user', content: 'p' }] });
  assert.equal(state.google.length, 3);
  assert.equal(r.fallback.from, 'gemini-3.8-flash');
});

test('queda do GPT-4.1 não cai em fallback do mesmo fornecedor', async () => {
  const erro = Object.assign(new Error('503 simulado'), { status: 503 });
  reset({ openaiRespostas: [erro, erro, erro] });
  await assert.rejects(gerar({ model: 'gpt-4.1', max_tokens: 50, messages: [{ role: 'user', content: 'p' }] }), /503 simulado/);
  assert.equal(state.openai.length, 3);
  assert.equal(state.google.length, 0);
});

test('argumentos de ferramenta inválidos do OpenAI viram falha', async () => {
  reset({ openaiRespostas: [{ id: 'o', model: 'gpt-4.1', choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'c', type: 'function', function: { name: 'x', arguments: '{quebrado' } }] } }], usage: {} }, null, null] });
  retry.esperasMs = [0];
  await assert.rejects(gerar({ model: 'gpt-4.1', max_tokens: 50, messages: [{ role: 'user', content: 'p' }] }, { maxRetries: 0 }), /não são JSON/);
  retry.esperasMs = [0, 0];
});

test('DeepSeek: redação no v4-pro vai com raciocínio low, piso de saída e cache automático', async () => {
  reset({ openaiRespostas: [{ id: 'd-1', model: 'deepseek-v4-pro', choices: [{ finish_reason: 'stop', message: { content: 'CONTRATO', reasoning_content: 'pensei' } }], usage: { prompt_tokens: 3000, completion_tokens: 900, prompt_tokens_details: { cached_tokens: 2500 }, prompt_cache_hit_tokens: 2500, prompt_cache_miss_tokens: 500 } }] });
  const r = await gerar({ model: 'deepseek-v4-pro', max_tokens: 4096, system: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }], messages: [{ role: 'user', content: 'redige' }] });
  const q = state.openai[0];
  assert.equal(q._baseURL, DEEPSEEK_URL);
  assert.equal(q.model, 'deepseek-v4-pro');
  assert.equal(q.reasoning_effort, 'low');
  assert.deepEqual(q.thinking, { type: 'enabled' });
  assert.equal(q.max_tokens, MIN_SAIDA_DEEPSEEK);
  assert.deepEqual(q.messages, [{ role: 'system', content: 'A\n\nB' }, { role: 'user', content: 'redige' }]);
  assert.deepEqual(r.content, [{ type: 'text', text: 'CONTRATO' }]);
  assert.deepEqual(r.usage, { input_tokens: 500, output_tokens: 900, cache_read_input_tokens: 2500, cache_creation_input_tokens: 0 });
});

test('DeepSeek: ferramenta forçada no v4-pro raciocina pelo modo JSON e volta como tool_use; JSON inválido é falha', async () => {
  reset({ openaiRespostas: [
    { id: 'd-2', model: 'deepseek-v4-pro', choices: [{ finish_reason: 'stop', message: { content: '```json\n{"answer":"ok","closing":"Se quiser, eu redijo."}\n```', reasoning_content: 'pensei' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } },
    { id: 'd-3', model: 'deepseek-v4-pro', choices: [{ finish_reason: 'stop', message: { content: '   ' } }], usage: { prompt_tokens: 10, completion_tokens: 0 } },
    { id: 'd-3', model: 'deepseek-v4-pro', choices: [{ finish_reason: 'stop', message: { content: 'não é json' } }], usage: { prompt_tokens: 10, completion_tokens: 3 } },
    { id: 'd-3', model: 'deepseek-v4-pro', choices: [{ finish_reason: 'stop', message: { content: '[1,2]' } }], usage: { prompt_tokens: 10, completion_tokens: 3 } },
    { id: 'o-f', model: 'gpt-4.1-mini', choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'c9', type: 'function', function: { name: 'grounded_answer', arguments: '{"answer":"fallback"}' } }] } }], usage: { prompt_tokens: 10, completion_tokens: 3 } },
  ] });
  const r = await gerar({ model: 'deepseek-v4-pro', max_tokens: 1024, temperature: 0, system: [{ type: 'text', text: 'S1' }, { type: 'text', text: 'S2' }], messages: [{ role: 'user', content: 'p' }], tools: [FERRAMENTA], tool_choice: { type: 'tool', name: 'grounded_answer' } });
  const q = state.openai[0];
  assert.equal(q.reasoning_effort, 'low');
  assert.deepEqual(q.thinking, { type: 'enabled' });
  assert.deepEqual(q.response_format, { type: 'json_object' });
  assert.equal('tools' in q, false);
  assert.equal('tool_choice' in q, false);
  assert.match(q.messages[0].content, /^S1\n\nS2\n\nFormato de saída obrigatório: responda SOMENTE com um objeto json/);
  assert.ok(q.messages[0].content.includes(JSON.stringify(FERRAMENTA.input_schema)));
  assert.deepEqual(r.content, [{ type: 'tool_use', id: 'json_d-2', name: 'grounded_answer', input: { answer: 'ok', closing: 'Se quiser, eu redijo.' } }]);
  assert.equal(r.stop_reason, 'tool_use');
  // Vazio, texto solto e lista: três falhas seguidas, cai no gpt-4.1-mini com a ferramenta de verdade.
  const f = await gerar({ model: 'deepseek-v4-pro', max_tokens: 1024, system: 'S', messages: [{ role: 'user', content: 'p' }], tools: [FERRAMENTA], tool_choice: { type: 'tool', name: 'grounded_answer' } });
  assert.equal(state.openai.length, 5);
  assert.equal(state.openai[4].model, 'gpt-4.1-mini');
  assert.deepEqual(state.openai[4].tool_choice, { type: 'function', function: { name: 'grounded_answer' } });
  assert.equal(f.fallback.from, 'deepseek-v4-pro');
  assert.deepEqual(f.content[0].input, { answer: 'fallback' });
});

test('DeepSeek: o flash roda sem raciocínio e com a ferramenta de verdade; tool_choice "any" também', async () => {
  reset({ openaiRespostas: [
    { id: 'd-4', model: 'deepseek-flash', choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'grounded_answer', arguments: '{"answer":"ok"}' } }] } }], usage: { prompt_tokens: 10, completion_tokens: 5 } },
    { id: 'd-5', model: 'deepseek-flash', choices: [{ finish_reason: 'stop', message: { content: 'trabalhista' } }], usage: { prompt_tokens: 10, completion_tokens: 2 } },
    { id: 'd-6', model: 'deepseek-v4-pro', choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'c2', type: 'function', function: { name: 'grounded_answer', arguments: '{"answer":"ok"}' } }] } }], usage: { prompt_tokens: 10, completion_tokens: 5 } },
  ] });
  const r = await gerar({ model: 'deepseek-flash', max_tokens: 256, temperature: 0, system: 'S', messages: [{ role: 'user', content: 'p' }], tools: [FERRAMENTA], tool_choice: { type: 'tool', name: 'grounded_answer' } });
  assert.equal(state.openai[0].reasoning_effort, 'none');
  assert.deepEqual(state.openai[0].thinking, { type: 'disabled' });
  assert.deepEqual(state.openai[0].tool_choice, { type: 'function', function: { name: 'grounded_answer' } });
  assert.equal('response_format' in state.openai[0], false);
  assert.deepEqual(r.content, [{ type: 'tool_use', id: 'c1', name: 'grounded_answer', input: { answer: 'ok' } }]);
  await gerar({ model: 'deepseek-flash', max_tokens: 40, temperature: 0, system: 'S', messages: [{ role: 'user', content: 'p' }] });
  assert.equal(state.openai[1].reasoning_effort, 'none');
  assert.equal(state.openai[1].max_tokens, MIN_SAIDA_DEEPSEEK);
  await gerar({ model: 'deepseek-v4-pro', max_tokens: 40, system: 'S', messages: [{ role: 'user', content: 'p' }], tools: [FERRAMENTA], tool_choice: { type: 'any' } });
  assert.equal(state.openai[2].reasoning_effort, 'none');
  assert.equal(state.openai[2].tool_choice, 'required');
});

test('DeepSeek: resposta cortada ou vazia nunca vai ao cliente: tenta de novo e cai no gpt-4.1-mini', async () => {
  const cortada = { id: 'd-4', model: 'deepseek-v4-pro', choices: [{ finish_reason: 'length', message: { content: 'metade de um contr' } }], usage: { prompt_tokens: 10, completion_tokens: 8192 } };
  const vazia = { id: 'd-5', model: 'deepseek-v4-pro', choices: [{ finish_reason: 'stop', message: { content: '' } }], usage: { prompt_tokens: 10, completion_tokens: 0 } };
  reset({ openaiRespostas: [cortada, vazia, cortada] });
  const r = await gerar({ model: 'deepseek-v4-pro', max_tokens: 4096, system: 'S', messages: [{ role: 'user', content: 'redige' }] });
  assert.equal(state.openai.length, 4);
  assert.deepEqual(state.openai.slice(0, 3).map(q => q.model), ['deepseek-v4-pro', 'deepseek-v4-pro', 'deepseek-v4-pro']);
  assert.equal(state.openai[3].model, 'gpt-4.1-mini');
  assert.equal(state.openai[3]._baseURL, null);
  assert.deepEqual(r.content, [{ type: 'text', text: 'RESPOSTA OPENAI' }]);
  assert.equal(r.fallback.from, 'deepseek-v4-pro');
  assert.match(r.fallback.reason, /cortou/);
});
