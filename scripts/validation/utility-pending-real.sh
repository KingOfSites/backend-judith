set -euo pipefail
umask 077
root=/opt/judith-backend/backups/utility-pending-v11-20260924
mkdir -p "$root/build" "$root/evidence" "$root/private"
cleanup(){ docker rm -f utility-run utility-db utility-embeddings >/dev/null 2>&1 || true; docker network rm utility-net >/dev/null 2>&1 || true; rm -f "$root/private/provider.env" "$root/private/snapshot.json"; }
trap cleanup EXIT
tar -xzf /tmp/utility-validation.tar.gz -C "$root/build"
cat > "$root/build/Dockerfile" <<'DOCKER'
FROM judith-backend:delivery-9959f20
COPY prisma /app/prisma
RUN npx prisma generate
COPY dist /app/dist
COPY test /app/test
DOCKER
docker build --no-cache -t judith-utility-validation:isolated "$root/build" > "$root/evidence/build.log" 2>&1
docker exec judith-backend node -e 'const e=require("./dist/config/env.js").env;console.log("ANTHROPIC_API_KEY="+e.ANTHROPIC_API_KEY);console.log("JUDITH_MODEL_HAIKU="+e.JUDITH_MODEL_HAIKU)' > "$root/private/provider.env"
# Read-only, consistent snapshot: no contacts, history, credits or payments.
docker exec -i judith-backend node <<'NODE' > "$root/private/snapshot.json"
const {prisma:p}=require('./dist/db/client.js');
(async()=>{const data=await p.$transaction(async tx=>{
 const sources=await tx.fichaConhecimento.findMany({where:{status:'PUBLICADA'}});
 const documents=await tx.knowledgeDocument.findMany({where:{sourceId:{in:sources.map(x=>x.id)}}});
 const chunks=await tx.knowledgeChunk.findMany({where:{sourceId:{in:documents.map(x=>x.sourceId)}}});
 const areas=await tx.knowledgeChunkArea.findMany({where:{chunkId:{in:chunks.map(x=>x.id)}}});
 const embeddings=await tx.knowledgeEmbedding.findMany({where:{id:{in:[...new Set(chunks.map(x=>x.embeddingId))]}}});
 const prompt=await tx.promptConfig.findUnique({where:{chave:'PRINCIPAL'},select:{secaoA:true,secaoB:true,secaoC:true,versao:true}});
 return {sources,documents,chunks,areas,embeddings,prompt};
},{isolationLevel:'RepeatableRead',timeout:60000});console.log(JSON.stringify(data));await p.$disconnect()})().catch(()=>{process.exitCode=1});
NODE
docker network create utility-net >/dev/null
docker run -d --name utility-db --network utility-net -e MARIADB_ROOT_PASSWORD=isolated_only -e MARIADB_DATABASE=utility_isolated mariadb:10.11 >/dev/null
docker run -d --name utility-embeddings --network utility-net --cpus=0.75 --memory=3g --memory-swap=3g --read-only --cap-drop=ALL --security-opt=no-new-privileges:true judith-embeddings:e5-large-int8-v1 >/dev/null
for i in $(seq 1 60);do if docker exec utility-db mariadb-admin ping -h127.0.0.1 -uroot -pisolated_only --silent >/dev/null 2>&1;then break;fi;sleep 1;done
for i in $(seq 1 60);do if docker exec utility-embeddings python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8080/health')" >/dev/null 2>&1;then break;fi;sleep 1;done
docker run --rm --network utility-net -e DATABASE_URL=mysql://root:isolated_only@utility-db:3306/utility_isolated judith-utility-validation:isolated npx prisma db push --skip-generate > "$root/evidence/schema.log" 2>&1
docker run --name utility-run --network utility-net --env-file "$root/private/provider.env" -e DATABASE_URL=mysql://root:isolated_only@utility-db:3306/utility_isolated -v "$root/private:/private:ro" -v "$root/evidence:/evidence" judith-utility-validation:isolated node test/utility-pending-real-isolated.cjs 2> "$root/evidence/runner-error.log" | tee "$root/evidence/summary.jsonl"
