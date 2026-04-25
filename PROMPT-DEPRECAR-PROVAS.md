# Prompt: Deprecar Feature de Provas/Simulados/Caderno de Erros

## Contexto e Decisão Estratégica

O AprovaMind decidiu **abandonar** o módulo de provas/simulados/banco de questões próprio. Motivo: não tem como competir com QConcursos e Tec Concursos que têm 2M+ questões curadas. Cada hora gasta nessa feature é uma hora que não vai para o motor de decisão, que é o verdadeiro diferencial do produto.

**O que SAI**: todas as páginas de provas, simulados, caderno de erros e o código que depende de banco de questões.

**O que FICA**: o registro manual de questões (`QuestionTrackerCard`) e a camada de acurácia (`AccuracyChart`, `getAccuracyAnalytics`, `questions_stats`) porque alimentam o motor de decisão com dados de precisão por matéria.

## Documentação obrigatória

Leia `docs/aprovaflow-project-memory.mdc` antes de começar.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Firebase Firestore
- Monorepo: `apps/web/src/`

---

## BLOCO 1: Remover páginas de rotas

Deletar **todas** estas pastas/arquivos:

```
apps/web/src/app/(app)/provas/              ← pasta inteira (page.tsx, criar-simulado/, [id]/)
apps/web/src/app/(app)/caderno-erros/       ← pasta inteira  
apps/web/src/app/(app)/simulations/         ← pasta inteira (redirect para /provas)
```

São 6 páginas no total:
- `/provas/page.tsx` — hub de provas
- `/provas/criar-simulado/page.tsx` — criador de simulado
- `/provas/[id]/executar/page.tsx` — execução de prova
- `/provas/[id]/resultado/page.tsx` — resultado de prova
- `/caderno-erros/page.tsx` — caderno de erros
- `/simulations/page.tsx` — redirect

## BLOCO 2: Remover itens de navegação

Editar `apps/web/src/components/layout/Sidebar.tsx`:

Remover estes dois objetos do array `NAV_ITEMS` (linhas ~56-66):

```typescript
// REMOVER:
{
  href: '/provas',
  icon: Target,
  label: 'Provas e Simulados',
  description: 'Hub de treino',
},
{
  href: '/caderno-erros',
  icon: BookX,
  label: 'Caderno de Erros',
  description: 'Erros e padrões',
},
```

Depois, remover os imports de ícones não mais usados (`Target`, `BookX`) se não forem usados em outro lugar do mesmo arquivo. Verificar antes de remover.

## BLOCO 3: Limpar `questions.ts`

O arquivo `apps/web/src/lib/firebase/questions.ts` tem ~629 linhas. Muitas funções só eram usadas pelas páginas de provas que foram deletadas.

**Funções que FICAM** (usadas por Dashboard, Engine, Analytics, Mentoring, QuestionTrackerCard, AccuracyChart):

| Função | Usada por |
|---|---|
| `saveQuestionSession` | `QuestionTrackerCard.tsx` |
| `getAccuracyAnalytics` | `Dashboard.tsx`, `dashboard/page.tsx`, `mentoring/page.tsx`, `analytics/page.tsx` |
| `getSubjectDeltaMap` | `Dashboard.tsx`, `analytics/page.tsx` |
| `type AccuracyAnalytics` | `Dashboard.tsx`, `AccuracyChart.tsx`, `analytics/page.tsx` |
| `type AccuracyPeriod` | `AccuracyChart.tsx` |
| `getQuestionSessionsFromDate` | Verificar — pode ser usada internamente por `getAccuracyAnalytics` |

**Funções que SAEM** (só eram usadas por provas/caderno-erros/simulados):

| Função | Era usada por (agora deletado) |
|---|---|
| `getQuestionById` | `provas/[id]/executar`, `provas/[id]/resultado` |
| `getQuestionsByIds` | `caderno-erros/page.tsx` |
| `listQuestionsByFilter` | Interna, alimenta `getRandomQuestions` e `getPredictiveQuestions` |
| `loadExamQuestions` | `provas/[id]/executar`, `provas/[id]/resultado` |
| `getExamById` | `provas/[id]/executar`, `provas/[id]/resultado` |
| `listExamsByPlan` | `provas/page.tsx` |
| `saveQuestionAttempts` | `provas/[id]/executar` |
| `saveQuestionAttempt` | Interna, usada por `saveQuestionAttempts` |
| `getRecentAttempts` | `provas/[id]/resultado` |
| `getWrongAttempts` | `caderno-erros/page.tsx` |
| `markAttemptAsMastered` | `caderno-erros/page.tsx` |
| `saveSimulatedConfig` | `provas/criar-simulado` |
| `getSimulatedConfigById` | `provas/[id]/executar`, `provas/[id]/resultado` |
| `getSimulatedConfigs` | Verificar se usado em algum lugar que fica |
| `getRandomQuestions` | `provas/criar-simulado` |
| `getPredictiveQuestions` | `provas/criar-simulado` |
| `getAccuracyBySubject` | `provas/criar-simulado` |
| `getAvailableSubjects` | `provas/page.tsx` |
| `getAvailableBancas` | Dead code (não importado em lugar nenhum) |
| `buildSimulationOverview` (se existir em `lib/provas/overview.ts`) | `provas/page.tsx` |

**Procedimento**:
1. Primeiro deletar as páginas (Bloco 1)
2. Depois rodar `npx tsc --noEmit` — os erros vão mostrar exatamente quais imports quebraram
3. Remover as funções não mais importadas de `questions.ts`
4. Verificar se `apps/web/src/lib/provas/` existe e pode ser deletada inteira
5. Rodar `npx tsc --noEmit` novamente — deve compilar limpo (exceto erros pré-existentes conhecidos)

## BLOCO 4: Limpar Firestore Rules

Editar `firestore.rules` — remover ou comentar as rules das collections que ficam órfãs:

```
// REMOVER (collections de provas/banco de questões):
match /questions_bank/{questionId} { ... }
match /exams/{examId} { ... }
match /question_attempts/{attemptId} { ... }
match /simulated_configs/{configId} { ... }

// MANTER (usado pelo QuestionTrackerCard + motor de decisão):
match /questions_stats/{docId} { ... }
```

**NÃO remover `questions_stats`** — é a collection que o registro manual de questões usa e que alimenta o motor de decisão.

## BLOCO 5: Limpar arquivos auxiliares

Verificar e deletar se existirem:
- `apps/web/src/lib/provas/` — pasta inteira (overview.ts e qualquer outro arquivo)
- Qualquer componente em `apps/web/src/components/` que só era usado pelas páginas de provas (fazer grep para confirmar)

**NÃO deletar**:
- `apps/web/src/components/QuestionTrackerCard.tsx` — FICA (registro manual)
- `apps/web/src/components/AccuracyChart.tsx` — FICA (gráfico de acurácia)

## BLOCO 6: Verificação

1. `npx tsc --noEmit --project apps/web/tsconfig.json` — deve compilar sem erros novos
2. Verificar que Dashboard ainda renderiza: `QuestionTrackerCard` e `AccuracyChart` devem funcionar normalmente
3. Verificar que `/planner`, `/dashboard`, `/engine`, `/mentoring`, `/analytics`, `/history`, `/settings` continuam funcionando
4. Verificar que Sidebar não tem links quebrados

## BLOCO 7: Atualizar documentação

Editar `docs/aprovaflow-project-memory.mdc`:

1. Na seção "Componentes Existentes", remover menções a páginas de provas/simulados/caderno-erros
2. Na seção "Decisões de Produto", adicionar:
   ```
   - Feature de provas/simulados/caderno de erros DEPRECADA (abril/2026).
     Motivo: impossível competir com QConcursos/Tec em banco de questões.
     Registro manual de questões (QuestionTrackerCard) e acurácia mantidos
     para alimentar o motor de decisão.
   ```
3. Remover `question_attempts`, `simulated_configs`, `questions_bank`, `exams` do Firestore Schema
4. Manter `questions_stats` no schema
5. Atualizar data

Editar `firestore.rules` conforme Bloco 4.

## Resumo do impacto

| Métrica | Antes | Depois |
|---|---|---|
| Páginas no app | ~12 | ~6 |
| Itens no Sidebar | 8 | 6 |
| Linhas em questions.ts | ~629 | ~150-200 |
| Collections Firestore | ~15 | ~11 |
| Superfície de manutenção | Alta | Focada no core |

## Restrições

- **NÃO deletar** `QuestionTrackerCard.tsx`, `AccuracyChart.tsx`, `questions_stats` collection
- **NÃO deletar** funções de `questions.ts` que são usadas pelos componentes que ficam (`saveQuestionSession`, `getAccuracyAnalytics`, `getSubjectDeltaMap`, types)
- Verificar CADA função antes de deletar — fazer grep para confirmar que não é importada
- Manter a landing page (`/`) e login (`/login`) intocados
- Rodar TypeScript check depois de cada bloco para pegar erros cedo
