# Closure Log

## `BATCH-01`

- `status`: `validating`
- `summary`: codigo corrigido e guards automatizados adicionados; fechamento
  final depende de smoke manual da cadeia principal

## Bugs

### `STAB-001`

- `status`: `fixed-awaiting-validation`
- `evidence_links`:
  - `/apps/web/src/app/(app)/planner/page.tsx`
  - `/apps/web/src/lib/stability/core-flow.ts`
  - `/apps/web/tests/stability/core-flow-regression.test.ts`
- `reopen_rule`: reabrir se o CTA principal do Planner voltar a parecer
  quebrado para `pro` ou `premium`

### `STAB-002`

- `status`: `fixed-awaiting-validation`
- `evidence_links`:
  - `/apps/web/src/components/PlanManager.tsx`
  - `/apps/web/src/types/index.ts`
  - `/apps/web/tests/stability/ui-safety.test.ts`
- `reopen_rule`: reabrir se o modal voltar a emitir warning de chave duplicada
  ou se a paleta repetir `hex`

### `STAB-003`

- `status`: `fixed-awaiting-validation`
- `evidence_links`:
  - `/apps/web/src/app/login/page.tsx`
  - `/apps/web/src/app/(app)/planner/page.tsx`
  - `/apps/web/tests/stability/ui-safety.test.ts`
- `reopen_rule`: reabrir se um usuario em sandbox voltar a navegar sem aviso
  claro de contexto local

### `STAB-004`

- `status`: `fixed-awaiting-validation`
- `evidence_links`:
  - `/apps/web/src/app/(app)/dashboard/page.tsx`
  - `/apps/web/tests/stability/core-flow-regression.test.ts`
- `reopen_rule`: reabrir se o Dashboard voltar a seguir sem edital ativo ou sem
  CTA claro para o Planner

### `STAB-005`

- `status`: `fixed-awaiting-validation`
- `evidence_links`:
  - `/apps/web/src/app/(app)/engine/page.tsx`
  - `/apps/api/src/core-flow.stability.test.ts`
  - `/apps/web/tests/stability/core-flow-regression.test.ts`
- `reopen_rule`: reabrir se o Engine aceitar contexto ausente sem retorno
  honesto ao Planner

## Smoke Pendentes

- `CORE-FLOW-01`
- `CORE-FLOW-02`
- `CORE-FLOW-03`

## Observacao

Nenhum bug P1 foi marcado `closed` sem reproducao anterior, guarda posterior e
smoke manual correspondente.
