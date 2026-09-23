const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AREAS, validateAreas } = require('../dist/knowledge/areas.js');
const { parseNotebook } = require('../dist/knowledge/parser.js');
const { prepareDocument, retrieve, fingerprint, cosine } = require('../dist/knowledge/core.js');
const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name + '.md'), 'utf8');
const source = (overrides = {}) => ({ id: 'one', slug: 'civil-contratos', titulo: 'Contrato', area: 'civil', status: 'PUBLICADA', fontes: [], ordem: 0, conteudo: '## Contratos\nAção com acentuação.', ...overrides });

test('áreas: lista exata, vírgulas, desconhecidos, vazios e slug separado', () => {
  assert.equal(AREAS.length, 12);
  for (const area of AREAS) assert.deepEqual(validateAreas(area), [area]);
  assert.deepEqual(validateAreas('civil, consumidor'), ['civil', 'consumidor']);
  for (const area of ['financeiro', 'civil-contratos', '', 'Civil', 'consumo', 'civil,', 'civil, financeiro', null, ['civil']]) assert.throws(() => validateAreas(area));
  assert.equal(parseNotebook(source().conteudo, source().area).length, 1);
});
test('parser: capítulos/subcapítulos sem duplicação, herança e sobrescrita com escopo', () => {
  const text = '## Contratos\n**Área:** consumidor, civil\nIntrodução única\n### A\nTexto A\n### B\n**Área:** autoral\nTexto B\n### C\nTexto C\n## Outro\nTexto D\n';
  const chunks = parseNotebook(text, 'administrativo');
  assert.deepEqual(chunks.map(c => c.areas), [['consumidor', 'civil'], ['consumidor', 'civil'], ['autoral'], ['consumidor', 'civil'], ['administrativo']]);
  assert.equal(chunks.map(c => c.content).join(''), text);
  assert.ok(!chunks[0].content.includes('Texto A'));
  assert.equal(chunks[2].chapter, 'Contratos');
  assert.equal(chunks[2].subchapter, 'B');
});
test('parser: marcação após prosa só afeta os blocos seguintes', () => {
  const chunks = parseNotebook('## A\nantes\n**Área:** autoral\ndepois\n### B\nsub\n', 'civil');
  assert.deepEqual(chunks.map(c => c.areas), [['civil'], ['autoral'], ['autoral']]);
});
test('parser: metadados/frontmatter, vírgulas e erros localizados', () => {
  assert.deepEqual(parseNotebook('---\narea: civil, consumidor\n---\n## A\ntexto', 'lgpd')[0].areas, ['civil', 'consumidor']);
  assert.throws(() => parseNotebook('## Contratos\n**Área:** civil, financeiro\ntexto', 'civil'), e => e.issues[0].linha === 2 && e.issues[0].capitulo === 'Contratos' && e.issues[0].valor === 'financeiro' && e.issues[0].origem === 'markdown');
  assert.throws(() => parseNotebook('---\narea: civil', 'civil'), /fechamento/);
});
test('parser: cercas de backticks, tildes, código indentado e CRLF opacos', () => {
  for (const fence of ['```', '~~~~']) {
    const text = `## A\r\n${fence}markdown\r\n## Falso\r\n**Área:** financeiro\r\n${fence}\r\n    ### Ignorar\r\n    **Área:** desconhecida\r\nfim\r\n`;
    const chunks = parseNotebook(text, 'civil');
    assert.equal(chunks.length, 1); assert.equal(chunks[0].content, text);
  }
});
test('fixture base-propaganda: módulo autoral sobrescreve consumidor', () => {
  const chunks = parseNotebook(fixture('base-propaganda'), 'consumidor');
  assert.deepEqual(chunks.find(c => c.chapter === 'Direitos sobre criação').areas, ['autoral']);
  assert.deepEqual(chunks.find(c => c.subchapter === 'Uso de imagens').areas, ['autoral']);
});
test('fixture base-guias: seis módulos não acumulam administrativo', () => {
  const chunks = parseNotebook(fixture('base-guias'), 'administrativo').filter(c => c.chapter);
  assert.deepEqual(chunks.filter(c => !c.subchapter).map(c => c.areas[0]), ['civil', 'consumidor', 'empresarial', 'lgpd', 'tributario', 'previdenciario']);
  assert.ok(chunks.every(c => !c.areas.includes('administrativo')));
});
test('arquivos históricos reais: sintaxe observada válida e área antiga rejeitada', () => {
  const root = path.join(__dirname, '../knowledge');
  assert.ok(parseNotebook(fs.readFileSync(path.join(root, '11-lgpd.md'), 'utf8'), 'lgpd').length > 5);
  assert.throws(() => parseNotebook(fs.readFileSync(path.join(root, '04-contratos-geral.md'), 'utf8'), 'civil'), /civil-contratual/);
});
test('busca: área antes de embedding, publicados, cinco, menos, íntegros e sem fallback', async () => {
  const events = [];
  const provider = { model: 'test', classify: async () => { events.push('classify'); return 'civil'; }, embed: async () => { events.push('embed'); return [1, 0]; } };
  const content = 'Ação íntegra: '.repeat(14000);
  const candidates = Array.from({ length: 7 }, (_, i) => ({ id: String(i), content, areas: ['civil'], published: true, vector: [1, i], titulo: 'teste', fontes: [], chapter: '', subchapter: null }));
  const load = async (area, model) => { events.push('filter'); assert.equal(area, 'civil'); assert.equal(model, 'test'); return [...candidates, { ...candidates[0], id: 'bad-area', areas: ['autoral'], vector: null }, { ...candidates[0], id: 'draft', published: false, vector: null }]; };
  let result = await retrieve('pergunta', provider, load);
  assert.deepEqual(events, ['classify', 'filter', 'embed']);
  assert.equal(result.chunks.length, 5); assert.equal(result.chunks[0].content, content);
  assert.deepEqual(result.chunks.map(c => c.id), ['0', '1', '2', '3', '4']);
  result = await retrieve('pergunta', provider, async () => candidates.slice(0, 2)); assert.equal(result.chunks.length, 2);
  result = await retrieve('pergunta', { ...provider, embed: async () => assert.fail('empty candidates') }, async () => []); assert.equal(result.chunks.length, 0);
  result = await retrieve('?', { ...provider, classify: async () => null }, async () => assert.fail('fallback')); assert.equal(result.chunks.length, 0);
  assert.throws(() => cosine([1], [1, 0]), /DIMENSION/);
});
test('conteúdo grande: >169.000 caracteres, 117 chunks, acentos íntegros', async () => {
  const text = Array.from({ length: 117 }, (_, i) => `## Capítulo ${i}\n${'Ação, coração, proteção e café. '.repeat(52)}\n`).join('');
  assert.ok(text.length >= 169000);
  const chunks = parseNotebook(text, 'civil');
  assert.equal(chunks.length, 117); assert.equal(chunks.map(c => c.content).join(''), text);
  const cache = new Map();
  const prepared = await prepareDocument(source({ conteudo: text }), { model: 'test', embed: async () => [1, 0] }, { get: async id => cache.get(id), put: async (id, model, v) => cache.set(id, v) }, async () => {});
  assert.equal(prepared.document.chunks.map(c => c.content).join(''), text);
});
test('embeddings: reutilização em área/metadados/publicação; conteúdo/modelo invalidam', async () => {
  const cache = new Map(); let calls = 0;
  const provider = { model: 'test', embed: async () => { calls++; return [1, 0]; } };
  const store = { get: async id => cache.get(id), put: async (id, model, v) => cache.set(id, v) };
  const run = s => prepareDocument(s, provider, store, async () => {});
  await run(source()); assert.equal(calls, 1);
  await run(source()); assert.equal(calls, 1);
  await run(source({ area: 'consumidor', titulo: 'Mudou', status: 'RASCUNHO', fontes: ['nova'] })); assert.equal(calls, 1);
  await run(source({ conteudo: source().conteudo + ' novo' })); assert.equal(calls, 2);
  provider.model = 'new'; await run(source()); assert.equal(calls, 3);
  const marked = source({ conteudo: '## A\n**Área:** civil\ntexto' });
  await run(marked); const previous = calls;
  await run({ ...marked, conteudo: marked.conteudo.replace('civil', 'consumidor') }); assert.equal(calls, previous);
  assert.notEqual(fingerprint(source()), fingerprint(source({ status: 'RASCUNHO' })));
});
