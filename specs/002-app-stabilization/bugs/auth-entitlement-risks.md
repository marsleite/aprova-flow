# Auth, Entitlement, Quota and Sandbox Risks

## Objetivo

Inventariar os riscos que atravessam autenticacao, sandbox, entitlements e
trust boundary da aplicacao.

## Fontes Auditadas

- `/apps/web/src/hooks/useEntitlements.ts`
- `/apps/web/src/components/EntitlementSandboxCard.tsx`
- `/apps/web/src/lib/entitlements.ts`
- `/apps/web/src/lib/entitlement-sandbox.ts`
- `/apps/api/src/modules/entitlements/`
- `/apps/api/src/modules/engine/`
- `/firestore.rules`

## Riscos Mapeados

### `AUTH-001` - Sandbox local no browser continua sendo override real de leitura

- camada dominante: `auth-entitlement-gating`
- leitura: `useEntitlements()` prefere `sandboxScenarioUserId` quando presente
- impacto: a UI pode refletir tier diferente do usuario real ate o operador
  voltar para “usuario real”
- mitigacao atual:
  - aviso no `/login`
  - badge e callout no `/planner`
  - operacao de retorno via `/settings`
- risco residual: superficies secundarias ainda dependem de smoke manual

### `AUTH-002` - `allowSandboxAuth` e `allowManualScenarios` nao significam a mesma coisa

- camada dominante: `cross-layer`
- leitura:
  - `firebase-auth` so aceita `x-aprovamind-user-id` para autenticar request
    quando `allowSandbox` esta `true`
  - `resolveRequestedUserId()` em `entitlements/routes.ts` continua aceitando
    `x-aprovamind-user-id` e `query.userId` quando `allowManualScenarios` esta
    `true`
- impacto: o time pode acreditar que desligou o sandbox na API, mas ainda
  receber snapshots manuais em `/entitlements/me`
- guarda atual:
  - `/apps/api/src/entitlement-stability.test.ts`
- recomendacao: tratar como item de endurecimento do `BATCH-02`

### `AUTH-003` - Trust boundary final de plano continua dependendo da API e de `firestore.rules`

- camada dominante: `cross-layer`
- leitura:
  - a `web` agora comunica limites com mais honestidade
  - a fonte final de verdade continua na `api` e nas rules publicadas
- impacto: qualquer drift entre rules locais e ambiente real reabre bugs de
  acesso indevido ou bloqueio incorreto
- mitigacao atual:
  - `firestore.rules` endurecidas no branch
  - rotas protegidas consolidadas na `apps/api`
- risco residual: publicar as rules continua sendo passo operacional externo ao
  codigo local

### `AUTH-004` - Quotas e gates menores precisam de revisao manual fora da cadeia principal

- camada dominante: `auth-entitlement-gating`
- leitura: o ciclo atual estabilizou a cadeia principal e boa parte das
  superficies de IA, mas ainda nao existe smoke dedicado para todas as telas
  adjacentes
- impacto: diferencas de copy ou recomendacao de plano podem persistir em
  areas fora do lote P1

## Conclusao Operacional

- o maior risco residual nao e mais “acesso premium pelo cliente”, e sim
  ambiguidade operacional entre usuario real, sandbox local e cenarios manuais
- a proxima rodada de endurecimento deve esclarecer a semantica de toggles da
  API e adicionar um passe manual curto para `settings` e superficies
  secundarias
