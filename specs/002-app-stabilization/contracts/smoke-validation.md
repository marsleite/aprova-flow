# Contract: Smoke Validation

## Purpose

Definir o protocolo minimo de smoke testing que acompanha cada lote de
estabilizacao, evitando encerrar bugs da jornada principal apenas por leitura de
codigo ou por sucesso de um teste isolado.

## Output Format

- **Format**: Markdown checklist ou registro curto por lote
- **Audience**: engenharia e revisao operacional
- **Rule**: todo lote que tocar `login`, `planner`, `dashboard` ou `engine`
  deve terminar com smoke correspondente ao fluxo afetado

## Required Scenario Fields

| Field | Required Content |
|---|---|
| `scenario_id` | Identificador estavel |
| `batch_id` | Lote ao qual o smoke pertence |
| `scope` | `flow-step`, `flow-chain` ou `batch-regression` |
| `starting_point` | Tela inicial e precondicoes de conta/plano |
| `steps` | Sequencia curta de interacoes |
| `expected_outcome` | Resultado observavel que prova estabilidade |
| `evidence_capture` | Como a passagem foi registrada |

## Mandatory Flow Coverage

### Sempre que o lote tocar a jornada principal

- `login`: autenticacao valida e entrada sem dead-end
- `planner`: carregamento, acao central e resposta honesta de gates/limites
- `dashboard`: leitura da semana sem estado quebrado ou silenciosamente vazio
- `engine`: abertura e execucao da acao principal sem bloqueio equivalente

### Sempre que o lote tocar auth, entitlements ou quota

- validar o comportamento com usuario real
- validar comportamento com sandbox ou fallback, quando aplicavel
- confirmar que a UI e o server-side continuam coerentes

## Closure Rules

- Smoke MUST refletir o comportamento esperado do usuario, nao so a ausencia de
  excecao no console.
- Smoke de `flow-chain` SHOULD percorrer mais de uma etapa quando a correcao
  puder deslocar a quebra para a tela seguinte.
- Se o smoke falhar, o lote volta para `active`.
