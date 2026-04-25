# Fix Batches: Estabilizacao da Aplicacao

## Objetivo

Agrupar o backlog em lotes curtos com dono principal, criterio de entrada e
criterio de saida, sem misturar correcoes de natureza diferente.

## `BATCH-01` - Recuperar a cadeia principal com resposta honesta de contexto

- `batch_id`: `BATCH-01`
- `objective`: remover dead actions, warnings visiveis e estados vazios
  contraditorios em `login -> planner -> dashboard -> engine`
- `included_bug_ids`: `STAB-001`, `STAB-002`, `STAB-003`, `STAB-004`,
  `STAB-005`
- `dominant_layer`: `ui-render-state`
- `entry_criteria`:
  - checkpoints do fluxo principal mapeados
  - bugs P1 triados com causa suspeita e guarda definido
  - ambiente local validado para `apps/web` e `apps/api`
- `exit_criteria`:
  - `PlanManager` sem warning de chave duplicada
  - CTA principal do Planner diferencia criacao vs upgrade
  - login e Planner deixam claro quando o navegador esta em sandbox local
  - Dashboard e Engine nao seguem sem edital ativo
  - regressao automatizada verde em `apps/web` e `apps/api`
  - smoke `CORE-FLOW-01` registrado
- `required_docs`:
  - `/specs/002-app-stabilization/bug-ledger.md`
  - `/specs/002-app-stabilization/validation/core-flow-smoke.md`
  - `/specs/002-app-stabilization/validation/closure-log.md`
  - `/docs/architecture/current-architecture.md`
  - `/docs/product/beta-operations-checklist.md`
- `status`: `validating`

## `BATCH-02` - Tornar explicitos os limites entre sandbox, cenario manual e auth real

- `batch_id`: `BATCH-02`
- `objective`: reduzir ambiguidade operacional entre sandbox local da `web` e
  cenarios manuais aceitos pela `api`
- `included_bug_ids`: `STAB-006`, `STAB-007`
- `dominant_layer`: `cross-layer`
- `entry_criteria`:
  - `BATCH-01` com guards verdes
  - riscos de entitlement documentados
- `exit_criteria`:
  - semantica de `allowSandboxAuth` e `allowManualScenarios` documentada e/ou
    endurecida
  - smoke de usuario real vs sandbox alinhado entre `login`, `planner` e
    `/settings`
  - backlog secundario de gates atualizado
- `required_docs`:
  - `/specs/002-app-stabilization/bugs/auth-entitlement-risks.md`
  - `/specs/002-app-stabilization/bugs/secondary-surfaces.md`
  - `/docs/product/beta-operations-checklist.md`
- `status`: `planned`

## `BATCH-03` - Fechar lacunas de regressao e observabilidade da estabilizacao

- `batch_id`: `BATCH-03`
- `objective`: transformar o conhecimento do ciclo em rotina repetivel de
  validacao e revisao
- `included_bug_ids`: `STAB-008`, `STAB-009`
- `dominant_layer`: `observability-test-gap`
- `entry_criteria`:
  - `BATCH-01` estabilizado
  - backlog priorizado consolidado
- `exit_criteria`:
  - protocolo de smoke do fluxo principal reusavel
  - passe de regressao do ciclo registrado
  - itens de telemetria ou E2E pendentes classificados como `deferred` com
    racional
- `required_docs`:
  - `/specs/002-app-stabilization/validation/regression-guards.md`
  - `/specs/002-app-stabilization/validation/cycle-01-regression.md`
  - `/docs/product/beta-metrics-roadmap.md`
- `status`: `active`

## Ordem Recomendada

1. `BATCH-01`
2. `BATCH-02`
3. `BATCH-03`

## Racional da Ordem

- `BATCH-01` entra primeiro porque devolve confianca para a jornada central.
- `BATCH-02` vem depois porque usa as licoes do fluxo principal para apertar a
  trust boundary de entitlement e sandbox.
- `BATCH-03` fecha o ciclo com guardas e rotina de operacao, em vez de tentar
  substituir a estabilizacao funcional por telemetria prematura.
