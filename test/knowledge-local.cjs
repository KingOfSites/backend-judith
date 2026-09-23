// Requires the disposable MariaDB initialized by knowledge-mysql.cjs and the real local model.
const assert = require('node:assert/strict');
const fixture = require('./fixtures/semantic-portuguese.json');
const { performance } = require('node:perf_hooks');
const { PrismaClient } = require('@prisma/client');
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/judith_knowledge_test');
assert.equal(process.env.KNOWLEDGE_ISOLATED_TEST, 'true');
const db = new PrismaClient();
require.cache[require.resolve('../dist/db/client.js')] = { exports: { prisma: db } };
const { requestIndex, processNextJob } = require('../dist/knowledge/indexer.js');
const { createProvider } = require('../dist/knowledge/provider.js');
const { retrieve, cosine } = require('../dist/knowledge/core.js');
const { loadCandidates } = require('../dist/knowledge/repository.js');
const provider = createProvider();
let calls = 0, runId = 0;
const counted = {...provider, embed: async (...args) => {calls++;return provider.embed(...args)}};
const run = async () => {
 const requested = await requestIndex(db, `local-real-${runId++}`);
 await processNextJob(db, counted);
 const job = await db.knowledgeJob.findUniqueOrThrow({where:{id:requested.id}});
 assert.equal(job.status, 'completed', JSON.stringify(job.errors));return job;
};
const report = {model:provider.model, semanticVectors:'real-local', quality:[], timingMs:[]};
async function main() {
 const legacy = await db.fichaConhecimento.findUniqueOrThrow({where:{slug:'legacy-review'}});
 for(const p of fixture.passages) await db.fichaConhecimento.create({data:{slug:p.id,titulo:p.id,area:p.area,status:'PUBLICADA',fontes:[],conteudo:'## Exemplo sintético\n'+p.text}});
 // Strong distractors from another area must be excluded before selecting the five chunks.
 for(let i=0;i<6;i++) await db.fichaConhecimento.create({data:{slug:`wrong-area-${i}`,titulo:`wrong-area-${i}`,area:'ambiental',status:'PUBLICADA',fontes:[],conteudo:fixture.questions[0].text}});
 const start=performance.now(); report.firstJob=(await run()).result;report.indexMs=Math.round(performance.now()-start);
 assert.equal(calls,fixture.passages.length+1); // six identical distractors share their semantic cache
 assert.deepEqual(await db.fichaConhecimento.findUnique({where:{id:legacy.id}}),legacy);
 const callsBefore=calls;
 assert.equal((await run()).result.unchanged,fixture.passages.length+6);assert.equal(calls,callsBefore);
 report.incrementalReuse=true;
 for(const q of fixture.questions){
  const start=performance.now();
  // Explicit area fixture for embedding-quality isolation; production classification tested separately below.
  const result=await retrieve(q.text,{...counted,classify:async()=>q.area},loadCandidates);
  report.timingMs.push(Math.round(performance.now()-start));
  assert.ok(result.chunks.every(c=>c.areas.includes(q.area)));
  assert.ok(result.chunks.length<=5);
  if(q.area==='civil')assert.equal(result.chunks.length,5);
  const rank=result.chunks.findIndex(c=>c.titulo===q.expected)+1;
  report.quality.push({expected:q.expected,first:result.chunks[0]?.titulo,rank,score:result.chunks[0]?.score});
 }
 report.top1=report.quality.filter(x=>x.rank===1).length;
 report.top5=report.quality.filter(x=>x.rank>0).length;
 assert.ok(report.top1/fixture.questions.length>=0.8,'Top-1 below predeclared 80% synthetic acceptance threshold');
 assert.equal(report.top5,fixture.questions.length);
 // All tokens participate even for an input much longer than 512 tokens.
 const longText='Ação, proteção, coração e informação 🦉. '.repeat(1200);
 const raw=await fetch(new URL('/embed',process.env.LOCAL_EMBEDDINGS_URL),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:longText,kind:'passage'})});
 assert.equal(raw.status,200);const long=await raw.json();assert.ok(long.windows>1);assert.ok(long.tokens>512);
 const changed=await provider.embed(longText+' A última seção determina a restituição do veículo ao proprietário.','passage');
 assert.ok(cosine(long.vector,changed)<1-1e-10);
 report.longInput={characters:longText.length,tokens:long.tokens,windows:long.windows,elapsedMs:long.elapsedMs,tailChangesVector:true};
 // Query and passage prefixes have distinct real representations.
 assert.ok(cosine(await provider.embed('Contrato de empréstimo','query'),await provider.embed('Contrato de empréstimo','passage'))<0.99999);
 if(process.env.KNOWLEDGE_REAL_CLASSIFIER==='true'){
  report.endToEnd=[];
  for(const question of ['Qual é o procedimento de inventário e partilha de herança após o falecimento de uma pessoa?', 'Pela LGPD, como solicitar que uma empresa elimine meus dados pessoais tratados com consentimento?']){
   const r=await retrieve(question,counted,loadCandidates);
   assert.ok(['civil','lgpd'].includes(r.area));assert.ok(r.chunks.length>0);
   report.endToEnd.push({area:r.area,first:r.chunks[0].titulo,count:r.chunks.length});
  }
  assert.deepEqual(report.endToEnd.map(x=>x.area),['civil','lgpd']);
  assert.deepEqual(report.endToEnd.map(x=>x.first),['civil-heranca','lgpd-exclusao']);
 }
 const source=await db.fichaConhecimento.findUniqueOrThrow({where:{slug:'civil-emprestimo'}});
 await db.fichaConhecimento.update({where:{id:source.id},data:{status:'RASCUNHO',area:'legacy-invalid'}});
 assert.ok((await loadCandidates('civil',provider.model)).every(x=>x.titulo!==source.titulo));
 await run();assert.equal(await db.knowledgeChunk.count({where:{sourceId:source.id}}),0);
 await db.fichaConhecimento.delete({where:{slug:'civil-aluguel'}});await run();
 assert.ok((await loadCandidates('civil',provider.model)).every(x=>x.titulo!=='civil-aluguel'));
 report.unpublishDelete=true;
 const edited=await db.fichaConhecimento.findUniqueOrThrow({where:{slug:'civil-cobranca'}});
 const beforeEdit=calls;
 await db.fichaConhecimento.update({where:{id:edited.id},data:{fontes:['Metadado sintético']}});
 assert.ok((await loadCandidates('civil',provider.model)).every(x=>x.titulo!==edited.titulo));
 await run();assert.equal(calls,beforeEdit);report.metadataReuseAndStaleProtection=true;
 report.pass=true;
}
main().catch(e=>{report.pass=false;report.failure={code:e.code||e.name,message:e.message};process.exitCode=1}).finally(async()=>{console.log(JSON.stringify(report));await db.$disconnect()});
