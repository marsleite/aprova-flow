# AprovaMind

**Plataforma inteligente de estudo para concursos públicos.**

Rastreia horas líquidas de estudo, gerencia múltiplos editais, visualiza progresso por matéria, gera insights com IA e entrega feedback estratégico personalizado.

---

## Índice

- [Visão do Produto](#visão-do-produto)
- [Para quem é](#para-quem-é)
- [Funcionalidades](#funcionalidades)
- [Jornada do Usuário](#jornada-do-usuário)
- [Arquitetura Técnica](#arquitetura-técnica)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Firestore Schema](#firestore-schema)
- [Fluxo de Dados](#fluxo-de-dados)
- [Arquitetura Multi-Edital](#arquitetura-multi-edital)
- [Arquitetura IA (Gemini)](#arquitetura-ia-gemini)
- [Componentes](#componentes)
- [API Routes](#api-routes)
- [Como Rodar](#como-rodar)
- [Regras Firestore](#regras-firestore)
- [Roadmap](#roadmap)

---

## Visão do Produto

O AprovaMind resolve um problema real de concurseiros: **falta de visibilidade sobre onde o tempo de estudo está indo**. Quem estuda para PGE e Magistratura ao mesmo tempo precisa saber exatamente quantas horas dedicou a cada edital, qual matéria está sendo negligenciada, e se a estratégia está funcionando.

### Proposta de Valor

```
Cronômetro inteligente → Dados reais → Gráficos claros → IA estratégica → Aprovação
```

O app **não ensina matéria** — ele é o **coach de rotina** que garante que o concurseiro estude as matérias certas, no volume certo, com consistência.

---

## Para quem é

| Perfil | Necessidade |
|--------|------------|
| Concurseiro iniciante | Criar disciplina de estudo, visualizar progresso |
| Concurseiro intermediário | Equilibrar matérias, identificar gaps |
| Concurseiro multi-edital | Gerenciar PGE + Magistratura + TRF com dashboards separados |
| Concurseiro avançado | Cruzar horas de estudo com taxa de acerto em questões |

---

## Funcionalidades

### Cronômetro de Horas Líquidas
- Conta apenas tempo **ativo** na aba (Page Visibility API)
- Troca de aba = pausa automática
- Modos: Livre, Pomodoro 25/5, 50/10, 45/15
- Sessão salva com matéria, edital e duração líquida

### Multi-Edital
- Cria planos por concurso (PGE-SP, Magistratura, etc.)
- Cada plano tem matérias, pesos e meta semanal próprios
- Dashboard filtra tudo pelo edital selecionado
- Visão "Todos os Planos" agrega tudo

### Dashboard Inteligente
- Cards de resumo (Hoje / Semana / Mês)
- Gráfico de Radar por matéria
- Barras semanais (Seg-Dom)
- Heatmap anual tipo GitHub
- 52/53 semanas visíveis simultaneamente (último ano)
- Meses alinhados dinamicamente como no GitHub
- Intensidade baseada em horas líquidas por dia
- Filtra por plano ativo (ou Todos os planos)
- Clique abre resumo do dia (sessões, matérias)
- Planejado vs Real com status por matéria
- Meta semanal + Streak de dias consecutivos

### Módulo de Questões
- Registro de acertos/erros por matéria
- Gráfico RadialBar com taxa de acerto geral
- Barras por matéria com cores dinâmicas (verde/amarelo/vermelho)
- Validação inteligente (acertos <= total)

### IA Integrada (Google Gemini)
- **Coach IA**: Chat conversacional para dúvidas de rotina
- **Mentor AprovaMind**: Análise estratégica proativa com cruzamento constância × precisão
- **Feedback pós-sessão**: Toast automático ao parar o cronômetro
- Todos os prompts são "grounded" nos dados reais do Firestore

---

## Jornada do Usuário

```
  ┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
  │ Login Google  │────▶│ Migração automát. │────▶│ Primeiro acesso?│
  └──────────────┘     └───────────────────┘     └────────┬────────┘
                                                    Sim │      │ Não
                                               ┌────────▼──┐   │
                                               │ Cria plano │   │
                                               │  "Geral"   │   │
                                               └─────┬──────┘   │
                                                     │          │
                                                     ▼          ▼
                                               ┌─────────────────┐
                                               │  Carrega planos  │
                                               └────────┬────────┘
                                                        ▼
                              ┌──────────────────────────────────────────────┐
                              │               DASHBOARD                      │
                              └──┬──────────┬──────────┬──────────┬─────────┘
                                 │          │          │          │
                                 ▼          ▼          ▼          ▼
                           ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐
                           │Seleciona│ │ Inicia │ │Registra│ │Consulta│
                           │ Edital  │ │ Timer  │ │Questões│ │Coach IA│
                           └────┬────┘ └───┬────┘ └────────┘ └────────┘
                                │          │
                                ▼          ▼
                          ┌──────────┐ ┌──────────────────────┐
                          │Dashboard │ │Seleciona Edital +    │
                          │ filtra   │ │Matéria → Estuda →    │
                          │por edital│ │Para → Salva Firestore│
                          └──────────┘ │→ Toast feedback IA   │
                                       └──────────────────────┘
```

---

## Arquitetura Técnica

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLIENTE  (Next.js App Router)                        │
│                                                                         │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐│
│  │ Browser  │ │ AuthCtx   │ │ Dashboard │ │ StudyTimer │ │PlanSelect││
│  └──────────┘ └───────────┘ └───────────┘ └────────────┘ └──────────┘│
│  ┌──────────┐ ┌───────────┐ ┌───────────┐                            │
│  │PlanMgr   │ │ ChatPanel │ │MentorCard │                            │
│  └──────────┘ └───────────┘ └───────────┘                            │
└───────┬──────────────┬──────────────┬────────────────────────────────┘
        │ lê/escreve   │ POST         │ POST
        ▼              ▼              ▼
┌───────────────┐ ┌───────────────────────────────────────────────┐
│   FIREBASE    │ │           API ROUTES  (Server-Side)           │
│               │ │                                               │
│ ┌───────────┐ │ │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│ │   Auth    │ │ │  │/api/chat │ │/api/     │ │/api/post-    │ │
│ │  (Google) │ │ │  │          │ │  mentor  │ │  session     │ │
│ └───────────┘ │ │  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│ ┌───────────┐ │ │       │            │               │         │
│ │ sessions  │ │ │  ┌────┴─────┐ ┌────┴────┐ ┌───────┴──────┐  │
│ ├───────────┤ │ │  │/api/     │ │         │ │              │  │
│ │study_plans│ │ │  │ gemini   │ │         │ │              │  │
│ ├───────────┤ │ │  └────┬─────┘ │         │ │              │  │
│ │user_stats │ │ │       │       │         │ │              │  │
│ ├───────────┤ │ └───────┼───────┼─────────┼─┼──────────────┘  │
│ │quest_stats│ │         │       │         │ │
│ └───────────┘ │         ▼       ▼         ▼ ▼
└───────────────┘  ┌─────────────────────────────┐
                   │     GOOGLE CLOUD             │
                   │  ┌────────────────────────┐  │
                   │  │   Gemini 2.5 Flash     │  │
                   │  └────────────────────────┘  │
                   └──────────────────────────────┘
```

### Princípios

1. **GEMINI_API_KEY nunca vai ao browser** — todas as chamadas de IA passam por API Routes server-side
2. **Filtragem client-side** — queries do Firestore buscam por `userId`, filtragem por `planId` é feita no cliente (evita índices compostos)
3. **Resiliência** — dados opcionais (questions, user_stats) falham silenciosamente sem quebrar o dashboard
4. **Migração idempotente** — `migrateToMultiPlan()` roda no primeiro load e nunca duplica dados

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16 |
| Linguagem | TypeScript | 5.x |
| Estilização | Tailwind CSS | 4.x |
| Animações | Framer Motion | 12.x |
| Ícones | Lucide React | — |
| Gráficos | Recharts | 3.7 |
| Auth | Firebase Authentication (Google) | — |
| Banco de dados | Cloud Firestore | — |
| IA | Google Gemini API (@google/genai) | gemini-2.5-flash |

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts            # Chat conversacional (Gemini)
│   │   ├── parse-edital/route.ts    # Extrai edital PDF (Gemini)
│   │   └── weekly-mentoring/route.ts # Mentoria semanal (Gemini)
│   ├── provas/
│   │   ├── page.tsx                 # Hub Provas & Simulados
│   │   ├── criar-simulado/page.tsx
│   │   └── [id]/
│   │       ├── executar/page.tsx
│   │       └── resultado/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                     # Entry point (Login ou Dashboard)
│
├── components/
│   ├── AccuracyChart.tsx            # RadialBar + barras de acerto por matéria
│   ├── ActivityHeatmap.tsx          # Grid mensal tipo GitHub
│   ├── ChatPanel.tsx                # Painel slide-in do Coach IA
│   ├── DailySummaryCard.tsx         # Resumo do dia
│   ├── Dashboard.tsx                # Orquestrador principal — fetch + layout
│   ├── GeminiCoachCard.tsx          # Mini-card Coach com dica local
│   ├── GoalAndStreakCard.tsx         # Meta semanal + streak
│   ├── Header.tsx                   # Logo + PlanSelector + user
│   ├── InsightsPanel.tsx            # Insights automáticos (regras locais)
│   ├── LoginScreen.tsx              # Tela de login
│   ├── MentorCard.tsx               # Mentor local (regras, sem chamada IA)
│   ├── PlanManager.tsx              # Modal CRUD de editais
│   ├── PlanSelector.tsx             # Dropdown de editais no Header
│   ├── PostSessionToast.tsx         # Toast de feedback pós-sessão
│   ├── QuestionTrackerCard.tsx      # Registro de questões
│   ├── RecentSessions.tsx           # Últimas 5 sessões
│   ├── SessionHistory.tsx           # Histórico com filtros + CSV
│   ├── StudyPlanCard.tsx            # Pesos por matéria (planejado vs real)
│   ├── StudyTimer.tsx               # Cronômetro com anel SVG + Pomodoro
│   ├── SubjectRadarChart.tsx        # Gráfico de Radar
│   ├── SummaryCards.tsx             # Cards Hoje/Semana/Mês
│   ├── WeeklyBarChart.tsx           # Barras Seg-Dom
│   ├── WeeklyMentoringCard.tsx      # Mentoria semanal com cache
│   ├── Calendar.tsx                 # Calendário mensal
│   └── BenchmarkCard.tsx            # Benchmark anônimo
│
├── contexts/
│   └── AuthContext.tsx               # Provider global de autenticação
│
├── hooks/
│   ├── useAuth.ts                    # Hook Firebase Auth
│   └── useStudyTimer.ts             # Cronômetro + Page Visibility + Pomodoro
│
├── lib/
│   ├── firebase/
│   │   ├── config.ts                 # Inicialização Firebase
│   │   ├── benchmarks.ts             # Benchmark anônimo
│   │   ├── calendar.ts               # Eventos de agenda
│   │   ├── plans.ts                  # CRUD de planos (editais) + migração
│   │   ├── questions.ts              # CRUD de questões + accuracy
│   │   └── sessions.ts              # CRUD de sessões + analytics
│   ├── server/
│   │   ├── apiGuard.ts               # Auth + rate-limit das APIs
│   │   └── firebaseAdmin.ts          # Inicialização Firebase Admin
│   └── utils.ts                     # formatDuration, exportCSV, etc.
│
└── types/
    └── index.ts                     # Todos os tipos centrais
```

---

## Firestore Schema

### Visão geral das relações

```
  ┌─────────┐
  │  USER   │ (Firebase Auth — uid)
  └────┬────┘
       │ 1:1                    1:N                    1:N                  1:N
       │                         │                      │                    │
       ▼                         ▼                      ▼                    ▼
┌─────────────┐         ┌──────────────┐       ┌──────────────┐    ┌────────────────┐
│ user_stats  │         │ study_plans  │       │   sessions   │    │questions_stats │
│             │         │              │       │              │    │                │
│ userId (PK) │         │ id (PK)      │       │ id (PK)      │    │ id (PK)        │
│ weeklyGoal  │         │ userId       │  ┌───▶│ userId       │    │ userId         │
│ planSubjects│         │ name         │  │    │ planId ──────┼───▶│ planId ────────┼──┐
│ activePlanId│────────▶│ subjects[]   │──┘    │ subject      │    │ subject        │  │
│ updatedAt   │         │ weeklyGoal   │       │ duration     │    │ totalQuestions  │  │
└─────────────┘         │ color        │       │ date         │    │ correctAnswers │  │
                        │ isDefault    │       │ startTime    │    │ accuracy       │  │
                        │ createdAt    │       │ endTime      │    │ date           │  │
                        │ updatedAt    │       │ createdAt    │    │ createdAt      │  │
                        └──────────────┘       └──────────────┘    └────────────────┘  │
                               ▲                                                       │
                               └───────────────────────────────────────────────────────┘
                                             planId referencia study_plans
```

### Detalhes por coleção

| Coleção | Doc ID | Campos-chave | Observação |
|---------|--------|-------------|-----------|
| `sessions` | auto | userId, planId, subject, duration, date | Uma sessão = um bloco de estudo |
| `study_plans` | auto | userId, name, subjects[], weeklyGoalHours, color, isDefault | Um plano = um edital |
| `user_stats` | userId | weeklyGoalHours, planSubjects[], activePlanId | Singleton por usuário |
| `questions_stats` | auto | userId, planId, subject, totalQuestions, correctAnswers, accuracy | Um registro = um lote de questões |

---

## Fluxo de Dados

### Cronômetro → Firestore → Dashboard

```
  Usuário         StudyTimer       useStudyTimer       Firestore        Dashboard
    │                │                  │                  │                │
    │ Seleciona      │                  │                  │                │                  │
    │ edital+matéria │                  │                  │                │                  │
    │───────────────▶│                  │                  │                │                  │
    │                │                  │                  │                │                  │
    │ Clica Play     │                  │                  │                │                  │
    │───────────────▶│  play()          │                  │                │                  │
    │                │─────────────────▶│                  │                │                  │
    │                │                  │                  │                │                  │
    │                │       ┌──────────┴──────────┐       │                │                  │
    │                │       │ Page Visibility API  │       │                │                  │
    │                │       │ pausa se aba inativa │       │                │                  │
    │                │       └──────────┬──────────┘       │                │                  │
    │                │                  │                  │                │                  │
    │ Clica Stop     │                  │                  │                │                  │
    │───────────────▶│  stop()          │                  │                │                  │
    │                │─────────────────▶│                  │                │                  │
    │                │                  │  saveSession()   │                │                  │
    │                │                  │─────────────────▶│                │                  │
    │                │                  │        docId     │                │                  │
    │                │                  │◀─────────────────│                │                  │
    │                │  sessão salva    │                  │                │                  │
    │                │◀─────────────────│                  │                │                  │
    │                │                  │                  │                │                  │
    │                │  onSessionSaved()│                  │                │                  │
    │                │─────────────────────────────────────────────────────▶│                  │
    │                │                  │                  │  fetchData()   │                  │
    │                │                  │                  │◀───────────────│                  │
    │                │                  │                  │                │ Gera feedback local
    │ Toast feedback │                  │                  │                │ (PostSessionToast)
    │◀───────────────────────────────────────────────────────────────────────│
```

### Dashboard — Ciclo de Fetch

```
  ┌─────────────────┐
  │ Dashboard monta │
  └────────┬────────┘
           ▼
  ┌─────────────────────┐
  │ migrateToMultiPlan() │─── Cria plano "Geral" se não existir
  └────────┬────────────┘    (idempotente — roda só 1x)
           ▼
  ┌──────────────────────────────┐
  │ getStudyPlans + getActivePlan │
  └────────┬─────────────────────┘
           ▼
  ┌──────────────────────────┐
  │  fetchData( planId )     │
  └──┬────────┬────────┬─────┘
     │        │        │
     ▼        ▼        ▼
 ┌────────┐┌────────┐┌──────────┐
 │Essencial││Questões││ Avançado │
 ├────────┤├────────┤├──────────┤
 │Summary ││Accuracy││Consistên.│
 │Hours   ││(falha  ││PlanvsAct │
 │Weekly  ││ok)     ││Insights  │
 │Recent  ││        ││          │
 └───┬────┘└───┬────┘└────┬─────┘
     │         │          │
     ▼         ▼          ▼
 ┌───────────────────────────────────────────────────────────────────┐
 │                    RENDERIZA COMPONENTES                          │
 │                                                                   │
 │  SummaryCards · RadarChart · WeeklyBar · RecentSessions           │
 │  Heatmap · GoalStreak · StudyPlan · Insights · Coach              │
 │  Mentor · QuestionTracker · AccuracyChart · SessionHistory        │
 └───────────────────────────────────────────────────────────────────┘
```

---

## Arquitetura Multi-Edital

### Conceito

O usuário pode estudar para **múltiplos concursos** ao mesmo tempo. Cada concurso é um "plano" com:
- Nome (ex: "PGE-SP")
- Matérias com pesos (ex: Tributário 30%, Civil 25%...)
- Meta semanal própria (ex: 15h)
- Cor para identificação visual

### Fluxo do PlanSelector

```
  ┌────────────────────────────────────────────────────────────┐
  │                        HEADER                               │
  │                                                             │
  │    ┌─────────────────────────────────────────────┐          │
  │    │  PlanSelector                               │          │
  │    │  ┌────────┐ ┌───────┐ ┌────────────┐ ┌───┐ │          │
  │    │  │ Todos  │ │PGE-SP │ │Magistratura│ │ + │ │          │
  │    │  └───┬────┘ └───┬───┘ └─────┬──────┘ └─┬─┘ │          │
  │    └──────┼──────────┼───────────┼───────────┼───┘          │
  └───────────┼──────────┼───────────┼───────────┼──────────────┘
              │          │           │           │
              ▼          ▼           ▼           ▼
         planId=null  planId=abc  planId=xyz   Abre PlanManager
              │          │           │
              ▼          ▼           ▼
  ┌───────────────────────────────┐
  │            DASHBOARD                   │
  │                                        │
  │  planId=null → busca TODAS as sessões  │
  │  planId=abc  → filtra SÓ sessões PGE  │
  │  planId=xyz  → filtra SÓ Magistratura │
  │                                        │
  │  Componentes recebem dados filtrados:  │
  │  Summary, Radar, Weekly, Goal, Plan    │
  └───────────────────────────────┘
```

### Como o filtro funciona

```
  getSessionsFromDate(userId, fromDate, planId?)
  ┌──────────────────────────────────────────────────────┐
  │                                                       │
  │  1. Query Firestore:  where("userId", "==", uid)     │
  │                       where("date", ">=", fromDate)   │
  │                       orderBy("date", "desc")         │
  │                                                       │
  │  2. Resultado: [sessão1, sessão2, sessão3, ...]       │
  │                                                       │
  │  3. Se planId fornecido:                              │
  │     resultado.filter(s => s.planId === planId)        │
  │     ─── filtragem CLIENT-SIDE (evita index composto)  │
  │                                                       │
  │  4. Retorna sessões filtradas                         │
  └──────────────────────────────────────────────────────┘
```

### Migração Automática

Na primeira vez que o usuário abre o app após o update:

```
  migrateToMultiPlan(userId)
  ┌─────────────────────────────────────────────────────┐
  │                                                      │
  │  1. getStudyPlans(userId)                            │
  │     └─ Tem planos? → RETORNA (já migrou)             │
  │                                                      │
  │  2. Cria plano "Geral" (isDefault: true)             │
  │     └─ Copia planSubjects e weeklyGoal do user_stats │
  │                                                      │
  │  3. Batch update: sessions sem planId                 │
  │     └─ Adiciona planId do "Geral" em cada sessão     │
  │                                                      │
  │  4. Batch update: questions_stats sem planId          │
  │     └─ Adiciona planId do "Geral" em cada registro   │
  │                                                      │
  │  5. setActivePlan(userId, planGeralId)                │
  │                                                      │
  │  ⚡ IDEMPOTENTE — rodar N vezes = mesmo resultado     │
  └─────────────────────────────────────────────────────┘
```

---

## Arquitetura IA (Gemini)

### Princípios

- **Grounded**: cada chamada injeta dados reais do Firestore no prompt
- **Anti-alucinação**: regras absolutas ("NÃO invente dados", "NÃO cite leis")
- **Server-side only**: `GEMINI_API_KEY` nunca vai ao browser
- **Temperatura baixa**: 0.3-0.5 para respostas consistentes

### 3 Endpoints IA (server-side)

```
  ┌──────────────────────────────┐        ┌─────────────────────┐        ┌──────────────────┐
  │     BROWSER (Componentes)    │        │  API ROUTES (Server) │        │   GEMINI CLOUD   │
  │                              │        │                      │        │                  │
  │  ┌────────────────────────┐  │  POST  │  ┌────────────────┐  │  req   │ │   Gemini     │ │
  │  │ ChatPanel              │──┼───────▶│  │ /api/chat      │──┼──────▶│ │   2.5 Flash  │ │
  │  └────────────────────────┘  │        │  └────────────────┘  │       │ │              │ │
  │  ┌────────────────────────┐  │  POST  │  ┌────────────────┐  │  req   │ │              │ │
  │  │ PlanManager (Import)   │──┼───────▶││/api/parse-edital │──┼──────▶│ │              │ │
  │  └────────────────────────┘  │        │  └────────────────┘  │       │ │              │ │
  │  ┌────────────────────────┐  │  POST  │  ┌────────────────┐  │  req   │ │              │ │
  │  │ WeeklyMentoringCard    │──┼───────▶││/api/weekly-mentoring│──┼────▶│ │              │ │
  │  └────────────────────────┘  │        │  └────────────────┘  │       │ └──────────────┘ │
  └──────────────────────────────┘        └──────────────────────┘       └──────────────────┘
```

| Endpoint | Uso | Contexto enviado | Resposta |
|----------|-----|-----------------|---------|
| `/api/chat` | Chat conversacional | Tudo + histórico (últimas 10 msgs) | Resposta de coach |
| `/api/parse-edital` | Importação de edital PDF | Base64 do PDF + instruções | JSON com matérias, pesos, meta e nome do plano |
| `/api/weekly-mentoring` | Mentoria semanal profunda | Contexto semanal completo | JSON com diagnóstico, pontos fortes/melhorias e metas |

### IA local vs IA remota

- `MentorCard` e `PostSessionToast` usam regras locais (sem chamadas de IA remota).
- Gemini fica reservado para chat, parse de edital e mentoria semanal.
- As rotas de IA exigem token Firebase (`Authorization: Bearer`) e possuem rate limiting.

### Cruzamento Constância × Precisão (Mentor)

O Mentor analisa 5 cenários por matéria:

| Horas | Acerto | Diagnóstico | Ação sugerida |
|-------|--------|------------|---------------|
| Altas | >= 80% | Domínio | Avançar para questões complexas |
| Altas | < 60% | Esforço sem resultado | Trocar estratégia: questões comentadas |
| Baixas | >= 80% | Talento sem volume | Aumentar horas nessa matéria |
| Baixas | < 60% | Sinal vermelho | Atenção imediata: horas + revisão teórica |
| Altas | Sem dados | Estudo cego | Começar a fazer questões |

---

## Componentes

### Hierarquia

```
  page.tsx
  ├── LoginScreen
  └── Dashboard  ◀── orquestra tudo, faz fetch, filtra por planId
      │
      ├── Header
      │   └── PlanSelector  ◀── dropdown de editais
      │
      ├── DailySummaryCard
      ├── SummaryCards  (Hoje / Semana / Mês)
      │
      ├── ┌─ StudyTimer  ◀── cronômetro com seletor de edital
      │   └─ SubjectRadarChart
      │
      ├── ┌─ QuestionTrackerCard  ◀── registro de questões
      │   └─ AccuracyChart  ◀── RadialBar + barras
      │
      ├── ┌─ WeeklyBarChart  (Seg-Dom)
      │   └─ RecentSessions  (últimas 5)
      │
      ├── ActivityHeatmap  (grid anual estilo GitHub)
      │
      ├── ┌─ GoalAndStreakCard  (meta + streak)
      │   └─ StudyPlanCard  (planejado vs real)
      │
      ├── ┌─ InsightsPanel  (regras locais)
      │   └─ GeminiCoachCard  (dica + botão chat)
      │
      ├── MentorCard  ◀── análise local (sem IA remota)
      ├── SessionHistory  (filtros + CSV)
      │
      ├── ChatPanel  ◀── slide-in chat (oculto por padrão)
      ├── PostSessionToast  ◀── toast pós-sessão (auto-dismiss)
      └── PlanManager  ◀── modal CRUD editais (oculto por padrão)
```

### Responsabilidades

| Componente | Recebe dados de | Modifica |
|-----------|----------------|---------|
| Dashboard | Firestore (fetch) | Orquestra tudo, passa props filtradas |
| Header | Dashboard (plans, activePlanId) | Nada — emite eventos |
| StudyTimer | useStudyTimer hook | Firestore (saveSession) |
| GoalAndStreakCard | Dashboard (consistency) | Firestore (weeklyGoal ou plan goal) |
| StudyPlanCard | Dashboard (planVsActual, planWeights) | Firestore (plan subjects) |
| MentorCard | Dashboard (todos os dados) | Regras locais (sem API) |
| WeeklyMentoringCard | Dashboard (dados semanais) | `/api/weekly-mentoring` + cache Firestore |
| PlanManager | Dashboard (editPlan) | Firestore (study_plans CRUD) + `/api/parse-edital` |

---

## API Routes

### Autenticação

As rotas de IA exigem:

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

### POST /api/chat

**Request (resumo):**
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "context": {
    "userName": "Marcelo",
    "weeklyGoalHours": 15,
    "weeklyProgressPercent": 57
  }
}
```

**Response:**
```json
{
  "reply": "Resposta do coach..."
}
```

### POST /api/parse-edital

**Request (resumo):**
```json
{
  "pdfBase64": "<base64>",
  "fileName": "edital.pdf"
}
```

**Response (resumo):**
```json
{
  "planName": "TRF1 Juiz Federal 2024",
  "subjects": [{ "subject": "Direito Constitucional", "weight": 20 }],
  "suggestedWeeklyGoalHours": 15,
  "totalSubjectsFound": 8
}
```

### POST /api/weekly-mentoring

**Request (resumo):**
```json
{
  "userName": "Marcelo",
  "weeklyGoalHours": 15,
  "weeklyTotalHours": 8.5,
  "subjectHours": [{ "subject": "Direito Civil", "hours": 12 }]
}
```

**Response (resumo):**
```json
{
  "weekDiagnosis": "...",
  "strengths": ["..."],
  "improvements": ["..."],
  "recoveryPlan": "...",
  "suggestedGoals": ["..."],
  "motivationalClose": "..."
}
```

---

## Como Rodar

### Pré-requisitos
- Node.js 18+
- Conta Firebase com projeto criado
- Chave da API Gemini

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha no `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
GEMINI_API_KEY=...
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_ADMIN_EMAILS=admin1@email.com,admin2@email.com
# opcional
NEXT_PUBLIC_ADMIN_UIDS=uid1,uid2
```

> As rotas de IA validam Firebase ID token no servidor via Firebase Admin.
> `NEXT_PUBLIC_ADMIN_EMAILS` e `NEXT_PUBLIC_ADMIN_UIDS` liberam acesso total (tier `admin`).
> Também existe uma lista bootstrap fixa em `/Users/marleite/workspace/aprova-flow/src/lib/admin.ts`.

### 3. Configurar Firebase

1. Ative **Authentication > Google** como provedor
2. Crie um banco **Firestore**
3. Aplique as [regras de segurança](#regras-firestore)

### 4. Rodar

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## Regras Firestore

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /sessions/{sessionId} {
      allow read: if request.auth != null
                  && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.subject is string
                    && request.resource.data.duration is number
                    && request.resource.data.date is string;
      allow update: if request.auth != null
                    && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null
                    && resource.data.userId == request.auth.uid;
    }

    match /user_stats/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    match /study_plans/{planId} {
      allow read: if request.auth != null
                  && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.name is string;
      allow update: if request.auth != null
                    && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null
                    && resource.data.userId == request.auth.uid;
    }

    match /questions_stats/{docId} {
      allow read: if request.auth != null
                  && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.subject is string
                    && request.resource.data.totalQuestions is number;
      allow update: if request.auth != null
                    && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null
                    && resource.data.userId == request.auth.uid;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Roadmap

### Concluído

- [x] **Fase 1** — MVP: Login, Cronômetro, Dashboard, Radar, Barras, Meta, Plano, Insights, CSV
- [x] **Fase 2** — IA + Features: Chat, Parse de edital, Pomodoro, Heatmap, Questões, Multi-Edital
- [x] **Fase 3 (parcial)** — Benchmark anônimo, Mentoria IA semanal e Calendário com agenda

### Próximo

- [ ] **Modo prova** — simulado temporizado + análise (em andamento)
- [ ] **PWA** — instalar como app, funcionar offline
- [ ] **Plano Pro** — IA avançada, relatórios, múltiplos planos

### Próxima Fase

- [ ] **Notificações inteligentes** — push contextual baseado em padrões de estudo

### Fase 3 — Escala e Monetização

- [x] Benchmark anônimo — comparar com usuários similares
- [x] Mentoria IA semanal — relatório + plano de recuperação
- [x] Calendário com agenda — planejar estudo futuro
- [ ] Modo prova — simulado temporizado + análise (em andamento)
- [ ] PWA — instalar como app, funcionar offline
- [ ] Plano Pro — IA avançada, relatórios, múltiplos planos

### Fase Final

- [ ] Tutorial interativo de onboarding

---

## Licença

Projeto privado — todos os direitos reservados.
