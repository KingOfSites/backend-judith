#!/bin/bash
set -euo pipefail
umask 077
revision=${1:?full revision required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
export RELEASE_REVISION="$revision"
cd /opt/judith-backend
r=/opt/judith-backend/backups/support-$revision
export RELEASE_RECEIPT="$r"
test -f "$r/READY"
test "$(docker inspect --format '{{.Id}}' judith-backend)" = "$(cat "$r/previous-container.txt")"
test "$(git -C app rev-parse HEAD)" = "$(cat "$r/previous-revision.txt")"
test -z "$(git -C app status --porcelain)"
sha256sum -c "$r/config.sha256" >/dev/null
gzip -t "$r/database.sql.gz" "$r/prompts.tar.gz"
test "$(docker image inspect judith-backend:support-$revision --format '{{.Id}}')" = "$(cat "$r/candidate-image.txt")"
cat > "$r/rollback.sh" <<'ROLLBACK'
#!/bin/bash
set -euo pipefail
r=$(cd "$(dirname "$0")" && pwd)
cd /opt/judith-backend
docker tag "$(cat "$r/previous-image.txt")" judith-backend-backend
docker compose up -d --no-build --no-deps backend
git -C app switch --detach "$(cat "$r/previous-revision.txt")"
# Additive audit table stays intact. Never restore/drop real data automatically.
echo ROLLED_BACK_IMAGE_ONLY_AUDIT_PRESERVED
ROLLBACK
chmod 700 "$r/rollback.sh"
# Only the reviewed additive SQL, not Prisma migration history or db push.
python3 - <<'PY'
import os,pathlib,subprocess,json,urllib.parse
r=pathlib.Path(os.environ['RELEASE_RECEIPT'])
d=json.loads(subprocess.check_output(['docker','inspect','judith-backend']))[0]
env=dict(x.split('=',1) for x in d['Config']['Env']);u=urllib.parse.urlparse(env['DATABASE_URL'])
def q(v): return '"'+str(v).replace('\\','\\\\').replace('"','\\"').replace('\n','\\n')+'"'
cnf=r/'mysql-client.cnf'
cnf.write_text('[client]\nhost='+q(u.hostname)+'\nport='+str(u.port or 3306)+'\nuser='+q(urllib.parse.unquote(u.username))+'\npassword='+q(urllib.parse.unquote(u.password))+'\n')
try:
 cmd=['mysql','--defaults-extra-file='+str(cnf),'--batch','--skip-column-names',u.path.lstrip('/')]
 def sql(s): return subprocess.check_output(cmd,input=s.encode(),stderr=subprocess.DEVNULL).decode().strip()
 exists=sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='KnowledgeInteraction'")
 assert exists=='0','AUDIT_TABLE_ALREADY_EXISTS_STOP_FOR_REVALIDATION'
 migration=pathlib.Path('/opt/judith-backend/support-'+os.environ['RELEASE_REVISION']+'/prisma/migrations/202609240002_knowledge_interaction/migration.sql')
 sql(migration.read_text())
 columns=sql("SELECT CONCAT(column_name,':',data_type) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='KnowledgeInteraction' ORDER BY ordinal_position").splitlines()
 assert columns==['id:varchar','payload:longtext','createdAt:datetime','updatedAt:datetime'],columns
 assert sql('SELECT COUNT(*) FROM KnowledgeInteraction')=='0'
 (r/'migration.json').write_text(json.dumps({'migration':'202609240002_knowledge_interaction','created':True,'columns':columns,'rowsAfterMigration':0}))
 print('ADDITIVE_AUDIT_MIGRATION_OK')
finally: cnf.unlink(missing_ok=True)
PY
rollback_on_error(){ echo ACTIVATION_FAILED_ROLLING_BACK; bash "$r/rollback.sh"; }
trap rollback_on_error ERR
git -C app switch --detach "$revision"
docker tag judith-backend:support-$revision judith-backend-backend
docker compose up -d --no-build --no-deps backend
healthy=false
for i in $(seq 1 25); do
 if curl -fsS --max-time 3 http://127.0.0.1:3020/health > "$r/health-after.json" 2>/dev/null; then healthy=true;break;fi
 sleep 2
done
test "$healthy" = true
test "$(docker inspect --format '{{.Image}}' judith-backend)" = "$(cat "$r/candidate-image.txt")"
docker exec -i judith-backend node < "/opt/judith-backend/support-$revision/scripts/deploy/verify-support.cjs" > "$r/verification.json"
python3 - <<'PY'
import json,os,pathlib
r=pathlib.Path(os.environ['RELEASE_RECEIPT']);before=json.loads((r/'before.json').read_text());after=json.loads((r/'verification.json').read_text())
assert after['ok']
for k in ['sourceHash','promptHash','sources','statuses','documents','chunks','jobs']: assert before[k]==after[k],k
after['protectedStateUnchanged']=True
(r/'verification.json').write_text(json.dumps(after,indent=2))
PY
sha256sum -c "$r/config.sha256" > "$r/config-check-after.txt"
docker inspect judith-backend --format 'REVISION={{index .Config.Labels "org.opencontainers.image.revision"}} IMAGE={{.Image}} STATE={{.State.Status}} RESTARTS={{.RestartCount}}' | tee "$r/deployment.txt"
trap - ERR
echo ACTIVATED_VERIFIED_NO_CONTENT_OR_MESSAGES_WRITTEN
