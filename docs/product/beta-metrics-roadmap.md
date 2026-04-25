# Roadmap de Métricas do Beta

## Objetivo

Registrar o que o AprovaMind já mede hoje, o que ainda falta medir no beta e
qual é o próximo passo recomendado antes do gateway real de pagamento.

Este documento existe para responder três perguntas:

1. O que já temos para acompanhar o beta?
2. O que ainda não temos de observabilidade de produto?
3. Dá para manter esta base na `main` durante `8 semanas` ou mais de teste?

## Resposta Curta

Sim, a base atual já pode ficar na `main` durante o beta, desde que:

- o fluxo continue sem gateway real
- a operação de testers siga manual via `/settings`
- a equipe aceite que a observabilidade de produto ainda está incompleta

O grande bloco que ainda falta antes de cobrança real é:

- calibrar a escada `free -> pro` com base nos bloqueios, quotas e cliques que
  o beta já está coletando

## O que já medimos hoje

### 1. Telemetria de IA

Já existe telemetria útil para rotas de IA, com persistência em:

- `ai_usage_events`

O que já conseguimos observar:

- rota chamada
- task executada
- provider/model
- latência
- tokens
- custo estimado
- sucesso ou erro
- status code

Arquivos principais:

- [metrics.ts](/Users/marleite/workspace/aprova-flow/packages/ai-gateway/src/metrics.ts)
- [routes.ts](/Users/marleite/workspace/aprova-flow/apps/api/src/modules/ai/routes.ts)
- [ai-usage-store.ts](/Users/marleite/workspace/aprova-flow/apps/api/src/modules/ai/ai-usage-store.ts)
- [aiUsage.ts](/Users/marleite/workspace/aprova-flow/apps/web/src/lib/firebase/aiUsage.ts)

### 2. Uso de quotas por entitlement

Já existe controle operacional de consumo em `user_stats`, usando:

- `entitlementUsage`
- `entitlementUsagePeriods`

Isso já permite acompanhar:

- uso atual por feature
- consumo dentro do mês
- reset de usage
- fallback de quota por plano

Arquivos principais:

- [aiRateLimit.ts](/Users/marleite/workspace/aprova-flow/apps/web/src/lib/server/aiRateLimit.ts)
- [userEntitlements.ts](/Users/marleite/workspace/aprova-flow/apps/web/src/lib/server/userEntitlements.ts)
- [subscription-state.shared.ts](/Users/marleite/workspace/aprova-flow/apps/api/src/modules/entitlements/subscription-state.shared.ts)

### 3. Dados funcionais do produto

O produto já gera dados suficientes para análises derivadas sobre uso, como:

- sessões de estudo
- tentativas de questões
- simulados
- caderno de erros
- analytics de acurácia
- snapshot do motor

Isso já ajuda a responder perguntas como:

- o usuário voltou?
- fez simulado?
- usou o motor?
- praticou questões?

## O que ainda não medimos bem

### 1. Eventos de produto ligados a billing e conversão

Agora já existe uma baseline consistente para:

- `feature_blocked`
- `upgrade_cta_viewed`
- `upgrade_cta_clicked`
- `ai_quota_exhausted`
- `simulation_completed`
- `plan_status_changed`
- `tester_subscription_updated`

Esses eventos já sustentam a leitura operacional do beta antes do gateway.

O que ainda falta nesta camada:

- consolidar comparações entre janelas (`7d`, `14d`, `30d`)
- observar quais sinais puxam mais `free -> pro` versus `pro -> premium`
- ligar melhor bloqueio e clique com recorrência real de uso do produto

### 2. Funil real de upgrade

Hoje já conseguimos responder melhor:

- em qual tela o usuário sentiu falta do `Pro`
- em qual tela o usuário sentiu falta do `Premium`
- qual bloqueio gerou clique de upgrade

O que ainda não está totalmente claro:

- qual feature realmente puxou mudança manual de plano com mais frequência
- quais bloqueios sinalizam curiosidade e quais realmente antecipam upgrade
- qual recorte de quota deve ser recalibrado antes do gateway
- quantas vezes `dashboard` e `engine` ainda devolvem o usuário ao Planner por
  falta de contexto real de edital

### 3. Painel consolidado de produto

Os dados agora já estão organizados em um painel admin claro de beta.

Atualizacao de implementacao:

- existe um painel admin em `/settings` consolidando `product_usage_events` e
  `ai_usage_events` na janela de 7 dias
- esse painel agora le os dados via `/api/admin/beta-signals` ->
  `/billing/admin/beta-signals`, sem depender de leitura direta do Firestore no
  navegador
- o painel agora tambem segmenta a escada `free -> pro` versus
  `pro -> premium`, pressao de quota por tarefa e mudancas recentes de plano
- o objetivo agora deixa de ser "criar um primeiro painel" e passa a ser
  calibrar quais cortes e comparacoes realmente ajudam na revisao semanal

## Recomendação de Merge

### Pode ir para `main`?

Sim.

Minha recomendação é:

- mergear esta branch na `main`
- rodar o beta por `8 semanas`
- manter a operação de testers manual
- não esperar o gateway para começar a aprender

### Por que eu recomendo mergear agora

- evita uma branch longa demais
- já existe valor real e testável no produto
- entitlements, gates e operação manual estão funcionando
- o beta depende mais de comportamento real do usuário do que de cobrança

### O que eu não esperaria para mergear

- gateway real de pagamento
- checkout
- webhook
- billing externo
- instrumentação completa de analytics

Esses itens podem entrar depois do beta ou no meio dele, com mais segurança.

## Condições para manter na `main` durante o beta

### 1. Operação manual deve continuar estável

- `/settings` deve permitir operar `plan`, `status` e `usage`
- admins devem conseguir promover e rebaixar testers
- reset de usage deve funcionar

### 2. Gates devem continuar coerentes

- `free` precisa ser útil
- `pro` precisa parecer o plano principal
- `premium` precisa parecer a experiência completa

### 3. Time precisa revisar o beta semanalmente

- bugs de entitlement
- copy de upgrade
- uso de IA
- pontos de bloqueio

## Próximos passos recomendados

### Etapa 1 — Instrumentação mínima

Manter os eventos atuais confiáveis para:

- `feature_blocked`
- `upgrade_cta_viewed`
- `upgrade_cta_clicked`
- `ai_quota_exhausted`
- `tester_subscription_updated`

E reforçar:

- consistência dos payloads (`recommendedPlan`, `planTier`, `surface`)
- disciplina de uso do painel admin nas revisões semanais
- cobertura gradual de mais marcos reais de retenção além dos gates

### Etapa 2 — Revisão operacional semanal

Toda semana:

- revisar uso do motor
- revisar uso de IA
- revisar bloqueios
- revisar feedback qualitativo

### Etapa 3 — Ajuste de embalagem

Com base no beta:

- revisar quotas
- revisar copy de upgrade
- revisar o que fica em `free`, `pro` e `premium`
- revisar se os bloqueios puxam mais `free -> pro` ou `pro -> premium`
- revisar quais tarefas de IA estao concentrando a pressao de quota

### Etapa 4 — Gateway real

Só depois que:

- a escada de valor estiver clara
- os gates estiverem estáveis
- as quotas estiverem calibradas
- o time souber o que realmente vende cada plano

## Relação com os outros docs

Este roadmap complementa:

- [beta-test-plan.md](/Users/marleite/workspace/aprova-flow/docs/product/beta-test-plan.md)
- [beta-operations-checklist.md](/Users/marleite/workspace/aprova-flow/docs/product/beta-operations-checklist.md)
- [entitlements-matrix.md](/Users/marleite/workspace/aprova-flow/docs/product/entitlements-matrix.md)
