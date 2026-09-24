#!/usr/bin/env bash
# FUTURE AUTHORIZED OPERATION ONLY. Never called by preparation or tests.
set -euo pipefail
umask 077
mode=${1:-}
if [[ "$mode" = --apply-reviewed-18 ]]; then
 test "$#" = 1
elif [[ "$mode" = --recover-created ]]; then
 test "$#" = 2
else
 echo 'Explicit --apply-reviewed-18 or --recover-created RECEIPT required' >&2
 exit 1
fi
base=/opt/judith-backend/backups/import-review-20260924
payload="$base/prepared"
image=judith-backend:review-e330465
manifest=99886b09a8850e0896d0e67feeee2d53a722931e8ef2a87075e115d9631c6e5e
cd "$payload"
sha256sum --check SHA256SUMS
test "$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = e330465bd29a4a7bc88cdc5f067fa0747b89d70d
operation=$(mktemp -d "$base/apply-18-XXXXXXXX")
if [[ "$mode" = --recover-created ]]; then
 # Receipt must be an existing file inside this operation family; never accept a traversal outside it.
 receipt=$(realpath -- "$2")
 [[ "$receipt" = "$base"/apply-18-*/*.attempt-*.json ]]
 test -f "$receipt"
 cp -- "$receipt" "$operation/recovery-input.json"
fi
export JUDITH_IMPORT_OPERATION="$operation"
trap 'rm -f "$operation/database.env" "$operation/mysql-client.cnf"' EXIT
python3 - <<'PY'
import os,subprocess,json,urllib.parse,pathlib,gzip,hashlib
p=pathlib.Path(os.environ['JUDITH_IMPORT_OPERATION'])
d=json.loads(subprocess.check_output(['docker','inspect','judith-backend']))[0]
env=dict(x.split('=',1) for x in d['Config']['Env']);url=env['DATABASE_URL'];u=urllib.parse.urlparse(url)
def q(v): return '"'+str(v).replace('\\','\\\\').replace('"','\\"').replace('\n','\\n')+'"'
config=p/'mysql-client.cnf'
config.write_text('[client]\nhost='+q(u.hostname)+'\nport='+str(u.port or 3306)+'\nuser='+q(urllib.parse.unquote(u.username))+'\npassword='+q(urllib.parse.unquote(u.password))+'\n');config.chmod(0o600)
try:
 with gzip.open(p/'database.sql.gz','wb') as out:
  proc=subprocess.Popen(['mysqldump','--defaults-extra-file='+str(config),'--single-transaction','--quick','--routines','--triggers','--events','--hex-blob','--no-tablespaces',u.path.lstrip('/')],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
  while True:
   chunk=proc.stdout.read(1024*1024)
   if not chunk: break
   out.write(chunk)
  if proc.wait()!=0: raise RuntimeError('BACKUP_FAILED')
finally: config.unlink(missing_ok=True)
with gzip.open(p/'database.sql.gz','rb') as stream:
 tables=sum(1 for line in stream if line.startswith(b'CREATE TABLE'))
assert tables>=27,'INCOMPLETE_BACKUP'
(p/'backup-verification.json').write_text(json.dumps({'tables':tables,'sha256':hashlib.sha256((p/'database.sql.gz').read_bytes()).hexdigest()}))
(p/'database.env').write_text('DATABASE_URL='+url+'\n');(p/'database.env').chmod(0o600)
PY
runner=(docker run --rm --network container:judith-backend --env-file "$operation/database.env"
 -v "$payload/scripts:/app/scripts:ro" -v "$payload/review:/app/review:ro" -v "$operation:/operation" "$image")
"${runner[@]}" node scripts/knowledge-snapshot.cjs > "$operation/before.json"
if [[ "$mode" = --apply-reviewed-18 ]]; then
 "${runner[@]}" node scripts/knowledge-import-execute.cjs --apply \
  --batch /app/review/knowledge-2026-09-24 --manifest-sha256 "$manifest" \
  --snapshot /operation/before.json --receipt /operation/import-commit.json | tee "$operation/result.json"
else
 "${runner[@]}" node scripts/knowledge-import-execute.cjs --recover --receipt /operation/recovery-input.json | tee "$operation/result.json"
fi
"${runner[@]}" node scripts/knowledge-snapshot.cjs > "$operation/after.json"
echo "OPERATION_RECEIPTS=$operation"
