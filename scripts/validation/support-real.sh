set -euo pipefail
umask 077
root=/opt/judith-backend/backups/support-validation-20260924
mkdir -p "$root/build" "$root/evidence" "$root/private"
tar -xzf /tmp/support-validation.tar.gz -C "$root/build"
cat > "$root/build/Dockerfile" <<'DOCKER'
FROM judith-backend:delivery-9959f20
COPY prisma /app/prisma
RUN npx prisma generate
COPY dist /app/dist
COPY test /app/test
DOCKER
docker build --no-cache -t judith-support-validation:isolated "$root/build" > "$root/evidence/build.log" 2>&1
# Copy only API access and editorial text, never production DB or Evolution credentials.
docker exec judith-backend node -e 'const e=require("./dist/config/env.js").env;console.log("ANTHROPIC_API_KEY="+e.ANTHROPIC_API_KEY);console.log("JUDITH_MODEL_HAIKU="+e.JUDITH_MODEL_HAIKU)' > "$root/private/provider.env"
docker exec -i judith-backend node <<'NODE' > "$root/private/prompt.json"
const {prisma:p}=require('./dist/db/client.js');(async()=>{const row=await p.promptConfig.findUnique({where:{chave:'PRINCIPAL'},select:{secaoA:true,secaoB:true,secaoC:true,versao:true}});console.log(JSON.stringify(row));await p.$disconnect()})().catch(()=>{process.exitCode=1});
NODE
docker network create support-isolated-net >/dev/null
cleanup(){ docker rm -f support-isolated-run support-isolated-db >/dev/null 2>&1 || true;docker network rm support-isolated-net >/dev/null 2>&1 || true; rm -f "$root/private/provider.env" "$root/private/prompt.json"; }
trap cleanup EXIT
docker run -d --name support-isolated-db --network support-isolated-net -e MARIADB_ROOT_PASSWORD=isolated_only -e MARIADB_DATABASE=support_isolated mariadb:10.11 >/dev/null
for i in $(seq 1 60);do if docker exec support-isolated-db mariadb-admin ping -h127.0.0.1 -uroot -pisolated_only --silent >/dev/null 2>&1;then break;fi;sleep 1;done
docker run --rm --network support-isolated-net -e DATABASE_URL=mysql://root:isolated_only@support-isolated-db:3306/support_isolated judith-support-validation:isolated npx prisma db push --skip-generate > "$root/evidence/schema.log" 2>&1
docker run --name support-isolated-run --network support-isolated-net --env-file "$root/private/provider.env" -e DATABASE_URL=mysql://root:isolated_only@support-isolated-db:3306/support_isolated -v "$root/private:/private:ro" -v "$root/evidence:/evidence" judith-support-validation:isolated node test/support-real-isolated.cjs 2> "$root/evidence/runner-error.log" | tee "$root/evidence/summary.jsonl"
