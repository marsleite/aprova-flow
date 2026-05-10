# Bug Ledger: Estabilizacao da Aplicacao

## Objetivo

Centralizar os bugs reais desta iniciativa com prioridade, ownership, evidencia
e criterio de encerramento, seguindo o contrato em
`contracts/stability-backlog.md`.

## Resumo do Ciclo

- `cycle_id`: `cycle-01`
- `target_scope`: `login -> planner -> dashboard -> engine`
- `target_bug_priorities`: `P1`, `P2`
- `current_state`: fluxo principal validado no smoke manual final de
  `2026-04-21`; bugs P1 encerrados como `closed` com evidencias em
  `validation/core-flow-smoke.md` e `validation/closure-log.md`

## Ordem Priorizada

| bug_id | title | affected_flow | ownership_layer | severity | priority | status | owner | dependencies |
|---|---|---|---|---|---|---|---|---|
| `STAB-001` | CTA de novo edital parecia quebrado quando o limite do plano era atingido | `planner` | `auth-entitlement-gating` | `blocker` | `P1` | `closed` | `web` | `-` |
| `STAB-002` | `PlanManager` gerava warning de chave duplicada ao renderizar as cores | `planner` | `ui-render-state` | `high` | `P1` | `closed` | `web` | `-` |
| `STAB-003` | Login e Planner escondiam que o navegador estava em sandbox local de entitlement | `login` | `auth-entitlement-gating` | `high` | `P1` | `closed` | `web` | `-` |
| `STAB-004` | Dashboard sem edital ativo caia em estado vazio contraditorio | `dashboard` | `ui-render-state` | `high` | `P1` | `closed` | `web` | `-` |
| `STAB-005` | Engine sem edital ativo nao devolvia o usuario para o Planner com contexto honesto | `engine` | `cross-layer` | `high` | `P1` | `closed` | `web` + `api` | `STAB-004` |
| `STAB-006` | `/entitlements/me` ainda aceita `x-aprovamind-user-id` quando cenarios manuais estao ligados, mesmo com sandbox auth desligado | `cross-flow` | `cross-layer` | `high` | `P2` | `triaged` | `api` | `-` |
| `STAB-007` | Superficies secundarias ainda dependem de smoke manual para confirmar coerencia de gates apos sandbox e tier changes | `secondary-surface` | `auth-entitlement-gating` | `medium` | `P2` | `identified` | `web` | `STAB-003` |
| `STAB-008` | O repositorio nao tem smoke autenticado automatizado da cadeia `login -> planner -> dashboard -> engine` | `cross-flow` | `observability-test-gap` | `medium` | `P2` | `batched` | `qa` | `STAB-001`, `STAB-004`, `STAB-005` |
| `STAB-009` | Falta sinal operacional para distinguir no beta quando `dashboard` ou `engine` voltam ao Planner por falta de contexto | `cross-flow` | `observability-test-gap` | `medium` | `P3` | `deferred` | `product` | `STAB-004`, `STAB-005` |

## Bugs

### `STAB-001` - CTA de novo edital parecia quebrado quando o limite do plano era atingido

- `affected_flow`: `planner`
- `ownership_layer`: `auth-entitlement-gating`
- `severity`: `blocker`
- `priority`: `P1`
- `user_impact`: usuario `pro` ou em sandbox podia clicar em um botao que
  parecia uma acao primaria disponivel, mas nao explicava por que nao abria o
  fluxo correto de multi-edital.
- `expected_behavior`: o topo do Planner deve abrir o modal de criacao quando o
  plano permite novo edital, ou virar CTA de upgrade honesto quando o limite do
  tier foi atingido.
- `actual_behavior`: a tela podia aparentar “botao quebrado”, principalmente
  em cenarios com apenas um edital ativo e gate pro.
- `evidence`:
  - `/specs/002-app-stabilization/bugs/core-flow-login-planner.md#stab-001`
  - `/apps/web/src/app/(app)/planner/page.tsx`
  - `/apps/web/src/lib/stability/core-flow.ts`
  - `/apps/web/tests/stability/core-flow-regression.test.ts`
- `reproduction_steps`:
  1. Entrar no Planner com um usuario `pro` ou sandbox equivalente.
  2. Garantir `1` edital ativo.
  3. Tentar abrir `Novo Edital`.
  4. Observar que a acao precisava virar gate honesto, nao botao aparentemente
     quebrado.
- `suspected_root_cause`: a tela tratava o limite de editais apenas como
  `canCreate` booleano bruto, sem distinguir “criar permitido” de “upgrade
  requerido”.
- `owner`: `web`
- `dependencies`: `-`
- `validation_plan`:
  - guarda automatizado em
    `/apps/web/tests/stability/core-flow-regression.test.ts`
  - smoke manual em
    `/specs/002-app-stabilization/validation/core-flow-smoke.md`
- `status`: `closed`

### `STAB-002` - `PlanManager` gerava warning de chave duplicada ao renderizar as cores

- `affected_flow`: `planner`
- `ownership_layer`: `ui-render-state`
- `severity`: `high`
- `priority`: `P1`
- `user_impact`: o usuario via erro visivel de console em pleno fluxo de
  gerenciamento de edital, corroendo confianca e escondendo regressao real de
  renderizacao.
- `expected_behavior`: cada opcao de cor do `PlanManager` deve ter chave unica
  e a paleta nao deve repetir cores a ponto de quebrar identidade de render.
- `actual_behavior`: duas cores compartilhavam `var(--primary)`, fazendo o
  React acusar `Encountered two children with the same key`.
- `evidence`:
  - screenshot do usuario com stack em `src/components/PlanManager.tsx (557:21)`
  - `/apps/web/src/components/PlanManager.tsx`
  - `/apps/web/src/types/index.ts`
  - `/apps/web/tests/stability/ui-safety.test.ts`
- `reproduction_steps`:
  1. Abrir o modal de criar/editar edital.
  2. Ir ate o seletor de cor.
  3. Observar o warning de chave duplicada no console.
- `suspected_root_cause`: `PLAN_COLORS` continha hex repetido e o componente
  usava apenas `c.hex` como `key`.
- `owner`: `web`
- `dependencies`: `-`
- `validation_plan`:
  - guarda automatizado em
    `/apps/web/tests/stability/ui-safety.test.ts`
  - revalidacao manual leve no modal do Planner
- `status`: `closed`

### `STAB-003` - Login e Planner escondiam que o navegador estava em sandbox local de entitlement

- `affected_flow`: `login`
- `ownership_layer`: `auth-entitlement-gating`
- `severity`: `high`
- `priority`: `P1`
- `user_impact`: o usuario podia acreditar que era `pro` real, quando na
  verdade a tela ainda refletia um cenario local de sandbox gravado no browser.
- `expected_behavior`: sempre que um cenario local estiver ativo, login e
  Planner devem explicar que os gates refletem o sandbox ate o retorno ao
  usuario real em `/settings`.
- `actual_behavior`: o sandbox podia alterar a leitura de entitlement sem aviso
  claro no inicio do fluxo.
- `evidence`:
  - `/apps/web/src/app/login/page.tsx`
  - `/apps/web/src/app/(app)/planner/page.tsx`
  - `/apps/web/src/lib/entitlement-sandbox.ts`
  - `/apps/web/tests/stability/ui-safety.test.ts`
- `reproduction_steps`:
  1. Persistir `entitlementScenario` local no navegador.
  2. Abrir `/login` e seguir para o Planner.
  3. Observar que as telas precisavam informar o contexto de sandbox ativo.
- `suspected_root_cause`: o sandbox existe para debug local, mas o estado
  persistido em `localStorage` nao era refletido com destaque suficiente na UI.
- `owner`: `web`
- `dependencies`: `-`
- `validation_plan`:
  - guarda automatizado em
    `/apps/web/tests/stability/ui-safety.test.ts`
  - smoke manual de usuario real vs sandbox em
    `/specs/002-app-stabilization/validation/core-flow-smoke.md`
- `status`: `closed`

### `STAB-004` - Dashboard sem edital ativo caia em estado vazio contraditorio

- `affected_flow`: `dashboard`
- `ownership_layer`: `ui-render-state`
- `severity`: `high`
- `priority`: `P1`
- `user_impact`: o usuario chegava ao Dashboard sem contexto de plano e via
  uma etapa central sem resposta honesta sobre o que faltava.
- `expected_behavior`: sem plano ou sem plano ativo, o Dashboard deve levar o
  usuario de volta ao Planner com um empty state explicito.
- `actual_behavior`: a etapa podia seguir sem o contexto minimo do edital.
- `evidence`:
  - `/specs/002-app-stabilization/bugs/core-flow-dashboard-engine.md#stab-004`
  - `/apps/web/src/app/(app)/dashboard/page.tsx`
  - `/apps/web/src/lib/stability/core-flow.ts`
  - `/apps/web/tests/stability/core-flow-regression.test.ts`
- `reproduction_steps`:
  1. Entrar no fluxo sem editais ou sem `activePlanId` valido.
  2. Abrir `/dashboard`.
  3. Verificar que a tela precisa interromper o fluxo com CTA claro para o
     Planner.
- `suspected_root_cause`: o fluxo assumia contexto ativo de edital sem validar
  o estado antes de montar a tela.
- `owner`: `web`
- `dependencies`: `-`
- `validation_plan`:
  - guarda automatizado em
    `/apps/web/tests/stability/core-flow-regression.test.ts`
  - smoke manual em `CORE-FLOW-01`
- `status`: `closed`

### `STAB-005` - Engine sem edital ativo nao devolvia o usuario para o Planner com contexto honesto

- `affected_flow`: `engine`
- `ownership_layer`: `cross-layer`
- `severity`: `high`
- `priority`: `P1`
- `user_impact`: o usuario podia entrar na etapa “Hoje” sem um edital ativo e
  ficar preso num estado sem proxima acao real.
- `expected_behavior`: o Engine deve exigir contexto real de plano e oferecer
  CTA claro para o Planner quando o contexto estiver ausente.
- `actual_behavior`: a etapa nao comunicava a dependencia do edital ativo com a
  mesma clareza da jornada desejada.
- `evidence`:
  - `/specs/002-app-stabilization/bugs/core-flow-dashboard-engine.md#stab-005`
  - `/apps/web/src/app/(app)/engine/page.tsx`
  - `/apps/api/src/modules/engine/routes.ts`
  - `/apps/api/src/core-flow.stability.test.ts`
- `reproduction_steps`:
  1. Remover ou invalidar o `activePlanId`.
  2. Abrir `/engine`.
  3. Confirmar que a tela deve retornar o usuario ao Planner em vez de seguir
     sem contexto.
- `suspected_root_cause`: a jornada aceitava uma dependencia estrutural do
  Engine sem validacao comum entre telas e borda da API.
- `owner`: `web` + `api`
- `dependencies`: `STAB-004`
- `validation_plan`:
  - guarda automatizado em
    `/apps/web/tests/stability/core-flow-regression.test.ts`
  - contrato API em `/apps/api/src/core-flow.stability.test.ts`
  - smoke manual em `CORE-FLOW-01`
- `status`: `closed`

### `STAB-006` - `/entitlements/me` ainda aceita `x-aprovamind-user-id` quando cenarios manuais estao ligados, mesmo com sandbox auth desligado

- `affected_flow`: `cross-flow`
- `ownership_layer`: `cross-layer`
- `severity`: `high`
- `priority`: `P2`
- `user_impact`: operadores podem acreditar que o sandbox esta totalmente
  desligado no backend quando, na pratica, a rota ainda resolve um usuario
  manual enquanto `allowManualScenarios` estiver ativo.
- `expected_behavior`: a politica de cenarios manuais deve ser explicita e
  coerente entre auth plugin, rotas de entitlement e operacao local.
- `actual_behavior`: `allowSandboxAuth: false` nao impede
  `resolveRequestedUserId(...)` de aceitar header/query manual em
  `/entitlements/me` se `allowManualScenarios` estiver ligado.
- `evidence`:
  - `/apps/api/src/modules/entitlements/routes.ts`
  - `/apps/api/src/plugins/firebase-auth.ts`
  - `/apps/api/src/entitlement-stability.test.ts`
- `reproduction_steps`:
  1. Subir a API com `allowSandboxAuth: false`.
  2. Manter `allowManualScenarios` habilitado.
  3. Chamar `GET /entitlements/me` com `x-aprovamind-user-id`.
  4. Observar resposta `200` com snapshot manual.
- `suspected_root_cause`: existem dois toggles de ambiente distintos
  (`allowSandboxAuth` e `allowManualScenarios`) com semanticas proximas, mas
  nao equivalentes.
- `owner`: `api`
- `dependencies`: `-`
- `validation_plan`:
  - guarda automatizado em
    `/apps/api/src/entitlement-stability.test.ts`
  - decisao operacional documentada em
    `/specs/002-app-stabilization/bugs/auth-entitlement-risks.md`
- `status`: `triaged`

### `STAB-007` - Superficies secundarias ainda dependem de smoke manual para confirmar coerencia de gates apos sandbox e tier changes

- `affected_flow`: `secondary-surface`
- `ownership_layer`: `auth-entitlement-gating`
- `severity`: `medium`
- `priority`: `P2`
- `user_impact`: mesmo com a jornada central corrigida, telas adjacentes podem
  manter copy, CTA ou leitura de tier que precisem de regressao manual.
- `expected_behavior`: telas secundarias devem seguir a mesma leitura honesta
  de sandbox, acesso e limite de plano.
- `actual_behavior`: ainda nao existe passe dedicado cobrindo essas telas no
  ciclo atual.
- `evidence`:
  - `/specs/002-app-stabilization/bugs/secondary-surfaces.md`
  - `/docs/product/beta-operations-checklist.md`
- `reproduction_steps`:
  1. Alternar entre usuario real e sandbox.
  2. Navegar por `mentoring`, `provas`, `caderno-erros` e `settings`.
  3. Confirmar coerencia de badge, gate e CTA.
- `suspected_root_cause`: o ciclo atual priorizou a cadeia principal e ainda nao
  capturou smoke documentado para todas as superficies secundarias.
- `owner`: `web`
- `dependencies`: `STAB-003`
- `validation_plan`:
  - smoke semanal do beta
  - lote dedicado de estabilizacao secundaria
- `status`: `identified`

### `STAB-008` - O repositorio nao tem smoke autenticado automatizado da cadeia `login -> planner -> dashboard -> engine`

- `affected_flow`: `cross-flow`
- `ownership_layer`: `observability-test-gap`
- `severity`: `medium`
- `priority`: `P2`
- `user_impact`: bugs P1 podem parecer resolvidos em testes unitarios, mas
  reabrir quando a cadeia completa roda num browser autenticado.
- `expected_behavior`: existir ao menos um protocolo repetivel que prove a
  cadeia principal com usuario real ou harness equivalente.
- `actual_behavior`: o ciclo depende de smoke manual documentado e de guards
  isolados por helper/rota.
- `evidence`:
  - `/specs/002-app-stabilization/validation/core-flow-smoke.md`
  - `/specs/002-app-stabilization/validation/cycle-01-regression.md`
- `reproduction_steps`:
  1. Fechar um lote P1.
  2. Tentar validar o fluxo inteiro apenas com testes automatizados atuais.
  3. Observar que a ultima confirmacao ainda depende de smoke manual.
- `suspected_root_cause`: o repositorio tem boa cobertura local por helper e
  rota, mas nao possui harness autenticado de navegacao ponta a ponta.
- `owner`: `qa`
- `dependencies`: `STAB-001`, `STAB-004`, `STAB-005`
- `validation_plan`:
  - manter o smoke `CORE-FLOW-01`
  - avaliar E2E autenticado em ciclo seguinte
- `status`: `batched`

### `STAB-009` - Falta sinal operacional para distinguir no beta quando `dashboard` ou `engine` voltam ao Planner por falta de contexto

- `affected_flow`: `cross-flow`
- `ownership_layer`: `observability-test-gap`
- `severity`: `medium`
- `priority`: `P3`
- `user_impact`: o time nao consegue medir se os empty states honestos estao
  ajudando ou se o usuario continua se perdendo antes de configurar o edital.
- `expected_behavior`: o beta deveria ter sinal minimo indicando quantas vezes
  o usuario bate nos fallbacks de contexto do Planner.
- `actual_behavior`: o comportamento agora e honesto na UI, mas ainda opaco na
  operacao do beta.
- `evidence`:
  - `/specs/002-app-stabilization/bugs/test-and-observability-gaps.md`
  - `/docs/product/beta-metrics-roadmap.md`
- `reproduction_steps`:
  1. Entrar sem edital ativo.
  2. Cair no empty state de Dashboard ou Engine.
  3. Verificar que nao existe evento dedicado dessa situacao.
- `suspected_root_cause`: o foco do ciclo foi estabilizar a UX antes de ampliar
  a telemetria de produto.
- `owner`: `product`
- `dependencies`: `STAB-004`, `STAB-005`
- `validation_plan`:
  - decidir em ciclo futuro se esse fallback merece evento de produto
- `status`: `deferred`
