# Release revisada preparada — 24/09/2026

**Estado: pronta para troca, NÃO ATIVADA. Aguardar confirmação explícita do usuário de que o deploy do Admin concluiu.** Não inferir autorização pela saúde do Admin ou pelo tempo decorrido.

- Repositório: `https://github.com/KingOfSites/backend-judith.git`, branch `main`.
- Commit de código enviado: `e330465bd29a4a7bc88cdc5f067fa0747b89d70d`.
- Checkout de preparação: `/opt/judith-backend/review-e330465`, separado do checkout ativo `app`.
- Imagem pronta: `judith-backend:review-e330465`.
- Digest: `sha256:f6745983c868a181d921d84022c56fa0d74a6c38d82ce3bb4c82d4939d8a4227`; label de revisão identifica o commit acima.
- Backend ativo permanece em `5d0f2cc`, digest `sha256:30db70b57a13bb23fd083b74f99be5d42a907418a9b8ce52ad16b6c017c88abf`. Contêiner original preservado, configuração conferida por SHA-256, saúde pública OK.

## Verificações

Revisão do diff, `git diff --check`, conferência de segredos nos arquivos novos e ausência de mudanças em `prompts/`, `knowledge/` e `prisma/`. `npm test` local e no estágio builder da VPS: build, 33 testes e 39 cenários aprovados, incluindo a normalização da janela com pergunta sem resposta. Nenhuma migration é necessária.

A imagem final de produção, sem substituir seu `dist`, passou na aceitação MariaDB descartável com vetores E5 reais e classificador/contextualizador Anthropic reais: indexar → editar → buscar texto novo, um vetor novo e cinco reaproveitados; continuação LGPD em primeiro; mudança de assunto trabalhista com consulta idêntica à pergunta atual e ranking igual ao de histórico vazio. Recursos isolados e credenciais temporárias removidos.

- [Recibo de preparação](evidence/2026-09-24/deploy-prepared-e330465.json).
- [Aceitação na imagem final](evidence/2026-09-24/acceptance-image-e330465.json).
- [Produção mantida durante a preparação](evidence/2026-09-24/production-staged-e330465.txt).

## Backup e retorno

Pasta restrita: `/opt/judith-backend/backups/review-e330465` (umask 077).

- `database.sql.gz`: dump com `--single-transaction`, rotinas, triggers e eventos; leitura gzip integral e 27 tabelas verificadas. 77.304 bytes; SHA-256 `f9cef2684f25684aa9811b5db11b8473b4ee7fbd0cf867333175147ad96ab9f2`. Não foi executado restore sobre o banco compartilhado.
- `environment.backup`, Compose e override, `prompts.tar.gz`, snapshot de hashes das fichas/prompts e revisão/imagem anteriores. Segredos e dump permanecem exclusivamente na VPS protegida, fora do Git.
- Imagem de retorno preservada: `judith-backend-rollback:pre-review-e330465`.
- `unit-tests.log`, `build.log`, `backup-verification.json`, `acceptance/report.json`, `prepared.json` e marcador `READY`.

## Troca final pendente

Script preparado, validado com `bash -n`, mas **não executado**: `/opt/judith-backend/backups/review-e330465/switch.sh`. Exige argumento `--admin-deploy-confirmed`, que só poderá ser usado depois da confirmação explícita do usuário. Troca somente o backend, usando `--no-build --no-deps`; não toca no serviço local de embeddings, não publica cadernos, não dispara reindexação e não envia mensagens de teste a usuários.

Antes da troca o script confere contêiner/revisão/configuração ainda iguais ao estado preparado, imagem candidata e aceitação aprovada, e tira novo snapshot de fichas/prompts. Divergência exige nova conferência, não sobrescrita automática. Após trocar, confere saúde, digest, parser v3 e hashes. Falha retorna imagem/checkout anteriores; nunca restaura dados automaticamente, preservando escritas legítimas concorrentes. Backup reflete o instante desta preparação; não deve ser usado para apagar alterações posteriores do Admin. Se a ativação for adiada substancialmente, renovar o backup antes da troca.

O Admin deve concluir a adaptação de criação de cadernos com conteúdo inicial válido: vazio recebe 422. Parser v3 exige reindexação futura de publicados, mediante operação autorizada; na preparação foram observados 17 cadernos em revisão e índice vazio. Nenhum conteúdo foi corrigido/publicado. Prompts aprovados e chave do Whisper preservados. Não confundir os testes de recuperação com resposta final pelo WhatsApp, que permanece fora desta validação.
