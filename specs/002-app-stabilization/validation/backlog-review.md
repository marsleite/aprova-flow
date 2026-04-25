# Backlog Review

## Resultado

- `status`: `pass-with-deferred-items`
- `reviewed_against`:
  - `/specs/002-app-stabilization/contracts/stability-backlog.md`
  - `/specs/002-app-stabilization/research.md`
  - `/specs/002-app-stabilization/triage-rubric.md`

## Checks

- todos os bugs priorizados possuem `bug_id`, fluxo, owner, prioridade,
  reproducao e evidencia
- os bugs `P1` aparecem primeiro e estao separados dos gaps de observabilidade
- os itens `deferred` possuem racional explicito
- os lotes estao em ordem de ataque coerente com a pesquisa da iniciativa
- o `quickstart.md` continua coerente com a ordem real do ciclo:
  mapeamento -> backlog -> lotes curtos -> guards -> validacao

## Deferred e Racional

### `STAB-009`

- motivo do defer:
  - a UX ja ficou honesta no ciclo atual
  - ainda nao ha evidencia suficiente de que um novo evento e indispensavel
    antes do proximo ciclo
- gatilho de reabertura:
  - usuarios continuam caindo em fallback do Planner sem progresso visivel
  - suporte ou operacao do beta pedem dado mais objetivo desse ponto do funil

## Observacoes

- `STAB-006` foi mantido em `triaged`, nao `deferred`, porque a ambiguidade
  entre `allowSandboxAuth` e `allowManualScenarios` pode afetar validacoes
  futuras do beta
- os bugs P1 permanecem em `fixed-awaiting-validation` ate o smoke manual de
  `BATCH-01`

## Final Contract-Compliance Pass

- `result`: `pass-with-open-manual-smoke`
- `p1_fix_evidence`: presente em `bug-ledger.md`,
  `validation/regression-guards.md` e `validation/closure-log.md`
- `deferred_items_rationale`: presente para `STAB-009`
- `manual_only_validation`: justificada apenas nos pontos visuais/operacionais
  que ainda dependem de browser real
- `remaining_open_item`: `T017`, que depende da execucao manual de
  `CORE-FLOW-01` a `CORE-FLOW-03`
