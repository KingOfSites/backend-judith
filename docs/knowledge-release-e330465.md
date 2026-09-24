# Release revisada preparada — 24/09/2026

**Estado atualizado: ATIVADA em 24/09/2026, verificação pós-deploy às 15:11 UTC.** Usuário confirmou Admin `ed89a7c`, deploy Ready, login e acesso à base verificados, e autorizou expressamente a troca e a reindexação dos publicados. O registro de preparação abaixo é histórico.

## Resultado da ativação

- Revisão efetivamente em execução: `e330465bd29a4a7bc88cdc5f067fa0747b89d70d`; digest `sha256:f6745983c868a181d921d84022c56fa0d74a6c38d82ce3bb4c82d4939d8a4227`; parser `markdown-v3`. Checkout `app` na mesma revisão, detached conforme script.
- Saúde local e pública: HTTP 200, `status=ok`, versão de prompt `v22072026`. Backend running, zero reinícios e OOM.
- Embeddings preservados na imagem `sha256:75ac08ff63f56c2c614046c73a8af81c839149c2495193f223cf3496729c86ee`, healthy, sem porta publicada, zero reinícios/OOM. Chamada real pelo provider do backend ativo produziu vetor local E5 de 1024 dimensões, norma 1.
- Validação autenticada local **e pública**: vazio, capa com prosa sem capítulos, apenas `###` e `##` sem conteúdo retornaram 422, `SEM_BLOCOS`, com instrução de capítulo `##` e conteúdo. Texto sintético válido retornou 200, `valid=true`, um chunk civil. Essas chamadas não persistiram cadernos.
- Reindexação solicitada com `requestKey=release-e330465-published-20260924`, HTTP 202. Job `cmufo6pfa0000jq80xf40lxkl`: **completed**, criado às 15:11:36.503Z e concluído às 15:11:40.004Z; total/processados/chunks/embeddings criados = **0**, sem erros. Não havia cadernos PUBLICADA; as 17 fichas continuam EM_REVISAO. Índice permanece vazio. Esse sucesso operacional não significa que exista conteúdo jurídico disponível.
- SHA-256 de todas as fichas e prompts idênticos ao snapshot imediatamente anterior à troca: `9f59935593b94475c67d96f9f5903dc7a5b728a7d52ee0f6e58e9d566ae89546` e `1e57c34b004ab4fe8c827931ec15df93af7d39f39086b6c8fca4dfdaf115328f`.
- Backup recente de 27 tabelas e prompts revalidado por gzip antes da ativação. Rollback não foi necessário. Script autônomo disponível e validado por sintaxe: `/opt/judith-backend/backups/review-e330465/rollback.sh --rollback-image-only`, usando a imagem anterior preservada. Não restaura o banco nem desfaz escritas editoriais posteriores automaticamente.

[Recibo integral de validação, embeddings e job](evidence/2026-09-24/post-activation-e330465.json). [Revisão, digest e estado dos contêineres](evidence/2026-09-24/runtime-e330465.txt). Evidências remotas: `activation.log`, `post-activation.json`, `runtime.txt`, `pre-switch.json` na pasta de backup. Sem migration, alteração de área/prompt, publicação adicional ou mensagens a usuários reais.

### Pendências após deploy

1. Admin hospedado: confirmação de Ready/login/acesso à base foi fornecida pelo usuário. Ainda não foi executado nesta rodada o fluxo completo pela interface hospedada após a troca (exibição do 422, criação/edição/reabertura de conteúdo válido e acompanhamento visual do job). A API pública do backend foi verificada diretamente; isso não substitui a conferência do proxy/interface do Admin.
2. Corpus: responsáveis precisam decidir importação/revisão/publicação dos cadernos; não foram publicados automaticamente. Permanecem as pendências editoriais de áreas e escopo de `###` registradas na revisão. Nova operação editorial exige nova requestKey para reindexação.
3. WhatsApp: não houve envio de mensagens reais nem teste de resposta final hospedada. A aceitação semântica em banco isolado e o health da produção não comprovam esse percurso. Com zero publicados, não há contexto jurídico disponível para geração; o caminho de ausência de conteúdo deve avisar explicitamente, como coberto nos testes locais.

## Histórico da preparação (antes da autorização)

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
