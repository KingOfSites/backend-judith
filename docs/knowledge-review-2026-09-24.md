# Retomada da base — 24/09/2026

> **Publicação concluída:** `e330465` ativo na VPS após autorização do usuário e confirmação do Admin `ed89a7c`. Saúde/embeddings/validação conferidos; reindexação completed sem cadernos publicados; fichas e prompts preservados. [Resultados e pendências hospedadas/WhatsApp](knowledge-release-e330465.md). Os estados locais/sem deploy descritos nas rodadas abaixo são históricos.

## Revisão integrada — normalização da janela de histórico

Correção local posterior à aceitação real abaixo, sem deploy e sem acesso a dados reais. O provedor de resposta continua sendo Anthropic Messages via `@anthropic-ai/sdk`. Conferidos os comentários do SDK instalado (`resources/messages/messages.d.ts`, seção `messages`, linha 1960) e o [contrato oficial de criação de mensagens](https://platform.claude.com/docs/en/api/messages/create): mensagens consecutivas do mesmo papel são combinadas pelo provedor. Portanto, perguntas sem resposta podem permanecer consecutivas; não devem ser apagadas nem receber respostas artificiais para forçar alternância. Não foi feito ensaio HTTP real de rejeição da janela nesta rodada.

**Reprodução:** o teste de fluxo constrói uma dúvida respondida, uma com falha de busca e mais sete respondidas. São 17 registros; a consulta das últimas 16 começa pela resposta à primeira dúvida, cujo usuário ficou fora da janela. Antes da correção, o teste falhou porque a primeira mensagem enviada era `assistant`, quando se esperava `user`.

**Correção:** `askJudith` localiza o primeiro `user` no histórico e usa uma cópia da janela a partir dele, tanto na recuperação quanto na montagem de `messages`. Se a janela estiver vazia ou tiver somente respostas órfãs, usa histórico vazio. Remove apenas respostas órfãs no início do contexto enviado; não altera registros, ordem ou texto das perguntas preservadas. A pergunta atual continua anexada uma única vez, depois do histórico; a leitura da janela permanece anterior à gravação da entrada atual. Não houve mudança em deduplicação, transação de consumo, parser ou regra de `###`.

**Regressões aprovadas:**

- Sequência solicitada: a mensagem inicial enviada passa a ser a pergunta que falhou; os 17 registros anteriores permanecem idênticos. O payload contém 15 mensagens históricas válidas mais a pergunta atual, uma única vez.
- Janela vazia e janela composta apenas por respostas órfãs: somente a pergunta atual; várias respostas órfãs iniciais são descartadas sem mutar o array recebido.
- Três perguntas sem resposta, seguidas de uma nova: as quatro mensagens `user` são preservadas em ordem; nenhuma resposta artificial é inserida. Há um único consumo para a resposta bem-sucedida.
- Reentrega do ID da pergunta atual: continuam 19 registros e nove consumos após a sequência completa; não há duplicação de pergunta, resposta ou cobrança. A dúvida que falhou não consumiu crédito.

`npm test` aprovado: build, **33 testes node:test e 39 cenários de fluxo**; `git diff --check` sem erros. O mock de leitura de histórico agora retorna efetivamente a janela de registros persistidos em memória, em ordem decrescente, em vez de sempre devolver `[]`, exercitando `loadHistory → askJudith → messages.create`. Banco, geração e WhatsApp são simulados nesses testes, com rede bloqueada. Os recibos de vetores reais da segunda revisão continuam válidos para aquela versão e não são apresentados como validação real desta correção posterior. Prompts e dados existentes preservados.

## Segunda revisão — estado local final, sem deploy (14:15 UTC)

Esta seção substitui as conclusões de comportamento da primeira revisão abaixo. Produção continua em `5d0f2cc`; o código desta revisão foi montado somente em contêiner descartável de teste.

### Conversa, conteúdo e falhas

- “Oi”, “obrigado” e “qual seu nome?” recebem respostas locais, breves, depois do onboarding e antes da cota. Não consultam RAG, classificador, gerador nem checkout e não consomem crédito. Correspondência é da mensagem inteira, para não descartar uma pergunta jurídica precedida de saudação.
- Classificação `nenhuma` retorna `KNOWLEDGE_OUT_OF_SCOPE`, explicando o escopo e pedindo assunto/detalhes quando pertinente, sem recomendação de repetir depois.
- Área válida sem candidatos publicados/disponíveis retorna `KNOWLEDGE_NO_CONTEXT`: ainda não há conteúdo disponível na base para aquela área. Não oferece orientação sem referência nem sugere que esperar resolverá falta de conteúdo.
- Falhas técnicas de classificação/serviços/vetores continuam explícitas e sugerem tentar novamente. Nenhum desses caminhos registra consumo ou resposta jurídica de sucesso. Lista editorial de 12 áreas e filtro SQL intactos.

### Consulta curta e histórico

O embedding não recebe mais o histórico completo. Para uma pergunta com histórico, uma chamada técnica ao Haiku seleciona `contexto=null` (pergunta autossuficiente/mudança de assunto) ou um único trecho literal de até 300 caracteres de uma das últimas oito mensagens do usuário. A chamada usa ferramenta estruturada `select_context`; respostas anteriores da JUDITH são excluídas **antes** dessa seleção. O backend verifica tamanho e ocorrência literal do trecho; não aceita fatos acrescentados. Consulta = pergunta atual, opcionalmente seguida daquele trecho. Classificação e embedding usam a mesma consulta curta; nenhuma herança automática de área ou busca sem filtro.

Mensagens admitidas pela cota são gravadas como USER antes da busca/geração. Falha técnica, falta de conteúdo, resposta vazia ou falha na confirmação de uso não apagam a pergunta nem criam cobrança/ASSISTANT de sucesso. ID determinístico baseado no usuário e no ID de transporte do WhatsApp usa a chave primária existente de Message: reentrega do mesmo evento não duplica a linha nem reexecuta a resposta; uma nova mensagem com novo ID pode tentar novamente. Não houve migration. A pergunta atual é carregada separadamente, sem entrar duas vezes no contexto.

Limites: falha na própria persistência impede garantir gravação e aborta antes de gerar/cobrar. A deduplicação depende do ID de transporte (presente no webhook); chamadas internas sem ID não têm essa garantia. Eventos já persistidos são tratados como recebidos, sem replay automático após crash ou falha de envio; retry do usuário usa mensagem nova. Onboarding, mensagens sociais e recusas de acesso/cota mantêm seus caminhos próprios e não entram no histórico jurídico por esta mudança.

### Cadernos sem blocos

Parser/validação/indexador rejeitam zero blocos com `campo=conteudo`, `valor=SEM_BLOCOS` e mensagem exigindo ao menos um capítulo `##` seguido de conteúdo. HTTP 422 para vazio, capa com prosa, títulos vazios ou somente `###` sem capítulo. Áreas da capa continuam validadas; a regra de `###` não mudou.

**Pendência concreta do Admin:** `NovaFichaForm.tsx`, inspecionado em leitura, cria rascunho enviando `conteudo: ""`. Com esta validação, esse fluxo será bloqueado corretamente por 422; antes de um deploy coordenado, o Admin deve permitir fornecer conteúdo inicial válido antes do POST. Não introduzir texto fictício, exceção silenciosa para vazio ou publicação automática. O Admin não foi alterado nesta rodada.

### Evidências desta versão

`npm test`: build, **33 testes node:test e 36 cenários de fluxo aprovados**. Inclui HTTP 422, rejeição de contexto inventado, exclusão do texto da assistente, consulta de continuação, mudança de assunto, três conversas comuns sem cota, mensagens distintas por motivo de indisponibilidade, pergunta preservada em falha, reentrega deduplicada e retry com ID novo. Em concorrência, permanece apenas um consumo permitido; não se exige apagar perguntas legítimas dos pedidos perdedores. As simulações de banco/provedores/WhatsApp continuam identificadas como simulações.

**Aceitação com vetores reais aprovada às 14:15 UTC**, MariaDB 10.11 descartável, E5 large INT8/1024 dimensões real e Haiku real, com **o compilado local corrigido** montado read-only em `/app/dist`. [Recibo integral](evidence/2026-09-24/acceptance-review.json), [hashes locais](evidence/2026-09-24/review-build.json), [hashes do compilado efetivamente montado](evidence/2026-09-24/review-tested-build.json). Nenhum worker/servidor de produção recebeu esses arquivos.

- Indexar, editar “canal Alfa” para “canal Beta atualizado” e reindexar: um vetor criado, cinco reutilizados, mesmo ID do bloco alterado e mesmos hashes dos vetores dos cinco blocos preservados. Texto novo recuperado em primeiro; texto antigo ausente. Repetição sem alteração: zero chamadas de embedding de passagens.
- Continuação “E como faço esse pedido?”: extraiu apenas “Como solicitar a eliminação dos meus dados pessoais pela LGPD?”. Consulta curta registrada no recibo; área `lgpd`, bloco atualizado em **primeiro lugar**.
- Mudança de assunto para “Quais são os direitos de férias anuais remuneradas de um empregado?”: ferramenta retornou contexto nulo, embedding recebeu **exatamente a pergunta atual**, área `trabalhista`; ranking idêntico à consulta sem histórico, “Férias sintéticas” em primeiro. Uma resposta anterior longa e deliberadamente distrativa da assistente não entrou na consulta.
- Contêineres/rede/banco temporários e credenciais descartáveis removidos; limpeza conferida. Imagens/saúde de produção preservadas; conferência final de fichas/prompts em [recibo de produção](evidence/2026-09-24/production-after-review.txt).

Tentativas anteriores foram preservadas nos recibos `acceptance-review-first-attempt.json`, `acceptance-review-classifier-markdown.json`, `acceptance-review-context-fence.json` e `acceptance-review-context-prose.json`. O classificador real inicialmente devolveu `**lgpd**`: foi rejeitado, sem flexibilizar áreas. Instrução técnica foi esclarecida para saída literal. A seleção de contexto em JSON textual produzia cercas/explicações; foi substituída por ferramenta estruturada e validação extrativa. A execução final passou depois dessas correções, não por ignorar as falhas.

Não foram alterados prompts aprovados, conteúdo editorial, áreas ou dados reais. Sem deploy ou publicação. A amostra sintética comprova os cenários descritos, não acurácia universal. Continua pendente a validação de resposta final pelo WhatsApp e uma futura implantação/reindexação autorizada, coordenada com o ajuste de criação no Admin e as decisões editoriais já listadas.

## Correções após revisão independente — locais, sem deploy

Histórico da primeira rodada; comportamento substituído pela segunda revisão acima.

Esta seção atualiza os achados abaixo; os recibos de produção e aceitação real anteriores continuam referentes a **5d0f2cc / markdown-v2**, não ao código corrigido nesta etapa.

**Preâmbulo reproduzido e corrigido.** A especificação original `JUDITH-ENTREGA-23072026/01-ESPECIFICACAO-TECNICA.md`, §3, linha 58, exige ignorar o preâmbulo antes do primeiro `##`. No compilado anterior, o teste com capa e prosa retornou quatro blocos em vez dos dois capítulos esperados. `markdown-v3` agora descarta a capa, inclusive `###` anterior ao primeiro capítulo, preservando leitura/validação das áreas e frontmatter. Cercas de código continuam opacas. Regressão verifica texto integral, linhas, herança da marcação de capa, ausência de chunks sem `##` e rejeição de área inválida na capa. Não foi introduzido corte arbitrário de tamanho dos blocos.

**Busca com falhas explícitas.** Antes, `financeiro` devolvido pelo classificador propagava `KnowledgeValidationError` até o fallback genérico do webhook; `nenhuma`/base vazia permitia chamar o gerador sem referência; embeddings offline também propagavam erro genérico. Agora há erro tipado na fronteira de recuperação: `CLASSIFICATION_INVALID`, `KNOWLEDGE_NO_CONTEXT` ou `KNOWLEDGE_UNAVAILABLE`. A conversa responde com aviso de indisponibilidade de base confiável, sem orientação jurídica, sem chamada de geração, sem consumir crédito/cota e sem registrar o turno como sucesso. O webhook registra somente o código sanitizado no campo `knowledgeFailure`. Erros externos de geração continuam no tratamento existente. Nenhuma alteração da validação editorial, das 12 áreas ou do filtro SQL.

**Continuação corrigida.** Antes, “E se recusarem?” chegava ao classificador sem o assunto anterior; o teste demonstrou `history=undefined`. Agora `askJudith → getBaseConhecimento → retrieve → classify` transmite até as últimas 16 mensagens já carregadas da sessão, com papéis. A instrução técnica do classificador manda resolver referências pelo histórico e priorizar mudança explícita de assunto na pergunta atual. O embedding da consulta recebe esse mesmo contexto; nenhum texto de caderno é cortado. Não se reutiliza área antiga sem classificar e não há consulta sem filtro. Testes verificam a passagem efetiva no caminho de resposta, contrato do SDK e ordem classificar → filtrar → embedding. Isso prova transporte e comportamento determinístico do código; não comprova acurácia do modelo real em todas as continuações ou mudanças de assunto.

**Escopo de `###` preservado.** A especificação §3, linha 59, combina “chunk com linha Área própria troca a área vigente” com “### filhos herdam o módulo”; não explicita o que ocorre com irmãos após sobrescrita num filho. A instrução de 23/09 (“até aparecer outra linha”) admite leitura persistente, enquanto herança do pai admite escopo local. Em Guias, área na linha 37 rege ANATEL/ANEEL/etc. (linhas 41–77); em Propaganda, área autoral não é presumida por assunto e as marcações observadas estão nos módulos (linhas 11, 45, 65, 89 e 113). Esses exemplos demonstram herança, mas não resolvem a sobrescrita dentro de um `###`. Mantida regra atual: sobrescrita só no filho, irmãos/próximo capítulo retornam à área vigente do capítulo. Regressão existente continua passando. Responsável editorial deve decidir explicitamente antes de qualquer mudança.

**Admin: documentação antiga, não defeito vigente dos cadernos.** Inspeção somente em leitura em `Desktop/ADMIN JUDITH/admin-judith`, HEAD `bfe94f4`, com alterações locais preexistentes em `next-env.d.ts`, `test/knowledge.test.cjs` e `tsconfig.tsbuildinfo` preservadas:

- POST `src/app/api/fichas/route.ts` e PATCH `src/app/api/fichas/[id]/route.ts` chamam `validateNotebook` antes de persistir, sem limite de 65.535 bytes.
- `src/lib/knowledge-backend.ts:30` mede bytes UTF-8 do JSON `{area, conteudo}` e limita a **10 MiB**, sem truncar. Schema linha 481 usa `@db.LongText`; textarea de `FichaForm.tsx` não tem `maxLength`.
- O limite 65.535 encontrado em `src/app/api/prompt/route.ts:18` é das seções de prompt, não dos cadernos; permanece intacto.
- `docs/knowledge-verification.md` registra edição/reabertura de **212.529 caracteres / 247.754 bytes**, e `docs/knowledge-browser-review.md` registra edição final de **212.531 / 247.756**, com SHA-256 e verificação visual. São passos diferentes, não evidências contraditórias. Esses ensaios não foram repetidos nesta etapa.
- Portanto, a pendência antiga de remover 65.535 bytes e sincronizar LONGTEXT no Admin está superada no código inspecionado. Esta leitura não constitui nova certificação da hospedagem ou do deploy atual do Admin.

**Testes e limites.** Regressões executadas primeiro contra `dist` anterior falharam por capa indexada, histórico ausente e erro de classificador sem código tipado. Após correções: `npm test` (build, 32 testes node:test, 31 cenários de fluxo) aprovado. Casos com `financeiro`, múltiplas áreas, texto explicativo e duplicação de área são rejeitados; `nenhuma`, candidatos vazios e indisponibilidade dos embeddings impedem geração. Fluxo simulado verifica aviso e preservação do crédito. Nenhuma conexão a banco/APIs reais nesta rodada; o recibo com vetores reais anterior não foi reapresentado como validação da nova versão. WhatsApp real permanece pendente.

**Próxima etapa, somente mediante autorização futura:** revisar diff e implantar; reindexar publicados com parser v3 (fingerprints v2 ficam obsoletos e não serão servidos). Capítulos semanticamente iguais reutilizam cache compatível; capas saem do índice. Documentos sem `##` ficam com zero chunks, exigindo revisão editorial caso contenham material útil. Avaliar modelo real com continuações/mudança de assunto e repetir aceitação isolada na versão a publicar. Como a produção observada não tinha publicados, atualmente não há corpus confiável para respostas jurídicas; com esta correção o aviso ficará explícito. Sem deploy, publicação, reindexação de produção ou mudanças em dados/prompts nesta etapa.

## Resultado e preservação

Conferência inicial às 13:37 UTC e final às 13:41 UTC. Produção permanece em `5d0f2cc014b32aa23dd7d7c52a25e1a36ad144fb`, parser `markdown-v2`, imagem `sha256:30db70b57a13bb23fd083b74f99be5d42a907418a9b8ce52ad16b6c017c88abf`. O nome observado no Compose é `judith-backend-backend`, mas o digest é o mesmo da release registrada. Checkout local `0a16c93` acrescenta somente documentação à release. Não houve deploy, alteração de código funcional, migration ou escrita no banco compartilhado.

Saúde local/pública OK. Backend e embeddings running, zero reinícios e OOM. Permanecem 17 fichas EM_REVISAO, zero documentos/chunks e seis jobs. Hashes antes/depois idênticos aos de 23/09:

- Fichas: `9f59935593b94475c67d96f9f5903dc7a5b728a7d52ee0f6e58e9d566ae89546`.
- Prompts: `1e57c34b004ab4fe8c827931ec15df93af7d39f39086b6c8fca4dfdaf115328f`.

[Recibo final de produção](evidence/2026-09-24/production-after.txt). Hashes do compilado local e da imagem coincidem para provider, core, parser, indexer, conhecimento e claude. Repository difere apenas em finais de linha (diff ignorando EOL vazio), sem diferença funcional.

## Seção A

Código e 28 testes node:test + 28 cenários de fluxo aprovados por `npm test`:

- Classificador Anthropic separado dos prompts aprovados: aceita exatamente administrativo, ambiental, civil, consumidor, eca, empresarial, lgpd, tributario, previdenciario, processual, trabalhista e autoral. `nenhuma` encerra sem candidatos; valor inválido falha, sem conversão automática.
- `retrieve` classifica, consulta SQL por área/publicação/modelo, rejeita fingerprint obsoleto, calcula embedding da pergunta e só então ordena por cosseno e seleciona até cinco blocos.
- `getBaseConhecimento` entrega `content` integral dos blocos; `askJudith` só consulta em `duvida`. Não há truncamento dos blocos nesse caminho. Limite de geração da resposta não equivale a truncamento do contexto.
- Área do campo/frontmatter é padrão inicial. Marcação no topo/`##` substitui a área vigente e persiste nos próximos capítulos até nova marcação. `###` herda do capítulo; marcação própria substitui somente naquela subseção. Irmãos voltam à área do capítulo. Listas explícitas não são somadas ao padrão.
- **Pendente editorial:** confirmar o escopo de uma marcação dentro de `###`, pois a formulação literal “até aparecer outra linha” pode divergir do escopo implementado. Nenhuma regra foi alterada nesta retomada.

## Aceitação isolada com vetores reais

[Teste reproduzível](../test/knowledge-edit-real.cjs), [recibo JSON integral](evidence/2026-09-24/acceptance.json). Executado na imagem exata em produção, MariaDB 10.11 descartável, banco `judith_knowledge_test`, host exclusivo `judith-accept-db`, sem credenciais do banco compartilhado. Serviço local E5 large INT8 real, 1024 dimensões; duas classificações Anthropic reais. Evolution configurada com endereço fictício, sem envio WhatsApp.

Caderno sintético LGPD de seis blocos e gêmeo trabalhista com os mesmos textos, para testar exclusão de outra área:

| Operação | Job | Resultado |
| --- | --- | --- |
| Indexação inicial | `cmufky20b0002u7kg3dam8sfa` | completed; 12 chunks, seis vetores criados e seis reutilizados pelo gêmeo |
| Edição de uma frase | `cmufkyanu000uu7kgt1sth97t` | completed; um chunk atualizado, um vetor criado, cinco vetores reutilizados; zero inserts/deletes de chunks |
| Repetição sem alterações | `cmufkybj2000xu7kg9d32zf8k` | completed; dois cadernos inalterados, zero chamadas de embedding |

Pergunta: “Como solicitar a eliminação dos meus dados pessoais pela LGPD?”. Antes: primeiro bloco continha “canal Alfa”, score 0,8533185. Depois: mesmo ID de chunk, texto integral com “canal Beta atualizado”, score 0,8527733. Texto antigo ausente dos resultados. IDs, embeddingIds e SHA-256 dos vetores dos cinco blocos inalterados preservados, conforme recibo. Entre edição e reindexação, a fonte obsoleta ficou excluída da busca.

Ambas as buscas classificaram `lgpd` e registraram `classified:lgpd → sql-area-filter → embed:query`; retornaram cinco blocos completos, nenhum do gêmeo trabalhista. Isso valida recuperação com classificação real para essa pergunta, não acurácia do classificador em todas as 12 áreas.

Preparação exigiu corrigir variáveis fictícias obrigatórias do ambiente de teste e esperar a disponibilidade TCP do MariaDB (o ping por socket detectava o servidor temporário de inicialização). Essas tentativas não completaram indexação. A execução final passou integralmente. Contêineres, rede, banco em tmpfs e arquivos temporários de credenciais foram removidos e a remoção conferida. Recibo remoto: `/opt/judith-backend/backups/accept-20260924/report.json`.

## Os 17 antigos e os 19 da entrega

Os 17 slugs do banco são os históricos `01-mei` a `17-confidencialidade-nda`, também presentes em `knowledge/`. Não representam uma importação de 17 dos 19 cadernos novos; não há correspondência individual demonstrada nem autorização para substituir um conjunto pelo outro.

Encontrados **todos os 19 arquivos** na pasta `C:/Users/Kauã/Downloads/judith-entrega-extracted/JUDITH-ENTREGA-23072026/01-conteudo-ia/base-rag/`. Os dois ZIPs `JUDITH-ENTREGA-23072026.zip` e `JUDITH-ENTREGA-23072026 (1).zip` contêm o mesmo conjunto, com hashes de cada caderno idênticos à extração. [Inventário, tamanhos e hashes](evidence/2026-09-24/inventory.json). A contagem manual preliminar de 18 foi corrigida pelo inventário automatizado.

Arquivos encontrados (prefixo comum `JUDITH-`, extensão `.md`):

| | Nome |
| --- | --- |
| 1 | base-guias-v1 |
| 2 | base-propaganda-v1 |
| 3 | resumo-administrativo-v2 |
| 4 | resumo-ambiental-v2 |
| 5 | resumo-civil-contratos-v2 |
| 6 | resumo-civil-obrigacoes-v1 |
| 7 | resumo-civil-parte-geral-v1 |
| 8 | resumo-consumidor-v1 |
| 9 | resumo-direito-autoral-v1 |
| 10 | resumo-eca-v2 |
| 11 | resumo-empresarial-v1 |
| 12 | resumo-familia-sucessoes-v2 |
| 13 | resumo-lgpd-marco-civil-v3 |
| 14 | resumo-locacao-comercial-v1 |
| 15 | resumo-penal-tributario-v2 |
| 16 | resumo-previdenciario-mei-v1 |
| 17 | resumo-processo-civil-v1 |
| 18 | resumo-simples-nacional-v2 |
| 19 | resumo-tributario-v1 |

`_MANIFESTO-cross-tags-v1.md` e `_patch_kw.py` são auxiliares, excluídos dessa contagem. Nenhum script do pacote foi executado. Manifesto contém regras antigas de adição de tags/boost; não foi aplicado sobre o contrato atual de filtro e sobrescrita solicitado pelo usuário.

**Faltantes:** nenhum dos 19 declarados. A especificação da entrega, linha 55, e o LEIA-ME, linha 16, dizem expressamente que dois arquivos trabalhistas (material e processual) chegam depois, em revisão externa. Não foram encontrados nos ZIPs nem na busca por nomes em Desktop, Downloads e Documents. Nomes exatos e versões não estão definidos nesses trechos. O histórico `06-direito-trabalho.md` não comprova recebimento desses dois. Não há garantia sobre arquivos fora do escopo pesquisado.

## Bloqueios editoriais e pendências para o Admin

Validação somente em memória dos originais, sem modificar bytes e sem indexá-los. Para testar a sintaxe foi fornecido `civil` como campo obrigatório fictício; isso **não atribui área editorial** aos arquivos nem aprova sua importação. [Erros completos](evidence/2026-09-24/original-validation.json):

| Arquivo | Linha | Bloqueio |
| --- | --- | --- |
| base-guias-v1 | 5 | Comentário explicativo faz parte do valor da marcação `empresarial` e é rejeitado |
| base-guias-v1 | 105 | `tributário` fora da lista exata |
| base-propaganda-v1 | 89 | `penal` fora das 12 áreas |
| resumo-direito-autoral-v1 | 7 | `direito-autoral` fora da lista exata |

1. Responsável deve aprovar conjunto/versões e política de importação dos 19 novos versus 17 antigos; não sobrescrever por similaridade de títulos.
2. Resolver explicitamente os quatro erros acima e as áreas inválidas das 12 fichas antigas listadas em `knowledge-production.md`. Não converter valores nem criar novas áreas automaticamente.
3. Definir metadados de cada caderno e confirmar o escopo de `###`. Não tratar a área fictícia do diagnóstico como proposta editorial.
4. Conferir no Admin o contrato de validação, LONGTEXT/limites de transporte, autenticação server-side e progresso dos jobs. Esta retomada não auditou o código/interface atuais do outro repositório; o estado de integração do Admin permanece não confirmado.
5. Após autorização editorial, salvar/publicar pelo fluxo responsável, validar antes de salvar, usar requestKey nova por operação e acompanhar até completed/failed. HTTP 202 não é sucesso final. Não reaplicar a migration já existente.
6. Receber os dois trabalhistas posteriores, sem inventar nomes/conteúdo. Avaliar relevância com perguntas reais do cliente após indexação autorizada.
7. Validar separadamente conversa real no WhatsApp, contexto efetivamente usado e qualidade da resposta final. **O teste isolado não comprova resposta final pelo WhatsApp**, nem as 539 divisões citadas na especificação antiga correspondem necessariamente aos chunks do parser atual.

Prompts, cadernos originais, áreas e estados de publicação permaneceram preservados. Nenhuma publicação/importação automática foi feita.
