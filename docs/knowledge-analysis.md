# Análise anterior à implementação

Inspeção local em 23/09/2026, antes de editar arquivos. Nenhum AGENTS.md aplicável encontrado no repositório ou ancestrais. Nenhuma consulta ao MySQL compartilhado realizada.

- `getBaseConhecimento`: lê `FichaConhecimento` PUBLICADA, concatena título/área/fontes/conteúdo de todas as fichas, cache de 60s; sem parser.
- `askJudith`: seções A/B/C de PromptConfig e perfil; injetava base em todas as funções. Prompts aprovados permanecem intactos.
- `routeIntent`: anexo/análise e gatilhos de redação; restante `duvida` (Haiku ou Sonnet). Onboarding e cotas precedem a chamada.
- Fonte ativa: MySQL `FichaConhecimento`. Admin escreve diretamente, status RASCUNHO/EM_REVISAO/PUBLICADA e exclusão física. `knowledge/` contém 17 referências históricas em Markdown, não importadas automaticamente. Sintaxe observada: frontmatter `area:`, título #, seções ##. Existem áreas antigas inválidas, como consumo, civil-contratual, empresarial-tributario. Não converter automaticamente.
- `base-propaganda`, `base-guias` e os ~19 cadernos ativos não estão nos arquivos locais examinados. Os testes desses dois nomes usam fixtures representativas, não originais.
- Prisma/MySQL compartilhados; schema contém usuários, sessões, mensagens, planos/cobranças, créditos, bots multi-tenant, dicas, PromptConfig e FichaConhecimento. SemanticCache guarda hash/resposta, não vetores, e não é usado na recuperação.
- Sem fila persistida, worker ou infraestrutura vetorial. Webhook responde e processa assíncrono no mesmo processo. Integrações: Anthropic, OpenAI (Whisper), Evolution, Web Judith/Mercado Pago via chamada interna.
- Admin local em `Desktop/ADMIN JUDITH/admin-judith`: sessão HMAC em cookie, validação na camada de autenticação; CRUD usa Prisma. Tem limite explícito de 65.535 bytes em criação/edição. Schema FichaConhecimento igual ao Backend (TEXT). Web Judith em `Desktop/WEB JUDITH/web-judith` não declara FichaConhecimento/PromptConfig; demais modelos compartilhados. Há também outra cópia de backend em Desktop/WEB JUDITH/backend-judith.
- Contrato servidor-servidor existente: `x-internal-key`, `INTERNAL_API_KEY`, usado pelo Backend/Web Judith. Reutilizado para Admin chamar endpoints no servidor, nunca no navegador. Admin mantém sua sessão para autorizar o proxy.

Decisão: tabelas novas isoladas para índice/cache/jobs; alargamento compatível TEXT → LONGTEXT na fonte. Sem exclusão ou alteração de conteúdo, de enums existentes ou prompts. Índice preparado fora da transação e substituído atomicamente após verificar fontes sob locks; leitura verifica fonte/publicação atuais. Cache de embeddings por texto/modelo/versão, sem banco vetorial adicional. Jobs persistidos com exclusão mútua e lease. Sincronização dos schemas e remoção do limite no Admin são necessárias antes da adoção; outros repositórios não foram editados.
