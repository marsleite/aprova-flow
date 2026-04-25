# Data Model: Estabilizacao da Aplicacao

Este modelo organiza a iniciativa de estabilizacao como um sistema de leitura,
priorizacao e correcao. Nao descreve schema de producao; ele define como bugs,
evidencias, lotes e validacoes devem ser estruturados nesta frente.

## Entity: StabilityBug

| Field | Type | Description | Validation |
|---|---|---|---|
| `bug_id` | string | Identificador estavel do bug | MUST be unique |
| `title` | string | Titulo curto e objetivo | MUST describe the observed failure |
| `affected_flow` | enum | Fluxo principal ou adjacente impactado | MUST be one of: `login`, `planner`, `dashboard`, `engine`, `cross-flow`, `secondary-surface` |
| `ownership_layer` | enum | Camada dominante da causa raiz | MUST be one of: `ui-render-state`, `auth-entitlement-gating`, `api-data-contract`, `observability-test-gap`, `cross-layer` |
| `severity` | enum | Gravidade do bug | MUST be one of: `blocker`, `high`, `medium`, `low` |
| `priority` | enum | Ordem de ataque planejada | MUST be one of: `P1`, `P2`, `P3` |
| `symptom_type` | enum | Forma como o bug aparece | MUST be one of: `runtime-error`, `render-warning`, `dead-action`, `wrong-gate`, `data-mismatch`, `loading-state`, `regression`, `observability-gap` |
| `user_impact` | string | Consequencia para o usuario | MUST explain why the bug matters |
| `expected_behavior` | string | Comportamento correto esperado | MUST be explicit |
| `actual_behavior` | string | Comportamento atual observado | MUST be reproducible |
| `status` | enum | Estado do bug no ciclo | MUST be one of: `identified`, `triaged`, `batched`, `in-fix`, `fixed-awaiting-validation`, `closed`, `deferred` |
| `owner` | string | Responsavel pela proxima acao | MUST be explicit |
| `dependency_ids` | string[] | Bugs ou lotes que precisam vir antes | MAY be empty |

## Entity: ReproductionEvidence

| Field | Type | Description | Validation |
|---|---|---|---|
| `evidence_id` | string | Identificador da evidencia | MUST be unique |
| `bug_id` | string | Bug relacionado | MUST reference an existing `StabilityBug` |
| `evidence_type` | enum | Tipo de prova | MUST be one of: `ui-observation`, `console-error`, `code-reference`, `test-failure`, `manual-repro`, `metric-signal` |
| `reference` | string | Caminho, tela, screenshot, log ou teste | MUST be traceable |
| `reproduction_steps` | string[] | Passos minimos para reproduzir | MUST contain enough detail to retry |
| `confidence` | enum | Confianca na reproducao | MUST be one of: `high`, `medium`, `low` |
| `note` | string | Contexto adicional opcional | SHOULD explain caveats when confidence is not `high` |

## Entity: FlowCheckpoint

| Field | Type | Description | Validation |
|---|---|---|---|
| `checkpoint_id` | string | Identificador do checkpoint | MUST be unique |
| `flow` | enum | Etapa da jornada | MUST be one of: `login`, `planner`, `dashboard`, `engine` |
| `core_action` | string | Acao central que define sucesso da etapa | MUST be singular and user-visible |
| `expected_state` | string | Resultado que confirma estabilidade | MUST be verifiable |
| `blocking_conditions` | string[] | Condicoes que tornam a etapa instavel | SHOULD be explicit |

## Entity: FixBatch

| Field | Type | Description | Validation |
|---|---|---|---|
| `batch_id` | string | Identificador do lote | MUST be unique |
| `objective` | string | Objetivo unico do lote | MUST be specific and outcome-oriented |
| `included_bug_ids` | string[] | Bugs tratados no lote | MUST reference one or more `StabilityBug` entries |
| `dominant_layer` | enum | Camada principal do lote | MUST be one of: `ui-render-state`, `auth-entitlement-gating`, `api-data-contract`, `observability-test-gap`, `cross-layer` |
| `entry_criteria` | string[] | O que precisa estar claro antes de iniciar | MUST be explicit |
| `exit_criteria` | string[] | Sinais que permitem encerrar o lote | MUST be observable |
| `required_docs` | string[] | Documentos que precisam ser atualizados | MAY be empty |
| `status` | enum | Estado do lote | MUST be one of: `planned`, `active`, `validating`, `done` |

## Entity: RegressionGuard

| Field | Type | Description | Validation |
|---|---|---|---|
| `guard_id` | string | Identificador do guarda | MUST be unique |
| `bug_id` | string | Bug coberto | MUST reference an existing `StabilityBug` |
| `guard_type` | enum | Tipo de blindagem | MUST be one of: `automated-test`, `smoke-scenario`, `contract-check`, `lint-typecheck`, `manual-visual` |
| `location` | string | Onde a blindagem vive | MUST be traceable |
| `pass_signal` | string | O que significa sucesso | MUST be explicit |
| `justification` | string | Justificativa quando nao for teste automatizado | MUST exist for `manual-visual` |

## Entity: SmokeScenario

| Field | Type | Description | Validation |
|---|---|---|---|
| `scenario_id` | string | Identificador do smoke | MUST be unique |
| `scope` | enum | Abrangencia da validacao | MUST be one of: `flow-step`, `flow-chain`, `batch-regression` |
| `starting_point` | string | Tela ou condicao inicial | MUST be reproducible |
| `steps` | string[] | Sequencia curta de validacao | MUST be ordered |
| `expected_outcome` | string | Resultado esperado | MUST be observable |
| `evidence_capture` | string | Como registrar a passagem | SHOULD be explicit |

## Entity: StabilityCycle

| Field | Type | Description | Validation |
|---|---|---|---|
| `cycle_id` | string | Identificador do ciclo | MUST be unique |
| `name` | string | Nome do ciclo | MUST be specific |
| `target_scope` | string | Escopo declarado do ciclo | MUST align with prioritized flows |
| `target_bug_priorities` | string[] | Prioridades atendidas no ciclo | MUST contain one or more of `P1`, `P2`, `P3` |
| `included_batch_ids` | string[] | Lotes do ciclo | MUST reference existing `FixBatch` entries |
| `success_signal` | string[] | Sinais de saida do ciclo | MUST be observable |

## Relationships

- Um `StabilityBug` possui uma ou mais `ReproductionEvidence`.
- Um `StabilityBug` pode exigir um ou mais `RegressionGuard`.
- Um `FixBatch` agrupa varios `StabilityBug`.
- Um `FixBatch` precisa de um ou mais `SmokeScenario` quando tocar fluxo
  principal.
- Um `StabilityCycle` agrupa varios `FixBatch`.
- Um `FlowCheckpoint` serve como referencia de validacao para `SmokeScenario` e
  para o criterio de encerramento de bugs na jornada principal.

## Validation Rules

- Todo `StabilityBug` MUST ter pelo menos uma evidencia rastreavel.
- Todo bug `P1` MUST ter owner, prioridade, reproducao e dependencia
  explicitadas antes de entrar em um lote.
- Todo `FixBatch` MUST declarar criterio de entrada e de saida.
- Todo bug fechado em `login`, `planner`, `dashboard` ou `engine` MUST ter um
  `RegressionGuard` associado.
- Todo smoke de `flow-chain` MUST cobrir a navegacao e a acao central do fluxo
  validado, nao apenas carregamento superficial da tela.

## State Transitions

### StabilityBug Lifecycle

`identified` -> `triaged` -> `batched` -> `in-fix` -> `fixed-awaiting-validation` -> `closed`

Fluxos alternativos:

- `triaged` -> `deferred`
- `fixed-awaiting-validation` -> `in-fix` se a validacao falhar

### FixBatch Lifecycle

`planned` -> `active` -> `validating` -> `done`

- `active`: correcoes em andamento
- `validating`: guards e smoke rodando
- `done`: criterios de saida atendidos

### StabilityCycle Lifecycle

`planned` -> `active` -> `checkpointed` -> `completed`

- `checkpointed`: o ciclo tem leitura confiavel de progresso, ainda que com P2
  ou P3 remanescentes
