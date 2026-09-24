# Pendências de TRIAL e concessão de cortesia — 24/09/2026

## Atualização: concessão pontual concluída

Após autorização adicional explícita para operação administrativa sem endpoint, foram concedidos **2 créditos DUVIDA** em 24/09/2026, 19:24:15.690 UTC (16:24:15 de Brasília). Saldo final conferido: **2**. O bloqueio de concessão descrito abaixo é histórico; as pendências do TRIAL e da mensagem incorreta continuam abertas.

- Operação: `scripts/grant-test-courtesy.cjs`; teste: `test/courtesy-isolated.cjs`.
- Schema real conferido: chave primária `CreditoCortesia.id`, campos existentes `quantidade`, `saldo` e `criadoPor`. Nenhuma migração. `criadoPor` armazena JSON compacto com ator e motivo, dentro do limite VARCHAR(191); o consumidor de créditos não interpreta esse campo.
- Chave idempotente: `courtesy-20260924-4822-duvida-2-v1`. Um único registro criado, quantidade 2 e saldo 2. Repetições não acrescentam saldo nem repõem créditos consumidos.
- Identidade validada pelo ID previamente identificado e pelo número completo obtido do recibo conhecido, com nova validação conjunta sob lock `FOR UPDATE`. Manifesto privado na VPS; número completo não exposto no relatório.
- Testes em MariaDB isolado passaram: identidade incompatível, rollback após inserção, concorrência com apenas uma concessão, repetição idempotente, conflito de chave, preservação de saldo parcialmente consumido e preservação de usuário/assinatura/pagamento/consumo. Banco e rede descartáveis removidos ao terminar.
- Produção: transação inseriu somente a linha de cortesia. Hashes antes/depois do cadastro, assinaturas, compras, pagamentos e consumo desse contato idênticos. Uma compra PENDING preservada. Nenhum comando de alteração de outros usuários, catálogo ou conexão; nenhum checkout ou envio de mensagem.
- Motivo persistido: “2 duvidas para teste WhatsApp autorizado em 24/09/2026”; ator: `admin-autorizado-via-codex`.
- Recibo sanitizado: [courtesy-4822-receipt.json](evidence/2026-09-24/courtesy-4822-receipt.json). Evidências, identidade privada e snapshot anterior: `/opt/judith-backend/backups/courtesy-20260924-4822/`, com acesso restrito.
- A concessão não modifica a política global do TRIAL. O backend existente consumirá a cortesia somente quando confirmar uma resposta elegível, conforme as regras atuais.

Consulta somente de leitura em 24/09/2026, 19:15:49 UTC. Contato autorizado final 4822 identificado pelo número completo obtido do destinatário do envio `3EB0FB84E52ADDEEC03931`, instância `judith`, e consultado por igualdade exata em `User.whatsappNumber`, não por busca de sufixo.

## Estado confirmado

- Cadastro CONCLUIDO; termos aceitos; plano TRIAL; trialFimEm nulo; nenhuma assinatura.
- Nenhum registro correspondente ao código TRIAL em PlanCatalog.
- Zero UsageEvent de qualquer serviço desde a criação do cadastro; zero dúvidas consumidas no mês corrente.
- Nenhum registro de CreditoCortesia; saldo DUVIDA de cortesia = 0.
- Uma compra avulsa DUVIDA PENDING, criada em 24/09/2026 às 19:06:15.407 UTC, sem paidAt e sem consumidoEm. Preservada.

## Concessão autorizada, não executada

O usuário autorizou 2 créditos de cortesia DUVIDA, uma única vez, condicionados ao uso de mecanismo seguro existente. O commit Admin f0e78b4 removeu o botão e a rota `src/app/api/usuarios/[id]/creditos/route.ts`, além dos testes. A rota segue ausente no checkout ed89a7c examinado. O backend conserva o mecanismo de consumo de CreditoCortesia, mas não foi encontrada uma operação disponível de concessão. A rota `/api/usuarios/[id]/liberar` modifica plano e Subscription, portanto não serve para esta autorização.

Nenhum crédito concedido; nenhuma escrita improvisada em banco; nenhum checkout, pagamento, assinatura ou catálogo alterado. A autorização não foi usada para substituir a API removida por INSERT direto. Bloqueio comunicado ao usuário antes de qualquer alternativa de escrita.

Próximo passo proposto: restaurar uma operação restrita, autenticada, idempotente e auditável de concessão, com testes, sem necessidade de restaurar o botão. Executar a concessão somente após resolver esse bloqueio com o usuário; revalidar estado e impedir duplicação. Quantidade autorizada continua sendo 2, não 1.

## Pendências funcionais

1. Definir explicitamente a política do TRIAL e configurar sua cota aprovada, ou representar corretamente a ausência de acesso. Não presumir limite global.
2. Corrigir a classificação da ausência de PlanCatalog: `disponibilidade()` considera o trial ativo sem assinatura e retorna `cota_estourada` quando não encontra plano nem créditos. A mensagem afirma esgotamento apesar de consumo zero e o fluxo gera checkout avulso. Diferenciar configuração ausente de cota realmente consumida. Nenhuma mudança de cobrança foi executada nesta investigação.
