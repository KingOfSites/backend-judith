const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'utility-db');assert.equal(url.pathname,'/utility_isolated');assert.equal(process.env.EVOLUTION_API_KEY,undefined);
const base='/app/dist',replace=(id,exports)=>{require.cache[require.resolve(id)]={exports}};
replace(base+'/config/env.js',{env:{ANTHROPIC_API_KEY:process.env.ANTHROPIC_API_KEY,JUDITH_MODEL_HAIKU:process.env.JUDITH_MODEL_HAIKU,JUDITH_MODEL_SONNET:process.env.JUDITH_MODEL_HAIKU,LOCAL_EMBEDDINGS_URL:'http://utility-embeddings:8080',WEB_JUDITH_URL:'http://127.0.0.1:1',INTERNAL_API_KEY:'ISOLATED',JUDITH_DOMAIN:'example.invalid'}});
replace(base+'/evolution/client.js',{sendText:()=>{throw Error('WHATSAPP_FORBIDDEN')},sendTyping:()=>{throw Error('WHATSAPP_FORBIDDEN')}});
const report={startedAt:new Date().toISOString(),productionWrites:false,whatsappCalls:0,calls:[],cases:[]};
let activeCase='setup';
const RealAnthropic=require('@anthropic-ai/sdk').default;
replace('@anthropic-ai/sdk',class extends RealAnthropic{constructor(options){super(options);const create=this.messages.create.bind(this.messages);this.messages.create=async(req)=>{const start=Date.now();const r=await create(req);report.calls.push({case:activeCase,id:r.id,kind:req.tools?.[0]?.name||(typeof req.system==='string'?'classification':'generation'),latencyMs:Date.now()-start,usage:r.usage,content:r.content});return r}}});
const {prisma:p}=require(base+'/db/client.js');
const save=()=>fs.writeFileSync('/evidence/result.json',JSON.stringify(report,null,2));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
// Predeclared holdout questions: not used to tune the generation contract.
const mainTests=[
 {id:'lgpd-deletion',session:0,q:'Pela LGPD, um cliente pode pedir a eliminação de dados?'},
 {id:'lgpd-refusal',session:0,q:'E se a empresa se recusar a apagar?'},
 {id:'lgpd-financial',session:0,q:'Responda em uma frase: dados financeiros são automaticamente dados sensíveis?'},
 {id:'topic-change',session:0,q:'Mudando de assunto: comprei um produto pela internet. Posso desistir da compra mesmo sem defeito?'},
 {id:'consumer-followup',session:0,q:'E qual é o prazo para exercer esse direito?'},
 {id:'holdout-access',session:1,q:'Qual é o prazo para a declaração completa de acesso aos meus dados pessoais na LGPD?'},
 {id:'holdout-dpo',session:2,q:'Na LGPD, qual é a função do encarregado de dados?'},
 {id:'holdout-consumer',session:3,q:'Comprei um produto durável com defeito aparente. Qual é o prazo para reclamar ao fornecedor?'},
 {id:'unsupported-statistic',session:4,q:'Qual é a porcentagem exata de pequenos empresários que perderam ações por recusa de apagar dados em Curitiba em 2025?',unsupported:true},
 {id:'unsupported-personal',session:5,q:'Pela LGPD, qual foi o valor exato da indenização no processo particular de Maria Silva contra a Loja Aurora, ajuizado ontem em Curitiba?',unsupported:true},
 {id:'new-holdout-nondurable',session:6,q:'Qual é o prazo para reclamar de um vício aparente em produto não durável?'},
 {id:'new-holdout-small-dpo',session:7,q:'Sou MEI e não faço tratamento de dados de alto risco. Preciso indicar formalmente um encarregado de dados?'},
 {id:'final-holdout-store',session:8,q:'O direito de arrependimento de sete dias também vale para compra que fiz dentro da loja física?'},
 {id:'final-holdout-suppliers',session:9,q:'No CDC, quem responde pelo vício do produto: apenas o fabricante ou também o comerciante?'},
];
const extraTests=[
 {id:'extra-online',session:10,q:'Comprei um produto pela internet. Tenho direito de desistir da compra?'},
 {id:'extra-followup',session:10,q:'E preciso explicar por que quero desistir?'},
 {id:'extra-change',session:10,q:'Agora sobre proteção de dados: sendo MEI sem tratamento de alto risco, preciso indicar formalmente um encarregado de dados?'},
 {id:'extra-unsupported',session:11,q:'Pela LGPD, qual foi a indenização exata no processo privado de João Teste contra Loja Exemplo iniciado ontem?',unsupported:true},
];
const tests=[{...mainTests.find(x=>x.id==='lgpd-financial'),session:1},mainTests.find(x=>x.id==='consumer-followup'),mainTests.find(x=>x.id==='final-holdout-suppliers'),...extraTests.filter(x=>!x.unsupported)];
async function main(){
 const raw=fs.readFileSync('/private/snapshot.json','utf8'),s=JSON.parse(raw);
 report.snapshot={sha256:sha(raw),sources:s.sources.map(x=>({id:x.id,slug:x.slug,titulo:x.titulo})),documents:s.documents.length,chunks:s.chunks.length,embeddings:s.embeddings.length,promptVersion:s.prompt.versao,promptHash:sha(s.prompt.secaoA)};
 assert.equal(s.sources.length,18);
 for(const [model,rows]of [['fichaConhecimento',s.sources],['knowledgeEmbedding',s.embeddings],['knowledgeDocument',s.documents],['knowledgeChunk',s.chunks],['knowledgeChunkArea',s.areas]])for(let i=0;i<rows.length;i+=30)await p[model].createMany({data:rows.slice(i,i+30)});
 await p.promptConfig.create({data:{chave:'PRINCIPAL',...s.prompt}});
 for(let i=0;i<12;i++){await p.user.create({data:{id:'utility-'+i,whatsappNumber:'00000000000'+i,onboarding:'CONCLUIDO',aceitouTermos:true}});await p.creditoCortesia.create({data:{id:'credit-'+i,userId:'utility-'+i,servico:'DUVIDA',quantidade:20,saldo:20,criadoPor:'isolated'}})}
 // Synthetic antecedents, not additional provider executions or real contact history.
 const antecedents=[[0,[mainTests.find(x=>x.id==='topic-change').q]],[1,[mainTests[0].q,mainTests[1].q]]];
 report.seededHistory=antecedents;
 for(const [number,questions] of antecedents){
  const session=await p.session.create({data:{userId:'utility-'+number}});
  for(let i=0;i<questions.length;i++)await p.message.create({data:{sessionId:session.id,role:'USER',content:questions[i],createdAt:new Date(Date.now()-10000+i*1000)}});
 }
 const {handleInbound}=require(base+'/judith/conversation.js');
 for(const t of tests){
  activeCase=t.id;const start=Date.now(),pre=(await p.creditoCortesia.findUnique({where:{id:'credit-'+t.session}})).saldo;
  const r=await handleInbound({whatsappNumber:'00000000000'+t.session,text:t.q,hasAttachment:false,messageId:t.id});
  const id=sha(JSON.stringify(['utility-'+t.session,t.id]));const audit=await p.knowledgeInteraction.findUnique({where:{id}});
  const post=(await p.creditoCortesia.findUnique({where:{id:'credit-'+t.session}})).saldo;
  const result={...t,reply:r.replies[0],failure:r.knowledgeFailure||null,creditDelta:pre-post,latencyMs:Date.now()-start,audit:audit?.payload};
  report.cases.push(result);assert.equal(pre-post,r.knowledgeFailure?0:1);assert.equal(await p.message.count({where:{id}}),1);
  save();console.log(JSON.stringify({id:t.id,failure:result.failure,creditDelta:result.creditDelta,latencyMs:result.latencyMs,area:result.audit?.area}));
 }
 activeCase='esquecimento-barrier';
 const {verifySupport,validateSupport}=require(base+'/knowledge/support.js');
 const source='O titular pode pedir a eliminação dos dados pessoais tratados com consentimento, ressalvadas as hipóteses legais de conservação.';
 const chunk={id:'barrier-fixture',content:source};
 const answer='O titular pode pedir a eliminação dos dados tratados com consentimento; a lei chama isso de direito ao esquecimento.';
 const result=await verifySupport(mainTests[0].q,[],answer,[chunk]);
 const forced={units:[{index:0,supported:true,conversational:false,evidence:[{chunkId:chunk.id,quote:source}]}]};
 report.barrier={answer,source,real:result,forcedVoteBlocked:!validateSupport(answer,[chunk],forced)};
 assert.equal(result.supported,false);assert.equal(report.barrier.forcedVoteBlocked,true);
 report.scopeControls=[];
 for(const fixture of JSON.parse(fs.readFileSync('/app/test/fixtures/utility-pending-scope-regression.json','utf8'))){
  for(const type of ['bad','good']){
   activeCase='scope-'+fixture.id+'-'+type;
   const result=await verifySupport(fixture.question,[],fixture[type],fixture.chunks);
   report.scopeControls.push({id:fixture.id,type,answer:fixture[type],expected:type==='good',result});save();
  }
 }
 report.acceptance={accepted:report.cases.filter(x=>!x.failure).length,blocked:report.cases.filter(x=>x.failure).length,unsupportedBlocked:report.cases.filter(x=>x.unsupported).every(x=>x.failure&&x.creditDelta===0)};
 report.finishedAt=new Date().toISOString();save();
 assert.ok(report.scopeControls.every(x=>x.result.supported===x.expected),'SCOPE_CONTROL_FAILED');assert.ok(report.cases.filter(x=>x.id!=='lgpd-financial').every(x=>!x.failure),'TARGETED_UTILITY_FAILURE');assert.ok(report.acceptance.unsupportedBlocked,'UNSUPPORTED_LEAK');
}
main().catch(e=>{report.fatal={name:e.name,code:e.code,message:e.message?.slice(0,140)};save();console.error('UTILITY_RUN_FAILED');process.exitCode=1}).finally(()=>p.$disconnect());
