# Core Flow Bugs: Dashboard and Engine

## Objetivo

Registrar as falhas reproduzidas nas etapas `Semana` e `Hoje`.

## `STAB-004`

### Sintoma

O Dashboard podia ser alcançado sem edital ativo, deixando a etapa central da
jornada sem contexto confiavel.

### Evidencia

- `/apps/web/src/app/(app)/dashboard/page.tsx`
- `/apps/web/src/lib/stability/core-flow.ts`
- `/apps/web/tests/stability/core-flow-regression.test.ts`

### Reproducao

1. Remover todos os editais ou limpar `activePlanId`.
2. Abrir `/dashboard`.
3. Verificar que o fluxo precisa interromper com CTA claro para o Planner.

### Causa Suspeita

A tela assumia a existencia de um edital ativo antes de validar o estado.

### Estado Atual

Corrigido com empty state explicito e CTA para `/planner`; aguardando smoke
manual da cadeia.

## `STAB-005`

### Sintoma

O Engine herdava a mesma falta de contexto do Dashboard e podia seguir sem
edital ativo claramente selecionado.

### Evidencia

- `/apps/web/src/app/(app)/engine/page.tsx`
- `/apps/web/src/lib/stability/core-flow.ts`
- `/apps/api/src/modules/engine/routes.ts`
- `/apps/api/src/core-flow.stability.test.ts`

### Reproducao

1. Limpar `activePlanId` ou usar estado com editais sem plano ativo.
2. Abrir `/engine`.
3. Confirmar que a tela precisa devolver o usuario ao Planner.

### Causa Suspeita

Dependencia estrutural do Engine nao estava representada com a mesma rigidez da
jornada guiada.

### Estado Atual

Corrigido com empty state honesto na `web` e guardas de validacao de entrada na
`api`; aguardando smoke manual da cadeia.
