// Run only in the disposable test DB, with the local embedding container stopped.
const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
assert.equal(new URL(process.env.DATABASE_URL).pathname,'/judith_knowledge_test');
assert.equal(process.env.KNOWLEDGE_ISOLATED_TEST,'true');
const db=new PrismaClient();
require.cache[require.resolve('../dist/db/client.js')]={exports:{prisma:db}};
const {createProvider}=require('../dist/knowledge/provider.js');
const {requestIndex,processNextJob}=require('../dist/knowledge/indexer.js');
const {loadCandidates}=require('../dist/knowledge/repository.js');
const provider=createProvider();
(async()=>{
 const docs=await db.knowledgeDocument.findMany({orderBy:{sourceId:'asc'}}),chunks=await db.knowledgeChunk.findMany({orderBy:{id:'asc'}});
 await assert.rejects(provider.embed('Consulta sintética','query'),/LOCAL_EMBEDDING_UNAVAILABLE/);
 const source=await db.fichaConhecimento.findUniqueOrThrow({where:{slug:'civil-cobranca'}});
 await db.fichaConhecimento.update({where:{id:source.id},data:{conteudo:source.conteudo+' Alteração sintética durante indisponibilidade.'}});
 const requested=await requestIndex(db,'local-outage');await processNextJob(db,provider);
 const job=await db.knowledgeJob.findUniqueOrThrow({where:{id:requested.id}});
 assert.equal(job.status,'failed');assert.equal(job.errors.code,'LOCAL_EMBEDDING_UNAVAILABLE');
 assert.deepEqual(await db.knowledgeDocument.findMany({orderBy:{sourceId:'asc'}}),docs);
 assert.deepEqual(await db.knowledgeChunk.findMany({orderBy:{id:'asc'}}),chunks);
 assert.ok((await loadCandidates('civil',provider.model)).every(c=>c.titulo!==source.titulo));
 console.log(JSON.stringify({realLocalOutage:true,job:job.id,status:job.status,error:job.errors.code,previousIndexPreserved:true,staleContentHidden:true,paidFallback:false}));
})().catch(e=>{console.log(JSON.stringify({failed:true,code:e.code||e.name}));process.exitCode=1}).finally(()=>db.$disconnect());
