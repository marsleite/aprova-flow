/**
 * WeeklyMentoringCard — Mentoria Semanal com IA
 *
 * Verifica cache no Firestore (1x/semana).
 * Se já existe: mostra conteúdo salvo (zero requests).
 * Se não existe: mostra botão "Gerar Mentoria Semanal" (1 request).
 *
 * Visual premium com seções expandíveis.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Target,
  Trophy,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  StudyConsistency,
  SubjectHours,
  PlanVsActual,
  DailyHours,
  StudySession,
  SubjectAccuracy,
  WeeklyMentoringContent,
} from '@/types';
import {
  getWeeklyMentoring,
  saveWeeklyMentoring,
  getCurrentWeekStart,
} from '@/lib/firebase/sessions';
import { auth } from '@/lib/firebase/config';

// ============================================================
// Tipos
// ============================================================

interface WeeklyMentoringCardProps {
  userId: string;
  planId?: string;
  userName: string;
  consistency: StudyConsistency | null;
  subjectHours: SubjectHours[];
  planVsActual: PlanVsActual[];
  weeklyData: DailyHours[];
  recentSessions: StudySession[];
  accuracyData?: SubjectAccuracy[];
  activePlanName?: string | null;
  loading?: boolean;
}

// ============================================================
// Componente
// ============================================================

export default function WeeklyMentoringCard({
  userId,
  planId,
  userName,
  consistency,
  subjectHours,
  planVsActual,
  weeklyData,
  recentSessions,
  accuracyData,
  activePlanName,
  loading: parentLoading,
}: WeeklyMentoringCardProps) {
  const [content, setContent] = useState<WeeklyMentoringContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [cachedWeek, setCachedWeek] = useState<string | null>(null);

  // Detecta se há dados suficientes
  const hasStudyData =
    (consistency?.weeklyTotalSeconds ?? 0) > 0 ||
    subjectHours.length > 0 ||
    recentSessions.length > 0;

  // Carrega cache do Firestore ao montar
  useEffect(() => {
    if (!userId || parentLoading) return;

    let cancelled = false;
    setLoading(true);

    getWeeklyMentoring(userId, planId)
      .then((cached) => {
        if (cancelled) return;
        if (cached) {
          setContent(cached.content);
          setCachedWeek(cached.weekStart);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, planId, parentLoading]);

  // Gera nova mentoria via API
  const handleGenerate = useCallback(async () => {
    if (!consistency || !userName || generating) return;

    setGenerating(true);
    setError(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      const res = await fetch('/api/weekly-mentoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userName,
          activePlanName: activePlanName || null,
          currentStreak: consistency.currentStreak,
          bestStreak: consistency.bestStreak,
          weeklyGoalHours: consistency.weeklyGoalHours,
          weeklyTotalHours: consistency.weeklyTotalSeconds / 3600,
          weeklyProgressPercent: consistency.weeklyProgressPercent,
          daysStudiedThisWeek: consistency.daysStudiedThisWeek,
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
          recentSessions: recentSessions.slice(0, 10).map((s) => ({
            subject: s.subject,
            duration: s.duration,
            date: s.date,
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError('Limite da IA atingido. Tente novamente mais tarde.');
        } else {
          setError(data.error || 'Erro ao gerar mentoria.');
        }
        return;
      }

      const result = (await res.json()) as WeeklyMentoringContent;
      setContent(result);
      setCachedWeek(getCurrentWeekStart());

      // Salva no Firestore (cache)
      await saveWeeklyMentoring(userId, result, planId).catch(() => {});
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }, [
    userId,
    planId,
    userName,
    consistency,
    subjectHours,
    planVsActual,
    weeklyData,
    recentSessions,
    accuracyData,
    activePlanName,
    generating,
  ]);

  // ---- Skeleton ----
  if (parentLoading || loading) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-[#0E111B] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg shimmer" />
          <div className="h-4 w-48 rounded shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded shimmer" />
          <div className="h-3 w-3/4 rounded shimmer" />
        </div>
        <div className="mt-4 h-10 w-full rounded-xl shimmer" />
      </div>
    );
  }

  // ---- Sem dados ----
  if (!hasStudyData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/[0.07] bg-[#0E111B] p-5"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3150AA]/10">
            <Brain className="h-4 w-4 text-[#F59768]" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">Mentoria Semanal</span>
            <p className="text-[11px] text-[#666]">Análise profunda via IA</p>
          </div>
        </div>
        <p className="text-sm text-[#666]">
          Estude durante a semana para desbloquear sua mentoria semanal personalizada com IA.
        </p>
      </motion.div>
    );
  }

  // ---- Conteúdo da mentoria ----
  const weekLabel = cachedWeek
    ? `Semana de ${new Date(cachedWeek + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
    : 'Esta semana';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-xl border border-[#3150AA]/20 bg-gradient-to-b from-violet-900/10 to-[#0f1825] p-5"
    >
      {/* Decoração */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/5 blur-2xl" />
      <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-blue-500/5 blur-xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
              <Brain className="h-4 w-4 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Mentoria Semanal</span>
                <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                  IA
                </span>
              </div>
              <p className="text-[11px] text-[#666]">{weekLabel}</p>
            </div>
          </div>

          {content && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-lg p-1.5 text-[#666] transition hover:bg-white/[0.06] hover:text-[#666]"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Botão de gerar (quando não tem conteúdo) */}
        {!content && (
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F59768] to-[#3150AA] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-[#3150AA]/15 transition-all hover:shadow-[#3150AA]/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando mentoria...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Mentoria Semanal
                </>
              )}
            </button>
          </div>
        )}

        {/* Conteúdo da mentoria */}
        {content && (
          <>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3 overflow-hidden"
                >
                  {/* Diagnóstico */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                    <p className="text-sm leading-relaxed text-slate-300">{content.weekDiagnosis}</p>
                  </div>

                  {/* Pontos fortes */}
                  {content.strengths.length > 0 && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-300">Pontos Fortes</span>
                      </div>
                      <ul className="space-y-1">
                        {content.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-emerald-200/80">
                            <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pontos de melhoria */}
                  {content.improvements.length > 0 && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-300">Pontos de Melhoria</span>
                      </div>
                      <ul className="space-y-1">
                        {content.improvements.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-amber-200/80">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Plano de recuperação */}
                  {content.recoveryPlan && (
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3.5 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-xs font-semibold text-cyan-300">Plano para Próxima Semana</span>
                      </div>
                      <p className="text-sm leading-relaxed text-cyan-200/80">{content.recoveryPlan}</p>
                    </div>
                  )}

                  {/* Metas sugeridas */}
                  {content.suggestedGoals.length > 0 && (
                    <div className="rounded-xl border border-[#3150AA]/20 bg-violet-500/5 px-3.5 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-[#F59768]" />
                        <span className="text-xs font-semibold text-violet-300">Metas da Semana</span>
                      </div>
                      <ul className="space-y-1">
                        {content.suggestedGoals.map((g, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-violet-200/80">
                            <span className="mt-1.5 text-xs text-violet-500">{i + 1}.</span>
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fechamento motivacional */}
                  {content.motivationalClose && (
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] px-3.5 py-3">
                      <p className="text-xs italic leading-relaxed text-[#666]">
                        &ldquo;{content.motivationalClose}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Botão de regerar */}
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-xs text-[#666] transition hover:bg-white/[0.06] disabled:opacity-40"
                  >
                    {generating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Gerar nova análise
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compacto quando colapsado */}
            {!expanded && content.motivationalClose && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs italic text-[#666]"
              >
                &ldquo;{content.motivationalClose}&rdquo;
              </motion.p>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
