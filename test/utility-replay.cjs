const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../dist');require.cache[require.resolve(base+'/config/env.js')]={exports:{env:{}}};
const {validateSupport,materializeEvidence,SUPPORT_POLICY_VERSION}=require(base+'/knowledge/support.js');
const evidence=path.resolve(__dirname,'../docs/evidence/2026-09-24');
const d=JSON.parse(fs.readFileSync(evidence+'/utility-main-v6.json','utf8'));
const rows=[];
for(const c of d.cases.filter(c=>!c.failure)){
 const a=c.audit;const raw=d.calls.find(x=>x.id===a.verification.requestId).content.find(x=>x.name==='support_verdict').input;
 const supported=validateSupport(c.reply,a.chunks,materializeEvidence(raw,a.chunks),a.searchQuery);
 const expected=c.id!=='final-holdout-suppliers';assert.equal(supported,expected,c.id);
 rows.push({id:c.id,supported,expected});
}
const result={policy:SUPPORT_POLICY_VERSION,networkCalls:0,source:'utility-main-v6.json',rows};
fs.writeFileSync(evidence+'/utility-replay-v7.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
