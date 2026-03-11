'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Sparkles,
  Loader2,
  RefreshCw,
  Clock3,
  Target,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock4,
} from 'lucide-react';
import { StudyConsistency, SubjectHours, PlanVsActual, SubjectAccuracy } from '@/types';
import { auth } from '@/lib/firebase/config';
import {
  buildDailyPlanSignature,
  DailyPlanBlock,
  DailyPlanResponse,
  getDailyAiPlanForDate,
  getDailyAiPlanProgress,
  saveDailyAiPlanProgress,
} from '@/lib/firebase/dailyAiPlans';

interface DailyAiPlannerCardProps {
  userId: string;
  userName: string;
  activePlanName?: string | null;
  consistency: StudyConsistency | null;
  subjectHours: SubjectHours[];
  planVsActual: PlanVsActual[];
  accuracyData?: SubjectAccuracy[];
  totalTodaySeconds: number;
  initialRecoveryMode?: boolean;
}

function taskTypeLabel(taskType: DailyPlanBlock['taskType']): string {
  if (taskType === 'teoria') return 'Teoria';
  if (taskType === 'questoes') return 'Questões';
  if (taskType === 'simulado') return 'Simulado';
  return 'Revisão';
}

function priorityClasses(priority: DailyPlanBlock['priority']): string {
  if (priority === 'alta') return 'bg-am-error/10 text-am-error border-am-error/30';
  if (priority === 'media') return 'bg-am-warning/10 text-am-warning border-am-warning/30';
  return 'bg-am-success/10 text-am-success border-am-success/30';
}

function arrayWithout(values: number[], target: number): number[] {
  return values.filter((v) => v !== target);
}

function blockIdentityKey(block: DailyPlanBlock): string {
  return `${block.subject.trim().toLowerCase()}|${block.taskType}|${block.priority}|${block.objective
    .trim()
    .toLowerCase()}`;
}

type GenerateMode = 'manual' | 'session_saved' | 'recovery';

export default function DailyAiPlannerCard({
  userId,
  userName,
  activePlanName,
  consistency,
  subjectHours,
  planVsActual,
  accuracyData,
  totalTodaySeconds,
  initialRecoveryMode,
}: DailyAiPlannerCardProps) {
  const [loading, setLoading] = useState(false);
  const [loadingSavedPlan, setLoadingSavedPlan] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [autoReplanning, setAutoReplanning] = useState(false);
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedBlocks, setCompletedBlocks] = useState<number[]>([]);
  const [deferredBlocks, setDeferredBlocks] = useState<number[]>([]);
  const previousTodaySecondsRef = useRef<number | null>(null);
  const lastAutoReplanAtRef = useRef<number>(0);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const hasContext = useMemo(() => {
    return (subjectHours?.length || 0) > 0 || (planVsActual?.length || 0) > 0 || (consistency?.weeklyTotalSeconds || 0) > 0;
  }, [subjectHours, planVsActual, consistency]);

  const planSignature = useMemo(() => {
    if (!plan) return '';
    return buildDailyPlanSignature(plan);
  }, [plan]);

  const completionPercent = useMemo(() => {
    if (!plan || plan.blocks.length === 0) return 0;
    return Math.round((completedBlocks.length / plan.blocks.length) * 100);
  }, [plan, completedBlocks]);

  useEffect(() => {
    let cancelled = false;

    const loadSavedPlan = async () => {
      if (!userId) {
        setLoadingSavedPlan(false);
        return;
      }

      setLoadingSavedPlan(true);
      try {
        const saved = await getDailyAiPlanForDate(userId, todayISO);
        if (!cancelled && saved) {
          setPlan(saved);
        }
      } catch {
        // fallback: geração manual
      } finally {
        if (!cancelled) setLoadingSavedPlan(false);
      }
    };

    loadSavedPlan();

    return () => {
      cancelled = true;
    };
  }, [userId, todayISO]);

  useEffect(() => {
    let cancelled = false;

    const loadProgress = async () => {
      if (!userId || !plan || !planSignature) return;

      setLoadingProgress(true);
      try {
        const progress = await getDailyAiPlanProgress(userId, plan.dateISO);
        if (cancelled) return;

        if (!progress || progress.planSignature !== planSignature) {
          setCompletedBlocks([]);
          setDeferredBlocks([]);
          return;
        }

        setCompletedBlocks(progress.completedBlocks);
        setDeferredBlocks(progress.deferredBlocks);
      } catch {
        if (!cancelled) {
          setCompletedBlocks([]);
          setDeferredBlocks([]);
        }
      } finally {
        if (!cancelled) setLoadingProgress(false);
      }
    };

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [userId, plan, planSignature]);

  // Hook for triggering recovery mode on mount
  const hasTriggeredRecoveryRef = useRef(false);
  useEffect(() => {
    if (initialRecoveryMode && !hasTriggeredRecoveryRef.current && hasContext) {
      hasTriggeredRecoveryRef.current = true;
      void generatePlan('recovery');
    }
  }, [initialRecoveryMode, hasContext]); // Excluded generatePlan from deps intentionaly to run once

  const persistProgress = async (nextCompleted: number[], nextDeferred: number[]) => {
    if (!userId || !plan || !planSignature) return;
    try {
      await saveDailyAiPlanProgress(userId, plan.dateISO, {
        planSignature,
        completedBlocks: nextCompleted,
        deferredBlocks: nextDeferred,
      });
    } catch {
      // silencioso para não bloquear UX
    }
  };

  const dispatchStartSubject = (subject: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('aprova:start-subject', {
        detail: { subject },
      })
    );
  };

  const toggleCompleted = async (index: number) => {
    const isCompleted = completedBlocks.includes(index);
    const nextCompleted = isCompleted ? arrayWithout(completedBlocks, index) : [...completedBlocks, index];
    const nextDeferred = arrayWithout(deferredBlocks, index);

    setCompletedBlocks(nextCompleted);
    setDeferredBlocks(nextDeferred);
    await persistProgress(nextCompleted, nextDeferred);
  };

  const toggleDeferred = async (index: number) => {
    const isDeferred = deferredBlocks.includes(index);
    const nextDeferred = isDeferred ? arrayWithout(deferredBlocks, index) : [...deferredBlocks, index];
    const nextCompleted = arrayWithout(completedBlocks, index);

    setDeferredBlocks(nextDeferred);
    setCompletedBlocks(nextCompleted);
    await persistProgress(nextCompleted, nextDeferred);
  };

  const generatePlan = useCallback(
    async (mode: GenerateMode = 'manual') => {
      if (loading) return;
      setLoading(true);
      if (mode === 'session_saved') {
        setAutoReplanning(true);
      } else {
        setError(null);
      }

      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          if (mode !== 'session_saved') {
            setError('Sessão expirada. Faça login novamente.');
          }
          return;
        }

        const previousPlan = plan;
        const previousCompleted = [...completedBlocks];
        const previousDeferred = [...deferredBlocks];
        const previousCompletedKeys = new Set(
          previousCompleted
            .map((idx) => previousPlan?.blocks[idx])
            .filter((block): block is DailyPlanBlock => Boolean(block))
            .map((block) => blockIdentityKey(block))
        );
        const previousDeferredKeys = new Set(
          previousDeferred
            .map((idx) => previousPlan?.blocks[idx])
            .filter((block): block is DailyPlanBlock => Boolean(block))
            .map((block) => blockIdentityKey(block))
        );

        let gapInsights = undefined;
        try {
          const stored = typeof window !== 'undefined' ? localStorage.getItem('aprovamind_last_gaps') : null;
          if (stored) gapInsights = JSON.parse(stored);
        } catch { /* ignore */ }

        const res = await fetch('/api/planner-daily', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            userName,
            activePlanName: activePlanName || null,
            dateISO: todayISO,
            replanMode: mode,
            weeklyGoalHours: consistency?.weeklyGoalHours ?? 10,
            weeklyTotalHours: (consistency?.weeklyTotalSeconds ?? 0) / 3600,
            weeklyProgressPercent: consistency?.weeklyProgressPercent ?? 0,
            currentStreak: consistency?.currentStreak ?? 0,
            daysStudiedThisWeek: consistency?.daysStudiedThisWeek ?? 0,
            availableMinutesToday: 180,
            todayTotalMinutes: Math.round(totalTodaySeconds / 60),
            subjectHours: subjectHours.map((s) => ({ subject: s.subject, hours: s.hours })),
            planVsActual: planVsActual.map((p) => ({
              subject: p.subject,
              plannedPercent: p.plannedPercent,
              actualPercent: p.actualPercent,
              status: p.status,
            })),
            accuracyBySubject: (accuracyData || []).map((a) => ({
              subject: a.subject,
              accuracy: a.accuracy,
              totalQuestions: a.totalQuestions,
            })),
            gapInsights,
            executionContext: previousPlan
              ? {
                currentBlocks: previousPlan.blocks,
                completedBlockIndexes: previousCompleted,
                deferredBlockIndexes: previousDeferred,
              }
              : undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (mode !== 'session_saved') {
            setError(data.error || 'Não foi possível gerar o plano diário.');
          }
          return;
        }

        const data = (await res.json()) as DailyPlanResponse;
        const nextCompleted = data.blocks
          .map((block, idx) => (previousCompletedKeys.has(blockIdentityKey(block)) ? idx : -1))
          .filter((idx): idx is number => idx >= 0);
        const nextDeferred = data.blocks
          .map((block, idx) => (previousDeferredKeys.has(blockIdentityKey(block)) ? idx : -1))
          .filter((idx): idx is number => idx >= 0)
          .filter((idx) => !nextCompleted.includes(idx));

        setPlan(data);
        setCompletedBlocks(nextCompleted);
        setDeferredBlocks(nextDeferred);

        const signature = buildDailyPlanSignature(data);
        await saveDailyAiPlanProgress(userId, data.dateISO, {
          planSignature: signature,
          completedBlocks: nextCompleted,
          deferredBlocks: nextDeferred,
        });
      } catch {
        if (mode !== 'session_saved') {
          setError('Erro de conexão ao gerar plano diário.');
        }
      } finally {
        setLoading(false);
        if (mode === 'session_saved') {
          setAutoReplanning(false);
        }
      }
    },
    [
      loading,
      plan,
      completedBlocks,
      deferredBlocks,
      userName,
      activePlanName,
      todayISO,
      consistency,
      totalTodaySeconds,
      subjectHours,
      planVsActual,
      accuracyData,
      userId,
    ]
  );

  useEffect(() => {
    if (previousTodaySecondsRef.current == null) {
      previousTodaySecondsRef.current = totalTodaySeconds;
      return;
    }

    const previous = previousTodaySecondsRef.current;
    previousTodaySecondsRef.current = totalTodaySeconds;

    if (totalTodaySeconds <= previous) return;
    if (!plan || plan.blocks.length === 0) return;
    if (completedBlocks.length >= plan.blocks.length) return;
    if (loading || loadingSavedPlan || autoReplanning) return;

    const now = Date.now();
    if (now - lastAutoReplanAtRef.current < 60_000) return;
    lastAutoReplanAtRef.current = now;

    void generatePlan('session_saved');
  }, [
    totalTodaySeconds,
    plan,
    completedBlocks.length,
    loading,
    loadingSavedPlan,
    autoReplanning,
    generatePlan,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-am-xl border border-am-border-default border-t border-t-am-ai-default/30 bg-am-surface p-8 shadow-am-md relative overflow-hidden"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-am-md border border-am-border-default bg-am-surface-subtle p-2">
            <Brain className="h-4 w-4 text-am-text-tertiary" />
          </div>
          <div>
            <h2 className="font-brand text-am-body-lg font-bold text-am-text-primary tracking-tight">Plano Diário</h2>
            <p className="text-am-caption text-am-text-secondary mt-0.5 font-mono uppercase tracking-widest">Execução Inteligente</p>
          </div>
        </div>

        <button
          onClick={() => void generatePlan('manual')}
          disabled={loading || (!hasContext && !initialRecoveryMode)}
          className="inline-flex items-center gap-2 rounded-am-md border border-am-border-default bg-am-surface-elevated px-4 py-2 text-am-caption font-medium text-am-text-primary shadow-am-sm transition-colors hover:bg-am-surface-subtle hover:border-am-border-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : plan ? <RefreshCw className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-am-ai-default" />}
          {plan ? 'Regerar' : 'Gerar plano'}
        </button>
      </div>

      {!hasContext && !initialRecoveryMode && (
        <div className="rounded-xl border border-am-warning/30 bg-am-warning/10 px-3 py-2 text-xs text-am-warning">
          Registre sessões para a IA montar um plano diário personalizado.
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-am-error/30 bg-am-error/10 px-3 py-2 text-xs text-am-error">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {loadingSavedPlan && !plan && (
        <p className="mb-3 text-xs text-am-text-tertiary">Carregando plano salvo de hoje...</p>
      )}

      {autoReplanning && (
        <p className="mb-3 text-xs text-am-info">Sessão detectada. Replanejando automaticamente os próximos blocos...</p>
      )}

      {initialRecoveryMode && !plan && !loading && !loadingSavedPlan && (
        <div className="mb-3 rounded-xl border border-am-error/30 bg-am-error/10 px-3 py-2 text-xs text-am-error">
          Você ativou o Modo Recuperação. Clique em &quot;Gerar plano&quot; para a IA montar seu resgate estratégico focado em Gaps.
        </div>
      )}

      {plan && (
        <div className="space-y-3">
          <div className="rounded-xl border border-am-border-default bg-am-surface-subtle p-3">
            <p className="text-sm text-am-text-secondary">{plan.rationale}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-am-text-tertiary">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {plan.estimatedTotalMinutes} min
              </span>
              <span className="inline-flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                {plan.blocks.length} blocos
              </span>
              <span>{completionPercent}% concluído</span>
              {loadingProgress && <span className="text-[11px] text-am-text-tertiary">sincronizando...</span>}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-am-surface-subtle">
              <div className="h-full rounded-full bg-am-success transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            {plan.blocks.map((block, idx) => {
              const done = completedBlocks.includes(idx);
              const deferred = deferredBlocks.includes(idx);

              return (
                <div
                  key={`${block.subject}-${idx}`}
                  className={`rounded-xl border p-3 transition-colors ${done
                    ? 'border-am-success/30 bg-am-success/10'
                    : deferred
                      ? 'border-am-warning/30 bg-am-warning/10'
                      : 'border-am-border-default bg-am-surface-elevated'
                    }`}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${done ? 'text-am-success' : 'text-am-text-primary'}`}>
                      {idx + 1}. {block.subject}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-am-brand-primary/10 px-2 py-0.5 text-[11px] text-am-brand-primary">
                        {taskTypeLabel(block.taskType)}
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] ${priorityClasses(block.priority)}`}>
                        {block.priority}
                      </span>
                      <span className="text-xs text-am-text-tertiary">{block.durationMinutes} min</span>
                    </div>
                  </div>
                  <p className="mb-2 text-xs text-am-text-secondary">{block.objective}</p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => dispatchStartSubject(block.subject)}
                      className="inline-flex items-center gap-1 rounded-lg bg-am-ai-default/10 px-2.5 py-1.5 text-[11px] text-am-ai-default transition hover:bg-am-ai-default/20"
                    >
                      <Play className="h-3 w-3" />
                      Iniciar no cronômetro
                    </button>
                    <button
                      onClick={() => toggleCompleted(idx)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition ${done ? 'bg-am-success/20 text-am-success' : 'bg-am-success/10 text-am-success hover:bg-am-success/20'
                        }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {done ? 'Concluído' : 'Concluir'}
                    </button>
                    <button
                      onClick={() => toggleDeferred(idx)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition ${deferred ? 'bg-am-warning/20 text-am-warning' : 'bg-am-warning/10 text-am-warning hover:bg-am-warning/20'
                        }`}
                    >
                      <Clock4 className="h-3 w-3" />
                      {deferred ? 'Adiado' : 'Adiar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {plan.contingencies?.length > 0 && (
            <div className="rounded-xl border border-am-border-default bg-am-surface-subtle p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-am-text-tertiary">Plano B</p>
              <ul className="space-y-1 text-xs text-am-text-secondary">
                {plan.contingencies.map((item, idx) => (
                  <li key={`${item}-${idx}`}>- {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
