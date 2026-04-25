# Cross-Layer Risks Audit

## Objetivo

Registrar falhas ou riscos cuja causa nao pertence a uma unica tela.

## Itens Mapeados

### `CROSS-001` - Semantica dupla de sandbox/manual scenario na API

- relacionado a: `STAB-006`
- camadas: `apps/api/src/plugins/firebase-auth.ts` +
  `apps/api/src/modules/entitlements/routes.ts`
- risco: operador local pode interpretar o ambiente errado e validar um
  snapshot manual como se fosse autenticacao real
- prioridade recomendada: `P2`

### `CROSS-002` - Fallbacks honestos do Dashboard e Engine ainda nao geram sinal de produto

- relacionado a: `STAB-009`
- camadas: `apps/web`, `docs/product/beta-metrics-roadmap.md`
- risco: o beta nao distingue se os usuarios continuam travando por falta de
  edital ou se o ajuste resolveu a confusao
- prioridade recomendada: `P3`

### `CROSS-003` - Publicacao de `firestore.rules` continua sendo passo externo ao branch

- camadas: `firestore.rules`, console Firebase, operacao do beta
- risco: drift entre regras locais e ambiente real reabre bugs de entitlement
  e telemetria mesmo com o codigo da `api` correto
- prioridade recomendada: `P2`

## Dono Primario por Risco

- `CROSS-001`: `api`
- `CROSS-002`: `product`
- `CROSS-003`: `ops/platform`
