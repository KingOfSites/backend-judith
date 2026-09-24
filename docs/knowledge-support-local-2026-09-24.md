# Rastreamento e suporte — implementação local, sem deploy

Atualização posterior: o estado final de geração estruturada, reformulação única e verificação `support-v7` está em [knowledge-utility-validation-2026-09-24.md](knowledge-utility-validation-2026-09-24.md). Os resultados abaixo descrevem a etapa anterior de auditoria e suporte.

## Escopo implementado

O caminho de dúvidas jurídicas (`DUVIDA`) agora preserva uma auditoria ligada ao ID da pergunta já salva no histórico e verifica a resposta antes de `registrarUso`. Redação e análise mantêm seu comportamento anterior: não usavam a recuperação de cadernos e não recebem esta verificação nesta rodada. Saudações e cadastro continuam fora da geração jurídica.

- Nova tabela `KnowledgeInteraction`, sem endpoint público: payload privado com área, consulta efetivamente usada no embedding, IDs dos blocos e das fontes, versão por fingerprint do documento, hashes e snapshots integrais dos blocos enviados, scores, versão/hash do prompt, modelo solicitado/efetivo e ID da geração. Snapshot do prompt e versão são obtidos juntos no mesmo cache. Os snapshots dos blocos permitem reconstrução mesmo após edição/reindexação.
- A consulta pode conter dados pessoais. Ela fica no banco restrito, não em stdout, nem é acompanhada por duplicação de nome/telefone/perfil. A política de acesso e retenção dessa nova tabela precisa ser incorporada à operação antes de produção. Não há endpoint de leitura ou exportação pública.
- Estágios: início, recuperação, geração, suporte aprovado/rejeitado e falhas. `support_passed` significa suporte aprovado, **não envio, entrega ou crédito confirmado**. O vínculo ao ID da pergunta permite correlacionar histórico, recibo do envio e consumo pela execução; não há envio adicional nesta implementação.
- Persistência falha de forma conservadora: erro de auditoria impede a orientação antes da cobrança. Falha de recuperação/geração fica registrada quando o banco está disponível. Se a própria persistência falhar, não é possível prometer que a falha foi gravada nessa tabela; o fluxo devolve aviso sem consumo.

## Verificação de suporte

A instrução técnica `support-v3` é separada do prompt editorial. Um segundo pedido ao modelo avalia todas as unidades do rascunho, com a pergunta atual, apenas histórico do usuário e os blocos desta recuperação. Respostas anteriores da assistente não servem como fonte. A versão final pede conferência explícita de cada afirmação antes do veredicto; metadados de uso e latência são preservados na auditoria.

O verificador deve rejeitar mudança de fato gerador, sujeito, condições, exceções ou generalização. O contrato estruturado exige decisão para cada unidade e citações literais de blocos existentes. O código rejeita cobertura incompleta, referências inexistentes, citações não literais, números sem evidência e “maioria” sem suporte literal. Há barreiras determinísticas específicas para impedir prazo de acesso usado como exclusão e presunção de dano por vazamento usada como recusa.

Se qualquer unidade não tiver suporte suficiente, o rascunho inteiro é retido e a resposta é uma mensagem fixa de limite, sem orientação jurídica substantiva e sem consumir crédito. Não há reescrita automática ou nova tentativa de geração. Timeout, saída inválida e indisponibilidade também não consomem crédito. O cliente do verificador usa timeout de 30 segundos e zero retries.

## Resultados locais

- Prisma Client gerado; build TypeScript aprovado.
- `npm test`: **37 testes** e **43 cenários de fluxo**, todos aprovados.
- Casos: “Pela LGPD, um cliente pode pedir a eliminação de dados?”; “E se a empresa se recusar a apagar?”; dados financeiros; chance de ganhar; mudança para acesso; afirmação estatística sem fonte; prazo numérico inventado; citação inexistente; decisão incompleta; falha do provedor; falha de auditoria antes e depois da geração.
- Regressão de crédito: rejeição de suporte, indisponibilidade e falhas de auditoria deixam as duas cortesias intactas, não criam UsageEvent nem resposta substantiva e preservam a pergunta do usuário. Regressões existentes de deduplicação/histórico/cobrança continuam aprovadas.
- Parte determinística testada também com voto incorreto favorável do verificador. O caso de recusa foi bloqueado independentemente desse voto.
- Na suíte `npm test`, banco, geração, julgamento e WhatsApp são simulados. A validação adicional com MariaDB descartável e Anthropic real está em [knowledge-support-validation-2026-09-24.md](knowledge-support-validation-2026-09-24.md). Não houve envio de WhatsApp, alteração de produção ou teste de embeddings nesta rodada.
- `prisma validate` aprovado com URL sintética, sem conexão. A primeira tentativa não tinha DATABASE_URL; foi repetida com URL sintética para validar somente o schema. `git diff --check` sem erros de whitespace.

## Limitações e pré-requisitos de publicação

1. Suporte textual não é garantia de correção jurídica. Uma fonte editorial errada pode sustentar uma resposta também errada. As regras determinísticas cobrem padrões conhecidos, não todas as paráfrases; o julgamento semântico é probabilístico e pode ter erros correlacionados com o gerador. O mesmo modelo de configuração HAIKU é usado nesta versão.
2. Avaliação amostral real concluída e métricas registradas no relatório complementar. Isso não mede sensibilidade/especificidade em produção. Há uma chamada adicional ao provedor por dúvida gerada, mesmo quando o crédito do usuário é preservado; o julgamento ainda pode falhar e a resposta inteira é retida se qualquer unidade não passar.
3. O SQL da migração aditiva `202609240002_knowledge_interaction` foi executado em MariaDB 10.11 descartável, preservando os registros sintéticos preexistentes. Não foi aplicada em produção. Antes de deploy, preparar backup/rollback e definir retenção/acesso. Sem a tabela, o código bloqueia as dúvidas por TRACE_UNAVAILABLE em vez de cobrar sem auditoria. A execução via histórico completo de `prisma migrate deploy` não faz parte dessa prova.
4. Respostas rejeitadas não são gravadas integralmente no histórico; guarda-se hash do rascunho, decisão, versão da política e IDs de evidência dos casos aprovados. Isso reduz cópias de conteúdo do usuário, mas limita auditoria posterior do texto rejeitado.
5. Redação/análise e instrução editorial de pesquisa externa continuam fora deste ajuste. Não foi adicionada ferramenta de pesquisa externa à JUDITH.

## Editorial

Texto e prompt editorial permanecem intactos. A proposta separada está em [lgpd-editorial-proposal-2026-09-24.md](lgpd-editorial-proposal-2026-09-24.md), com fundamentos oficiais e aprovação pendente. Nenhuma alteração em cadernos, áreas, regra de `###`, saldos ou pagamentos.
