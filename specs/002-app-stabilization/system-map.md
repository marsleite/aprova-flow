# System Map: Core Flow Stability

## Jornada-alvo

`login -> planner -> dashboard -> engine`

## Superficies Principais

### `apps/web/src/app/login/page.tsx`

- porta de entrada da sessao no browser
- agora explicita quando existe `entitlementScenario` persistido localmente
- risco dominante: o usuario confundir sandbox local com plano real

### `apps/web/src/app/(app)/planner/page.tsx`

- primeira etapa autenticada da jornada guiada
- concentra badge de acesso, CTA `Novo Edital`, callout de sandbox e empty state
  para primeiro edital
- risco dominante: gate incoerente ou CTA parecer quebrado

### `apps/web/src/components/PlanManager.tsx`

- modal de criar/editar edital
- cobre nome, subjects, dias e seletor de cor
- risco dominante: warning de renderizacao ou estado local quebrado durante a
  edicao

### `apps/web/src/app/(app)/dashboard/page.tsx`

- etapa `Semana`
- depende de editais carregados e `activePlanId` valido
- risco dominante: seguir sem contexto real e exibir estado vazio ambiguo

### `apps/web/src/components/Dashboard.tsx`

- composicao visual da leitura semanal
- depende de dados organizados do plano ativo
- risco dominante: aceitar props parciais e mascarar ausencia de contexto

### `apps/web/src/app/(app)/engine/page.tsx`

- etapa `Hoje`
- depende do mesmo contexto de edital ativo do Dashboard
- risco dominante: permitir entrada sem contexto e deslocar a quebra para a
  acao central do dia

### `apps/api/src/modules/engine/routes.ts`

- borda canonica server-side do engine
- valida autenticacao, entrada e queries de portfolio/snapshot
- risco dominante: contrato permissivo demais ou validacao insuficiente

## Camadas de Ownership Relevantes

### `ui-render-state`

- `login/page.tsx`
- `planner/page.tsx`
- `dashboard/page.tsx`
- `engine/page.tsx`
- `components/PlanManager.tsx`

### `auth-entitlement-gating`

- `hooks/useEntitlements.ts`
- `lib/entitlement-sandbox.ts`
- `lib/entitlements.ts`
- `components/EntitlementSandboxCard.tsx`

### `api-data-contract`

- `apps/web/src/app/api/engine/snapshot/route.ts`
- `apps/api/src/modules/engine/routes.ts`
- `apps/api/src/modules/entitlements/routes.ts`

### `observability-test-gap`

- `apps/web/tests/stability/`
- `apps/api/src/*stability.test.ts`
- `docs/product/beta-operations-checklist.md`

## Touchpoints de Regressao Ja Disponiveis

- `/apps/web/tests/stability/core-flow-regression.test.ts`
- `/apps/web/tests/stability/ui-safety.test.ts`
- `/apps/api/src/core-flow.stability.test.ts`
- `/apps/api/src/entitlement-stability.test.ts`

## Leitura Atual do Sistema

- a `web` esta responsavel por comunicar o estado do fluxo de forma honesta
- a `api` segue como fonte canonica para engine e entitlements
- o maior risco residual do ciclo atual nao e mais o crash direto, e sim a
  ambiguidade operacional entre usuario real, sandbox local e cenarios manuais
