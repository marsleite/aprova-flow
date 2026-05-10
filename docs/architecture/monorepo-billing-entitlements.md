# Arquitetura Alvo — Monorepo com Web, API de Assinatura e Pacotes Compartilhados

Data de referência: 11/03/2026

## Documentos Complementares

Para a fotografia atual da implementação, consultar também:

- `docs/architecture/current-architecture.md`
- `docs/architecture/deploy-and-environments.md`
- `docs/architecture/api-roadmap.md`

## 1. Objetivo

Preparar o AprovaMind para crescer com segurança, sem quebrar a base atual, separando primeiro o que é mais sensível operacionalmente:

- app web
- assinatura
- entitlements/permissões
- regras de domínio compartilhadas

A decisão central desta proposta é:

- manter a experiência principal no `Next.js`
- abrir uma `API` dedicada apenas para `billing + entitlements`
- compartilhar `domain`, `application` e `contracts` em `packages`
- evitar mover o motor inteiro para a API logo no início

## 2. Decisão Arquitetural

### O que vamos fazer

- Transformar o projeto em `monorepo`
- Criar `apps/web` para o app Next.js
- Criar `apps/api` para billing, webhooks e controle de permissões
- Criar `packages/domain`, `packages/application` e `packages/contracts`

### O que não vamos fazer agora

- Não migrar todo o backend do produto para fora do Next imediatamente
- Não colocar `Next + Fastify/Nest` no mesmo processo
- Não construir sistema próprio de pagamento
- Não centralizar cobrança no frontend

## 3. Por que este é o melhor ponto de corte

O próximo eixo de complexidade do produto não é o motor em si. É a camada de:

- checkout
- webhooks
- sincronização do status da assinatura
- liberação/bloqueio de features
- auditoria mínima
- autorização pro

Essas responsabilidades justificam um backend próprio antes de outras partes do sistema.

O motor, por outro lado:

- ainda está evoluindo
- ainda pode mudar contrato
- já está sendo isolado internamente com boa separação de camadas

Então a separação mais segura é por responsabilidade operacional, não por “tudo ou nada”.

## 4. Estrutura Alvo do Monorepo

```text
apps/
  web/                    # Next.js (UI + BFF temporário + rotas leves do produto)
  api/                    # Fastify (billing, webhooks, entitlements, auth server-side)

packages/
  domain/                 # regras puras do AprovaMind
  application/            # use cases, ports, policies
  contracts/              # DTOs, schemas e contratos HTTP compartilhados
  infrastructure-firebase/# adapters compartilhados para Firebase Admin/Firestore
  infrastructure-billing/ # adapters para Stripe/Asaas/etc

docs/
  architecture/
    monorepo-billing-entitlements.md
```

## 5. Responsabilidades por Módulo

### `apps/web`

Responsável por:

- UI e experiência do usuário
- páginas, componentes e fluxos visuais
- consumo da API de assinatura/entitlements
- BFF temporário para rotas ainda não extraídas
- composição da tela do motor e recursos já existentes

Não deve concentrar no médio prazo:

- webhook
- lógica de assinatura
- validação final de acesso pro
- sincronização financeira

### `apps/api`

Responsável por:

- criação de checkout
- portal do cliente
- webhooks do gateway
- sincronização do estado da assinatura
- cálculo e persistência de `entitlements`
- autorização de recursos pro
- auditoria e idempotência do ciclo de billing

Pode evoluir depois para:

- IA server-side mais robusta
- jobs assíncronos
- parse de edital pesado
- autorização central de features do produto

### `packages/domain`

Responsável por:

- tipos e regras puras do negócio
- motor de decisão
- regras de assinatura e capabilities
- enums, policies e value objects

Não deve conhecer:

- Next.js
- Fastify
- Firebase SDK
- provider de billing

### `packages/application`

Responsável por:

- casos de uso
- portas (`ports`)
- mappers de aplicação
- services orquestradores

Não deve depender de implementação concreta.

### `packages/contracts`

Responsável por:

- contratos HTTP
- DTOs de requests/responses
- schemas de validação compartilhados
- payloads entre `web` e `api`

Objetivo:

- evitar divergência de tipos entre frontend e backend

### `packages/infrastructure-firebase`

Responsável por:

- adapters com `Firebase Admin SDK`
- persistência server-side
- mappers Firestore <-> tipos puros

### `packages/infrastructure-billing`

Responsável por:

- adapters do gateway de pagamento
- tradução de eventos externos para eventos internos
- criação de checkout/session/portal

## 6. Tecnologia Recomendada

### `apps/web`

- `Next.js`
- `TypeScript`
- `React`

### `apps/api`

- `Fastify`
- `TypeScript`
- `Firebase Admin SDK`
- gateway externo de pagamento

### Por que `Fastify`

- mais enxuto que `NestJS`
- excelente com `TypeScript`
- menos estrutura mágica
- suficiente para webhook, auth, billing e APIs internas
- mais fácil de introduzir sem sobrecarregar o time

### Quando `NestJS` faria sentido

Só se, no futuro, houver necessidade clara de:

- DI pesada
- módulos muito grandes
- vários times backend
- convenção mais rígida de framework

Hoje, para o AprovaMind, `Fastify` é a escolha mais pragmática.

## 6.1 Estratégia de Deploy

### `apps/web`

- deploy próprio
- otimizado para experiência web
- pode continuar em Vercel

### `apps/api`

- deploy próprio
- otimizado para webhook, autenticação e integração server-side
- não deve rodar dentro do mesmo processo do Next

Decisão:

- mesmo repositório: sim
- mesmo domínio de produto: sim
- mesmo processo/runtime: não
- mesmo deploy: não

## 7. Modelo de Assinatura e Entitlements

O AprovaMind não deve ser dono da cobrança. Ele deve ser dono do:

- plano interno
- status interno da assinatura
- permissões/capabilities
- bloqueios e liberações de features

### Conceitos centrais

```ts
type PlanCode = 'free' | 'pro' | 'pro';

type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

type FeatureCode =
  | 'engine_snapshot'
  | 'ai_chat'
  | 'multi_plan'
  | 'edital_parse'
  | 'weekly_mentoring';

interface UserEntitlements {
  userId: string;
  plan: PlanCode;
  status: SubscriptionStatus;
  features: Record<FeatureCode, boolean>;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}
```

## 8. Responsabilidade do Gateway vs AprovaMind

### Gateway de pagamento

Deve cuidar de:

- cartão
- antifraude
- recorrência
- tokenização
- retry de cobrança
- falha de pagamento
- chargeback e mecanismos básicos do provedor
- portal do cliente

### AprovaMind

Deve cuidar de:

- mapear assinatura externa para plano interno
- guardar `customerId` e `subscriptionId`
- persistir status interno da assinatura
- calcular e salvar entitlements
- aplicar autorização nas features

## 9. Fluxo Alvo de Billing

### Checkout

```text
Web -> API -> Gateway
                -> usuário paga
Gateway -> webhook -> API
API -> atualiza assinatura interna
API -> recalcula entitlements
Web -> consulta entitlements -> libera/bloqueia recursos
```

### Mudança de status

```text
Gateway envia evento
API valida assinatura do webhook
API aplica idempotência
API traduz evento para status interno
API recalcula UserEntitlements
Web passa a refletir o novo estado
```

## 10. O que fica no Next por enquanto

Permanece em `apps/web` no curto prazo:

- dashboard
- timer
- chat atual
- mentoria atual
- motor novo já integrado
- rotas internas ainda leves

Não é necessário mover tudo de uma vez.

## 11. O que vai primeiro para a API

### Escopo inicial de `apps/api`

- `POST /billing/checkout`
- `POST /billing/portal`
- `POST /billing/webhooks/provider`
- `GET /me/entitlements`
- `GET /me/subscription`

### Possível evolução posterior

- autorização central para recursos pro
- rotas pro sensíveis
- IA com custo/segredo mais sensível
- jobs/eventos

## 12. Estratégia de Migração Incremental

### Fase 0 — Estado atual controlado

Objetivo:

- manter o app rodando
- não refatorar em massa

Entregas:

- continuar com a arquitetura limpa interna já iniciada
- manter o motor no Next por enquanto

### Fase 1 — Preparar o monorepo

Objetivo:

- separar código sem separar tudo operacionalmente

Entregas:

- criar estrutura `apps/` e `packages/`
- mover `domain`, `application` e contratos compartilháveis para `packages`
- manter `web` funcionando com o mínimo de quebra

### Fase 2 — Abrir a API de assinatura

Objetivo:

- separar billing e entitlements

Entregas:

- criar `apps/api`
- integrar gateway
- criar persistência de assinatura e entitlements
- integrar `web` com a API

### Fase 3 — Fechar autorização pro

Objetivo:

- fazer o backend, não a UI, decidir acesso

Entregas:

- `GET /me/entitlements`
- guards server-side
- bloqueio nas rotas pro reais

### Fase 4 — Reavaliar extrações futuras

Objetivo:

- só extrair mais coisas quando houver pressão real

Possíveis candidatos:

- IA
- planner avançado
- parse de edital
- engine snapshot

## 13. Regras de Arquitetura

### Regra 1

O frontend nunca decide sozinho se o usuário pode usar uma feature pro.

### Regra 2

O gateway nunca define diretamente as permissões do produto.

O gateway informa o estado financeiro.
O AprovaMind traduz isso para `entitlements`.

### Regra 3

`domain` e `application` devem ser compartilháveis entre `web` e `api`.

### Regra 4

O backend de billing deve ser idempotente.

### Regra 5

Não misturar `Next` e `Fastify` no mesmo processo/custom server.

## 14. Sinais de que vale mover mais coisas para a API

- rotas do Next começam a carregar regras sensíveis demais
- crescimento de recursos pro bloqueados por plano
- necessidade de jobs assíncronos
- IA com maior custo e maior necessidade de controle
- parse de edital e pipelines mais pesados
- múltiplos clientes consumindo a mesma API

## 15. Decisões Fechadas neste Documento

- Sim para `monorepo`
- Sim para `apps/web`
- Sim para `apps/api`
- Sim para `packages` compartilhados
- Sim para `Fastify` como primeira escolha de API
- Não para mover tudo de uma vez
- Não para fazer sistema próprio de pagamento
- Sim para separar primeiro `billing + entitlements`

## 16. Próximos Documentos Recomendados

Depois deste documento, os próximos artefatos de arquitetura deveriam ser:

1. modelagem de `plans`, `subscriptionStatus` e `entitlements`
2. contratos HTTP de `apps/api`
3. plano de migração do repositório atual para monorepo
4. matriz de features por plano (`free / pro`)
5. fluxo de autenticação entre `web` e `api`

## 17. Próxima Decisão de Produto/Tecnologia

A próxima decisão prática não é “migrar tudo”.

É definir:

- quais features existem em `free`
- quais entram em `pro`
- quais entram em `pro`
- e como isso será traduzido para `entitlements`

Esse é o ponto que fecha a fronteira entre produto, billing e autorização.
