# Reavaliacao E Roadmap Do Produto

## 1. Diagnostico do estado atual

### Limites desta leitura

- Esta leitura foi baseada em codigo, regras, docs e artefatos atuais do
  repositorio.
- Quando um ponto abaixo mistura observacao e interpretacao, a coluna
  "Implicacao" representa a inferencia; a coluna "Fatos observados" representa
  o estado diretamente verificavel.

| Area | Fatos observados | Implicacao |
|---|---|---|
| Jornada principal `onboarding -> planner -> dashboard -> engine` | O login redireciona para `/dashboard`; a barra lateral ordena `Dashboard -> Sessao de Estudo -> Planner`; o `StudyJourneyCard` explica `Planner -> Dashboard -> Engine`. | O produto ja sabe qual historia quer contar, mas ainda nao a introduz do jeito mais coerente no shell principal. |
| Proposta de valor | README, landing e login vendem performance, IA e multi-edital; planner, dashboard e engine ja entregam uma espinha dorsal real de decisao e execucao. | O valor existe e e percebivel, mas a embalagem ainda acelera a promessa de sofisticacao antes de consolidar a rotina central. |
| UX/UI e fluxos principais | As telas principais sao intencionais, com contexto visual forte e CTAs claros; simulados vivem em `/simulations` como overview e em `/provas` como hub operacional. | A experiencia parece premium, mas ainda custa mais navegacao e mais interpretacao do que deveria. |
| Onboarding e retencao | Beta access e hardcoded por allowlist; login e cadastro ficam expostos antes do bloqueio; nao existe um caminho explicito de "primeiro plano -> primeira leitura semanal -> primeira sessao". | A primeira experiencia ainda depende demais de contexto externo ou de explicacao manual. |
| Arquitetura e organizacao do codigo | O monorepo compartilha `domain`, `application` e `contracts`; `apps/api` ja expone AI, engine e entitlements; `apps/web` ainda hospeda varias rotas server-side equivalentes. | A base arquitetural e melhor do que um app monolitico simples, mas a fronteira de ownership ainda esta em consolidacao. |
| Qualidade tecnica e testabilidade | Ha cobertura boa para regras de dominio, use cases e entitlements no backend; as paginas e fluxos visiveis do produto tem menos cobertura automatizada. | O nucleo de regras esta relativamente protegido, mas a experiencia mais importante para o usuario ainda pode regredir com mais facilidade. |
| Performance | `caderno-erros` resolve questoes erradas em serie; planner monta estatisticas com fetches repetidos por plano. | O beta pequeno suporta o desenho atual, mas as areas de maior valor premium ja mostram pontos de desgaste para escala. |
| Observabilidade e metricas | IA ja tem `ai_usage_events`, custo estimado e quota headers; os docs do beta listam como faltantes eventos de bloqueio, CTA de upgrade e mudanca de status. | Hoje o produto mede melhor custo e uso de IA do que ativacao, retencao e desejo real de upgrade. |
| Monetizacao | A matriz de entitlements esta bem pensada, upgrade cards sao contextuais, e o beta e manual; ao mesmo tempo, o modal de "faturamento" escreve `planTier` pelo cliente e `user_stats` permite escrita do proprio usuario. | A estrategia comercial e boa no papel, mas a confiabilidade operacional/comercial atual ainda e insuficiente. |
| Escalabilidade futura | O beta depende de operacao manual, docs semanais e review constante; a API dedicada ainda aceita sandbox bypass e o web ainda concentra parte do backend funcional. | Antes de ampliar cohortes ou colocar gateway real, o produto precisa de uma base mais confiavel de auth, entitlement e ownership server-side. |

## 2. Pontos fortes

- O produto ja tem uma espinha dorsal real e util: planner, dashboard e engine
  nao sao slides de visao, sao superficies funcionais.
- A qualidade da camada de produto percebido e alta para beta: as telas sao
  intencionais, contextuais e ja apontam a proxima acao.
- O time ja pensou seriamente em packaging e operacao: matriz de entitlements,
  beta test plan, beta metrics roadmap e operations checklist nao sao
  improvisados.
- A base compartilhada em `packages/domain`, `packages/application` e
  `packages/contracts` reduz o risco de duplicar regra de negocio entre apps.
- O produto ja mede bem a parte de IA e quota, o que e raro para uma fase beta.
- Algumas fragilidades do audit anterior ja foram corrigidas, como a
  transparencia da amostra do Gap Analyzer e a explicacao explicita da jornada
  macro -> semana -> hoje.

## 3. Problemas e riscos

| Severity | Problema ou risco | Impacto principal | Evidencia |
|---|---|---|---|
| `critical` | O usuario consegue influenciar `planTier`/usage porque `user_stats` e escrevivel pelo proprio owner e o modal de conta escreve o plano pelo cliente. | Monetizacao, fairness, confianca e qualquer leitura de quota ficam contaminadas. | `firestore.rules`, `AccountPlanModal.tsx`, `lib/firebase/entitlements.ts` |
| `critical` | A API dedicada esta com sandbox bypass habilitado (`x-aprovamind-user-id`) em rotas protegidas. | Protected routes podem ser acessadas sem auth real se essa superficie estiver exposta como esta. | `apps/api/src/app.ts`, `apps/api/src/plugins/firebase-auth.ts` |
| `high` | A jornada principal e contada de um jeito e navegada de outro. | Ativacao e recorrencia sofrem porque o produto nao reforca a mesma narrativa desde a entrada. | `login/page.tsx`, `Sidebar.tsx`, `StudyJourneyCard.tsx` |
| `high` | Ownership server-side esta duplicado entre `apps/web` e `apps/api`. | Auth, observabilidade, deploy e evolucao ficam mais caros e mais confusos. | `apps/web/src/app/api/*`, `apps/api/src/modules/*`, `current-architecture.md` |
| `high` | Ainda faltam eventos de produto para bloqueio, CTA e funil de upgrade. | O time nao consegue dizer com seguranca o que realmente vende `pro` ou `premium`. | `beta-metrics-roadmap.md`, `beta-test-plan.md` |
| `high` | O onboarding beta ainda se parece com cadastro aberto antes do bloqueio por convite. | Primeira impressao fraca, ruido operacional e confianca menor logo no inicio. | `useAuth.ts`, `beta-access.ts`, `login/page.tsx` |
| `medium` | Simulados ainda exigem navegao entre overview e hub operacional. | A descoberta e boa, mas a execucao ainda pede contexto demais. | `simulations/page.tsx`, `provas/page.tsx` |
| `medium` | Front-end principal tem menos cobertura automatizada do que dominio/backend. | Regressao de UX e gates pode escapar mesmo com regras centrais corretas. | `apps/web/tests`, paginas em `apps/web/src/app/(app)/` |
| `medium` | Planner e caderno de erros tem fan-out que envelhece mal com crescimento. | Areas premium e multi-edital podem sofrer latencia justo onde o valor e maior. | `planner/page.tsx`, `caderno-erros/page.tsx` |
| `medium` | README e parte da documentacao descrevem um estado arquitetural anterior. | Onboarding tecnico e decisoes futuras ficam mais lentos e mais ambigos. | `README.md`, `current-architecture.md`, `components/Dashboard.tsx` |

## 4. Quick wins

| ID | Oportunidade | Impact | Effort | Risk | Dependency | Por que vale agora |
|---|---|---|---|---|---|---|
| `QW-01` | Realinhar entrada e nav com `planner -> dashboard -> engine` | `high` | `low` | `low` | nenhum bloqueio pesado | Corrige rapidamente a maior incoerencia da jornada central. |
| `QW-02` | Tornar onboarding beta explicitamente invite-first | `high` | `low` | `low` | nenhuma | Remove uma friccao desnecessaria logo na primeira experiencia. |
| `QW-03` | Canonicalizar a navegacao de simulados | `high` | `medium` | `low` | naming alinhado ajuda | Melhora descoberta e execucao sem pedir nova fundacao tecnica. |
| `QW-04` | Normalizar naming e copy da jornada principal | `medium` | `low` | `low` | nenhuma | Reduz dispersao entre marca, produto e app shell. |
| `QW-05` | Trocar copy de billing por linguagem honesta de beta | `medium` | `low` | `low` | deve acompanhar hardening de trust boundary | Evita vender um fluxo que ainda nao existe como faturamento real. |
| `QW-06` | Explicitar vazios e falhas em telas analiticas | `medium` | `medium` | `low` | nenhuma | Melhora confianca sem precisar criar novas features. |

## 5. Melhorias estruturais

| ID | Oportunidade | Impact | Effort | Risk | Dependency | Risco de nao fazer |
|---|---|---|---|---|---|---|
| `ST-01` | Endurecer auth, entitlements e quota no server-side | `high` | `medium` | `high` | nenhuma | O beta continua produzindo sinal comercial e de autorizacao pouco confiavel. |
| `ST-02` | Consolidar ownership entre `apps/web` e `apps/api` | `high` | `high` | `medium` | `ST-01` | O backend continua espalhado e caro de operar/evoluir. |
| `ST-03` | Criar baseline de observabilidade de produto | `high` | `medium` | `medium` | `ST-01` | O time segue decidindo monetizacao e retencao com pouca evidencia. |
| `ST-04` | Expandir cobertura automatizada da jornada e dos gates | `medium` | `medium` | `low` | `ST-01`, idealmente `ST-02` | Regressao de UX e entitlement continua barata de introduzir. |
| `ST-05` | Reduzir fan-out de planner e caderno de erros | `medium` | `medium` | `medium` | melhor apos `ST-02` | As superficies mais valiosas pioram conforme o beta cresce. |
| `ST-06` | Atualizar docs e remover drift de superficies legadas | `medium` | `medium` | `low` | melhor apos `ST-02` | A equipe continua raciocinando com um mapa tecnico defasado. |

## 6. Melhorias estrategicas

| ID | Oportunidade | Impact | Effort | Risk | Dependency | Por que ainda nao e o primeiro movimento |
|---|---|---|---|---|---|---|
| `SG-01` | Calibrar `free -> pro` com base em valor bloqueado real | `high` | `high` | `medium` | `ST-01`, `ST-03`, jornada mais coerente | Sem medicao de bloqueio e desejo de upgrade, gateway vira aposta cedo demais. |
| `SG-02` | Reposicionar `premium` como coordenacao de rotina complexa | `high` | `high` | `medium` | `SG-01` | O produto ainda precisa provar melhor o que sustenta `pro` antes de sofisticar `premium`. |
| `SG-03` | Fechar o loop adaptativo planner -> dashboard -> engine -> provas -> erros | `high` | `high` | `high` | `ST-02`, `ST-03`, `SG-01` | Uma camada adaptativa mais profunda sem ownership e metricas maduras aumenta rework. |
| `SG-04` | Escalar beta somente depois da base estabilizada | `medium` | `medium` | `medium` | `ST-01`, `QW-01`..`QW-06`, `ST-03` | Crescer cedo demais amplia ruido, nao aprendizado util. |

## 7. Roadmap por fases

### Phase 0 - Trust boundary hardening

- Objetivo: restaurar confianca operacional e comercial antes de tirar
  conclusoes sobre upgrade, quota ou uso premium.
- Inclui: `ST-01`, `QW-05`
- Sinais de saida:
  - nao existe mais caminho cliente-direto para alterar plano/usage
  - sandbox bypass nao fica exposto em rotas protegidas
  - settings nao promete faturamento real onde ainda ha beta manual

### Phase 1 - Coherent activation

- Objetivo: fazer o produto contar a mesma historia desde a primeira tela ate a
  primeira sessao.
- Inclui: `QW-01`, `QW-02`, `QW-03`, `QW-04`, `QW-06`
- Sinais de saida:
  - o usuario entra e entende por onde comecar
  - planner, dashboard e engine reforcam a mesma ordem
  - simulados tem caminho mais canonico

### Phase 2 - Measurement and retention learning

- Objetivo: observar friccao, bloqueio e upgrade com evidencia mais confiavel.
- Inclui: `ST-03`, `ST-04`
- Sinais de saida:
  - existem eventos de bloqueio, CTA, quota e status
  - revisao semanal do beta combina uso, bloqueio e feedback
  - a jornada central tem cobertura automatizada minima

### Phase 3 - Runtime consolidation and performance

- Objetivo: limpar ownership server-side e reduzir gargalos das superficies mais
  valiosas.
- Inclui: `ST-02`, `ST-05`, `ST-06`
- Sinais de saida:
  - AI, engine e entitlements tem ownership mais claro
  - planner multi-edital e caderno de erros envelhecem melhor
  - docs refletem o runtime real do monorepo

### Phase 4 - Commercial calibration

- Objetivo: descobrir o que realmente sustenta `free -> pro` antes do gateway.
- Inclui: `SG-01`
- Sinais de saida:
  - o time sabe quais bloqueios e momentos puxam upgrade de forma confiavel
  - copy e quotas estao calibradas para o proposito real do beta

### Phase 5 - Premium differentiation and adaptive intelligence

- Objetivo: aprofundar a camada premium e a inteligencia adaptativa sem diluir
  o foco central do produto.
- Inclui: `SG-02`, `SG-03`, `SG-04`
- Sinais de saida:
  - `premium` passa a significar coordenacao de rotina complexa
  - o loop entre planejamento, execucao e diagnostico fica mais integrado
  - a ampliacao do beta acontece sobre uma base mais confiavel

## 8. Dependencias e ordem recomendada de execucao

### O que deve vir primeiro

1. `ST-01`
2. `QW-01`, `QW-02`, `QW-03`, `QW-04`, `QW-05`, `QW-06`
3. `ST-03`, `ST-04`

### O que vem depois

4. `ST-02`, `ST-05`, `ST-06`
5. `SG-01`
6. `SG-02`, `SG-03`, `SG-04`

### Por que essa ordem faz sentido

- Sem `ST-01`, qualquer aprendizado sobre plano, quota e upgrade continua
  contaminado por trust boundaries fracas.
- Sem as quick wins de coerencia, o produto continua exigindo mais interpretacao
  do que deveria exatamente na jornada que mais importa para retencao.
- Sem `ST-03`, o time ainda nao consegue dizer com seguranca o que realmente
  vende `pro`, entao gateway e recalibracao comercial ficam precipitados.
- `ST-02` e `ST-05` devem servir a uma pergunta de produto mais clara, e nao
  rodar como refatoracao cega.
- `premium` e loop adaptativo so devem crescer depois que o nucleo single-plan e
  a escada `free -> pro` ficarem mais confiaveis.

### Custo de executar fora de ordem

- Abrir gateway antes de `ST-03`
  - gera cobranca com aprendizado comercial fraco
- Escalar beta antes de `ST-01`
  - amplia ruido e risco de abuso, nao confianca
- Investir em `premium` antes de `SG-01`
  - reforca dispersao estrategica e pode atrasar a consolidacao do plano
    principal
