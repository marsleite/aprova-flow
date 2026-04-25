# Regression Guards

## Guardas por Bug

### `STAB-001`

- `guard_id`: `GUARD-STAB-001-A`
- `guard_type`: `automated-test`
- `location`: `/apps/web/tests/stability/core-flow-regression.test.ts`
- `pass_signal`: `getPlannerCreateEditalState(...)` devolve `upgrade` honesto
  quando o limite de multi-edital foi atingido

- `guard_id`: `GUARD-STAB-001-B`
- `guard_type`: `smoke-scenario`
- `location`: `/specs/002-app-stabilization/validation/core-flow-smoke.md#core-flow-01`
- `pass_signal`: CTA principal do Planner nao parece quebrado no browser

### `STAB-002`

- `guard_id`: `GUARD-STAB-002-A`
- `guard_type`: `automated-test`
- `location`: `/apps/web/tests/stability/ui-safety.test.ts`
- `pass_signal`: `PLAN_COLORS` tem nomes e `hex` unicos

- `guard_id`: `GUARD-STAB-002-B`
- `guard_type`: `manual-visual`
- `location`: `/specs/002-app-stabilization/validation/core-flow-smoke.md`
- `pass_signal`: seletor de cor do `PlanManager` abre sem warning visivel
- `justification`: o warning nasce de renderizacao React em runtime visual do
  modal; o teste automatizado protege a causa raiz e o smoke confirma a
  superficie real

### `STAB-003`

- `guard_id`: `GUARD-STAB-003-A`
- `guard_type`: `automated-test`
- `location`: `/apps/web/tests/stability/ui-safety.test.ts`
- `pass_signal`: a mensagem de sandbox so aparece quando o scenario esta ativo

- `guard_id`: `GUARD-STAB-003-B`
- `guard_type`: `smoke-scenario`
- `location`: `/specs/002-app-stabilization/validation/core-flow-smoke.md#core-flow-02`
- `pass_signal`: login e Planner deixam explicito o sandbox local

### `STAB-004`

- `guard_id`: `GUARD-STAB-004-A`
- `guard_type`: `automated-test`
- `location`: `/apps/web/tests/stability/core-flow-regression.test.ts`
- `pass_signal`: Dashboard recebe `missing-plan` state quando nao ha edital

- `guard_id`: `GUARD-STAB-004-B`
- `guard_type`: `smoke-scenario`
- `location`: `/specs/002-app-stabilization/validation/core-flow-smoke.md#core-flow-03`
- `pass_signal`: Dashboard devolve o usuario ao Planner com CTA claro

### `STAB-005`

- `guard_id`: `GUARD-STAB-005-A`
- `guard_type`: `automated-test`
- `location`: `/apps/web/tests/stability/core-flow-regression.test.ts`
- `pass_signal`: Engine recebe `missing-plan` state quando nao ha edital ativo

- `guard_id`: `GUARD-STAB-005-B`
- `guard_type`: `contract-check`
- `location`: `/apps/api/src/core-flow.stability.test.ts`
- `pass_signal`: borda do engine rejeita entradas invalidas antes de executar
  o caso de uso

- `guard_id`: `GUARD-STAB-005-C`
- `guard_type`: `smoke-scenario`
- `location`: `/specs/002-app-stabilization/validation/core-flow-smoke.md#core-flow-03`
- `pass_signal`: Engine falha de forma honesta quando falta contexto

### `STAB-006`

- `guard_id`: `GUARD-STAB-006-A`
- `guard_type`: `automated-test`
- `location`: `/apps/api/src/entitlement-stability.test.ts`
- `pass_signal`: o comportamento atual de cenarios manuais fica explicitado e
  protegido enquanto a decisao de endurecimento nao for tomada

### Excecoes Manuais do Ciclo

- `STAB-002`: precisa de confirmacao visual complementar no modal
- `STAB-003`: precisa de smoke real vs sandbox para encerrar o bug
- `STAB-004` e `STAB-005`: precisam de smoke manual do fluxo porque ainda nao
  existe E2E autenticado
