# Evolução das Funcionalidades de IA — AprovaMind

Este documento rastreia a implementação das funcionalidades baseadas em Inteligência Artificial para elevar a plataforma ao nível de **Mentor Preditivo e Generativo**.

---

## Fase 1: GPS do Estudo (Recálculo de Rota) ✅

| Item | Status |
|---|---|
| Mapear estrutura de dados necessária (Plano de Estudos, Metas, Histórico de Sessões) | ✅ |
| Criar endpoint `POST /api/smart-schedule` para geração do cronograma da semana | ✅ |
| Desenvolver componente `SmartScheduleCard` no Dashboard | ✅ |
| Integrar lógica de recalcular a rota caso o aluno perca um dia de estudo | 🔄 Em progresso |

**Arquivos principais:**
- `src/app/api/smart-schedule/route.ts`
- `src/components/SmartScheduleCard.tsx`

---

## Fase 2: Modo Interrogatório (Active Recall Pós-Sessão) ✅

| Item | Status |
|---|---|
| Criar endpoint `POST /api/interrogation` com resposta JSON (`score`, `strengths`, `weaknesses`) | ✅ |
| Mapear provider `interrogation` em `types.ts` e `gateway.ts` | ✅ |
| Construir Modal com lógica "Pular" ou "Enviar para IA" (`InterrogationModal.tsx`) | ✅ |
| Integrar no `StudyTimer.tsx` com salvamento de `retentionScore` | ✅ |

**Arquivos principais:**
- `src/app/api/interrogation/route.ts`
- `src/components/InterrogationModal.tsx`
- `src/components/StudyTimer.tsx` (modificado)
- `src/lib/ai/types.ts` / `gateway.ts` / `entitlements.ts` (modificados)

**Quotas configuradas:**
| Plano | Limite |
|---|---|
| Free | 15/dia |
| Pro | 50/dia |
| Pro | 100/dia |

---

## Fase 3: Simulador de Prova Preditivo ✅

| Item | Status |
|---|---|
| Algoritmo `getPredictiveQuestions()` com seleção calibrada por fraquezas | ✅ |
| Endpoint `POST /api/explain-answer` para explicações IA de erros | ✅ |
| Toggle "Simulado Inteligente (IA)" na criação de simulado | ✅ |
| Botão "Explicar com IA" na tela de resultados | ✅ |
| Pontuação Projetada ponderada | ✅ |

**Arquivos principais:**
- `src/lib/firebase/questions.ts` (novo: `getPredictiveQuestions`)
- `src/app/api/explain-answer/route.ts`
- `src/app/provas/criar-simulado/page.tsx` (modificado)

**Quotas configuradas:**
| Plano | predictive-exam | explain-answer |
|---|---|---|
| Free | 5/dia | ❌ Bloqueado |
| Pro | 20/dia | 30/dia |
| Pro | 50/dia | 80/dia |

---

## Fase 4: Gerador de Cadernos de Erros Automatizado ✅

| Item | Status |
|---|---|
| `'error-diagnosis'` em `AiTask`, `gateway.ts`, `entitlements.ts` | ✅ |
| Campo `mastered` no `QuestionAttempt` | ✅ |
| `getWrongAttempts()` e `markAttemptAsMastered()` em `questions.ts` | ✅ |
| Endpoint `POST /api/error-diagnosis` (diagnóstico IA de padrões) | ✅ |
| Página `/caderno-erros` com KPIs, filtros, lista agrupada | ✅ |
| Link "Caderno de Erros" no Sidebar | ✅ |

**Arquivos principais:**
- `src/app/api/error-diagnosis/route.ts`
- `src/app/(app)/caderno-erros/page.tsx`
- `src/lib/firebase/questions.ts` (novo: `getWrongAttempts`, `markAttemptAsMastered`)
- `src/components/layout/Sidebar.tsx` (modificado)

**Quotas configuradas:**
| Plano | error-diagnosis |
|---|---|
| Free | ❌ Bloqueado |
| Pro | 5/dia |
| Pro | 15/dia |
