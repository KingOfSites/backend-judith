# Prompt e base de conhecimento

O prompt jurídico é lido da linha `PRINCIPAL` de `PromptConfig`. As três seções
são editadas em `/prompt` no admin. Cada seção precisa ter pelo menos 1000
caracteres e não pode conter o placeholder de migração.

As fichas são editadas em `/fichas`. Somente fichas `PUBLICADA`, com conteúdo,
entram no contexto da JUDITH jurídica. Rascunhos e fichas em revisão não entram.
O contexto inclui título, área, fontes e conteúdo, em ordem estável. A base
publicada completa é enviada como referência, usando o cache de prompt do modelo.
O volume de fichas publicadas contribui para o tamanho e o custo do contexto.

Prompt e fichas são consultados novamente após 60 segundos de cache. Depois do
deploy desta integração, editar, publicar, despublicar ou excluir pelo admin não
exige reiniciar o bot. Isso não altera as personas dos bots de clientes.

Os arquivos confidenciais `JUDITH-*.md` continuam fora do Git. A cópia na VPS é
referência da migração; o backend atualizado não depende dela para responder.
Os arquivos em `knowledge/` são referências históricas, não a base ativa.

Antes do primeiro deploy, verificar o prompt real no banco e revisar os status
das fichas. Não publicar automaticamente fichas jurídicas ainda em revisão.

Validação local: `npm run build` e `node --test test/conteudo.test.cjs`.
Os testes usam banco e modelo simulados, sem mensagens WhatsApp nem escritas em produção.
