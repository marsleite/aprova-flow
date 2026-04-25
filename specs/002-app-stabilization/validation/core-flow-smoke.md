# Core Flow Smoke

## Status Atual do Ciclo

- `batch_id`: `BATCH-01`
- `status`: `passed`
- `executed_at`: `2026-04-21`
- `environment`: browser local em `localhost:3000` com API local em
  `127.0.0.1:3001`
- `reason`: smoke manual final executado no fluxo real e no sandbox local para
  encerrar o ciclo de validacao do lote

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
- `result`: `pass`
- `observed_evidence`:
  - `/login` em `localhost:3000/login` sem callout de sandbox depois do retorno
    para `usuario real`
  - autenticacao via Google concluida com conta real e redirecionamento para o
    `/planner`
  - `/planner` exibiu badge coerente de acesso e o CTA `Novo Edital` abriu o
    modal `Novo Edital`
  - `/dashboard` carregou com contexto ativo `Sessao Livre`
  - `/engine` abriu a etapa `Sessao` com `CONTEXTO ATIVO: Sessao Livre`

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
- `result`: `pass`
- `observed_evidence`:
  - `/login` exibiu o bloco `SANDBOX LOCAL` com o contexto
    `premium-user`
  - `/planner` exibiu chip `SANDBOX · PREMIUM-USER`
  - o callout de sandbox orientou voltar ao usuario real em `/settings`

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
- `result`: `pass`
- `observed_evidence`:
  - seletor de contexto ajustado para `Todos os Editais`, removendo edital ativo
  - `/dashboard` exibiu empty state `Selecione um edital ativo no Planner` com
    CTA `Gerenciar Editais`
  - `/engine` exibiu empty state equivalente com a mesma orientacao para o
    Planner
