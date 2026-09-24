// Offline import planner. Intentionally has no database client or write mode.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseNotebook, PARSER_VERSION } = require('../dist/knowledge/parser.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function plan(batchDir, existing = null) {
  const manifest = JSON.parse(fs.readFileSync(path.join(batchDir, 'manifest.json'), 'utf8'));
  if (!Array.isArray(manifest.candidates) || manifest.candidates.length !== 19) throw Error('Expected exactly 19 candidates');
  if (existing !== null && !Array.isArray(existing)) throw Error('Snapshot must be an array');
  const slugs = new Set(), hashes = new Set();
  const actions = manifest.candidates.map(candidate => {
    const { metadata: m } = candidate;
    if (!/^[a-z0-9-]+$/.test(m.slug) || slugs.has(m.slug)) throw Error('Duplicate/invalid slug');
    slugs.add(m.slug);
    if (path.basename(candidate.file) !== candidate.file) throw Error('Unsafe file path');
    const bytes = fs.readFileSync(path.join(batchDir, 'candidates', candidate.file));
    const contentHash = hash(bytes);
    if (contentHash !== candidate.candidateSha256) throw Error('Candidate hash mismatch: ' + candidate.file);
    if (hashes.has(contentHash)) throw Error('Duplicate content in batch');
    hashes.add(contentHash);
    const content = bytes.toString('utf8');
    let issues = [], chunks = [];
    try { chunks = parseNotebook(content, m.area); }
    catch (e) { if (!e.issues) throw e; issues = e.issues; }
    if (!m.titulo || !Array.isArray(m.fontes) || !Number.isInteger(m.ordem) || m.status !== 'EM_REVISAO') throw Error('Invalid metadata');
    const sameSlug = existing?.filter(row => row.slug === m.slug) ?? [];
    const sameContent = existing?.filter(row => hash(row.conteudo) === contentHash) ?? [];
    const identical = sameSlug.length === 1 && sameSlug[0].conteudo === content &&
      ['titulo', 'area', 'status', 'ordem'].every(key => sameSlug[0][key] === m[key]) &&
      JSON.stringify(sameSlug[0].fontes) === JSON.stringify(m.fontes);
    let action = existing === null ? 'NEEDS_DATABASE_SNAPSHOT' : 'WOULD_CREATE';
    if (sameSlug.length || sameContent.length) action = identical && sameContent.every(row => row.slug === m.slug) ? 'SKIP_IDENTICAL' : 'CONFLICT';
    if (issues.length || candidate.blocked) action = 'BLOCKED';
    return { file: candidate.file, slug: m.slug, action, editorialApproved: false, issues, chunkCount: chunks.length,
      // Payload is review-only, never submitted by this program.
      proposedRecord: { ...m, conteudo: content }, chunks };
  });
  return { mode: 'OFFLINE_SIMULATION_ONLY', parser: PARSER_VERSION, databaseAccess: false,
    existingSnapshotProvided: existing !== null, editorialApprovalRequired: true, actions };
}
if (require.main === module) {
  const [mode, batchDir, snapshot, ...extra] = process.argv.slice(2);
  if (mode !== '--simulate' || !batchDir || extra.length) {
    console.error('Usage: node scripts/knowledge-import.cjs --simulate BATCH_DIR [READ_ONLY_SNAPSHOT.json]. No apply/write mode.');
    process.exitCode = 1;
  } else {
    const result = plan(batchDir, snapshot ? JSON.parse(fs.readFileSync(snapshot, 'utf8')) : null);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  }
}
module.exports = { plan, hash };
