const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { plan, hash } = require('../scripts/knowledge-import.cjs');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judith-import-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'candidates'));
  const candidates = Array.from({ length: 19 }, (_, i) => {
    const content = `## Capitulo ${i}\nTexto ${i}.\n`;
    const file = `caderno-${i}.md`;
    fs.writeFileSync(path.join(dir, 'candidates', file), content);
    return { file, candidateSha256: hash(content), metadata: { titulo: `Caderno ${i}`, slug: `caderno-${i}`, area: 'civil', fontes: [], ordem: i, status: 'EM_REVISAO' } };
  });
  const save = () => fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ candidates }));
  save(); return { dir, candidates, save };
}
test('offline default never claims database duplication checked; repeated snapshot skips identical records', t => {
  const { dir } = fixture(t);
  assert.ok(plan(dir).actions.every(a => a.action === 'NEEDS_DATABASE_SNAPSHOT'));
  const empty = plan(dir, []);
  assert.ok(empty.actions.every(a => a.action === 'WOULD_CREATE'));
  const existing = empty.actions.map(a => a.proposedRecord);
  const before = JSON.stringify(existing);
  assert.ok(plan(dir, existing).actions.every(a => a.action === 'SKIP_IDENTICAL'));
  assert.equal(JSON.stringify(existing), before);
  existing[0].titulo = 'Edited externally';
  assert.equal(plan(dir, existing).actions[0].action, 'CONFLICT');
  existing[0].slug = 'another-slug';
  assert.equal(plan(dir, existing).actions[0].action, 'CONFLICT');
});
test('changed bytes, duplicate slugs and duplicate content fail closed', t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.dir, 'candidates', f.candidates[0].file), 'changed');
  assert.throws(() => plan(f.dir), /hash mismatch/);
  f.candidates[0].candidateSha256 = hash(fs.readFileSync(path.join(f.dir, 'candidates', f.candidates[0].file)));
  f.candidates[1].metadata.slug = f.candidates[0].metadata.slug; f.save();
  assert.throws(() => plan(f.dir), /slug/);
  f.candidates[1].metadata.slug = 'unique';
  fs.copyFileSync(path.join(f.dir, 'candidates', f.candidates[0].file), path.join(f.dir, 'candidates', f.candidates[1].file));
  f.candidates[1].candidateSha256 = f.candidates[0].candidateSha256; f.save();
  assert.throws(() => plan(f.dir), /Duplicate content/);
});
test('penal and zero-block notebooks are blocked; publishing status is forbidden', t => {
  const f = fixture(t);
  for (const content of ['## Promo\n**Área:** consumidor, penal\nTexto.\n', '# Capa\nTexto.\n']) {
    fs.writeFileSync(path.join(f.dir, 'candidates', f.candidates[0].file), content);
    f.candidates[0].candidateSha256 = hash(content); f.save();
    const action = plan(f.dir, []).actions[0];
    assert.equal(action.action, 'BLOCKED'); assert.ok(action.issues.length);
    assert.equal(action.proposedRecord.conteudo, content);
  }
  f.candidates[0].metadata.status = 'PUBLICADA'; f.save();
  assert.throws(() => plan(f.dir), /metadata/);
});
