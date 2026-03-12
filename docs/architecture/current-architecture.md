# Arquitetura Atual do AprovaMind

Data de referência: 12/03/2026

## Objetivo

Este documento descreve a arquitetura atual do repositório depois da migração para monorepo e antes da implementação completa de billing + entitlements.

O objetivo é registrar:

- como o repositório está organizado hoje
- qual é a responsabilidade de cada módulo
- onde a lógica de negócio deve morar
- quais partes já estão operacionais
- quais partes ainda são scaffolding

## Visão Geral

```text
apps/
  web/        # Next.js: UI, páginas, rotas web e BFF temporário
  api/        # Fastify: backend dedicado, hoje em scaffold inicial

packages/
  domain/                   # regras puras do produto
  application/              # casos de uso, portas e mappers
  contracts/                # DTOs e contratos compartilhados
  infrastructure-firebase/  # placeholder para adapters server-side
  infrastructure-billing/   # placeholder para gateway de cobrança

docs/
  architecture/
```

## Responsabilidades por Área

### `apps/web`

Responsável por:

- experiência do usuário
- páginas e componentes React
- rotas HTTP do produto ainda não extraídas
- composição visual do motor e dos recursos existentes

Não deve concentrar no médio prazo:

- billing
- webhook
- sincronização de assinatura
- autorização premium final

### `apps/api`

Responsável por:

- backend dedicado para assinatura e permissões
- webhook do gateway
- entitlements
- autorização server-side de features pagas

Estado atual:

- existe
- builda
- faz deploy separado
- expõe `GET /health`
- ainda não tem auth, billing nem persistência real

### `packages/domain`

Responsável por:

- tipos puros do domínio
- regras do motor de decisão
- policies
- value objects
- enums de negócio

Não pode conhecer:

- React
- Next.js
- Fastify
- Firebase
- Vercel
- gateway de pagamento

### `packages/application`

Responsável por:

- casos de uso
- portas (`ports`)
- mappers de aplicação
- orquestração entre infraestrutura e domínio

Não pode depender de implementações concretas.

### `packages/contracts`

Responsável por:

- DTOs e contratos compartilhados entre `web` e `api`
- shape dos snapshots e payloads públicos entre apps

## Fluxos Relevantes Hoje

### Fluxo do motor no app web

```text
Next route/component
  -> application use case
    -> application port
      -> infrastructure adapter
        -> domain services
          -> contracts/dto
```

Exemplo concreto já funcional:

```text
apps/web/src/app/api/engine/snapshot/route.ts
  -> packages/application/.../GetPlanEngineSnapshot
  -> packages/domain/.../PlanEngine
  -> packages/contracts/.../PlanEngineSnapshot
```

### Fluxo atual da API dedicada

```text
apps/api/src/app.ts
  -> Fastify app
    -> GET /health
```

Hoje a `apps/api` ainda não executa regra de negócio do produto.

## Regras de Dependência

Dependências permitidas:

- `apps/web` -> `packages/domain`, `packages/application`, `packages/contracts`
- `apps/api` -> `packages/domain`, `packages/application`, `packages/contracts`
- `packages/application` -> `packages/domain`, `packages/contracts`
- `packages/contracts` -> sem dependência do runtime dos apps

Dependências proibidas:

- `packages/domain` -> qualquer `app`
- `packages/domain` -> Firebase, Fastify, Next
- `packages/application` -> implementação concreta do banco ou gateway
- `apps/web` -> lógica de negócio espalhada em componente React

## Estado Atual por Maturidade

### Estável

- monorepo com workspaces
- `apps/web`
- `packages/domain`
- `packages/application`
- `packages/contracts`
- deploy do web em `apps/web`

### Inicial, mas válido

- `apps/api`
- deploy separado da API
- scaffold Fastify

### Ainda por implementar

- auth server-side na API
- billing
- webhooks
- entitlements
- adapters de infraestrutura compartilhados em `packages/infrastructure-*`

## Decisões Arquiteturais já Fechadas

- Um único repositório Git
- Monorepo com `apps/*` e `packages/*`
- `apps/web` continua em `Next.js`
- `apps/api` será `Fastify`
- `domain`, `application` e `contracts` são compartilhados
- cobrança fica no gateway externo; o AprovaMind gerencia assinatura interna e permissões

## O que ainda não deve acontecer

- mover todo o backend do produto para `apps/api` de uma vez
- duplicar domínio entre `web` e `api`
- deixar billing nascer dentro de componentes React ou routes web antigas
- usar a API dedicada para tudo antes de fechar auth e entitlements
