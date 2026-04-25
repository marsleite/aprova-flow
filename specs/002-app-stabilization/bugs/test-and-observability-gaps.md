# Test and Observability Gaps

## Objetivo

Registrar o que ainda falta para provar estabilidade sem depender apenas da
memoria da sessao.

## Gaps Mapeados

### `GAP-001` - Falta smoke autenticado automatizado do core flow

- relacionado a: `STAB-008`
- estado atual:
  - helpers da `web` cobertos
  - contratos de `api` cobertos
  - smoke manual ainda necessario
- recomendacao: avaliar harness E2E autenticado em ciclo posterior

### `GAP-002` - Fallbacks de contexto do Planner nao geram evento operacional dedicado

- relacionado a: `STAB-009`
- estado atual: nao existe telemetria especifica para quando `dashboard` ou
  `engine` devolvem o usuario ao Planner por falta de edital ativo
- recomendacao: decidir em lote futuro se isso merece evento proprio

### `GAP-003` - Superficies secundarias ainda nao entraram no smoke formal do ciclo

- relacionado a: `STAB-007`
- estado atual: dependem da rotina operacional semanal do beta, nao do ciclo de
  estabilizacao principal
- recomendacao: abrir lote secundario depois do fechamento do P1

## Cobertura que Ja Existe

- `/apps/web/tests/stability/core-flow-regression.test.ts`
- `/apps/web/tests/stability/ui-safety.test.ts`
- `/apps/api/src/core-flow.stability.test.ts`
- `/apps/api/src/entitlement-stability.test.ts`
