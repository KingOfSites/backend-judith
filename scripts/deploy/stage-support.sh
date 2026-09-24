set -euo pipefail
umask 077
cd /opt/judith-backend
revision=${1:?full revision required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
export RELEASE_REVISION="$revision"
receipt=/opt/judith-backend/backups/support-$revision
export RELEASE_RECEIPT="$receipt"
release_dir=/opt/judith-backend/support-$revision
test "$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' judith-backend)" = 9959f206770b1104d9d1cf4f8e7b1a2f372a58e9
mkdir -p "$receipt"
test ! -e "$receipt/previous-image.txt"
test -z "$(git -C app status --porcelain)"
git -C app rev-parse HEAD > "$receipt/previous-revision.txt"
docker inspect --format '{{.Image}}' judith-backend > "$receipt/previous-image.txt"
docker inspect --format '{{.Id}}' judith-backend > "$receipt/previous-container.txt"
docker tag "$(cat "$receipt/previous-image.txt")" judith-backend-rollback:pre-support-$revision
cp docker-compose.yml "$receipt/docker-compose.yml"
cp docker-compose.override.yml "$receipt/docker-compose.override.yml"
cp .env "$receipt/environment.backup"
tar -czf "$receipt/prompts.tar.gz" prompts
sha256sum docker-compose.yml docker-compose.override.yml .env > "$receipt/config.sha256"
docker compose exec -T backend node <<'NODE' > "$receipt/before.json"
const {prisma:db}=require('./dist/db/client.js'),crypto=require('crypto');
(async()=>{const assert=require('assert/strict');assert.equal(await db.knowledgeJob.count({where:{status:{in:['pending','processing']}}}),0);const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');const s=await db.fichaConhecimento.findMany({orderBy:{id:'asc'}}),p=await db.promptConfig.findMany({orderBy:{id:'asc'}});console.log(JSON.stringify({at:new Date().toISOString(),sourceHash:hash(s),promptHash:hash(p),sources:s.length,statuses:s.reduce((a,s)=>(a[s.status]=(a[s.status]||0)+1,a),{}),documents:await db.knowledgeDocument.count(),chunks:await db.knowledgeChunk.count(),jobs:await db.knowledgeJob.count()}))})().catch(()=>{process.exitCode=1}).finally(()=>db.$disconnect());
NODE
python3 - <<'PY'
import subprocess,json,urllib.parse,pathlib,gzip,hashlib,os
p=pathlib.Path(os.environ['RELEASE_RECEIPT'])
d=json.loads(subprocess.check_output(['docker','inspect','judith-backend']))[0]
env=dict(x.split('=',1) for x in d['Config']['Env']); u=urllib.parse.urlparse(env['DATABASE_URL'])
def q(v): return '"'+str(v).replace('\\','\\\\').replace('"','\\"').replace('\n','\\n')+'"'
config=p/'mysql-client.cnf'
config.write_text('[client]\nhost='+q(u.hostname)+'\nport='+str(u.port or 3306)+'\nuser='+q(urllib.parse.unquote(u.username))+'\npassword='+q(urllib.parse.unquote(u.password))+'\n')
try:
 with gzip.open(p/'database.sql.gz','wb') as out:
  proc=subprocess.Popen(['mysqldump','--defaults-extra-file='+str(config),'--single-transaction','--quick','--routines','--triggers','--events','--hex-blob','--no-tablespaces',u.path.lstrip('/')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
  while True:
   buf=proc.stdout.read(1024*1024)
   if not buf: break
   out.write(buf)
  if proc.wait()!=0: raise RuntimeError('BACKUP_FAILED')
finally: config.unlink(missing_ok=True)
with gzip.open(p/'database.sql.gz','rb') as f:
 count=0
 for line in f:
  if line.startswith(b'CREATE TABLE'): count+=1
assert count>=27,count
v={'tables':count,'bytes':(p/'database.sql.gz').stat().st_size,'sha256':hashlib.sha256((p/'database.sql.gz').read_bytes()).hexdigest()}
(p/'backup-verification.json').write_text(json.dumps(v))
print('BACKUP_VERIFIED='+json.dumps(v))
PY
git -C app fetch /tmp/judith-support.bundle main
test "$(git -C app rev-parse FETCH_HEAD)" = "$revision"
git -C app merge-base --is-ancestor HEAD FETCH_HEAD
git -C app worktree add --detach /opt/judith-backend/support-$revision FETCH_HEAD
docker build --target builder -t judith-backend-test:support-$revision support-$revision > "$receipt/build-test.log" 2>&1
docker run --rm --network none -v /opt/judith-backend/support-$revision/test:/app/test:ro -v /opt/judith-backend/support-$revision/knowledge:/app/knowledge:ro judith-backend-test:support-$revision npm test > "$receipt/unit-tests.log" 2>&1
echo IMAGE_TESTS_OK
docker build --label org.opencontainers.image.revision="$revision" -t judith-backend:support-$revision support-$revision > "$receipt/build.log" 2>&1
docker image inspect judith-backend:support-$revision --format '{{.Id}}' > "$receipt/candidate-image.txt"
test "$(docker inspect --format '{{.Id}}' judith-backend)" = "$(cat "$receipt/previous-container.txt")"
sha256sum -c "$receipt/config.sha256" > "$receipt/config-check.txt"
touch "$receipt/READY"
echo IMAGE_PREPARED_NOT_ACTIVATED
