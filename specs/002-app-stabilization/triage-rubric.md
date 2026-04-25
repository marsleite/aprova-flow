# Triage Rubric: Estabilizacao

## Objetivo

Padronizar severidade, prioridade e entrada em lote para que o backlog nao
misture sintoma cosmetico com quebra real de fluxo.

## Escala de Severidade

### `blocker`

- impede concluir a acao central da etapa
- deixa a interface com cara de quebrada
- exige entrar no lote ativo mais proximo

### `high`

- nao derruba a jornada inteira, mas compromete confianca, leitura de gating ou
  contexto operacional

### `medium`

- degrada entendimento, telemetria ou cobertura de regressao, sem impedir uso
  central imediato

### `low`

- cleanup ou risco local sem impacto direto percebido no primeiro ciclo

## Escala de Prioridade

### `P1`

- entra se toca `login`, `planner`, `dashboard` ou `engine`
- entra se produz erro visivel, dead action ou gate enganoso na cadeia central

### `P2`

- entra quando nao bloqueia a cadeia inteira, mas afeta estabilidade real de
  operacao, entitlement, contrato ou superficies adjacentes relevantes

### `P3`

- backlog residual de observabilidade, cleanup ou medicao futura

## Ownership Dominante

- `ui-render-state`: sintoma principal esta na tela, composicao ou estado local
- `auth-entitlement-gating`: problema central e tier, sandbox, quota, acesso ou
  comunicacao de limite
- `api-data-contract`: API ou proxy aceita/retorna dados sem contrato claro
- `observability-test-gap`: o maior problema e a incapacidade de provar ou
  monitorar a estabilidade
- `cross-layer`: o bug nasce de mais de uma camada e precisa owner principal +
  dependencias explicitas

## Regras de Entrada em Lote

- todo item precisa de `bug_id`, reproducao, evidencia e owner
- bug `P1` entra no ledger antes de qualquer cleanup paralelo
- bug cross-layer so entra com camada dona principal explicitada

## Regras de Saida do Lote

- guarda automatizado ou justificativa manual documentada
- status atualizado em `bug-ledger.md`
- evidencia posterior ao fix em `validation/closure-log.md`
- smoke correspondente registrado se o lote tocar fluxo principal

## Regras de Deferred

- so marcar `deferred` quando o item:
  - nao bloqueia o ciclo atual
  - tem racional claro
  - tem gatilho explicito para reabrir no proximo ciclo
