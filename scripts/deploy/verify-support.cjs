// Read-only DB checks plus in-memory validation/embedding; never handleInbound/sendText/reindex.
const {prisma:p}=require('/app/dist/db/client.js'),assert=require('assert/strict'),crypto=require('crypto');
const report={at:new Date().toISOString(),validation:[],health:[]};
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
(async()=>{
 const s=await p.fichaConhecimento.findMany({orderBy:{id:'asc'}}),prompts=await p.promptConfig.findMany({orderBy:{id:'asc'}});
 Object.assign(report,{sourceHash:hash(s),promptHash:hash(prompts),sources:s.length,statuses:s.reduce((a,s)=>(a[s.status]=(a[s.status]||0)+1,a),{}),documents:await p.knowledgeDocument.count(),chunks:await p.knowledgeChunk.count(),jobs:await p.knowledgeJob.count()});
 const columns=await p.$queryRaw`SELECT column_name AS name,data_type AS type FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='KnowledgeInteraction' ORDER BY ordinal_position`;
 assert.equal(columns.length,4);report.auditTable=true;report.auditRows=await p.knowledgeInteraction.count();
 report.supportPolicy=require('/app/dist/knowledge/support.js').SUPPORT_POLICY_VERSION;
 report.generationPolicy=require('/app/dist/knowledge/generation.js').GROUNDED_GENERATION_VERSION;
 assert.equal(report.supportPolicy,'support-v11');assert.equal(report.generationPolicy,'grounded-generation-v6');
 for(const base of ['http://127.0.0.1:3000','https://judith-72-60-2-210.sslip.io']){
  const h=await fetch(base+'/health',{signal:AbortSignal.timeout(15000)});assert.equal(h.status,200);report.health.push({base,http:h.status,body:await h.json()});
  for(const [name,conteudo,status]of [['empty','',422],['cover','# Capa\nTexto sem capitulo.',422],['valid','## Capitulo\nTexto sintetico integral, somente validacao.',200]]){
   const res=await fetch(base+'/internal/knowledge/validate',{method:'POST',headers:{'content-type':'application/json','x-internal-key':process.env.INTERNAL_API_KEY},body:JSON.stringify({area:'civil',conteudo}),signal:AbortSignal.timeout(15000)});
   const body=await res.json();assert.equal(res.status,status);if(status===200)assert.equal(body.chunks,1);report.validation.push({base,name,http:res.status,body});
  }
 }
 const provider=require('/app/dist/knowledge/provider.js').createProvider(),v=await provider.embed('Verificacao sintetica dos embeddings locais.','query');assert.equal(v.length,1024);assert.ok(v.every(Number.isFinite));report.embeddings={model:provider.model,dimensions:v.length};
 report.ok=true;
})().catch(e=>{report.ok=false;report.error=e.code||e.name;process.exitCode=1}).finally(async()=>{console.log(JSON.stringify(report,null,2));await p.$disconnect()});
