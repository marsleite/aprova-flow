# Quickstart: Como Executar a Estabilizacao

## Objetivo

Transformar a frente de estabilizacao em uma rotina executavel: mapear bugs
reais, ordenar a correcao e fechar cada lote com evidencias de que a jornada
principal voltou ao estado esperado.

## Pre-requisitos

- Estar no branch `002-app-stabilization`
- Usar esta pasta `specs/002-app-stabilization/` como fonte dos artefatos da
  iniciativa
- Consultar primeiro:
  - `spec.md`
  - `plan.md`
  - `research.md`
  - `data-model.md`
  - `contracts/stability-backlog.md`
  - `contracts/smoke-validation.md`
  - `docs/architecture/current-architecture.md`
- Ter ambiente local capaz de subir `apps/web` e `apps/api`

## Workflow Recomendado

### 1. Mapear os bugs da jornada principal

- Reproduzir `login -> planner -> dashboard -> engine`
- Registrar travas, warnings, dead actions, gates incoerentes, carregamentos
  contraditorios e regressos percebidos
- Comecar pelos bugs que o usuario ja consegue mostrar em runtime ou console

### 2. Montar o backlog com evidencias

Para cada bug:

- registrar no formato de `contracts/stability-backlog.md`
- separar sintoma e causa raiz suspeita
- marcar o `affected_flow`, `ownership_layer`, `severity` e `priority`
- anexar screenshot, erro de console, caminho de codigo ou teste quando existir

### 3. Sequenciar em lotes curtos

Ordem recomendada:

1. Lote 0: bloqueios e falsos sinais de quebra na jornada principal
2. Lote 1: bugs de auth, entitlements, gating e coerencia server/client
3. Lote 2: contratos de dados, estados parciais e regressao entre telas
4. Lote 3: observabilidade, guards faltantes e warnings secundarios

### 4. Corrigir com blindagem

Para cada lote:

- definir o guarda de regressao antes de fechar o item
- adicionar ou atualizar teste automatizado quando o risco pedir
- executar o smoke correspondente em `contracts/smoke-validation.md`
- atualizar docs se o fix mudar ownership, rota canonica ou fluxo operacional

### 5. Validar antes de encerrar

Base minima de validacao, ajustando conforme o lote:

- `npm run test:run`
- `npm run lint:web`
- `npm test -w @aprovamind/api`
- `npm run lint:api`
- smoke manual da jornada afetada

## Resultado Esperado

Ao final do primeiro ciclo, o time deve ter:

- bugs P1 mapeados com evidencias e ordem de ataque
- a jornada `login -> planner -> dashboard -> engine` utilizavel sem bloqueio
  funcional
- guards e smoke suficientes para evitar reabrir as mesmas falhas no lote
  seguinte
