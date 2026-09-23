# Prompt e base de conhecimento

O prompt jurídico é lido da linha `PRINCIPAL` de `PromptConfig`. As três seções
são editadas em `/prompt` no admin. Cada seção precisa ter pelo menos 1000
caracteres e não pode conter o placeholder de migração.

As fichas são editadas em `/fichas`. Somente fichas `PUBLICADA`, com conteúdo,
entram no contexto da JUDITH jurídica. Rascunhos e fichas em revisão não entram.
Somente a função `duvida` consulta a base. O contexto inclui até cinco chunks
integrais, filtrados por área antes da similaridade semântica, com título e fontes.
Indexação, autenticação do Admin e migração estão em [Base de conhecimento](../docs/knowledge-base.md).

O prompt mantém seu cache de 60 segundos. A base usa índice persistido e verifica
publicação e versão atuais da fonte; alterações exigem reindexação para aparecer,
sem reiniciar o bot. Despublicações/exclusões deixam de ser elegíveis na busca.
Isso não altera as personas dos bots de clientes.

Os arquivos confidenciais `JUDITH-*.md` continuam fora do Git. A cópia na VPS é
referência da migração; o backend atualizado não depende dela para responder.
Os arquivos em `knowledge/` são referências históricas, não a base ativa.

Antes do primeiro deploy, verificar o prompt real no banco e revisar os status
das fichas. Não publicar automaticamente fichas jurídicas ainda em revisão.

Validação local: `npm run build` e `node --test test/conteudo.test.cjs`.
Os testes usam banco e modelo simulados, sem mensagens WhatsApp nem escritas em produção.
