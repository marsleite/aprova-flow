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
import { Button } from '@/components/primitives/Button';

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
      .catch(() => { })
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
      await saveWeeklyMentoring(userId, result, planId).catch(() => { });
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
      <div className="rounded-xl border border-am-border-default bg-am-surface-elevated p-5">
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
        className="rounded-xl border border-am-border-default bg-am-surface-elevated p-5"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3150AA]/10">
            <Brain className="h-4 w-4 text-[#F59768]" />
          </div>
          <div>
            <span className="text-sm font-semibold text-am-text-primary">Mentoria Semanal</span>
            <p className="text-[11px] text-am-text-secondary">Análise profunda via IA</p>
          </div>
        </div>
        <p className="text-sm text-am-text-secondary">
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
      className="relative overflow-hidden rounded-am-xl border border-am-border-default border-t border-t-am-ai-default/30 bg-am-surface p-6 shadow-am-md"
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-am-ai-default/10">
              <Brain className="h-4 w-4 text-am-ai-default" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-am-text-primary">Mentoria Semanal</span>
                <span className="rounded-md bg-am-ai-default/10 px-1.5 py-0.5 text-[10px] font-bold text-am-ai-default">
                  IA
                </span>
              </div>
              <p className="text-[11px] text-am-text-secondary">{weekLabel}</p>
            </div>
          </div>

          {content && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-lg p-1.5 text-am-text-secondary transition hover:bg-am-surface-subtle hover:text-am-text-secondary"
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
            <Button
              onClick={handleGenerate}
              disabled={generating}
              variant="primary"
              className="w-full py-6 text-base shadow-am-md"
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
            </Button>
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
                  <div className="rounded-xl border border-am-border-default bg-am-surface-subtle p-3.5">
                    <p className="text-sm leading-relaxed text-am-text-secondary">{content.weekDiagnosis}</p>
                  </div>

                  {/* Pontos fortes */}
                  {content.strengths.length > 0 && (
                    <div className="rounded-xl border border-am-success/20 bg-am-success/5 px-3.5 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Trophy className="h-3.5 w-3.5 text-am-success" />
                        <span className="text-xs font-bold text-am-success uppercase tracking-wider">Pontos Fortes</span>
                      </div>
                      <ul className="space-y-1">
                        {content.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-am-text-secondary">
                            <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-am-success" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pontos de melhoria */}
                  {content.improvements.length > 0 && (
                    <div className="rounded-xl border border-am-warning/20 bg-am-warning/5 px-3.5 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-am-warning" />
                        <span className="text-xs font-bold text-am-warning uppercase tracking-wider">Pontos de Melhoria</span>
                      </div>
                      <ul className="space-y-1">
                        {content.improvements.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-am-text-secondary">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-am-warning" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Plano de recuperação */}
                  {content.recoveryPlan && (
                    <div className="rounded-xl border border-am-ai-default/20 bg-am-ai-default/5 px-3.5 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-am-ai-default" />
                        <span className="text-xs font-bold text-am-ai-default uppercase tracking-wider">Próxima Semana</span>
                      </div>
                      <p className="text-sm leading-relaxed text-am-text-secondary">{content.recoveryPlan}</p>
                    </div>
                  )}

                  {/* Metas sugeridas */}
                  {content.suggestedGoals.length > 0 && (
                    <div className="rounded-xl border border-am-ai-default/20 bg-am-ai-default/10 px-3.5 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-am-ai-default" />
                        <span className="text-xs font-bold text-am-ai-default uppercase tracking-wider">Metas Sugeridas</span>
                      </div>
                      <ul className="space-y-1">
                        {content.suggestedGoals.map((g, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-am-text-secondary">
                            <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-am-ai-default/10 text-[10px] font-bold text-am-ai-default leading-none">
                              {i + 1}
                            </span>
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fechamento motivacional */}
                  {content.motivationalClose && (
                    <div className="rounded-xl bg-am-surface-subtle/50 border border-am-border-default/50 px-3.5 py-3">
                      <p className="text-xs italic leading-relaxed text-am-text-secondary">
                        &ldquo;{content.motivationalClose}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Botão de regerar */}
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-am-border-default bg-am-surface-subtle px-4 py-2 text-xs text-am-text-secondary transition hover:bg-am-surface-subtle disabled:opacity-40"
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
                className="text-xs italic text-am-text-secondary"
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
