# API Dedicada — Estado Atual e Roadmap

Data de referência: 12/03/2026

## Objetivo

Registrar o que a `apps/api` é hoje, o que ela ainda não é e qual deve ser a ordem de evolução para se tornar o backend de assinatura e permissões do AprovaMind.

## Estado Atual

A `apps/api` está em scaffold inicial.

Hoje ela já entrega:

- projeto separado no monorepo
- build próprio
- deploy próprio
- bootstrap Fastify
- rota `GET /health`
- sandbox interno de entitlements para teste manual de planos

Hoje ela ainda não entrega:

- autenticação
- billing
- webhook
- entitlements
- autorização pro
- acesso a banco server-side

## O que já existe

Arquivos principais:

- `apps/api/src/app.ts`
- `apps/api/src/server.ts`

Responsabilidade atual:

- provar que o runtime Fastify separado está saudável
- servir como ponto de entrada para o backend dedicado
- permitir teste manual da matriz `free / pro` antes do gateway

## O que a API NÃO deve fazer agora

- tentar substituir todas as routes do `apps/web`
- duplicar o motor de decisão sem necessidade
- carregar regras de UI
- receber responsabilidades demais antes de fechar billing + entitlements

## Roadmap Recomendado

### Fase 0 — Fundação

Objetivo:

- garantir que a API sobe bem e responde healthcheck

Critérios:

- deploy estável
- `GET /health` retorna `200`
- logs sem crash no bootstrap

### Fase 1 — Auth Server-Side

Objetivo:

- validar identidade do usuário em rotas protegidas

Entradas esperadas:

- bearer token
- integração com Firebase Admin

Entrega:

- middleware de auth
- rota protegida de teste

Observação:

- hoje o endpoint de entitlements ainda aceita identificação manual de teste
- isso deve ser substituído por auth real antes de qualquer uso produtivo

### Fase 2 — Modelo de Assinatura Interna

Objetivo:

- definir o estado interno que o AprovaMind controla

Entidades esperadas:

- `PlanCode`
- `SubscriptionStatus`
- `FeatureCode`
- `UserEntitlements`

Entrega:

- contratos em `packages/contracts`
- tipos/regras em `packages/domain`

### Fase 3 — Entitlements

Objetivo:

- responder se o usuário pode ou não usar uma feature

Entrega:

- cálculo de entitlements
- leitura de entitlements do usuário
- endpoint interno de consulta

### Fase 4 — Billing Adapter

Objetivo:

- integrar o gateway externo sem internalizar cobrança

Entrega:

- criação de checkout
- portal do cliente
- mapeamento provider -> assinatura interna

### Fase 5 — Webhooks

Objetivo:

- sincronizar eventos do gateway com o estado interno do usuário

Entrega:

- validação de assinatura do webhook
- idempotência
- persistência do status da assinatura
- recálculo de entitlements

### Fase 6 — Autorização Pro

Objetivo:

- garantir bloqueio/liberação de recurso no backend, não só na UI

Entrega:

- guards por feature
- integração do `apps/web` com a API de entitlements

## Ordem Técnica Recomendada

1. health
2. auth
3. tipos de assinatura
4. entitlements
5. checkout
6. webhooks
7. autorização pro

## O que fica no `apps/web` por enquanto

- motor de decisão atual
- snapshot do plano
- UI
- rotas do produto ainda não extraídas

## O que tende a migrar depois, se fizer sentido

- autorização central de recursos pagos
- integrações mais sensíveis server-side
- jobs e processos assíncronos

## Critério para dizer que a API deixou de ser scaffold

A `apps/api` deixa de ser apenas fundação quando cumprir os quatro pontos abaixo:

1. auth server-side funcionando
2. endpoint de entitlements funcional
3. webhook validado e idempotente
4. pelo menos uma feature pro dependendo da API para autorização real
