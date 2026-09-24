const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const {grant,KEY}=require('../scripts/grant-test-courtesy.cjs');
const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'courtesy-isolated-db');assert.equal(url.pathname,'/courtesy_isolated');
const p=new PrismaClient(),p2=new PrismaClient();
(async()=>{
const u=await p.user.create({data:{id:'target',whatsappNumber:'551100004822'}});
await p.user.create({data:{id:'other',whatsappNumber:'551100009999'}});
const identity={id:u.id,number:u.whatsappNumber};
await assert.rejects(grant(p,{id:u.id,number:'551100009999'}),/IDENTITY_MISMATCH/);
await assert.rejects(grant(p,identity,{afterCreate:()=>{throw Error('ROLLBACK_TEST')}}),/ROLLBACK_TEST/);
assert.equal(await p.creditoCortesia.count(),0);
const results=await Promise.all([grant(p,identity),grant(p2,identity)]);
assert.equal(results.filter(r=>r.created).length,1);assert.equal(await p.creditoCortesia.count(),1);
assert.equal((await grant(p,identity)).balance,2);
await assert.rejects(grant(p,{id:'other',number:'551100009999'}),/IDEMPOTENCY_CONFLICT/);
await p.creditoCortesia.update({where:{id:KEY},data:{saldo:1}});
assert.equal((await grant(p,identity)).balance,1); // Repetition never replenishes spent credit.
assert.deepEqual(await p.user.findUnique({where:{id:u.id}}),u);
assert.equal(await p.subscription.count(),0);assert.equal(await p.avulsoCompra.count(),0);assert.equal(await p.usageEvent.count(),0);
console.log(JSON.stringify({passed:['exact ID/number match','rollback after insert','concurrency one grant','idempotent repeat','key conflict','repeat does not replenish spent credit','user/subscription/payment/usage preserved'],database:'isolated MariaDB'}));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await p.$disconnect();await p2.$disconnect()});
