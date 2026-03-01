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
| Premium | 100/dia |

---

## Fase 3: Simulador de Prova Preditivo

> Planejamento futuro

---

## Fase 4: Gerador de Cadernos de Erros Automatizado

> Planejamento futuro
