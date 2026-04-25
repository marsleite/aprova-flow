# Closure Log

## `BATCH-01`

- `status`: `closed`
- `executed_at`: `2026-04-21`
- `summary`: codigo corrigido, guards automatizados verdes e smoke manual final
  aprovado no browser local para `CORE-FLOW-01`, `CORE-FLOW-02` e
  `CORE-FLOW-03`

## Bugs

### `STAB-001`

- `status`: `closed`
- `evidence_links`:
  - `/apps/web/src/app/(app)/planner/page.tsx`
  - `/apps/web/src/lib/stability/core-flow.ts`
  - `/apps/web/tests/stability/core-flow-regression.test.ts`
  - `/specs/002-app-stabilization/validation/core-flow-smoke.md`
- `reopen_rule`: reabrir se o CTA principal do Planner voltar a parecer
  quebrado para `pro` ou `premium`

### `STAB-002`

- `status`: `closed`
- `evidence_links`:
  - `/apps/web/src/components/PlanManager.tsx`
  - `/apps/web/src/types/index.ts`
  - `/apps/web/tests/stability/ui-safety.test.ts`
  - `/specs/002-app-stabilization/validation/core-flow-smoke.md`
- `reopen_rule`: reabrir se o modal voltar a emitir warning de chave duplicada
  ou se a paleta repetir `hex`

### `STAB-003`

- `status`: `closed`
- `evidence_links`:
  - `/apps/web/src/app/login/page.tsx`
  - `/apps/web/src/app/(app)/planner/page.tsx`
  - `/apps/web/tests/stability/ui-safety.test.ts`
  - `/specs/002-app-stabilization/validation/core-flow-smoke.md`
- `reopen_rule`: reabrir se um usuario em sandbox voltar a navegar sem aviso
  claro de contexto local

### `STAB-004`

- `status`: `closed`
- `evidence_links`:
  - `/apps/web/src/app/(app)/dashboard/page.tsx`
  - `/apps/web/tests/stability/core-flow-regression.test.ts`
  - `/specs/002-app-stabilization/validation/core-flow-smoke.md`
- `reopen_rule`: reabrir se o Dashboard voltar a seguir sem edital ativo ou sem
  CTA claro para o Planner

### `STAB-005`

- `status`: `closed`
- `evidence_links`:
  - `/apps/web/src/app/(app)/engine/page.tsx`
  - `/apps/api/src/core-flow.stability.test.ts`
  - `/apps/web/tests/stability/core-flow-regression.test.ts`
  - `/specs/002-app-stabilization/validation/core-flow-smoke.md`
- `reopen_rule`: reabrir se o Engine aceitar contexto ausente sem retorno
  honesto ao Planner

## Smoke Results

### `CORE-FLOW-01`

- `status`: `pass`
- `notes`: login real sem aviso de sandbox, Planner com CTA funcional de
  `Novo Edital`, Dashboard carregado com `Sessao Livre` e Engine aberto na
  etapa `Sessao`

### `CORE-FLOW-02`

- `status`: `pass`
- `notes`: login e Planner deixaram explicito o cenario local
  `premium-user`, com orientacao visivel para voltar ao usuario real em
  `/settings`

### `CORE-FLOW-03`

- `status`: `pass`
- `notes`: ao remover o edital ativo via `Todos os Editais`, Dashboard e Engine
  exibiram empty state equivalente com CTA para o Planner

## Observacao

Os bugs P1 foram marcados `closed` somente apos reproducao anterior, guarda
posterior e smoke manual correspondente na mesma janela de validacao.
