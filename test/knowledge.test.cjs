const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AREAS, validateAreas } = require('../dist/knowledge/areas.js');
const { parseNotebook } = require('../dist/knowledge/parser.js');
const { prepareDocument, retrieve, fingerprint, cosine, vector } = require('../dist/knowledge/core.js');
const { accidentSourceForDefect } = require('../dist/knowledge/scope.js');
const { keywordAreas, parseAreaKeywords } = require('../dist/knowledge/keywords.js');
const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name + '.md'), 'utf8');
const source = (overrides = {}) => ({ id: 'one', slug: 'civil-contratos', titulo: 'Contrato', area: 'civil', status: 'PUBLICADA', fontes: [], ordem: 0, conteudo: '## Contratos\nAção com acentuação.', ...overrides });

test('parser: ignora capa até o primeiro ## real, preservando validação e área inicial', () => {
  const cover = '# Capa\nVersão interna, não indexar.\n### Cabeçalho de capa\n**Área:** lgpd\n```md\n## Falso\n**Área:** penal\n```\n';
  const body = '## Direitos\nTexto integral.\n### Acesso\nOutro bloco.\n';
  const chunks = parseNotebook(cover + body, 'civil');
  assert.equal(chunks.length, 2);
  assert.equal(chunks.map(c => c.content).join(''), body);
  assert.ok(chunks.every(c => c.areas.join() === 'lgpd'));
  assert.equal(chunks[0].line, cover.split('\n').length);
  assert.throws(() => parseNotebook(cover, 'civil'), /capítulo iniciado por ##/);
  assert.throws(() => parseNotebook('Capa\n**Área:** penal\n## A\nTexto', 'civil'), /penal/);
});

test('busca: continuação envia histórico ao classificador e ao embedding, mantendo filtro', async () => {
  const history = [{ role: 'user', content: 'Quero excluir meus dados pessoais pela LGPD.' }, { role: 'assistant', content: 'Qual foi o pedido enviado?' }];
  const question = 'E se recusarem?';
  const events = [];
  const result = await retrieve(question, {
    model: 'test',
    contextualize: async (q, h) => { assert.equal(q, question); assert.deepEqual(h, [history[0]]); return q + '\nContexto informado pelo usuário: ' + h[0].content; },
    classify: async q => { assert.ok(q.startsWith(question)); events.push('classify'); return 'lgpd'; },
    embed: async (q, kind) => { assert.ok(q.startsWith(question)); assert.ok(!q.includes(history[1].content)); assert.equal(kind, 'query'); events.push('embed'); return [1, 0]; },
  }, async area => { assert.equal(area, 'lgpd'); events.push('filter'); return [{ id: 'a', areas: ['lgpd'], published: true, vector: [1, 0], content: 'Bloco integral' }]; }, history);
  assert.deepEqual(events, ['classify', 'filter', 'embed']); assert.equal(result.chunks[0].content, 'Bloco integral');
});

test('consulta curta só no embedding; classificação mantém referência e seleção continua limitada a cinco na área', async () => {
  const resolvedQuestion='E qual é o prazo?\nContexto informado pelo usuário: Comprei pela internet e quero desistir.';
  const searchText='prazo desistir pela internet',events=[];
  const result=await retrieve('E qual é o prazo?',{
    model:'test',contextualize:async()=>({resolvedQuestion,searchText}),
    classify:async q=>{assert.equal(q,resolvedQuestion);events.push('classify');return 'consumidor'},
    embed:async q=>{assert.equal(q,searchText);events.push('embed');return [1,0]},
  },async area=>{assert.equal(area,'consumidor');events.push('filter');return Array.from({length:7},(_,i)=>({id:String(i),areas:['consumidor'],published:true,vector:[1,i/10],content:'Inteiro '+i})).concat([{id:'other',areas:['civil'],published:true,vector:[1,0],content:'Proibido'}])},[{role:'user',content:'Comprei pela internet e quero desistir.'}]);
  assert.deepEqual(events,['classify','filter','embed']);assert.equal(result.chunks.length,5);assert.equal(result.resolvedQuestion,resolvedQuestion);assert.ok(result.chunks.every(c=>c.content.startsWith('Inteiro')));
});

test('escopo: acidente não fundamenta vício; não exclui capítulos pertinentes nem perguntas sobre acidente ou comparação', () => {
  assert.equal(accidentSourceForDefect('Quem responde pelo vício do produto?','CHUNK 4 — RESPONSABILIDADE POR ACIDENTE DE CONSUMO'),true);
  assert.equal(accidentSourceForDefect('Quem responde pelo vício do produto?','Q&A — VÍCIO DO PRODUTO'),false);
  assert.equal(accidentSourceForDefect('Quem responde pelo vício do produto?','COMPLEMENTO STJ — Consumidor'),false);
  assert.equal(accidentSourceForDefect('Quem responde pelo acidente de consumo?','CHUNK 4 — RESPONSABILIDADE POR ACIDENTE DE CONSUMO'),false);
  assert.equal(accidentSourceForDefect('Compare vício e acidente de consumo.','CHUNK 4 — RESPONSABILIDADE POR ACIDENTE DE CONSUMO'),false);
});

test('áreas: lista exata, vírgulas, desconhecidos, vazios e slug separado', () => {
  assert.equal(AREAS.length, 12);
  for (const area of AREAS) assert.deepEqual(validateAreas(area), [area]);
  assert.deepEqual(validateAreas('civil, consumidor'), ['civil', 'consumidor']);
  for (const area of ['financeiro', 'civil-contratos', '', 'Civil', 'consumo', 'civil,', 'civil, financeiro', null, ['civil']]) assert.throws(() => validateAreas(area));
  assert.equal(parseNotebook(source().conteudo, source().area).length, 1);
});
test('MariaDB: vetores JSON em LONGTEXT e valores inválidos', () => {
  assert.deepEqual(vector('[1,0]'), [1, 0]);
  for (const value of ['invalid', '{}', '[]', '[0,0]', '[null,1]']) assert.throws(() => vector(value), /INVALID_VECTOR/);
});
test('parser: capítulos/subcapítulos sem duplicação, herança e sobrescrita com escopo', () => {
  const text = '## Contratos\n**Área:** consumidor, civil\nIntrodução única\n### A\nTexto A\n### B\n**Área:** autoral\nTexto B\n### C\nTexto C\n## Outro\nTexto D\n';
  const chunks = parseNotebook(text, 'administrativo');
  // Chapter marker holds "dali pra baixo" until another marker; the ### marker stays in its subchapter.
  assert.deepEqual(chunks.map(c => c.areas), [['consumidor', 'civil'], ['consumidor', 'civil'], ['autoral'], ['consumidor', 'civil'], ['consumidor', 'civil']]);
  assert.equal(chunks.map(c => c.content).join(''), text);
  assert.ok(!chunks[0].content.includes('Texto A'));
  assert.equal(chunks[2].chapter, 'Contratos');
  assert.equal(chunks[2].subchapter, 'B');
});
test('parser: marcação de módulo vale para capítulos seguintes até outra marcação (caso Módulo 4 de base-guias)', () => {
  const text = '## MÓDULO 3\n**Área:** civil, empresarial\nProtesto.\n## MÓDULO 4\n**Área:** empresarial, tributario, administrativo\nIntrodução.\n## Tipos de empresa\nMEI, ME, EPP.\n## Regimes tributários\nSimples.\n### Detalhe\nAnexos.\n## MÓDULO 5\n**Área:** empresarial, administrativo\nEncerramento.\n';
  const chunks = parseNotebook(text, 'administrativo');
  assert.deepEqual(chunks.map(c => [c.chapter, c.subchapter, c.areas.join(',')]), [
    ['MÓDULO 3', null, 'civil,empresarial'],
    ['MÓDULO 4', null, 'empresarial,tributario,administrativo'],
    ['Tipos de empresa', null, 'empresarial,tributario,administrativo'],
    ['Regimes tributários', null, 'empresarial,tributario,administrativo'],
    ['Regimes tributários', 'Detalhe', 'empresarial,tributario,administrativo'],
    ['MÓDULO 5', null, 'empresarial,administrativo'],
  ]);
  // Without any marker the notebook field stays the default everywhere.
  assert.ok(parseNotebook('## A\nx\n## B\ny\n', 'eca').every(c => c.areas.join() === 'eca'));
  // An explicit return to the default is written as another marker.
  assert.deepEqual(parseNotebook('## A\n**Área:** lgpd\nx\n## B\n**Área:** eca\ny\n', 'eca').map(c => c.areas.join()), ['lgpd', 'eca']);
});
test('parser: blocos só com títulos, separadores ou marcações não viram chunks', () => {
  const text = '# Título do caderno\n\n**Área:** consumidor\n\n---\n\n## Módulo\n**Área:** autoral\n\n***\n### Sub\nConteúdo real.\n\n---\n## Vazio\n## Final\n- item\n';
  const chunks = parseNotebook(text, 'consumidor');
  assert.deepEqual(chunks.map(c => [c.chapter, c.subchapter, c.areas.join()]), [['Módulo', 'Sub', 'autoral'], ['Final', null, 'autoral']]);
  // Titles stay available as context of the blocks with content; separators after content are kept.
  assert.equal(chunks[0].content, '### Sub\nConteúdo real.\n\n---\n');
  assert.ok(chunks.every(c => c.semanticText.trim()));
  // Substantive text is never dropped: every non-structural line is in exactly one chunk.
  const substantive = text.split('\n').filter(l => l.trim() && !/^#|^(-{3,}|\*{3,})$|^\*\*Área/.test(l));
  for (const l of substantive) assert.equal(chunks.filter(c => c.content.split('\n').includes(l)).length, 1, l);
  // Code and lists count as content.
  assert.equal(parseNotebook('## A\n```\n---\n```\n', 'civil').length, 1);
  assert.equal(parseNotebook('## A\n**Negrito**\n', 'civil').length, 1);
});
test('parser: todos os erros de área com linha e capítulo', () => {
  assert.throws(() => parseNotebook('## A\n**Área:** tributário\nx\n## B\n**Área:** penal\ny\n### C\n**Área:** civil, empresarial-tributario\nz\n', 'civil, financeiro'), e => {
    assert.deepEqual(e.issues.map(i => [i.origem, i.valor, i.linha, i.capitulo]), [
      ['metadados', 'financeiro', undefined, undefined],
      ['markdown', 'tributário', 2, 'A'],
      ['markdown', 'penal', 5, 'B'],
      ['markdown', 'empresarial-tributario', 8, 'B'],
    ]);
    return true;
  });
});
test('parser: marcação após prosa só afeta os blocos seguintes', () => {
  const chunks = parseNotebook('## A\nantes\n**Área:** autoral\ndepois\n### B\nsub\n', 'civil');
  assert.deepEqual(chunks.map(c => c.areas), [['civil'], ['autoral'], ['autoral']]);
});
test('parser: aceita marcação no estilo WhatsApp (*Área:* e *Área*:)', () => {
  const chunks = parseNotebook('## A\n*Área:* consumidor\ntexto\n## B\n*Area*: lgpd\ntexto\n## C\n**Área:** autoral\ntexto\n', 'civil');
  assert.deepEqual(chunks.map(c => c.areas), [['consumidor'], ['lgpd'], ['autoral']]);
  assert.ok(!chunks[0].semanticText.includes('Área'));
  assert.throws(() => parseNotebook('## A\n*Área:* civil-imobiliario\ntexto', 'civil'), e => e.issues[0].valor === 'civil-imobiliario' && e.issues[0].linha === 2);
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

test('parser: Área do bloco vale só para o bloco onde está, sem mudar os seguintes', () => {
  const text = '## A\nTexto A\n## B\n*Área do bloco:* administrativo, ambiental\nTexto B\n## C\nTexto C\n### C1\n**Área do bloco:** eca\nSub C1\n### C2\nSub C2\n## D\n**Área:** lgpd\nTexto D\n## E\nÁrea do bloco: civil\nTexto E\n## F\nTexto F\n';
  const chunks = parseNotebook(text, 'administrativo');
  assert.deepEqual(chunks.map(c => [c.chapter, c.subchapter, c.areas.join(',')]), [
    ['A', null, 'administrativo'], ['B', null, 'administrativo,ambiental'], ['C', null, 'administrativo'],
    ['C', 'C1', 'eca'], ['C', 'C2', 'administrativo'], ['D', null, 'lgpd'], ['E', null, 'civil'], ['F', null, 'lgpd'],
  ]);
  assert.equal(chunks.map(c => c.content).join(''), text);
  assert.ok(!chunks[1].semanticText.includes('Área do bloco'));
  // Marker placed after the block text still belongs to that block only.
  assert.deepEqual(parseNotebook('## A\ntexto\n**Área do bloco:** eca\n## B\nmais\n', 'civil').map(c => c.areas.join()), ['eca', 'civil']);
  assert.throws(() => parseNotebook('## A\n**Área do bloco:** penal\ntexto', 'civil'), e => e.issues[0].valor === 'penal' && e.issues[0].linha === 2);
  assert.throws(() => parseNotebook('Capa\n**Área do bloco:** civil\n## A\ntexto', 'civil'), /dentro de um bloco/);
});

test('busca: continuação vaga sem área classificada usa a área da pergunta anterior', async () => {
  const load = async area => [{ id: 'x', areas: [area], published: true, vector: [1, 0], content: 'Bloco ' + area }];
  const base = { model: 'test', classify: async () => null, embed: async () => [1, 0] };
  const history = [{ role: 'user', content: 'Meu cliente não pagou a duplicata.' }];
  // Depends on history (contextualized) -> previous area.
  let result = await retrieve('E se ele não pagar?', { ...base, contextualize: async q => q + '\nContexto informado pelo usuário: duplicata' }, load, history, { previousArea: 'empresarial' });
  assert.equal(result.area, 'empresarial'); assert.equal(result.areaSource, 'previous'); assert.equal(result.chunks.length, 1);
  // Self-contained question keeps "no area".
  result = await retrieve('Qual a previsão do tempo?', { ...base, contextualize: async q => q }, load, history, { previousArea: 'empresarial' });
  assert.equal(result.area, null); assert.equal(result.chunks.length, 0);
  // Classifier result wins over the previous area.
  result = await retrieve('E sobre dados pessoais?', { ...base, classify: async () => 'lgpd', contextualize: async q => q + '\nContexto' }, load, history, { previousArea: 'empresarial' });
  assert.equal(result.area, 'lgpd'); assert.equal(result.areaSource, 'classifier');
  // No previous area -> nothing to reuse.
  result = await retrieve('E se ele não pagar?', { ...base, contextualize: async q => q + '\nContexto' }, load, history, { previousArea: null });
  assert.equal(result.area, null);
});

test('palavras-chave: sem acento, sem caixa, início de palavra; lista inválida é ignorada', () => {
  const kw = parseAreaKeywords({ empresarial: ['duplicata', 'título de crédito', ''], trabalhista: ['CLT', 'rescisão'], financeiro: ['x'], consumidor: 'nao-lista' });
  assert.deepEqual(kw, { empresarial: ['duplicata', 'título de crédito'], trabalhista: ['CLT', 'rescisão'] });
  assert.deepEqual(keywordAreas('Emiti DUPLICATAS e o cliente não pagou', kw), ['empresarial']);
  assert.deepEqual(keywordAreas('É um titulo de credito?', kw), ['empresarial']);
  assert.deepEqual(keywordAreas('Rescisao pela clt e duplicata', kw), ['empresarial', 'trabalhista']);
  // Must start a word: "clt" inside another word does not match.
  assert.deepEqual(keywordAreas('ecltico', kw), []);
  assert.deepEqual(parseAreaKeywords(null), {}); assert.deepEqual(parseAreaKeywords(['empresarial']), {});
});

test('busca: palavras-chave somam área ao classificador e cobrem quando ele não acha', async () => {
  const loads = [];
  const load = async area => { loads.push(area); return [
    { id: area + '-1', areas: [area], published: true, vector: [1, area === 'empresarial' ? 0 : 1], content: area },
    { id: 'shared', areas: [area], published: true, vector: [1, 0.5], content: 'mesmo bloco em duas áreas' },
  ]; };
  const provider = { model: 'test', classify: async () => 'civil', embed: async () => [1, 0] };
  const keywords = { empresarial: ['duplicata'] };
  let result = await retrieve('O cliente não pagou a duplicata', provider, load, [], { keywords });
  assert.deepEqual(result.areas, ['civil', 'empresarial']); assert.equal(result.area, 'civil'); assert.equal(result.areaSource, 'classifier');
  assert.deepEqual(result.addedByKeywords, ['empresarial']); assert.deepEqual(loads, ['civil', 'empresarial']);
  assert.deepEqual(result.chunks.map(c => c.id).sort(), ['civil-1', 'empresarial-1', 'shared']);
  // Classifier already returned the keyword area: no duplicate.
  result = await retrieve('duplicata', { ...provider, classify: async () => 'empresarial' }, load, [], { keywords });
  assert.deepEqual(result.areas, ['empresarial']); assert.deepEqual(result.addedByKeywords, []);
  // Classifier finds nothing: keywords supply the area.
  result = await retrieve('duplicata vencida', { ...provider, classify: async () => null }, load, [], { keywords });
  assert.deepEqual(result.areas, ['empresarial']); assert.equal(result.areaSource, 'keywords');
  // No match, no area.
  result = await retrieve('previsão do tempo', { ...provider, classify: async () => null }, async () => assert.fail('load'), [], { keywords });
  assert.equal(result.area, null); assert.deepEqual(result.areas, []);
});

test('busca: continuação curta com seleção rejeitada usa a mensagem anterior literal e a área anterior', async () => {
  const { KnowledgeSearchError } = require('../dist/knowledge/errors.js');
  const history = [{ role: 'user', content: 'Emiti uma duplicata e o cliente não pagou.' }, { role: 'assistant', content: 'Resposta que não pode virar contexto.' }];
  const seen = [];
  const provider = { model: 'test', contextualize: async () => { throw new KnowledgeSearchError('CLASSIFICATION_INVALID'); },
    classify: async q => { seen.push(q); return null; }, embed: async q => { seen.push(q); return [1, 0]; } };
  const load = async area => [{ id: 'x', areas: [area], published: true, vector: [1, 0], content: 'bloco' }];
  const result = await retrieve('E aí?', provider, load, history, { previousArea: 'empresarial' });
  assert.equal(result.resolvedQuestion, 'E aí?\nContexto informado pelo usuário: Emiti uma duplicata e o cliente não pagou.');
  assert.equal(result.area, 'empresarial'); assert.equal(result.areaSource, 'previous'); assert.equal(result.chunks.length, 1);
  assert.ok(seen.every(q => !q.includes('Resposta que não pode')));
  // Other failures still propagate.
  await assert.rejects(retrieve('E aí?', { ...provider, contextualize: async () => { throw new Error('rede'); } }, load, history), /rede/);
});

test('feedback: significado das reações, com tom de pele e variação', () => {
  const { reactionMeaning } = require('../dist/knowledge/feedback.js');
  for (const e of ['👍', '👍🏾', '❤️', '🙏', '✅']) assert.equal(reactionMeaning(e), true, e);
  for (const e of ['👎', '👎🏻', '😡', '❌']) assert.equal(reactionMeaning(e), false, e);
  for (const e of ['😂', '🤔', 'x']) assert.equal(reactionMeaning(e), null, e);
});
