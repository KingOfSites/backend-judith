const fs = require('node:fs');
const path = require('node:path');
const { plan, hash } = require('./knowledge-import.cjs');
const EXCLUDED = 'JUDITH-base-propaganda-v1.md';
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const digest = value => hash(canonical(value));
function loadBatch(batchDir, manifestHash) {
  const raw = fs.readFileSync(path.join(batchDir, 'manifest.json'));
  if (hash(raw) !== manifestHash) throw Error('MANIFEST_CHANGED');
  const manifest = JSON.parse(raw);
  for (const c of manifest.candidates) {
    if (path.basename(c.file) !== c.file) throw Error('UNSAFE_PATH');
    if (hash(fs.readFileSync(path.join(batchDir, 'originals', c.file))) !== c.originalSha256) throw Error('ORIGINAL_CHANGED');
  }
  const simulation = plan(batchDir, []);
  const included = simulation.actions.filter(a => a.file !== EXCLUDED);
  if (included.length !== 18 || included.some(a => a.action !== 'WOULD_CREATE')) throw Error('INVALID_BATCH');
  return included.map(a => ({ id: 'kbimp_' + hash(manifestHash + ':' + a.slug).slice(0, 32), ...a.proposedRecord }));
}
async function lockSources(tx) {
  // Full primary-index range scan at SERIALIZABLE locks rows AND gaps, including an empty table.
  // Also serializes writers that do not participate in an advisory-lock convention.
  await tx.$queryRawUnsafe('SELECT id FROM FichaConhecimento FORCE INDEX (PRIMARY) ORDER BY id FOR UPDATE');
}
function samePayload(row, proposed) {
  return ['slug','titulo','area','status','fontes','ordem','conteudo'].every(k => canonical(row[k]) === canonical(proposed[k]));
}
async function execute(db, options, hooks = {}) {
  const { batchDir, manifestHash, snapshot, receiptPath } = options;
  const expected = loadBatch(batchDir, manifestHash);
  if (!Array.isArray(snapshot.records) || !snapshot.promptHash || !snapshot.at) throw Error('INVALID_BACKUP_SNAPSHOT');
  const oldIds = new Set(snapshot.records.map(r => r.id));
  if (oldIds.size !== snapshot.records.length) throw Error('INVALID_BACKUP_SNAPSHOT');
  // Never truncate any receipt. Parent directory must be prepared explicitly.
  if (fs.existsSync(receiptPath)) throw Error('RECEIPT_EXISTS');
  for (let attempt = 1; attempt <= 4; attempt++) {
    const attemptPath = receiptPath + '.attempt-' + attempt + '.json';
    if (fs.existsSync(attemptPath)) throw Error('RECEIPT_ATTEMPT_EXISTS');
    try {
      const result = await db.$transaction(async tx => {
        await lockSources(tx);
        const records = await tx.fichaConhecimento.findMany({ orderBy: { id: 'asc' } });
        const prompts = await tx.promptConfig.findMany({ orderBy: { id: 'asc' } });
        if (hash(JSON.stringify(prompts)) !== snapshot.promptHash) throw Error('PROMPTS_CHANGED_SINCE_SNAPSHOT');
        for (const prior of snapshot.records) {
          if (canonical(records.find(r => r.id === prior.id)) !== canonical(prior)) throw Error('BASELINE_CHANGED:' + prior.id);
        }
        const current = loadBatch(batchDir, manifestHash); // revalidate disk inside write transaction
        if (digest(current) !== digest(expected)) throw Error('BATCH_CHANGED');
        const allowedIds = new Set(current.map(r => r.id));
        if (records.some(r => !oldIds.has(r.id) && !allowedIds.has(r.id))) throw Error('UNEXPECTED_RECORDS_REFRESH_SNAPSHOT');
        const creates = [], skipped = [];
        for (const row of current) {
          const sameSlug = records.filter(r => r.slug === row.slug);
          const sameContent = records.filter(r => hash(r.conteudo) === hash(row.conteudo));
          const sameId = records.find(r => r.id === row.id);
          if (sameSlug.length || sameContent.length || sameId) {
            if (sameSlug.length !== 1 || !samePayload(sameSlug[0], row) || sameContent.some(r => r.id !== sameSlug[0].id) || (sameId && sameId.id !== sameSlug[0].id)) throw Error('CONFLICT:' + row.slug);
            skipped.push(sameSlug[0].id);
          } else creates.push(row);
        }
        const inserted = [];
        for (const row of creates) {
          inserted.push(await tx.fichaConhecimento.create({ data: row }));
          if (hooks.afterCreate) await hooks.afterCreate(inserted.length, tx);
        }
        const receipt = { version: 1, at: new Date().toISOString(), transactionOutcome: 'VERIFY_COMMIT',
          manifestHash, snapshotDigest: digest(snapshot), created: inserted, skipped, baselineIds: [...oldIds] };
        // Durable pre-commit receipt. Even if the client loses the COMMIT response, created IDs can be reconciled.
        const fd = fs.openSync(attemptPath, 'wx', 0o600);
        try { fs.writeFileSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        return { created: inserted.length, skipped: skipped.length, receipt: attemptPath };
      }, { isolationLevel: 'Serializable', maxWait: 30000, timeout: 60000 });
      fs.writeFileSync(receiptPath, JSON.stringify({ ...result, committed: true, at: new Date().toISOString() }, null, 2), { flag: 'wx', mode: 0o600 });
      return result;
    } catch (error) {
      // Retry only a DB-confirmed rollback. Never retry an unknown COMMIT outcome or filesystem failure.
      if (error.code !== 'P2034' || attempt === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
}
async function recover(db, receipt) {
  if (receipt.version !== 1 || !Array.isArray(receipt.created) || !Array.isArray(receipt.baselineIds)) throw Error('INVALID_RECEIPT');
  return db.$transaction(async tx => {
    await lockSources(tx);
    let removed = 0;
    for (const expected of receipt.created) {
      if (receipt.baselineIds.includes(expected.id) || !expected.id.startsWith('kbimp_') || expected.status !== 'EM_REVISAO') throw Error('UNSAFE_RECOVERY');
      const row = await tx.fichaConhecimento.findUnique({ where: { id: expected.id } });
      if (!row) continue;
      if (canonical(row) !== canonical(expected)) throw Error('RECOVERY_RECORD_CHANGED:' + expected.id);
      if (await tx.knowledgeDocument.findUnique({ where: { sourceId: expected.id } })) throw Error('RECOVERY_RECORD_INDEXED');
      await tx.fichaConhecimento.delete({ where: { id: expected.id } }); removed++;
    }
    return { removed };
  }, { isolationLevel: 'Serializable', maxWait: 30000, timeout: 60000 });
}
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2), mode = args.shift(), opts = {};
    if (!['--apply','--recover'].includes(mode) || args.length % 2) throw Error('Explicit --apply or --recover and named arguments required');
    for (let i=0;i<args.length;i+=2) { if (opts[args[i]]) throw Error('Duplicate argument'); opts[args[i]]=args[i+1]; }
    const keys = mode === '--apply' ? ['--batch','--manifest-sha256','--snapshot','--receipt'] : ['--receipt'];
    if (Object.keys(opts).length !== keys.length || keys.some(k=>!opts[k])) throw Error('Invalid arguments');
    if (!process.env.DATABASE_URL) throw Error('DATABASE_URL required; .env is not loaded automatically');
    const { PrismaClient } = require('@prisma/client'), db = new PrismaClient();
    try {
      const result = mode === '--apply' ? await execute(db, { batchDir: opts['--batch'], manifestHash: opts['--manifest-sha256'],
        snapshot: JSON.parse(fs.readFileSync(opts['--snapshot'],'utf8')), receiptPath: opts['--receipt'] })
        : await recover(db, JSON.parse(fs.readFileSync(opts['--receipt'],'utf8')));
      console.log(JSON.stringify(result));
    } finally { await db.$disconnect(); }
  })().catch(e=>{console.error(e.code || e.message);process.exitCode=1;});
}
module.exports = { execute, recover, loadBatch, canonical, digest };
