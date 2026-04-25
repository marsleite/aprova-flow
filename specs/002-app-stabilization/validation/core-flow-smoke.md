# Core Flow Smoke

## Status Atual do Ciclo

- `batch_id`: `BATCH-01`
- `status`: `pending-manual-execution`
- `reason`: nao ha harness autenticado ponta a ponta no repositorio; o smoke
  final precisa ser executado manualmente em browser local ou ambiente beta

## `CORE-FLOW-01`

- `scenario_id`: `CORE-FLOW-01`
- `batch_id`: `BATCH-01`
- `scope`: `flow-chain`
- `starting_point`: `/login` com usuario real, sem sandbox local ativo e com ao
  menos um edital configurado
- `steps`:
  1. Autenticar na aplicacao.
  2. Confirmar ausencia de aviso de sandbox no login.
  3. Abrir `/planner` e verificar badge de acesso coerente.
  4. Confirmar que `Novo Edital` abre criacao ou mostra CTA honesto conforme o
     tier.
  5. Ir para `/dashboard` com edital ativo.
  6. Ir para `/engine` e confirmar abertura da etapa `Hoje`.
- `expected_outcome`: a cadeia inteira e navegavel sem warning visivel, dead
  action ou estado contraditorio
- `evidence_capture`: gravar resultado em
  `/specs/002-app-stabilization/validation/closure-log.md`

## `CORE-FLOW-02`

- `scenario_id`: `CORE-FLOW-02`
- `batch_id`: `BATCH-01`
- `scope`: `flow-step`
- `starting_point`: navegador local com `entitlementScenario` ativo
- `steps`:
  1. Abrir `/login`.
  2. Confirmar mensagem de sandbox local.
  3. Entrar no `/planner`.
  4. Confirmar badge `Sandbox ativo` e callout orientando voltar ao usuario real
     em `/settings`.
- `expected_outcome`: o usuario entende que os gates atuais refletem um cenario
  local e nao o plano real
- `evidence_capture`: screenshot ou anotacao curta no `closure-log.md`

## `CORE-FLOW-03`

- `scenario_id`: `CORE-FLOW-03`
- `batch_id`: `BATCH-01`
- `scope`: `flow-step`
- `starting_point`: usuario sem edital ativo
- `steps`:
  1. Abrir `/dashboard`.
  2. Confirmar empty state com CTA para o Planner.
  3. Abrir `/engine`.
  4. Confirmar empty state equivalente.
- `expected_outcome`: Dashboard e Engine falham de forma honesta, sem seguir
  silenciosamente sem contexto
- `evidence_capture`: anotacao manual no `closure-log.md`
