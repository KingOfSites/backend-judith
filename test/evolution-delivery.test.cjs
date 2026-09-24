const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
let calls=[],fail=false;
const axios={create:()=>({post:async(url,body)=>{calls.push({url,body});if(fail)throw {isAxiosError:true,response:{status:503,data:'PRIVATE'},config:{headers:{apikey:'SECRET'}}};return {status:201,data:{key:{id:'out-id',remoteJid:'551100004822@s.whatsapp.net',fromMe:true},instanceId:'instance-id',status:'PENDING',secret:'SECRET',message:{conversation:'PRIVATE'}}}}}),isAxiosError:e=>e?.isAxiosError===true};
require.cache[require.resolve('axios')]={exports:axios};
require.cache[require.resolve('../dist/config/env.js')]={exports:{env:{EVOLUTION_INSTANCE:'judith',EVOLUTION_API_URL:'https://isolated.invalid',EVOLUTION_API_KEY:'SECRET'}}};
const {sendText}=require('../dist/evolution/client.js');
test('automatic text preserves content/recipient, disables preview and records safe HTTP receipt',async t=>{
const logs=[];t.mock.method(console,'info',s=>logs.push(s));
for(const text of ['Teste de conexão JUDITH','Oi! 👋\nLeia https://example.invalid/termos e responda SIM.']){
 await sendText('551100004822',text,'in-id');
 assert.deepEqual(calls.at(-1),{url:'/message/sendText/judith',body:{number:'551100004822',text,linkPreview:false}});
 const receipt=JSON.parse(logs.at(-1));assert.equal(receipt.httpStatus,201);assert.equal(receipt.messageId,'out-id');assert.equal(receipt.inboundMessageId,'in-id');assert.equal(receipt.recipientMatches,true);assert.equal(receipt.providerStatus,'PENDING');
 assert.ok(!logs.at(-1).includes(text));assert.ok(!logs.at(-1).includes('SECRET'));assert.ok(!logs.at(-1).includes('PRIVATE'));assert.ok(!logs.at(-1).includes('551100004822'));
}
assert.equal(calls.length,2);
});
test('HTTP failure is sanitized and never retried by sendText',async t=>{
const logs=[];t.mock.method(console,'error',s=>logs.push(s));fail=true;const before=calls.length;
await assert.rejects(sendText('551100004822','PRIVATE','in-id'),e=>e.message==='Evolution sendText failed (HTTP 503)'&&!e.config);
assert.equal(calls.length,before+1);assert.equal(JSON.parse(logs[0]).httpStatus,503);assert.ok(!logs[0].includes('SECRET'));assert.ok(!logs[0].includes('PRIVATE'));
});
