'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Loader2, RefreshCw, Clock3, Target, AlertTriangle } from 'lucide-react';
import { StudyConsistency, SubjectHours, PlanVsActual, SubjectAccuracy } from '@/types';
import { auth } from '@/lib/firebase/config';
import { getDailyAiPlanForDate } from '@/lib/firebase/dailyAiPlans';

interface DailyPlanBlock {
  subject: string;
  durationMinutes: number;
  objective: string;
  taskType: 'teoria' | 'questoes' | 'revisao' | 'simulado';
  priority: 'alta' | 'media' | 'baixa';
}

interface DailyPlanResponse {
  dateISO: string;
  rationale: string;
  blocks: DailyPlanBlock[];
  contingencies: string[];
  estimatedTotalMinutes: number;
}

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
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasContext = useMemo(() => {
    return (subjectHours?.length || 0) > 0 || (planVsActual?.length || 0) > 0 || (consistency?.weeklyTotalSeconds || 0) > 0;
  }, [subjectHours, planVsActual, consistency]);

  useEffect(() => {
    let cancelled = false;

    const loadSavedPlan = async () => {
      if (!userId) {
        setLoadingSavedPlan(false);
        return;
      }

      setLoadingSavedPlan(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const saved = await getDailyAiPlanForDate(userId, today);
        if (!cancelled && saved) {
          setPlan(saved);
        }
      } catch {
        // Silencioso: fallback é gerar manualmente
      } finally {
        if (!cancelled) setLoadingSavedPlan(false);
      }
    };

    loadSavedPlan();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const generatePlan = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/planner-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userName,
          activePlanName: activePlanName || null,
          dateISO: today,
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
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Não foi possível gerar o plano diário.');
        return;
      }

      const data = (await res.json()) as DailyPlanResponse;
      setPlan(data);
    } catch {
      setError('Erro de conexão ao gerar plano diário.');
    } finally {
      setLoading(false);
    }
  };

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
          onClick={generatePlan}
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

      {plan && (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-sm text-gray-200">{plan.rationale}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {plan.estimatedTotalMinutes} min
              </span>
              <span className="inline-flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                {plan.blocks.length} blocos
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {plan.blocks.map((block, idx) => (
              <div key={`${block.subject}-${idx}`} className="rounded-xl border border-white/10 bg-gray-900/50 p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{idx + 1}. {block.subject}</p>
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
                <p className="text-xs text-gray-300">{block.objective}</p>
              </div>
            ))}
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
