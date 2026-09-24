// Replays saved synthetic provider verdicts; no network, DB or WhatsApp.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../dist');
require.cache[require.resolve(base+'/config/env.js')]={exports:{env:{}}};
const {validateSupport}=require(base+'/knowledge/support.js');
const evidence=path.resolve(__dirname,'../docs/evidence/2026-09-24');
const d=JSON.parse(fs.readFileSync(evidence+'/support-real-final.json','utf8'));
const harness=fs.readFileSync(path.join(__dirname,'support-real-isolated.cjs'),'utf8');
const list=harness.slice(harness.indexOf('const cases=[')+'const cases='.length,harness.indexOf('\n];',harness.indexOf('const cases=['))+2);
const cases=vm.runInNewContext(list,{q1:d.flows[0].question,q2:d.flows[1].question});
const chunks=d.flows[0].audit.chunks;
for(const [name,q,history,answer,expected] of cases){
 const record=d.cases.find(x=>x.name===name);
 const verdict=d.providerOutputs.find(x=>x.id===record.requestId).content.find(x=>x.type==='tool_use').input;
 assert.equal(validateSupport(answer,chunks,verdict),expected,name);
}
for(const flow of d.flows){
 const gen=d.providerOutputs.find(x=>x.id===flow.audit.generationId).content[0].text;
 const verdict=d.providerOutputs.find(x=>x.id===flow.audit.verification.requestId).content.find(x=>x.type==='tool_use').input;
 assert.equal(validateSupport(gen,chunks,verdict),false);
}
const firstGen=d.providerOutputs.find(x=>x.id===d.flows[0].audit.generationId).content[0].text;
const units=firstGen.split(/\n\s*\n/).filter(s=>s.trim());
const index=units.findIndex(s=>/esquecimento/.test(s));
const firstVerdict=d.providerOutputs.find(x=>x.id===d.flows[0].audit.verification.requestId).content.find(x=>x.type==='tool_use').input;
const unitVote=firstVerdict.units.find(x=>x.index===index);
assert.equal(unitVote.supported,true); // Known incorrect semantic vote remains visible.
assert.equal(validateSupport(units[index],chunks,{units:[{...unitVote,index:0}]}),false);
const result={networkCalls:0,fixedCases:cases.length,flows:3,incorrectEsquecimentoVoteBlocked:true};
fs.writeFileSync(evidence+'/support-replay.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
