// Administrative operation only; no HTTP route and no messaging/payment calls.
const KEY = 'courtesy-20260924-4822-duvida-2-v1';
const AUDIT = JSON.stringify({ator:'admin-autorizado-via-codex',motivo:'2 duvidas para teste WhatsApp autorizado em 24/09/2026'});
async function grant(db, identity, hooks = {}) {
  if (!identity?.id || !/^\d{12,13}$/.test(identity.number)) throw Error('INVALID_IDENTITY');
  return db.$transaction(async tx => {
    const locked = await tx.$queryRaw`SELECT id FROM User WHERE id = ${identity.id} AND whatsappNumber = ${identity.number} FOR UPDATE`;
    if (locked.length !== 1) throw Error('IDENTITY_MISMATCH');
    const previous = await tx.creditoCortesia.findUnique({where:{id:KEY}});
    if (previous && (previous.userId !== identity.id || previous.servico !== 'DUVIDA' || previous.quantidade !== 2 || previous.criadoPor !== AUDIT)) throw Error('IDEMPOTENCY_CONFLICT');
    const row = previous || await tx.creditoCortesia.create({data:{id:KEY,userId:identity.id,servico:'DUVIDA',quantidade:2,saldo:2,criadoPor:AUDIT}});
    if(hooks.afterCreate) await hooks.afterCreate();
    const total=await tx.creditoCortesia.aggregate({where:{userId:identity.id,servico:'DUVIDA'},_sum:{saldo:true}});
    return {key:KEY,created:!previous,quantity:row.quantidade,balance:row.saldo,totalDoubtCourtesy:total._sum.saldo||0,audit:JSON.parse(row.criadoPor),createdAt:row.createdAt};
  }, {maxWait:10000,timeout:15000});
}
module.exports={grant,KEY,AUDIT};
