# Matriz de Entitlements — Free, Pro e Premium

Data de referência: 12/03/2026

## Objetivo

Traduzir a estratégia de monetização do AprovaMind em uma matriz operacional de acesso.

Este documento existe para:

- definir o que cada plano pode usar
- separar recurso binário de quota
- preparar a modelagem da `apps/api`
- reduzir ambiguidade entre produto, frontend e backend

## Relação com outros documentos

Este documento complementa:

- [billing-pricing-market-study.md](/Users/marleite/workspace/aprova-flow/docs/product/billing-pricing-market-study.md)
- [monorepo-billing-entitlements.md](/Users/marleite/workspace/aprova-flow/docs/architecture/monorepo-billing-entitlements.md)
- [api-roadmap.md](/Users/marleite/workspace/aprova-flow/docs/architecture/api-roadmap.md)

## Princípios de packaging

### Free

Objetivo:

- ativar
- gerar hábito
- provar valor do motor

### Pro

Objetivo:

- ser o plano principal de quem estuda com consistência
- entregar o motor completo single-plan

### Premium

Objetivo:

- resolver rotina complexa
- capturar usuário de alta intenção
- justificar camadas mais caras de IA, coordenação e multi-edital

## Conceitos canônicos

### PlanCode

```ts
type PlanCode = 'free' | 'pro' | 'premium';
```

### SubscriptionStatus

```ts
type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'canceled'
  | 'expired';
```

### FeatureCode inicial

```ts
type FeatureCode =
  | 'study_timer'
  | 'dashboard_basic'
  | 'active_plans'
  | 'questions_practice_basic'
  | 'simulations_basic'
  | 'simulations_custom'
  | 'simulations_analytics'
  | 'subject_health_basic'
  | 'subject_health_full'
  | 'priority_day'
  | 'priority_score_full'
  | 'recommendations_basic'
  | 'recommendations_full'
  | 'weekly_diagnostic'
  | 'adaptive_daily_plan'
  | 'recovery_plan'
  | 'multi_edital'
  | 'edital_parse'
  | 'ai_explanations'
  | 'contextual_ai_chat'
  | 'weekly_mentoring'
  | 'error_gap_analyzer'
  | 'post_simulado_inteligente';
```

### Tipos de regra

```ts
type EntitlementMode = 'boolean' | 'quota';
```

## Matriz principal

| Feature | Free | Pro | Premium | Tipo |
|---|---|---|---|---|
| `study_timer` | sim | sim | sim | boolean |
| `dashboard_basic` | sim | sim | sim | boolean |
| `active_plans` | 1 | 1 | 3 | quota |
| `questions_practice_basic` | sim | sim | sim | boolean |
| `simulations_basic` | 2 por mês | ilimitado | ilimitado | quota |
| `simulations_custom` | não | sim | sim | boolean |
| `simulations_analytics` | não | sim | sim | boolean |
| `subject_health_basic` | sim | sim | sim | boolean |
| `subject_health_full` | não | sim | sim | boolean |
| `priority_day` | sim | sim | sim | boolean |
| `priority_score_full` | não | sim | sim | boolean |
| `recommendations_basic` | sim | sim | sim | boolean |
| `recommendations_full` | não | sim | sim | boolean |
| `weekly_diagnostic` | não | sim | sim | boolean |
| `adaptive_daily_plan` | não | não | sim | boolean |
| `recovery_plan` | não | não | sim | boolean |
| `multi_edital` | não | não | sim | boolean |
| `edital_parse` | 1 credito inicial | 3 por mês | 10 por mês | quota |
| `ai_explanations` | 3 por mês | 120 por mês | 300 por mês | quota |
| `contextual_ai_chat` | 5 por mês | 60 por mês | 150 por mês | quota |
| `weekly_mentoring` | não | 4 por mês | 8 por mês | quota |
| `error_gap_analyzer` | não | não | sim | boolean |
| `post_simulado_inteligente` | não | não | 8 por mês | quota |

## Interpretação da matriz

### O que o Free precisa mostrar

O plano grátis precisa permitir que o usuário sinta o diferencial do produto.

Por isso o Free inclui:

- cronômetro
- dashboard básico
- prática de questões
- degustação controlada de simulados
- saúde básica
- prioridade principal do dia
- recomendação resumida
- uso pequeno de IA para degustação

O Free não deve incluir:

- visão completa por matéria
- motor completo em profundidade
- rotina adaptativa
- coordenação complexa

### O que o Pro precisa resolver

O Pro deve resolver bem o caso de uso central do AprovaMind:

- um plano
- uma rotina séria
- clareza diária
- diagnóstico recorrente

Por isso o Pro recebe:

- motor completo single-plan
- provas e simulados completos
- criação de simulados customizados
- analytics de desempenho em simulados
- status e métricas completas
- priority score por matéria
- recomendações completas
- diagnóstico semanal
- quotas relevantes de IA

### O que o Premium precisa justificar

O Premium só faz sentido se resolver problemas que o Pro ainda não resolve:

- rotina complexa
- múltiplos objetivos
- replanejamento adaptativo
- recuperação intensiva
- pós-simulado inteligente
- coordenação avançada, não apenas mais volume

## Quotas iniciais recomendadas

Essas quotas são hipóteses de lançamento, não compromisso comercial final.

### Free

- `active_plans`: `1`
- `simulations_basic`: `2/mês`
- `edital_parse`: `1 crédito inicial`
- `ai_explanations`: `3/mês`
- `contextual_ai_chat`: `5/mês`

### Pro

- `active_plans`: `1`
- `simulations_basic`: `ilimitado`
- `edital_parse`: `3/mês`
- `ai_explanations`: `120/mês`
- `contextual_ai_chat`: `60/mês`
- `weekly_mentoring`: `4/mês`

### Premium

- `active_plans`: `3`
- `simulations_basic`: `ilimitado`
- `edital_parse`: `10/mês`
- `ai_explanations`: `300/mês`
- `contextual_ai_chat`: `150/mês`
- `weekly_mentoring`: `8/mês`
- `post_simulado_inteligente`: `8/mês`

## Recursos que exigem autorização real no backend

Esses recursos não podem ser controlados só por UI:

- `subject_health_full`
- `priority_score_full`
- `recommendations_full`
- `weekly_diagnostic`
- `simulations_basic`
- `simulations_custom`
- `simulations_analytics`
- `error_gap_analyzer`
- `adaptive_daily_plan`
- `recovery_plan`
- `multi_edital`
- `edital_parse`
- `ai_explanations`
- `contextual_ai_chat`
- `weekly_mentoring`
- `post_simulado_inteligente`

Motivo:

- afetam custo
- afetam cobrança
- afetam percepção de injustiça se vazarem

## Recursos que podem ter soft gating de UI

Esses podem ser escondidos ou resumidos na interface, mas não são o centro do risco de billing:

- `study_timer`
- `dashboard_basic`
- `priority_day`
- `recommendations_basic`

## Regras de status da assinatura

### `trialing`

- usa entitlements do plano associado ao trial
- expira automaticamente se não converter

### `active`

- usa entitlements normais do plano

### `past_due`

Recomendação inicial:

- manter acesso por curto período apenas a features não críticas de continuidade
- manter o núcleo de estudo e simulados básicos do plano vigente por curto prazo
- restringir features caras ou premium-first, como `contextual_ai_chat`, `weekly_mentoring`, `adaptive_daily_plan` e `post_simulado_inteligente`
- preparar migração para `grace_period`

### `grace_period`

Recomendação inicial:

- manter acesso temporário ao plano atual
- bloquear novas ações de maior custo se necessário

### `canceled`

- acesso permanece até `currentPeriodEnd`, se `cancel_at_period_end = true`

### `expired`

- cai para `free`

## Regras de downgrade

Se o usuário sair de `premium` para `pro`:

- perde `multi_edital`
- perde `adaptive_daily_plan`
- perde `recovery_plan`
- perde `post_simulado_inteligente`
- mantém histórico, mas perde uso da feature premium

Se o usuário cair para `free`:

- mantém dados históricos
- perde recursos premium
- volta aos limites do `free`

## Regras de UX recomendadas

### Free -> Pro

Gatilhos de upgrade mais naturais:

- tentou abrir health completo
- tentou ver ranking completo por matéria
- tentou abrir diagnóstico semanal
- bateu limite de IA

### Pro -> Premium

Gatilhos de upgrade mais naturais:

- tentou adicionar segundo edital/plano
- quis replanejamento adaptativo
- quis plano de recuperação
- quis pós-simulado inteligente

## Decisões que ainda não estão fechadas

Pontos para validar em produto antes de congelar:

- se `edital_parse` no free deve ser `1 crédito inicial` ou apenas `1 trial assistido`
- se o `weekly_mentoring` no Pro deve permanecer em `4/mês` ou cair para `2/mês`
- se `contextual_ai_chat` no Free deve ficar em `5/mês` ou virar apenas trial controlado
- se `active_plans` no Premium deve ser `3` ou “ilimitado prático”

## Recomendação de lançamento

Se a prioridade for simplicidade:

### Free

- motor resumido
- quotas pequenas
- foco em ativação
- faz o usuário sentir valor antes de cobrar

### Pro

- produto principal
- motor completo single-plan
- provas e simulados completos
- melhor relação entre valor e conversão

### Premium

- upgrade real por complexidade de rotina
- vende coordenação e inteligência sobre desempenho
- menos volume de clientes, mais profundidade de uso

## Matriz final proposta V1

### Free

- cronômetro, dashboard e histórico básico
- prática de questões e simulados limitados
- saúde e recomendação em versão resumida
- IA em degustação controlada

### Pro

- motor completo single-plan
- provas e simulados completos
- criação de simulados customizados
- diagnóstico semanal e mentoria recorrente básica

### Premium

- tudo do Pro
- multi-edital
- plano adaptativo e plano de recuperação
- Gap Analyzer Copilot
- pós-simulado inteligente
- coordenação avançada da rotina

## Próximo passo técnico

Transformar esta matriz em três artefatos:

1. tipos de domínio
2. contratos da `apps/api`
3. política de entitlements calculável no backend
