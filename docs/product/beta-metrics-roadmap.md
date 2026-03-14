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

- instrumentação de eventos de produto para upgrade, bloqueio e quota

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

- [metrics.ts](/Users/marleite/workspace/aprova-flow/apps/web/src/lib/ai/metrics.ts)
- [aiUsageStore.ts](/Users/marleite/workspace/aprova-flow/apps/web/src/lib/server/aiUsageStore.ts)
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

Ainda não existe instrumentação consistente para:

- `feature_blocked`
- `upgrade_cta_viewed`
- `upgrade_cta_clicked`
- `ai_quota_exhausted`
- `plan_status_changed`
- `tester_subscription_updated`

Esses eventos são os mais importantes para aprender com o beta antes do gateway.

### 2. Funil real de upgrade

Hoje ainda não temos um fluxo claro para responder:

- em qual tela o usuário sentiu falta do `Pro`
- em qual tela o usuário sentiu falta do `Premium`
- qual bloqueio gerou clique de upgrade
- qual feature realmente puxou desejo de mudança de plano

### 3. Painel consolidado de produto

Os dados existem em partes, mas ainda não estão organizados em um painel claro
de beta.

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

Adicionar eventos para:

- `feature_blocked`
- `upgrade_cta_viewed`
- `upgrade_cta_clicked`
- `ai_quota_exhausted`
- `tester_subscription_updated`

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
