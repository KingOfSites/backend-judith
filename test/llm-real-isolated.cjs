// Fumaça com fornecedores REAIS. Não roda no `npm test`. Sem banco e sem WhatsApp.
// Uso: GEMINI_API_KEY=... OPENAI_API_KEY=... node test/llm-real-isolated.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(process.env.JUDITH_TEST_DIST || path.join(__dirname, '../dist')) + path.sep;
const replace = (id, exports) => { require.cache[require.resolve(id)] = { id: require.resolve(id), filename: require.resolve(id), loaded: true, exports }; };

replace(base + 'config/env.js', { env: {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  JUDITH_MODEL_HAIKU: process.env.JUDITH_MODEL_HAIKU || 'gemini-3.8-flash',
  JUDITH_MODEL_SONNET: process.env.JUDITH_MODEL_SONNET || 'gpt-4.1',
  JUDITH_MODEL_FALLBACK: process.env.JUDITH_MODEL_FALLBACK || 'gpt-4.1-mini',
  LOCAL_EMBEDDINGS_URL: 'http://127.0.0.1:9',
} });
replace(base + 'db/client.js', { prisma: {} });

const { gerar } = require(base + 'llm/client.js');
const { createProvider } = require(base + 'knowledge/provider.js');
const { verifySupport } = require(base + 'knowledge/support.js');
const { classificarTipo, classificarTurno } = require(base + 'regras/classificador.js');

const resultados = [];
async function caso(nome, fn) {
  const t = Date.now();
  try { const detalhe = await fn(); resultados.push({ nome, ok: true, ms: Date.now() - t, detalhe }); }
  catch (e) { resultados.push({ nome, ok: false, ms: Date.now() - t, erro: String(e && e.message || e).slice(0, 300), extra: e && e.verificationMetrics }); }
}

const FONTE = [
  'O consumidor pode desistir da compra feita fora do estabelecimento comercial.',
  'O prazo de arrependimento é de 7 dias, contados da assinatura do contrato ou do recebimento do produto.',
  'Exercido o arrependimento, os valores pagos devem ser devolvidos de imediato, com correção monetária.',
].join('\n');
const CHUNKS = [{ id: 'chunk-1', sourceId: 'caderno-consumidor', version: 1, titulo: 'Consumidor', areas: ['consumidor'], chapter: 'Direito de arrependimento', subchapter: null, fontes: ['CDC art. 49'], content: FONTE, score: 0.9 }];
const SNAPSHOT = { habilitadas: true, regras: [], config: {}, tipos: ['locacao_comercial', 'prestacao_servico', 'confissao_divida', 'franquia', 'nda'].map(e => ({ etiqueta: e, nome: e, composicao: [], analise: [], composicaoExtras: [], analiseExtras: [], desviaRedacao: false, mensagemDesvio: null })) };

(async () => {
  const p = createProvider();

  await caso('área: compra pela internet → consumidor', async () => {
    const a = await p.classify('Comprei um produto pela internet e quero devolver, posso?');
    assert.equal(a, 'consumidor'); return a;
  });
  await caso('área: pergunta sem tema jurídico → nenhuma', async () => {
    const a = await p.classify('qual a previsão do tempo pra amanhã?');
    assert.equal(a, null); return 'nenhuma';
  });
  await caso('contexto: continuação vaga usa a pergunta anterior', async () => {
    const r = await p.contextualize('e qual o prazo pra isso?', [{ role: 'user', content: 'Comprei um sofá pela internet e quero desistir da compra' }]);
    assert.equal(typeof r, 'object'); assert.match(r.resolvedQuestion, /Contexto informado pelo usuário/); return r.searchText;
  });
  await caso('contexto: pergunta autossuficiente não mexe', async () => {
    const q = 'Qual o prazo de arrependimento em compra pela internet?';
    const r = await p.contextualize(q, [{ role: 'user', content: 'como abro um MEI?' }]);
    assert.equal(r, q); return 'inalterada';
  });

  let resposta = '';
  await caso('dúvida: resposta fundamentada por ferramenta forçada (Gemini)', async () => {
    const r = await gerar({
      model: 'gemini-3.8-flash', max_tokens: 1024, temperature: 0,
      system: [{ type: 'text', text: 'Você é a JUDITH, assistente jurídica. Responda só com base nas fontes.' }, { type: 'text', text: `# Base\nCapítulo: Direito de arrependimento\n\n${FONTE}` }],
      messages: [{ role: 'user', content: 'Qual o prazo para desistir de uma compra feita pela internet?' }],
      tools: [{ name: 'grounded_answer', description: 'Resposta substantiva curta somente à pergunta atual.', input_schema: { type: 'object', properties: { scopeAnalysis: { type: 'string' }, unsupported: { type: 'boolean' }, answer: { type: 'string' } }, required: ['scopeAnalysis', 'unsupported', 'answer'], additionalProperties: false } }],
      tool_choice: { type: 'tool', name: 'grounded_answer' },
    });
    const b = r.content.filter(x => x.type === 'tool_use' && x.name === 'grounded_answer');
    assert.equal(b.length, 1);
    assert.equal(typeof b[0].input.scopeAnalysis, 'string');
    assert.equal(b[0].input.unsupported, false);
    assert.match(b[0].input.answer, /7 dias/);
    resposta = b[0].input.answer;
    return { answer: resposta, modelo: r.model, uso: r.usage };
  });

  await caso('auditoria: resposta fiel à fonte é aprovada', async () => {
    const v = await verifySupport('Qual o prazo para desistir de uma compra feita pela internet?', [], 'O prazo de arrependimento é de 7 dias, contados da assinatura do contrato ou do recebimento do produto.', CHUNKS);
    assert.equal(v.supported, true); return { modelo: v.model, evidencias: v.evidence, latencia: v.metrics.latencyMs };
  });
  await caso('auditoria: a resposta que o próprio Gemini gerou passa', async () => {
    const v = await verifySupport('Qual o prazo para desistir de uma compra feita pela internet?', [], resposta, CHUNKS);
    assert.equal(v.supported, true); return { latencia: v.metrics.latencyMs };
  });
  await caso('auditoria: prazo inventado é reprovado', async () => {
    const v = await verifySupport('Qual o prazo para desistir?', [], 'O prazo de arrependimento é de 30 dias e a loja pode cobrar multa de 10%.', CHUNKS);
    assert.equal(v.supported, false); return { feedback: v.feedback.map(f => f.reason) };
  });
  await caso('auditoria: acréscimo de precedência sem fonte é reprovado', async () => {
    const v = await verifySupport('Qual o prazo para desistir?', [], 'O prazo é de 7 dias, contados da assinatura ou do recebimento, o que ocorrer por último.', CHUNKS);
    assert.equal(v.supported, false); return 'reprovada';
  });

  await caso('tipo: aluguel de sala → locacao_comercial', async () => {
    const r = await classificarTipo(SNAPSHOT, 'preciso de um contrato pra alugar minha sala comercial pra um dentista');
    assert.equal(r.tipo, 'locacao_comercial'); return r;
  });
  await caso('tipo: classifica pela função, não pelo nome', async () => {
    const r = await classificarTipo(SNAPSHOT, 'quero um "termo de ciência" onde o cliente reconhece que me deve R$ 3.000 do serviço já feito e vai pagar em 6 parcelas');
    assert.equal(r.tipo, 'confissao_divida'); return r;
  });
  await caso('tipo: nada serve → outro', async () => {
    const r = await classificarTipo(SNAPSHOT, 'quero um testamento deixando meus bens pros meus filhos');
    assert.equal(r.tipo, 'outro'); return r;
  });
  await caso('turno: "então escreve pra mim" depois da análise → redacao', async () => {
    const t = await classificarTurno(SNAPSHOT, 'analise', 'então escreve pra mim essa cláusula que tá faltando', [{ role: 'user', content: 'analisa esse contrato de aluguel' }, { role: 'assistant', content: 'Não vi nenhuma previsão sobre multa por atraso. Pode valer incluir.' }]);
    assert.equal(t, 'redacao'); return t;
  });
  await caso('turno: dado da coleta → continua', async () => {
    const t = await classificarTurno(SNAPSHOT, 'redacao', 'João da Silva, CPF 000.000.000-00, mora na Rua das Flores 10', [{ role: 'assistant', content: 'Preciso do nome completo, CPF e endereço do locatário.' }]);
    assert.equal(t, 'continua'); return t;
  });
  await caso('turno: desistência → abandona', async () => {
    const t = await classificarTurno(SNAPSHOT, 'redacao', 'deixa pra lá, não vou mais precisar desse contrato', []);
    assert.equal(t, 'abandona'); return t;
  });

  await caso('redação: GPT-4.1 com seções em blocos', async () => {
    const r = await gerar({
      model: 'gpt-4.1', max_tokens: 300,
      system: [{ type: 'text', text: 'Você é a JUDITH, assistente jurídica. Linguagem simples.', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'Ao redigir, use [A PREENCHER] para dado não informado.' }, { type: 'text', text: 'Perfil do usuário:\n- Tipo: MEI' }],
      messages: [{ role: 'user', content: 'redige só a cláusula de foro de um contrato de prestação de serviço, sem informar a cidade' }],
    });
    const texto = r.content.filter(b => b.type === 'text').map(b => b.text).join('');
    assert.match(texto, /foro/i); assert.match(texto, /A PREENCHER/);
    return { modelo: r.model, uso: r.usage, trecho: texto.slice(0, 160) };
  });
  await caso('fallback real: modelo Gemini inexistente não é transitório, falha visível', async () => {
    await assert.rejects(gerar({ model: 'gemini-modelo-que-nao-existe', max_tokens: 10, messages: [{ role: 'user', content: 'oi' }] }, { maxRetries: 0 }), /Gemini 404/);
    return 'erro 404 propagado, sem resposta inventada';
  });

  for (const r of resultados) console.log(`${r.ok ? 'OK    ' : 'FALHOU'} ${String(r.ms).padStart(5)}ms  ${r.nome}${r.ok ? '' : '\n        ' + r.erro + (r.extra ? ' ' + JSON.stringify(r.extra) : '')}`);
  console.log('\nDETALHES:', JSON.stringify(resultados.filter(r => r.ok).map(r => ({ [r.nome]: r.detalhe })), null, 1).slice(0, 3500));
  const falhas = resultados.filter(r => !r.ok).length;
  console.log(`\n${resultados.length - falhas} de ${resultados.length} passaram`);
  process.exit(falhas ? 1 : 0);
})();
