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

test('fichas: filtro de publicação, fontes, cache, edição e despublicação', async (t) => {
  let now = 0;
  t.mock.method(Date, 'now', () => now);
  let rows = [{ titulo: 'Ficha teste', area: 'teste', fontes: ['Fonte teste', 42], conteudo: 'Conteúdo inicial' }];
  let reads = 0;
  t.mock.method(prisma.fichaConhecimento, 'findMany', async (query) => {
    reads++;
    assert.deepEqual(query.where, { status: 'PUBLICADA' });
    assert.deepEqual(query.orderBy, [{ ordem: 'asc' }, { titulo: 'asc' }, { id: 'asc' }]);
    return rows;
  });
  const { getBaseConhecimento } = fresh('judith/conhecimento.js');
  const initial = await getBaseConhecimento();
  assert.match(initial, /Conteúdo inicial/);
  assert.match(initial, /Fonte teste/);
  assert.doesNotMatch(initial, /42/);
  rows = [{ ...rows[0], conteudo: 'Conteúdo editado' }];
  now = 59_999;
  assert.equal(await getBaseConhecimento(), initial);
  assert.equal(reads, 1);
  now = 60_000;
  assert.match(await getBaseConhecimento(), /Conteúdo editado/);
  rows = [];
  now = 120_000;
  assert.equal(await getBaseConhecimento(), '');
  assert.equal(reads, 3);
});

test('fichas: não usa conteúdo desatualizado quando a consulta falha', async (t) => {
  t.mock.method(prisma.fichaConhecimento, 'findMany', async () => { throw new Error('banco indisponível'); });
  await assert.rejects(fresh('judith/conhecimento.js').getBaseConhecimento(), /banco indisponível/);
});

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

test('respostas incluem fichas em dúvida, redação e análise antes do perfil', async (t) => {
  const envId = require.resolve(path.join(base, 'config/env.js'));
  const sdkId = require.resolve('@anthropic-ai/sdk');
  const oldEnv = require.cache[envId];
  const oldSdk = require.cache[sdkId];
  let request;
  class FakeAnthropic {
    messages = { create: async (input) => {
      request = input;
      return { content: [{ type: 'text', text: 'resposta simulada' }], usage: { input_tokens: 1, output_tokens: 1 } };
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
  fresh('judith/conhecimento.js');
  const { askJudith } = fresh('judith/claude.js');
  for (const funcao of ['duvida', 'redacao', 'analise']) {
    const result = await askJudith({ tier: 'HAIKU', funcao, user: null, history: [], userMessage: 'pergunta simulada' });
    assert.equal(result.text, 'resposta simulada');
    assert.equal(request.system[0].text, 'A'.repeat(1000));
    if (funcao !== 'duvida') assert.equal(request.system[1].text, (funcao === 'redacao' ? 'B' : 'C').repeat(1000));
    assert.match(request.system.at(-2).text, /Material de referência teste/);
    assert.deepEqual(request.system.at(-2).cache_control, { type: 'ephemeral' });
    assert.match(request.system.at(-1).text, /Perfil do usuário/);
  }
});
