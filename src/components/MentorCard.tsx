/**
 * Card do Mentor AprovaFlow — Análise estratégica proativa
 *
 * Chama /api/mentor 1x ao montar (cache por sessão).
 * Mostra análise de equilíbrio, alerta de fadiga, ação imediata e frase motivacional.
 * Atualiza quando o usuário completa uma nova sessão de estudo.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  Quote,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Coffee,
  Target,
} from 'lucide-react';
import {
  StudyConsistency,
  SubjectHours,
  PlanVsActual,
  DailyHours,
  StudySession,
  SubjectAccuracy,
} from '@/types';

// ============================================================
// Tipos
// ============================================================

interface MentorCardProps {
  userName: string;
  consistency: StudyConsistency | null;
  subjectHours: SubjectHours[];
  planVsActual: PlanVsActual[];
  totalTodaySeconds: number;
  todayDominantSubject: string | null;
  weeklyData: DailyHours[];
  recentSessions: StudySession[];
  accuracyData?: SubjectAccuracy[];
  loading?: boolean;
}

interface MentorResponse {
  analysis: string;
  performanceInsight: string | null;
  fatigueAlert: string | null;
  immediateAction: string;
  motivationalQuote: string;
}

// ============================================================
// Componente
// ============================================================

export default function MentorCard({
  userName,
  consistency,
  subjectHours,
  planVsActual,
  totalTodaySeconds,
  todayDominantSubject,
  weeklyData,
  recentSessions,
  accuracyData,
  loading: parentLoading,
}: MentorCardProps) {
  const [data, setData] = useState<MentorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const fetchedRef = useRef(false);
  const lastFetchKeyRef = useRef('');

  // Chave para decidir se precisa re-fetch (muda quando dados relevantes mudam significativamente)
  const fetchKey = `${consistency?.weeklyTotalSeconds ?? 0}-${subjectHours.length}-${recentSessions.length}`;

  const fetchMentor = useCallback(async () => {
    if (!consistency || !userName) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          currentStreak: consistency.currentStreak,
          bestStreak: consistency.bestStreak,
          weeklyGoalHours: consistency.weeklyGoalHours,
          weeklyTotalHours: consistency.weeklyTotalSeconds / 3600,
          weeklyProgressPercent: consistency.weeklyProgressPercent,
          daysStudiedThisWeek: consistency.daysStudiedThisWeek,
          todayTotalMinutes: Math.round(totalTodaySeconds / 60),
          todayDominantSubject,
          subjectHours,
          planVsActual: planVsActual.map((p) => ({
            subject: p.subject,
            plannedPercent: p.plannedPercent,
            actualPercent: p.actualPercent,
            status: p.status,
          })),
          weeklyBreakdown: weeklyData.map((d) => ({
            day: d.day,
            hours: d.hours,
            isToday: d.isToday,
          })),
          recentSessions: recentSessions.slice(0, 5).map((s) => ({
            subject: s.subject,
            duration: s.duration,
            date: s.date,
            startTime: s.startTime,
          })),
          accuracyBySubject: accuracyData?.map((a) => ({
            subject: a.subject,
            totalQuestions: a.totalQuestions,
            correctAnswers: a.correctAnswers,
            accuracy: a.accuracy,
            sessions: a.sessions,
          })),
        }),
      });

      if (!res.ok) throw new Error('Erro na API');

      const json = (await res.json()) as MentorResponse;
      setData(json);
      fetchedRef.current = true;
      lastFetchKeyRef.current = fetchKey;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [
    userName,
    consistency,
    totalTodaySeconds,
    todayDominantSubject,
    subjectHours,
    planVsActual,
    weeklyData,
    recentSessions,
    accuracyData,
    fetchKey,
  ]);

  // Fetch 1x ao montar, e re-fetch se dados mudaram significativamente
  useEffect(() => {
    if (parentLoading || !consistency) return;
    if (fetchedRef.current && lastFetchKeyRef.current === fetchKey) return;
    fetchMentor();
  }, [parentLoading, consistency, fetchKey, fetchMentor]);

  // ---- Skeleton ----
  if (parentLoading || (loading && !data)) {
    return (
      <div className="animate-pulse rounded-2xl border border-white/10 bg-gray-900/70 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gray-800" />
          <div className="h-5 w-40 rounded bg-gray-800" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-800" />
          <div className="h-4 w-3/4 rounded bg-gray-800" />
          <div className="h-4 w-5/6 rounded bg-gray-800" />
        </div>
        <div className="mt-4 h-10 w-full rounded-xl bg-gray-800" />
      </div>
    );
  }

  // ---- Erro ----
  if (error && !data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-500/20 p-2.5">
            <Shield className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Mentor indisponível</p>
            <p className="text-xs text-gray-500">Não foi possível gerar a análise.</p>
          </div>
        </div>
        <button
          onClick={fetchMentor}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-gray-800/50 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      </motion.div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-gray-900 to-gray-950 p-5 shadow-2xl"
    >
      {/* Decoração de fundo */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl" />
      <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-violet-500/5 blur-xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 p-2.5">
              <Shield className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Mentor AprovaFlow</span>
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                  IA
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Análise estratégica dos seus estudos</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Refresh */}
            <button
              onClick={fetchMentor}
              disabled={loading}
              className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-800 hover:text-gray-400 disabled:opacity-30"
              title="Atualizar análise"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {/* Expand/Collapse */}
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-800 hover:text-gray-400"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {/* Análise Estratégica */}
              <div className="mb-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <p className="text-sm leading-relaxed text-gray-300">{data.analysis}</p>
              </div>

              {/* Performance Insight — Constância × Precisão */}
              {data.performanceInsight && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-3 flex items-start gap-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-3"
                >
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <div>
                    <span className="text-xs font-semibold text-cyan-300">Constância vs Precisão</span>
                    <p className="mt-0.5 text-sm leading-relaxed text-cyan-200/80">
                      {data.performanceInsight}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Alerta de Fadiga */}
              {data.fatigueAlert && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-3"
                >
                  <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <span className="text-xs font-semibold text-amber-300">Alerta de Fadiga</span>
                    <p className="mt-0.5 text-sm leading-relaxed text-amber-200/80">
                      {data.fatigueAlert}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Ação Imediata */}
              <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3.5 py-3">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <div>
                  <span className="text-xs font-semibold text-violet-300">Ação Imediata</span>
                  <p className="mt-0.5 text-sm leading-relaxed text-violet-200/80">
                    {data.immediateAction}
                  </p>
                </div>
              </div>

              {/* Frase Motivacional */}
              <div className="flex items-start gap-2 rounded-xl bg-gray-800/30 px-3.5 py-3">
                <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                <p className="text-xs italic leading-relaxed text-gray-400">
                  {data.motivationalQuote}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Frase motivacional compacta quando colapsado */}
        {!expanded && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs italic text-gray-500"
          >
            &ldquo;{data.motivationalQuote}&rdquo;
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
