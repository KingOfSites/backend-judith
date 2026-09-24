// SELECT-only snapshot. No dotenv loading and no prompt text in the artifact.
const { PrismaClient } = require('@prisma/client');
const { hash } = require('./knowledge-import.cjs');
const db = new PrismaClient();
db.$transaction(async tx => {
  const records = await tx.fichaConhecimento.findMany({ orderBy: { id: 'asc' } });
  const prompts = await tx.promptConfig.findMany({ orderBy: { id: 'asc' } });
  return { at: new Date().toISOString(), records, sourceHash: hash(JSON.stringify(records)),
    promptHash: hash(JSON.stringify(prompts)), published: records.filter(r => r.status === 'PUBLICADA').length };
}, { isolationLevel: 'RepeatableRead' }).then(s=>console.log(JSON.stringify(s,null,2)))
 .catch(()=>{console.error('SNAPSHOT_FAILED');process.exitCode=1;}).finally(()=>db.$disconnect());
