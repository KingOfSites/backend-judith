const fs = require('node:fs');
const path = require('node:path');
const { hash, plan } = require('./knowledge-import.cjs');
const inventory = JSON.parse(fs.readFileSync('docs/evidence/2026-09-24/inventory.json', 'utf8').replace(/^\uFEFF/, ''));
const destination = 'review/knowledge-2026-09-24';
if (fs.existsSync(destination)) throw Error('Destination already exists; refusing to overwrite review work');
// Verify every source before creating the batch.
const sources = inventory.notebooks.map(item => {
  const bytes = fs.readFileSync(path.join(inventory.directory, item.name));
  if (hash(bytes) !== item.sha256) throw Error('Original changed: ' + item.name);
  return { item, bytes };
});
fs.mkdirSync(path.join(destination, 'originals'), { recursive: true });
fs.mkdirSync(path.join(destination, 'candidates'));
const candidates = sources.map(({ item, bytes }, index) => {
  const original = bytes.toString('utf8');
  let content = original;
  const changes = [];
  function replaceExactly(from, to, originalLine) {
    if (content.split(from).length !== 2) throw Error('Expected exactly one approved edit');
    content = content.replace(from, to);
    changes.push({ originalLine, before: from, after: to });
  }
  if (item.name === 'JUDITH-base-guias-v1.md') {
    const marker = original.split('\n')[4].replace(/\r$/, '');
    const split = marker.indexOf(' *(');
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    replaceExactly(marker, marker.slice(0, split) + newline + newline + marker.slice(split + 1), 5);
    replaceExactly('**Área:** empresarial, tributário, administrativo', '**Área:** empresarial, tributario, administrativo', 105);
  }
  if (item.name === 'JUDITH-resumo-direito-autoral-v1.md') replaceExactly('**Área:** direito-autoral', '**Área:** autoral', 7);
  fs.writeFileSync(path.join(destination, 'originals', item.name), bytes);
  fs.writeFileSync(path.join(destination, 'candidates', item.name), content);
  const lines = content.split(/\r?\n/);
  const titleLine = lines.findIndex(line => /^# /.test(line));
  const areaLine = lines.findIndex(line => /^\*\*Área:\*\*/.test(line));
  if (titleLine < 0 || areaLine < 0) throw Error('Missing explicit title/area');
  // Only cover/header citations; do not invent a full bibliography from body references.
  const citations = lines.slice(0, Math.max(areaLine + 1, 10)).flatMap((line, i) => {
    const match = /(?:\*\*)?(?:Fontes?(?: primária| complementares)?|Base|Legislação de referência):(?:\*\*)?\s*(.+)/i.exec(line);
    return match ? [{ line: i + 1, raw: line, value: match[1].trim() }] : [];
  });
  if (item.name === 'JUDITH-base-propaganda-v1.md') citations.push({ line: 3, raw: lines[2],
    value: lines[2].replace(/^\*\*|\*\*$/g, ''), note: 'Explicit header reference without Fonte label; retained literally' });
  return { file: item.name, originalSha256: item.sha256, candidateSha256: hash(content), changes,
    blocked: item.name === 'JUDITH-base-propaganda-v1.md',
    metadata: { titulo: lines[titleLine].slice(2).trim(), area: lines[areaLine].replace(/^\*\*Área:\*\*\s*/, '').trim(),
      slug: item.name.replace(/^JUDITH-/, '').replace(/-v\d+\.md$/, ''), fontes: citations.map(c => c.value), ordem: index + 1, status: 'EM_REVISAO' },
    provenance: { titulo: { line: titleLine + 1, explicit: true }, area: { line: areaLine + 1, explicit: true }, fontes: citations,
      slug: 'Not explicit; proposed from filename without version', ordem: 'Not explicit; proposed inventory order',
      status: 'Not explicit; review-only proposal', filenameVersion: item.name.match(/-v\d+/)?.[0],
      headerVersionLines: lines.slice(0, Math.max(areaLine + 1, 10)).filter(line => /versão|\(v\d|— v\d/i.test(line)),
      pending: ['Client approval of metadata and coverage', ...(citations.length ? [] : ['No explicit structured source in header; fontes=[] requires review'])] } };
});
const save = (name, value) => fs.writeFileSync(path.join(destination, name), JSON.stringify(value, null, 2) + '\n');
save('manifest.json', { batch: 'knowledge-review-2026-09-24', sourceDirectory: inventory.directory, approvedForImport: false, candidates });
const simulation = plan(destination);
save('simulation.json', simulation);
const blocks = simulation.actions.map(action => ({ file: action.file, valid: !action.issues.length, issues: action.issues, chunks: action.chunks }));
save('blocks.json', blocks);
// Blocked notebook retains literal headings/markers for review, without presenting fallback areas as valid.
const blocked = candidates.find(c => c.blocked);
save('blocked-structure.json', fs.readFileSync(path.join(destination, 'candidates', blocked.file), 'utf8').split(/\r?\n/)
  .flatMap((text, i) => /^(## |### |\*\*Área:)/.test(text) ? [{ line: i + 1, text }] : []));
const rows = ['# Blocos e áreas efetivas', '', 'Parser vigente; conteúdo integral dos blocos em `blocks.json`. Linhas referem-se às cópias candidatas.', ''];
for (const notebook of blocks) {
  rows.push('## ' + notebook.file, '');
  if (!notebook.valid) rows.push('BLOQUEADO: ' + notebook.issues.map(i => `linha ${i.linha}: ${i.mensagem}`).join('; '), '', 'Não há conjunto de blocos validado. Estrutura e marcações literais: `blocked-structure.json`.', '');
  else {
    rows.push('| Bloco | Linha | Capítulo / subseção | Áreas efetivas |', '| --- | --- | --- | --- |');
    notebook.chunks.forEach((c, i) => rows.push(`| ${i + 1} | ${c.line} | ${[c.chapter, c.subchapter].filter(Boolean).join(' / ').replace(/\|/g, '\\|')} | ${c.areas.join(', ')} |`));
    rows.push('');
  }
}
fs.writeFileSync(path.join(destination, 'blocks.md'), rows.join('\n'));
console.log(JSON.stringify({ destination, candidates: candidates.length, valid: blocks.filter(b => b.valid).length,
  blocked: blocks.filter(b => !b.valid).length, chunks: blocks.reduce((n, b) => n + b.chunks.length, 0) }));
