const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(__dirname, '../dist');
// Substitui o módulo inteiro: nenhum teste pode abrir conexão com banco real.
const prisma = {
  fichaConhecimento: { findMany: async () => { throw new Error('Consulta não simulada'); } },
  promptConfig: { findUnique: async () => { throw new Error('Consulta não simulada'); } },
};
require.cache[require.resolve(path.join(base, 'db/client.js'))] = { exports: { prisma } };

function fresh(file) {
  const id = path.join(base, file);
  delete require.cache[require.resolve(id)];
  return require(id);
}

test('prompt: rejeita ausente, curto e placeholder, relê edição após 60s', async (t) => {
  let now = 0;
  t.mock.method(Date, 'now', () => now);
  let row = null;
  t.mock.method(prisma.promptConfig, 'findUnique', async () => row);
  const api = fresh('judith/prompts/principal.js');
  await assert.rejects(api.getPromptPrincipal(), /não encontrado/);
  row = { secaoA: 'a'.repeat(1000), secaoB: 'curto', secaoC: 'c'.repeat(1000), versao: 'teste' };
  await assert.rejects(api.getPromptPrincipal(), /inválido/);
  row.secaoB = '[Cole aqui'.padEnd(1100, '.');
  await assert.rejects(api.getPromptPrincipal(), /inválido/);
  row.secaoB = 'b'.repeat(1000);
  assert.equal(await api.getPromptRedacao(), row.secaoB);
  row = { ...row, secaoA: 'novo'.repeat(300), versao: 'teste2' };
  now = 60_000;
  assert.equal(await api.getPromptPrincipal(), row.secaoA);
  assert.equal(await api.getPromptVersao(), 'teste2');
});

test('respostas consultam base somente em duvida e preservam prompts/perfil', async (t) => {
  const envId = require.resolve(path.join(base, 'config/env.js'));
  const sdkId = require.resolve('@anthropic-ai/sdk');
  const oldEnv = require.cache[envId];
  const oldSdk = require.cache[sdkId];
  let request;
  class FakeAnthropic {
    messages = { create: async (input) => {
      request = input;
      return { content: input.tools ? [{type:'tool_use',name:'grounded_answer',input:{scopeAnalysis:'mock scope',unsupported:false,answer:'resposta simulada'}}] : [{type:'text',text:'resposta simulada'}], usage: { input_tokens: 1, output_tokens: 1 } };
    } };
  }
  require.cache[envId] = { exports: { env: { ANTHROPIC_API_KEY: 'fake', JUDITH_MODEL_HAIKU: 'haiku', JUDITH_MODEL_SONNET: 'sonnet' } } };
  require.cache[sdkId] = { exports: FakeAnthropic };
  t.after(() => {
    if (oldEnv) require.cache[envId] = oldEnv; else delete require.cache[envId];
    if (oldSdk) require.cache[sdkId] = oldSdk; else delete require.cache[sdkId];
  });
  t.mock.method(prisma.promptConfig, 'findUnique', async () => ({ secaoA: 'A'.repeat(1000), secaoB: 'B'.repeat(1000), secaoC: 'C'.repeat(1000), versao: 'teste' }));
  t.mock.method(prisma.fichaConhecimento, 'findMany', async () => [{ titulo: 'Referência teste', area: 'teste', fontes: [], conteudo: 'Material de referência teste' }]);
  fresh('judith/prompts/principal.js');
  let searches = 0;
  require.cache[require.resolve(path.join(base, 'judith/conhecimento.js'))] = { exports: { getKnowledgeContext: async question => { searches++; assert.equal(question, 'pergunta simulada'); return {text:'Material de referência teste',area:'civil',searchText:question,chunks:[]}; } } };
  require.cache[require.resolve(path.join(base, 'knowledge/audit.js'))] = {exports:{writeAudit:async()=>{}}};
  require.cache[require.resolve(path.join(base, 'knowledge/support.js'))] = {exports:{verifySupport:async()=>({supported:true}),SUPPORT_POLICY_VERSION:'test'}};
  const { askJudith } = fresh('judith/claude.js');
  for (const funcao of ['duvida', 'redacao', 'analise']) {
    const result = await askJudith({ tier: 'HAIKU', funcao, user: null, history: [], userMessage: 'pergunta simulada' });
    assert.equal(result.text, 'resposta simulada');
    assert.equal(request.system[0].text, 'A'.repeat(1000));
    if (funcao !== 'duvida') assert.equal(request.system[1].text, (funcao === 'redacao' ? 'B' : 'C').repeat(1000));
    assert.equal(request.system.some(b => b.text.includes('Material de referência teste')), funcao === 'duvida');
    assert.equal(searches, 1);
    const offset = funcao === 'duvida' ? 1 : 0;
    assert.deepEqual(request.system.at(-2-offset).cache_control, { type: 'ephemeral' });
    assert.match(request.system.at(-1-offset).text, /Perfil do usuário/);
    assert.equal(request.system.some(b => b.text.includes('Contrato técnico de geração')), funcao === 'duvida');
  }
  for (const history of [[], [{ role: 'assistant', content: 'Órfã 1' }, { role: 'assistant', content: 'Órfã 2' }], [{ role: 'assistant', content: 'Órfã' }, { role: 'user', content: 'Pergunta sem resposta' }, { role: 'user', content: 'Outra pergunta' }]]) {
    const before = structuredClone(history);
    await askJudith({ tier: 'HAIKU', funcao: 'duvida', user: null, history, userMessage: 'pergunta simulada' });
    assert.equal(request.messages[0].role, 'user');
    assert.ok(request.messages.every(m => !m.content.startsWith('Órfã')));
    assert.deepEqual(request.messages.slice(0, -1), []); // History is used by retrieval, not repeated into generation.
    assert.deepEqual(request.messages.at(-1), { role: 'user', content: 'pergunta simulada' });
    assert.equal(request.messages.filter(m => m.content === 'pergunta simulada').length, 1);
    assert.deepEqual(history, before);
  }
});
