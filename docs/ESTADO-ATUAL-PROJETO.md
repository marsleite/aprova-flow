# AprovaMind (AprovaFlow) — Documentação Real do Estado Atual do Projeto

**Data de Referência:** 24 de Agosto de 2026  
**Status do Projeto:** Fase Beta / Pré-lançamento (Monorepo Consolidado, Engine Determinístico Ativo, AI Gateway Híbrido, Billing Mercado Pago Integrado)

---

## 1. Visão Geral e Proposta de Valor

O **AprovaMind** é uma plataforma inteligente de planejamento e gestão de estudos para concurseiros de alta performance (Magistratura, Defensoria, PGE, Delegado, Tribunais, etc.).

Diferente de aplicativos convencionais que funcionam apenas como cronômetros ou bancos genéricos de questões, o diferencial do AprovaMind reside no **Motor de Decisão Estratégico (Decision Engine)** combinado a um **AI Gateway Econômico**:
1. **Rastreamento Fiel de Horas Líquidas**: Cronômetro com *Page Visibility API* que detecta perda de foco e pausa contagem em fraudes/distrações.
2. **Multi-Edital Real (Portfólio de Planos)**: Alocação de tempo finito entre múltiplos concursos concorrentes, calculando sobreposição de matérias e urgência temporal.
3. **Motor Heurístico Determinístico (Custo Zero de IA)**: Cálculo de *Saúde da Matéria* (Volume, Aderência, Frequência, Recência e Desempenho) e *Score de Prioridade* 100% determinístico e explicável.
4. **IA de Alto Valor**: Roteamento multi-provider (OpenRouter, Gemini, OpenAI) reservado apenas para tarefas complexas: *Parse de Edital PDF*, *Chat Conversacional com Coach*, *Planejador Diário Adaptativo*, *Mentoria Semanal Profunda* e *Smart Schedule*.
5. **Billing & Entitlements**: Escada de planos (*Free* e *Pro*) com checkout de assinaturas e webhooks via **Mercado Pago** (`preapproval`).

---

## 2. Topologia do Monorepo e Arquitetura de Código

O projeto adota Clean Architecture / Hexagonal Architecture em monorepo TypeScript:

```text
aprova-flow/
├── apps/
│   ├── web/                     # Frontend Next.js 16 (React 19, Tailwind CSS, Framer Motion, Recharts)
│   │   ├── src/app/             # App Router (Páginas públicas, Landing, Blog SEO, Rotas autenticadas)
│   │   ├── src/components/      # 40+ componentes de UI (Timer, Heatmap, Radar, PlanEngine, Mentoring, etc.)
│   │   └── src/hooks/           # useAuth, useStudyTimer, useEntitlements, etc.
│   │
│   └── api/                     # Backend Fastify 5.6 (Node.js)
│       ├── src/plugins/         # Firebase Auth token validator, CORS, Error Handler
│       ├── src/modules/engine/  # Endpoints canônicos /engine/snapshot e /engine/portfolio
│       ├── src/modules/billing/ # Endpoints /billing/checkout, /billing/webhook/mercadopago, /billing/cancel
│       ├── src/modules/entitlements/ # Avaliação de entitlements e quotas de usuário
│       └── src/modules/ai/      # Persistência e telemetria canônica de uso de IA (ai_usage_events)
│
├── packages/
│   ├── domain/                  # Lógica pura de negócio (Zero dependências externas de framework)
│   │   ├── services/            # PlanEngine, PortfolioAllocator, PriorityCalculator, RecommendationEngine, SubjectHealthComputer
│   │   └── value-objects / enums# SubjectHealthStatus, PlanPhase, PlanTier, etc.
│   │
│   ├── application/             # Casos de uso e portas de orquestração
│   │   ├── use-cases/           # GetPlanEngineSnapshot, CreateCheckoutSession, HandleBillingWebhook, etc.
│   │   └── ports/               # Interfaces para repositórios e serviços de infraestrutura
│   │
│   ├── contracts/               # DTOs e Schemas compartilhados entre Web e API
│   │   └── ai, analytics, billing, engine, planner, stability
│   │
│   ├── ai-gateway/              # Gateway de IA multi-provider com orçamento, custo e rate-limit
│   │   ├── providers/           # Gemini, OpenAI, OpenRouter
│   │   └── gateway.ts, pricing.ts, metrics.ts
│   │
│   ├── infrastructure-firebase/ # Repositórios Cloud Firestore e integração Firebase Auth
│   └── infrastructure-billing/  # Adapter Mercado Pago Subscriptions API
│
├── firestore.rules              # Regras de segurança granulares do Cloud Firestore
└── specs/ e docs/               # Especificações de produto e memória técnica
```

---

## 3. Estado Real dos Módulos: O que está em Produção vs. Histórico/Cancelado

### ✅ 3.1. Funcionalidades 100% Implementadas e Ativas

| Módulo / Recurso | Descrição da Implementação Real | Camada Técnica |
| :--- | :--- | :--- |
| **Autenticação & Sessão** | Login social Google via Firebase Auth + verificação de ID Token server-side | `AuthContext`, `firebase-auth.ts` |
| **Cronômetro de Horas Líquidas** | Anel SVG interativo, Page Visibility API, modos Pomodoro (25/5, 50/10, 45/15) e salvamento de sessões com `planId` | `StudyTimer.tsx`, `sessions.ts` |
| **Multi-Edital (PlanManager)** | CRUD de editais, definição de matérias, pesos, meta semanal de horas e importação de edital PDF | `PlanManager.tsx`, `PlanSelector.tsx` |
| **Decision Engine (Motor de Decisão)** | Cálculo de Saúde da Matéria (8 status: *healthy, mature, warning, critical, neglected, inefficient, blind_spot, no_data*) + Priorização (0-100) + Recomendações (*Rescue, Rebalance, Deepen, Sprint Push, Maintain, etc.*) | `packages/domain/src/services/` e `/engine/snapshot` |
| **Portfólio Multi-Edital** | Alocação proporcional do tempo semanal entre planos concorrentes baseada em risco, urgência da prova e matérias compartilhadas | `PortfolioAllocator.ts` e `/engine/portfolio` |
| **Registro Manual de Questões** | Lançamento de acertos/erros por matéria vinculada ao plano para alimentar a taxa de acerto do motor | `QuestionTrackerCard.tsx`, `AccuracyChart.tsx` |
| **AI Gateway Econômico** | Gateway com suporte OpenRouter (padrão), Gemini e OpenAI; fallback resiliente local; registro de tokens e custo | `packages/ai-gateway`, `ai_usage_events` |
| **Planejador Diário IA** | `/api/planner-daily` com blocos acionáveis de estudo, snapshot em `daily_ai_plans` e execução de progresso | `DailyAiPlannerCard.tsx` |
| **Cronograma Semanal IA (Smart Schedule)** | `/api/smart-schedule` gerando alocação semanal inteligente, persistida no Firestore em `weekly_smart_schedules` | `SmartScheduleCard.tsx`, `smartSchedules.ts` |
| **Mentoria Semanal Profunda** | `/api/weekly-mentoring` análise semanal de evolução com cache no Firestore por semana | `WeeklyMentoringCard.tsx` |
| **Chat com Coach IA** | Painel slide-in contextualizado com histórico recente de estudo e métricas | `ChatPanel.tsx`, `/api/chat` |
| **Interrogatório Pós-Sessão (Active Recall)** | Modal opcional pós-estudo com avaliação de retenção pela IA | `InterrogationModal.tsx`, `/api/interrogation` |
| **Assinaturas & Cobrança (Mercado Pago)** | Checkout de assinatura recorrente (`preapproval`), processamento de webhooks e gestão de cancelamento | `packages/infrastructure-billing`, `/billing/*` |
| **Landing Page & SEO Blog** | Landing page com demo interativa e parse gratuito de edital (email-gated) + 3 artigos long-tail de SEO | `apps/web/src/app/page.tsx`, `/blog/*` |
| **Telemetria & Painel Admin** | Painel de sinais beta (`BetaSignalsCard`), tracking de 7 eventos de produto e gerenciador de assinaturas de testers | `product_usage_events`, `/api/admin/*` |

---

### 🛑 3.2. Decisões Estratégicas de Simplificação e Funcionalidades Canceladas

Para manter o foco no *core business* e controlar custos, as seguintes decisões foram consolidadas:

1. **❌ Banco de Questões Próprio & Pipeline de Scraping (CANCELADO)**:
   - *Decisão*: O AprovaMind **não** é um banco de questões (como QConcursos ou TEC). O plano de ingestão de milhares de provas em PDF via OCR/LLM foi arquivado em `docs/archive/mode-provas-plan-CANCELLED.md`.
   - *Realidade atual*: O usuário registra o resultado das baterias que faz externamente via `QuestionTrackerCard`. Isso alimenta com precisão o motor sem custo astronômico de infraestrutura de banco de questões.
2. **❌ Pós-Simulado Inteligente via LLM (SUBSTITUÍDO)**:
   - Substituído pelo diagnóstico heurístico do `RecommendationEngine` e `SubjectHealthComputer`, que é instantâneo e gratuito.
3. **❌ Chamadas de IA para Feedback Diário Pós-Sessão (SUBSTITUÍDO)**:
   - `MentorCard` e `PostSessionToast` operam com **motor de regras local**, garantindo resposta em <1ms com zero requisições a LLMs.

---

## 4. Esquema Real de Dados no Cloud Firestore

| Coleção | Finalidade | Restrição de Segurança |
| :--- | :--- | :--- |
| `sessions/{id}` | Registros de sessões de estudo realizadas (tempo líquido, data, matéria, subtema, `planId`) | Dono (`request.auth.uid == userId`) |
| `study_plans/{id}` | Planos de estudo/editais (nome, cor, peso das matérias, meta semanal, data da prova) | Dono (`request.auth.uid == userId`) |
| `questions_stats/{id}` | Histórico de questões feitas manualmente (total, corretas, precisão, matéria, `planId`) | Dono (`request.auth.uid == userId`) |
| `user_stats/{userId}` | Perfil do aluno, plano ativo, tier (`planTier: 'free' \| 'pro'`), quotas e status de assinatura | Leitura pelo dono; campos de billing/tier protegidos para escrita server-side |
| `weekly_smart_schedules/{docId}` | Cache do cronograma semanal IA (`${userId}_${planId}_${weekStart}`) | Dono (`request.auth.uid == userId`) |
| `weekly_mentoring/{id}` | Cache da mentoria semanal IA gerada | Dono (`request.auth.uid == userId`) |
| `daily_ai_plans/{id}` | Snapshots dos planos diários sugeridos pela IA | Dono (`request.auth.uid == userId`) |
| `daily_ai_plan_progress/{id}` | Estado de execução do plano diário (blocos concluídos/adiados) | Dono (`request.auth.uid == userId`) |
| `calendar_events/{id}` | Eventos da agenda de estudos | Dono (`request.auth.uid == userId`) |
| `ai_usage_events/{id}` | Telemetria de consumo de IA (tokens, custo USD, provider, rota, status) | Server-side / Admin |
| `product_usage_events/{id}` | Eventos analíticos do produto (`feature_blocked`, `upgrade_cta_clicked`, etc.) | Criação pelo usuário / Leitura Admin |
| `waitlist/{id}` | Inscrições de interessados na fila do beta | Escrita pública / Leitura Admin |
| `edital_parse_tokens/{hash}` | Controle de 1 parse gratuito por e-mail no landing page | Server-side |
| `edital_parse_ip_limits/{hash}` | Rate-limit de 3 parses/hora por IP | Server-side |

---

## 5. Qualidade, Testes e Estabilidade

O projeto possui **100% de aprovação na suíte de testes automatizados**:

- **Frontend & Integração (`apps/web`)**: **127 testes aprovados** (39 arquivos de teste via Vitest cobrindo `PlanEngine`, `SubjectHealth`, `RecommendationEngine`, `PortfolioAllocator`, `SmartSchedule`, `Billing`, `AiBudgetPolicy`, etc.).
- **Backend API (`apps/api`)**: **43 testes aprovados** (Node Test Runner cobrindo autenticação, rotas de engine, checkout e webhooks do Mercado Pago, datasources do Firestore e guards de entitlements).

---

## 6. Próximos Passos Recomendados

1. **Lançamento e Tração do Beta**: Convidar primeiros 20-50 concurseiros utilizando a infraestrutura atual de captura (`waitlist` + Landing Page).
2. **Ativação do Webhook do Mercado Pago em Produção**: Configurar o endpoint público da API no painel do Mercado Pago com `MERCADO_PAGO_WEBHOOK_SECRET` em ambiente de produção.
3. **Refinamento Contínuo dos Prompts de IA**: Monitorar os custos reais e a qualidade dos planos diários gerados através do `ai_usage_events`.
