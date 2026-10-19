# Assinatura paga pelo site (Mercado Pago, recorrência)

Implementado em 19/10/2026 no repositório `web` (site), com um texto novo no backend/painel.

## Fluxo

1. `/planos` → botão **Começar** leva a `/assinar?plano=<codigo>` (ESSENCIAL, INTERMEDIARIO, PROFISSIONAL, COMPLETO, EMPRESARIAL; preço e nome vêm do `PlanCatalog`).
2. `/assinar` pede nome, **WhatsApp** (identidade do cliente na JUDITH) e e-mail (recibo do MP) e aceite dos Termos.
3. `POST /api/assinatura/criar` (rota pública):
   - normaliza o WhatsApp para o formato da Evolution (`55` + DDD + número);
   - encontra ou cria o `User` por `whatsappNumber` (quem nunca falou com a JUDITH ainda passa pelo onboarding normal quando mandar a primeira mensagem);
   - recusa (409) quando a assinatura mais recente do usuário é ACTIVE ou PAST_DUE (troca de plano = cancelar pelo WhatsApp e contratar de novo);
   - cria a recorrência no MP (`POST /preapproval`, `status: pending`, 1 mês, BRL, `external_reference = sub:<userId>:<PLANO>`, `back_url = /assinar/retorno`) e devolve o `init_point`.
4. O cliente autoriza o cartão no Mercado Pago e volta para `/assinar/retorno?preapproval_id=…` → redireciona para `/assinar/<preapproval_id>`.
5. Ativação (idempotente, em `web/src/lib/assinatura.ts`):
   - webhook `POST /api/webhooks/mercadopago` com `type = subscription_preapproval` → `sincronizarPreapproval(id)`;
   - a página `/assinar/<id>` e `GET /api/assinatura/<id>/status` (poll a cada 5 s) também sincronizam quando o banco ainda não tem a assinatura, para não depender do webhook;
   - `authorized` → cria a `Subscription` ACTIVE (`mpSubscriptionId`, `currentPeriodEnd = next_payment_date`), põe `User.plano = plano` e manda no WhatsApp o texto `assinaturaAtiva` (editável em Painel → Onboarding; marcadores `{nome}` e `{plano}`), via Evolution com `EVOLUTION_INSTANCE` do site;
   - `cancelled` → CANCELED (`cancelOrigem = gateway` se ninguém marcou antes); `paused` → PAST_DUE.
6. Cobranças mensais: `subscription_authorized_payment` (ou `payment` com `metadata.preapproval_id`) → `registrarCobranca`: grava `Payment` (CARD), aprovado estende `currentPeriodEnd` para pago + 1 mês e volta a ACTIVE; recusado em assinatura ACTIVE vira PAST_DUE.

## Por que a Subscription só nasce na autorização

O backend usa a assinatura **mais recente** do usuário (`quota.ts` → `assinaturaAtiva`). Uma linha PENDING criada ao abrir o checkout e abandonada travaria o trial de quem já usa a JUDITH. Por isso a referência vai no `external_reference` e a linha é criada só quando o MP autoriza.

## Cancelamento

Segue o fluxo que já existia: "quero cancelar" no WhatsApp → backend marca CANCELED e chama `POST /api/assinatura/cancelar` do site, que cancela o preapproval. O webhook `cancelled` que volta do MP não muda `cancelOrigem` já preenchido.

## Variáveis (Vercel, projeto web-judith)

`MERCADOPAGO_ACCESS_TOKEN`, `APP_PUBLIC_URL`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` (todas já cadastradas). No painel do Mercado Pago a URL de notificação é `${APP_PUBLIC_URL}/api/webhooks/mercadopago` com os eventos de pagamento e de assinatura (planos e assinaturas) marcados.

## O que não existe ainda

- Troca de plano direta (upgrade/downgrade) sem cancelar.
- PIX recorrente (o MP só faz recorrência no cartão).
- Login do cliente no site: por decisão do fundador o site é só para contratar; tudo o mais acontece no WhatsApp.
