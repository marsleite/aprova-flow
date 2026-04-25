# Baseline Validation

## Ambiente Base

- branch: `002-app-stabilization`
- apps alvo:
  - `apps/web`
  - `apps/api`
- foco do ciclo: `login -> planner -> dashboard -> engine`

## Preconditions de Conta

- usuario real com autenticacao valida para o smoke principal
- ao menos um edital ativo para o passo feliz de Dashboard e Engine
- acesso a `/settings` para remover sandbox local quando necessario

## Preconditions de Smoke

- `apps/web` e `apps/api` sobem localmente
- `NEXT_PUBLIC_API_BASE_URL` aponta para a `api`
- sandbox local desligado para `CORE-FLOW-01`
- sandbox local ligado apenas para `CORE-FLOW-02`

## Comandos Baseline do Ciclo

- `npm run test:run -w @aprovamind/web`
- `npm test -w @aprovamind/api`
- `npm run lint:web`
- `npm run lint:api`

## Observacao

O baseline automatizado cobre helpers, rotas e coerencia de borda, mas nao
substitui o smoke manual autenticado da cadeia completa.
