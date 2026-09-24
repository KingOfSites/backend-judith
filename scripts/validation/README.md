# Procedimentos preservados da validação de 24/09/2026

Estes scripts registram os ensaios isolados usados nesta entrega. Não são tarefas de deploy, importação ou envio de WhatsApp. Não executar automaticamente em produção.

- `utility-pending-real.sh`: seis perguntas delimitadas, snapshot somente de leitura dos cadernos/índice/prompt, MariaDB e embeddings descartáveis e Anthropic real. Chamadas WhatsApp bloqueadas pelo harness. O snapshot não contém usuários reais.
- `support-real.sh`: controles e falhas de auditoria/suporte no MariaDB isolado, com o provedor real.

Requerem VPS Docker, imagens históricas indicadas no arquivo e pacotes em `/tmp/utility-validation.tar.gz` ou `/tmp/support-validation.tar.gz`. Os pacotes contêm somente `dist`, `prisma` e `test` do checkout desejado, criados após `npm run build`. Credenciais do provedor são obtidas internamente pelo procedimento existente e removidas na limpeza; não devem ser copiadas para o GitHub. Os recibos desta entrega estão em `docs/evidence/2026-09-24/`.

Os nomes de recursos de teste são fixos: não executar simultaneamente dois ensaios que compartilhem esses nomes. Os caminhos e tags registram o ambiente histórico; antes de repetir, revalidar o isolamento e usar diretório novo para não substituir evidências anteriores. Esses scripts não comprovam entrega pelo WhatsApp nem validade jurídica de cadernos.
