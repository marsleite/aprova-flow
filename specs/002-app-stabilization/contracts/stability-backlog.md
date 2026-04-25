# Contract: Stability Backlog

## Purpose

Definir o formato minimo obrigatorio do backlog de bugs desta iniciativa,
garantindo que cada falha real tenha reproducao, prioridade, owner, dependencia
e criterio de encerramento antes de entrar em correcao.

## Output Format

- **Format**: Markdown
- **Audience**: produto, engenharia e operacao
- **Source of truth**: estado atual do codigo, comportamento real da aplicacao,
  evidencias de reproducao e testes/validacoes ligados ao bug
- **Rule**: nenhum bug entra como "priorizado" sem evidencia rastreavel e sem
  explicacao de por que ele vem antes ou depois de outro item

## Required Bug Fields

| Field | Required Content |
|---|---|
| `bug_id` | Identificador estavel |
| `title` | Resumo curto do bug |
| `affected_flow` | `login`, `planner`, `dashboard`, `engine`, `cross-flow` ou `secondary-surface` |
| `ownership_layer` | `ui-render-state`, `auth-entitlement-gating`, `api-data-contract`, `observability-test-gap` ou `cross-layer` |
| `severity` | `blocker`, `high`, `medium` ou `low` |
| `priority` | `P1`, `P2` ou `P3` |
| `user_impact` | Consequencia percebida pelo usuario |
| `expected_behavior` | O que deveria acontecer |
| `actual_behavior` | O que acontece hoje |
| `evidence` | Referencia a screenshot, erro, codigo, log ou teste |
| `reproduction_steps` | Passos minimos para reproduzir |
| `suspected_root_cause` | Hipotese inicial de causa, mesmo que provisoria |
| `owner` | Responsavel pela proxima acao |
| `dependencies` | O que precisa vir antes |
| `validation_plan` | Guarda automatizado, smoke ou justificativa manual |
| `status` | Estado atual do item |

## Priority Rules

### `P1`

- bloqueia a jornada `login -> planner -> dashboard -> engine`
- impede a acao central da etapa
- cria contradicao forte de confianca, gating ou integridade do fluxo

### `P2`

- nao bloqueia a jornada inteira, mas degrada uso real, entendimento ou
  estabilidade local de uma etapa

### `P3`

- cleanup, warning ou inconsistencia secundaria que nao merece entrar antes dos
  itens mais graves

## Closure Rules

- Um bug MUST NOT ser fechado sem reproducao anterior e verificacao posterior.
- Bugs em fluxo principal MUST ter `RegressionGuard` novo ou reaproveitado.
- Bugs visuais sem guarda automatizado novo MUST registrar por que a validacao
  manual e suficiente.
- Se a causa raiz for cross-layer, o backlog MUST registrar qual camada e a dona
  da correcao principal e quais telas dependem disso.
