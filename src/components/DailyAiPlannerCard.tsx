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
}

function taskTypeLabel(taskType: DailyPlanBlock['taskType']): string {
  if (taskType === 'teoria') return 'Teoria';
  if (taskType === 'questoes') return 'Questões';
  if (taskType === 'simulado') return 'Simulado';
  return 'Revisão';
}

function priorityClasses(priority: DailyPlanBlock['priority']): string {
  if (priority === 'alta') return 'bg-red-500/15 text-red-300 border-red-500/30';
  if (priority === 'media') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
}

function arrayWithout(values: number[], target: number): number[] {
  return values.filter((v) => v !== target);
}

function blockIdentityKey(block: DailyPlanBlock): string {
  return `${block.subject.trim().toLowerCase()}|${block.taskType}|${block.priority}|${block.objective
    .trim()
    .toLowerCase()}`;
}

type GenerateMode = 'manual' | 'session_saved';

export default function DailyAiPlannerCard({
  userId,
  userName,
  activePlanName,
  consistency,
  subjectHours,
  planVsActual,
  accuracyData,
  totalTodaySeconds,
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
      className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 via-gray-900 to-gray-950 p-6 shadow-2xl"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/20 p-2.5">
            <Brain className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Plano Diário IA</h2>
            <p className="text-sm text-gray-400">Blocos executáveis para hoje</p>
          </div>
        </div>

        <button
          onClick={() => void generatePlan('manual')}
          disabled={loading || !hasContext}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-violet-500/15 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : plan ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {plan ? 'Regerar' : 'Gerar plano'}
        </button>
      </div>

      {!hasContext && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Registre sessões para a IA montar um plano diário personalizado.
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {loadingSavedPlan && !plan && (
        <p className="mb-3 text-xs text-gray-500">Carregando plano salvo de hoje...</p>
      )}

      {autoReplanning && (
        <p className="mb-3 text-xs text-cyan-300">Sessão detectada. Replanejando automaticamente os próximos blocos...</p>
      )}

      {plan && (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-sm text-gray-200">{plan.rationale}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {plan.estimatedTotalMinutes} min
              </span>
              <span className="inline-flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                {plan.blocks.length} blocos
              </span>
              <span>{completionPercent}% concluído</span>
              {loadingProgress && <span className="text-[11px] text-gray-500">sincronizando...</span>}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-800/70">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            {plan.blocks.map((block, idx) => {
              const done = completedBlocks.includes(idx);
              const deferred = deferredBlocks.includes(idx);

              return (
                <div
                  key={`${block.subject}-${idx}`}
                  className={`rounded-xl border p-3 transition-colors ${
                    done
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : deferred
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-white/10 bg-gray-900/50'
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${done ? 'text-emerald-200' : 'text-white'}`}>
                      {idx + 1}. {block.subject}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-300">
                        {taskTypeLabel(block.taskType)}
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] ${priorityClasses(block.priority)}`}>
                        {block.priority}
                      </span>
                      <span className="text-xs text-gray-400">{block.durationMinutes} min</span>
                    </div>
                  </div>
                  <p className="mb-2 text-xs text-gray-300">{block.objective}</p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => dispatchStartSubject(block.subject)}
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-600/20 px-2.5 py-1.5 text-[11px] text-violet-200 transition hover:bg-violet-600/30"
                    >
                      <Play className="h-3 w-3" />
                      Iniciar no cronômetro
                    </button>
                    <button
                      onClick={() => toggleCompleted(idx)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                        done ? 'bg-emerald-500/30 text-emerald-100' : 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {done ? 'Concluído' : 'Concluir'}
                    </button>
                    <button
                      onClick={() => toggleDeferred(idx)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                        deferred ? 'bg-amber-500/30 text-amber-100' : 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
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
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Plano B</p>
              <ul className="space-y-1 text-xs text-gray-300">
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
