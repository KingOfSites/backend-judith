// Run ONLY in disposable MariaDB. No Evolution credentials, checkout or transport.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'support-isolated-db');assert.equal(url.pathname,'/support_isolated');
assert.ok(process.env.ANTHROPIC_API_KEY);assert.equal(process.env.EVOLUTION_API_KEY,undefined);
const base='/app/dist',replace=(id,exports)=>{require.cache[require.resolve(id)]={exports}};
const config={ANTHROPIC_API_KEY:process.env.ANTHROPIC_API_KEY,JUDITH_MODEL_HAIKU:process.env.JUDITH_MODEL_HAIKU,JUDITH_MODEL_SONNET:process.env.JUDITH_MODEL_HAIKU,WEB_JUDITH_URL:'http://127.0.0.1:1',INTERNAL_API_KEY:'ISOLATED',JUDITH_DOMAIN:'example.invalid'};
replace(base+'/config/env.js',{env:config});
replace(base+'/evolution/client.js',{sendText:()=>{throw Error('WHATSAPP_FORBIDDEN')},sendTyping:()=>{throw Error('WHATSAPP_FORBIDDEN')}});
const {prisma:p}=require(base+'/db/client.js');
const {writeAudit}=require(base+'/knowledge/audit.js');
const RealAnthropic=require('@anthropic-ai/sdk').default;
replace('@anthropic-ai/sdk',class extends RealAnthropic{constructor(options){super(options);const create=this.messages.create.bind(this.messages);this.messages.create=async(req)=>{const started=Date.now();const r=await create(req);report.providerOutputs.push({id:r.id,kind:req.tools?'verification':'generation',latencyMs:Date.now()-started,usage:r.usage,content:r.content});return r}}});
const {verifySupport}=require(base+'/knowledge/support.js');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const report={startedAt:new Date().toISOString(),productionWrites:false,whatsappCalls:0,migration:[],cases:[],flows:[],providerOutputs:[]};
const save=()=>fs.writeFileSync('/evidence/result.json',JSON.stringify(report,null,2));
const contents=[
 'O titular pode pedir a eliminação dos dados pessoais tratados com consentimento, ressalvadas as hipóteses legais de conservação. A conservação para cumprimento de obrigação legal pode justificar não eliminar determinados registros.',
 'O prazo de até 15 dias do art. 19, II refere-se à declaração completa para confirmação e acesso. Não há nesse dispositivo prazo universal de 15 dias para eliminar dados.',
 'O REsp 2.121.904/SP trata de vazamento de dados sensíveis em seguro de vida e reconhece dano moral presumido nesse contexto. Não se pode transportar essa conclusão automaticamente para recusa de exclusão.',
 'Dados financeiros, como categoria genérica, não são automaticamente dados pessoais sensíveis do rol do art. 5º, II. O conteúdo pode revelar informação sensível. Não há estatística nesta fonte sobre probabilidade de vitória judicial.',
 'Na recusa de exclusão, é preciso avaliar a base legal, a finalidade e as hipóteses de conservação. Se não houver suporte suficiente, declare esse limite. O atendimento é gratuito; responda justificando a impossibilidade de atendimento imediato.'
];
const chunks=contents.map((content,i)=>({id:'fixture-'+i,sourceId:'synthetic-lgpd',version:hash(content),content,chapter:'Fixture '+i,score:0.9-i/10,areas:['lgpd'],fontes:[],published:true,titulo:'Fonte sintética de teste',vector:[1,0],subchapter:null}));
const q1='Pela LGPD, um cliente pode pedir a eliminação de dados?',q2='E se a empresa se recusar a apagar?';
const cases=[
 ['invalid-mixed-consequences',q2,[q1],'É preciso avaliar a base legal e as hipóteses de conservação. Se a recusa não tiver fundamento legal, o cliente pode reclamar à ANPD ou mover ação judicial. A empresa que nega exclusão sem motivo responde por dano moral.',false],
 ['invalid-mixed-bases',q1,[],'O titular pode pedir a eliminação dos dados tratados com consentimento, mas há exceções: obrigação legal, cumprimento de contrato ou interesse legítimo que prevalece.',false],
 ['valid-deletion',q1,[],'O titular pode pedir a eliminação dos dados tratados com consentimento, mas há hipóteses legais de conservação.',true],
 ['invalid-15-day-deletion',q1,[],'A empresa deve apagar os dados em 15 dias.',false],
 ['valid-access-deadline','Qual o prazo da declaração completa de acesso?',[],'A declaração completa de acesso deve ser fornecida em até 15 dias, conforme o art. 19, II.',true],
 ['valid-refusal-continuation',q2,[q1],'É preciso avaliar a base legal e as hipóteses de conservação; uma obrigação legal pode justificar manter determinados registros.',true],
 ['invalid-refusal-presumed',q2,[q1],'Basta a recusa de exclusão para gerar indenização presumida.',false],
 ['invalid-majority',q2,[q1],'A maioria dos pequenos empresários perde essas ações.',false],
 ['invalid-financial','E se forem dados financeiros?',[q1,q2],'Todo dado financeiro é dado sensível e gera indenização automática.',false],
 ['valid-financial','E se forem dados financeiros?',[q1,q2],'Dados financeiros não são automaticamente dados sensíveis; o conteúdo pode revelar informação sensível.',true],
 ['valid-vazamento','E em seguro de vida, com vazamento de dados sensíveis?',[],'No contexto do REsp 2.121.904/SP, relativo a vazamento de dados sensíveis em seguro de vida, foi reconhecido dano moral presumido.',true],
 ['invalid-topic-transfer','Agora, se houver atraso na entrega de um produto?',[q1,q2],'O atraso na entrega gera o mesmo dano moral presumido do vazamento em seguro de vida.',false],
 ['valid-limit',q2,[q1],'A recusa precisa ser avaliada considerando a base legal, a finalidade e as hipóteses de conservação.',true],
 ['valid-conversational',q1,[],'Oi!\n\nO titular pode pedir a eliminação dos dados tratados com consentimento, ressalvadas hipóteses legais de conservação.',true],
 ['valid-friendly-conversational',q1,[],'Oi! Ótima pergunta.\n\nO titular pode pedir a eliminação dos dados tratados com consentimento, ressalvadas hipóteses legais de conservação.\n\nFicou claro? Posso te ajudar em mais alguma coisa?',true],
 ['valid-no-transfer',q2,[q1],'Não há prazo universal de 15 dias para apagar dados. Não se pode presumir indenização pela recusa de exclusão a partir do precedente sobre vazamento.',true],
];
async function preserved(){return {users:await p.user.findMany({orderBy:{id:'asc'}}),sources:await p.fichaConhecimento.findMany({orderBy:{id:'asc'}}),prompts:await p.promptConfig.findMany({orderBy:{id:'asc'}}),credits:await p.creditoCortesia.findMany({orderBy:{id:'asc'}}),payments:await p.avulsoCompra.findMany({orderBy:{id:'asc'}})};}
async function main(){
 await p.user.create({data:{id:'sentinel',whatsappNumber:'000000000001',onboarding:'CONCLUIDO'}});
 await p.fichaConhecimento.create({data:{id:'source-sentinel',slug:'sentinel',titulo:'Synthetic preserved',area:'lgpd',status:'EM_REVISAO',conteudo:'## Sentinel\nUnchanged',fontes:[],ordem:1}});
 await p.promptConfig.create({data:{chave:'PRINCIPAL',versao:'synthetic',secaoA:'A'.repeat(1100),secaoB:'B'.repeat(1100),secaoC:'C'.repeat(1100)}});
 await p.creditoCortesia.create({data:{id:'sentinel-credit',userId:'sentinel',servico:'DUVIDA',quantidade:2,saldo:2,criadoPor:'isolated'}});
 await p.avulsoCompra.create({data:{id:'pending-sentinel',userId:'sentinel',servico:'DUVIDA',precoCentavos:100,metodo:'PIX',status:'PENDING'}});
 const before=hash(await preserved());
 await p.$executeRawUnsafe('DROP TABLE KnowledgeInteraction');
 await assert.rejects(writeAudit('missing',{query:'PRIVATE_CANARY'},true),e=>e.code==='TRACE_UNAVAILABLE');report.migration.push('missing table fails closed');
 const sql=fs.readFileSync('/app/prisma/migrations/202609240002_knowledge_interaction/migration.sql','utf8');await p.$executeRawUnsafe(sql);
 assert.equal(hash(await preserved()),before);report.migration.push('migration preserves existing users/sources/prompts/credits/payments');
 await writeAudit('roundtrip',{searchQuery:'PRIVATE_CANARY ação',chunks:[{id:'x',content:'snapshot antigo'}]},true);
 assert.equal((await p.knowledgeInteraction.findUnique({where:{id:'roundtrip'}})).payload.searchQuery,'PRIVATE_CANARY ação');
 await assert.rejects(writeAudit('roundtrip',{changed:true},true),e=>e.code==='TRACE_UNAVAILABLE');
 assert.ok((await p.knowledgeInteraction.findUnique({where:{id:'roundtrip'}})).payload.chunks);report.migration.push('JSON unicode roundtrip and duplicate does not overwrite');
 await assert.rejects(writeAudit('no-row',{},false),e=>e.code==='TRACE_UNAVAILABLE');
 await assert.rejects(p.$transaction(async tx=>{await tx.knowledgeInteraction.create({data:{id:'rolled-back',payload:{test:true}}});throw Error('ROLLBACK')}));
 assert.equal(await p.knowledgeInteraction.findUnique({where:{id:'rolled-back'}}),null);report.migration.push('missing update and transaction rollback');
 const raced=await Promise.allSettled([writeAudit('race',{attempt:1},true),writeAudit('race',{attempt:2},true)]);assert.equal(raced.filter(x=>x.status==='fulfilled').length,1);report.migration.push('concurrent create has exactly one winner');
 await p.$executeRawUnsafe("CREATE USER 'audit_ro'@'%' IDENTIFIED BY 'isolated_only'");
 await p.$executeRawUnsafe('GRANT SELECT ON support_isolated.* TO audit_ro');
 const {PrismaClient}=require('@prisma/client');const readOnly=new PrismaClient({datasources:{db:{url:'mysql://audit_ro:isolated_only@support-isolated-db:3306/support_isolated'}},log:[]});
 const dbModule=require(base+'/db/client.js');dbModule.prisma=readOnly;
 try{await assert.rejects(writeAudit('denied',{query:'PRIVATE_CANARY'},true),e=>e.code==='TRACE_UNAVAILABLE');}finally{dbModule.prisma=p;await readOnly.$disconnect()}
 assert.equal(await p.knowledgeInteraction.findUnique({where:{id:'denied'}}),null);report.migration.push('read-only SQL permission fails safely');
 for(const [name,q,history,answer,expected]of cases){const start=Date.now();try{const result=await verifySupport(q,history,answer,chunks);report.cases.push({name,expected,...result,elapsedMs:Date.now()-start,pass:result.supported===expected});}catch(e){report.cases.push({name,expected,error:e.code,metrics:e.verificationMetrics,pass:false})}save();console.log(JSON.stringify(report.cases.at(-1)));}
 // Real generator + verifier, with fixed retrieval fixtures and isolated history/credit ledger.
 const prompt=JSON.parse(fs.readFileSync('/private/prompt.json','utf8'));await p.promptConfig.update({where:{chave:'PRINCIPAL'},data:prompt});
 await p.user.create({data:{id:'flow-user',whatsappNumber:'000000000002',onboarding:'CONCLUIDO',aceitouTermos:true}});
 await p.creditoCortesia.create({data:{id:'flow-credit',userId:'flow-user',servico:'DUVIDA',quantidade:10,saldo:10,criadoPor:'isolated'}});
 replace(base+'/judith/conhecimento.js',{getKnowledgeContext:async q=>({area:'lgpd',searchText:q,text:contents.join('\n\n'),chunks})});
 const {handleInbound}=require(base+'/judith/conversation.js');
 for(const [i,q]of [q1,q2,'Responda em uma frase: dados financeiros são automaticamente dados sensíveis?'].entries()){
 const pre=await p.creditoCortesia.findUnique({where:{id:'flow-credit'}});const start=Date.now();const r=await handleInbound({whatsappNumber:'000000000002',text:q,hasAttachment:false,messageId:'real-flow-'+i});
 const auditId=crypto.createHash('sha256').update(JSON.stringify(['flow-user','real-flow-'+i])).digest('hex');const audit=await p.knowledgeInteraction.findUnique({where:{id:auditId}});const post=await p.creditoCortesia.findUnique({where:{id:'flow-credit'}});
 report.flows.push({question:q,reply:r.replies[0],knowledgeFailure:r.knowledgeFailure||null,latencyMs:Date.now()-start,creditDelta:pre.saldo-post.saldo,audit:audit.payload});
 assert.equal(pre.saldo-post.saldo,r.knowledgeFailure?0:1);save();console.log(JSON.stringify({flow:i,latencyMs:Date.now()-start,creditDelta:pre.saldo-post.saldo,status:audit.payload.stage}));
 }
 const verificationModule=require(base+'/knowledge/support.js'),originalVerify=verificationModule.verifySupport;
 const auditModule=require(base+'/knowledge/audit.js'),originalAudit=auditModule.writeAudit;
 report.failures=[];
 for(const kind of ['audit-missing','verification-unavailable','verification-rejected','audit-final-write']){
  const pre=await p.creditoCortesia.findUnique({where:{id:'flow-credit'}}),usedBefore=await p.usageEvent.count({where:{userId:'flow-user'}});
  if(kind==='audit-missing')await p.$executeRawUnsafe('RENAME TABLE KnowledgeInteraction TO SavedAudit');
  if(kind==='verification-unavailable')verificationModule.verifySupport=async()=>{throw new (require(base+'/knowledge/errors.js').KnowledgeSearchError)('SUPPORT_UNAVAILABLE')};
  if(kind==='verification-rejected')verificationModule.verifySupport=async()=>({supported:false});
  if(kind==='audit-final-write'){
   verificationModule.verifySupport=async()=>({supported:true});
   auditModule.writeAudit=async(id,payload,create)=>{if(payload.stage==='support_passed'){await p.$executeRawUnsafe('RENAME TABLE KnowledgeInteraction TO SavedAudit');try{return await originalAudit(id,payload,create)}finally{await p.$executeRawUnsafe('RENAME TABLE SavedAudit TO KnowledgeInteraction')}}return originalAudit(id,payload,create)};
  }
  let r;const started=Date.now();
  try{r=await handleInbound({whatsappNumber:'000000000002',text:q2,hasAttachment:false,messageId:'failure-'+kind});}finally{
   if(kind==='audit-missing')await p.$executeRawUnsafe('RENAME TABLE SavedAudit TO KnowledgeInteraction');
   verificationModule.verifySupport=originalVerify;auditModule.writeAudit=originalAudit;
  }
  assert.ok(r.knowledgeFailure);assert.equal(r.replies.length,1);assert.match(r.replies[0],/Nenhum crédito foi consumido/);
  assert.equal((await p.creditoCortesia.findUnique({where:{id:'flow-credit'}})).saldo,pre.saldo);assert.equal(await p.usageEvent.count({where:{userId:'flow-user'}}),usedBefore);
  const savedId=crypto.createHash('sha256').update(JSON.stringify(['flow-user','failure-'+kind])).digest('hex');
  assert.equal(await p.message.count({where:{id:savedId}}),1);
  report.failures.push({kind,creditDelta:0,usageDelta:0,legalGuidanceReturned:false,code:r.knowledgeFailure,latencyMs:Date.now()-started});save();
 }
 report.finishedAt=new Date().toISOString();report.preservationFinal=hash(await preserved())!==before?'flow-fixtures intentionally added after migration check':'unchanged';save();
}
main().catch(e=>{report.fatal={name:e.name,code:e.code,message:e.message?.slice(0,180)};save();console.error('ISOLATED_RUN_FAILED');process.exitCode=1}).finally(()=>p.$disconnect());
