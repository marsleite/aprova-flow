'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import {
  getStudyConsistency,
  getHoursBySubject,
  getPlanVsActual,
  getWeeklyHours,
  getRecentSessions,
} from '@/lib/firebase/sessions';
import { getAccuracyAnalytics } from '@/lib/firebase/questions';
import {
  StudyConsistency,
  SubjectHours,
  PlanVsActual,
  DailyHours,
  StudySession,
  SubjectAccuracy,
} from '@/types';
import WeeklyMentoringCard from '@/components/WeeklyMentoringCard';
import MentorCard from '@/components/MentorCard';
import ChatPanel from '@/components/ChatPanel';
import {
  Brain,
  Sparkles,
  MessageCircle,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Zap,
  BarChart2,
  Calendar,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05, ease: 'easeOut' as const } }),
};

export default function MentoringPage() {
  const { user } = useAuthContext();
  const { activePlanId, activePlan: activePlanObj } = usePlanContext();
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [subjectHours, setSubjectHours] = useState<SubjectHours[]>([]);
  const [planVsActual, setPlanVsActual] = useState<PlanVsActual[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyHours[]>([]);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const filterPlanId = activePlanId || undefined;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [cons, hours, pva, weekly, recent] = await Promise.all([
        getStudyConsistency(user.uid, filterPlanId, activePlanObj?.weeklyGoalHours).catch(() => null),
        getHoursBySubject(user.uid, filterPlanId).catch(() => []),
        getPlanVsActual(user.uid, filterPlanId, activePlanObj?.subjects).catch(() => []),
        getWeeklyHours(user.uid, filterPlanId).catch(() => []),
        getRecentSessions(user.uid, 10, filterPlanId).catch(() => []),
      ]);
      setConsistency(cons);
      setSubjectHours(hours);
      setPlanVsActual(pva);
      setWeeklyData(weekly);
      setRecentSessions(recent);

      try {
        const analytics = await getAccuracyAnalytics(user.uid, filterPlanId);
        setAccuracyData(analytics.month);
      } catch { setAccuracyData([]); }
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user, filterPlanId, activePlanObj]);

  useEffect(() => { if (user) fetchData(); }, [fetchData, user, activePlanId]);

  if (!user) return null;

  const todayDominant = recentSessions.length > 0
    ? [...recentSessions].sort((a, b) => b.duration - a.duration)[0].subject
    : null;

  const avgAccuracy = accuracyData.length
    ? Math.round(accuracyData.reduce((a, b) => a + b.accuracy, 0) / accuracyData.length)
    : null;

  const neglected = planVsActual.filter((p) => p.status === 'neglected');
  const strengths = planVsActual.filter((p) => p.status === 'ok' || p.status === 'over');

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-white/[0.05] bg-[#0E111B]/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-3.5 w-3.5 text-[#F59768]" />
              <span className="text-xs text-[#666] uppercase tracking-wider">AI Strategic Advisor</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 4px rgba(52,211,153,0.8)' }} />
                AI Online
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Mentoria Estratégica</h1>
            <p className="mt-0.5 text-sm text-[#666]">
              Diagnóstico semanal de IA com análise comparativa e recomendações estratégicas
            </p>
          </div>
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500"
          >
            <MessageCircle className="h-4 w-4" />
            Strategic Copilot
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Quick metrics */}
        {!loading && consistency && (
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
            className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {[
              {
                label: 'Horas esta semana',
                value: `${(consistency.weeklyTotalSeconds / 3600).toFixed(1)}h`,
                sub: `Meta: ${consistency.weeklyGoalHours}h`,
                icon: Clock,
                color: 'text-[#F59768]',
                bg: 'bg-[#3150AA]/10',
              },
              {
                label: 'Progresso semanal',
                value: `${consistency.weeklyProgressPercent}%`,
                sub: `${consistency.daysStudiedThisWeek} dias estudados`,
                icon: TrendingUp,
                color: 'text-[#F59768]',
                bg: 'bg-[#3150AA]/10',
              },
              {
                label: 'Sequência atual',
                value: `${consistency.currentStreak} dias`,
                sub: `Recorde: ${consistency.bestStreak} dias`,
                icon: Activity,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
              },
              {
                label: 'Taxa de acerto',
                value: avgAccuracy !== null ? `${avgAccuracy}%` : '—',
                sub: `${accuracyData.reduce((a, b) => a + b.totalQuestions, 0)} questões`,
                icon: BarChart2,
                color: 'text-teal-400',
                bg: 'bg-teal-500/10',
              },
            ].map(({ label, value, sub, icon: Icon, color, bg }, i) => (
              <motion.div key={label} custom={i} variants={fadeUp} initial="hidden" animate="show"
                className="rounded-xl border border-white/[0.07] bg-[#0E111B] p-4"
              >
                <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-[#666]">{label}</p>
                <p className="mt-0.5 text-[10px] text-[#666]">{sub}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr_280px]">
          {/* Left: AI Adjustments Log */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show"
            className="space-y-4"
          >
            <div className="rounded-xl border border-white/[0.07] bg-[#0E111B] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#666]">
                Log de Ajustes IA
              </p>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded shimmer" />)}
                </div>
              ) : (
                <div className="relative space-y-3">
                  {/* Timeline line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.05]" />

                  {planVsActual.length > 0 ? (
                    <>
                      {neglected.slice(0, 2).map((pva, i) => (
                        <div key={pva.subject} className="relative flex gap-3 pl-6">
                          <div className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 ${i === 0 ? 'border-blue-400 bg-blue-400/30' : 'border-slate-600 bg-slate-700'}`} />
                          <div>
                            <p className="text-[10px] text-[#666]">{i === 0 ? 'HOJE' : '2 DIAS ATRÁS'}</p>
                            <p className="text-xs font-semibold text-white">Ajuste de Peso</p>
                            <p className="text-[10px] text-[#666]">{pva.subject}: aumento de {Math.abs(pva.deviation).toFixed(0)}% sugerido</p>
                          </div>
                        </div>
                      ))}
                      {strengths.slice(0, 1).map((pva) => (
                        <div key={pva.subject} className="relative flex gap-3 pl-6">
                          <div className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-slate-600 bg-slate-700" />
                          <div>
                            <p className="text-[10px] text-[#666]">3 DIAS ATRÁS</p>
                            <p className="text-xs font-semibold text-white">Marco Atingido</p>
                            <p className="text-[10px] text-[#666]">{pva.subject}: cobertura em dia</p>
                          </div>
                        </div>
                      ))}
                      {consistency && consistency.currentStreak >= 3 && (
                        <div className="relative flex gap-3 pl-6">
                          <div className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-emerald-400 bg-emerald-400/30" />
                          <div>
                            <p className="text-[10px] text-[#666]">ESTA SEMANA</p>
                            <p className="text-xs font-semibold text-white">Sequência Mantida</p>
                            <p className="text-[10px] text-[#666]">{consistency.currentStreak} dias consecutivos de estudo</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-[#666] pl-6">Sem ajustes registrados. Estude mais para gerar diagnósticos.</p>
                  )}
                </div>
              )}
            </div>

            {/* Study plan status */}
            <div className="rounded-xl border border-white/[0.07] bg-[#0E111B] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#666]">Status do Sistema</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666]">AI Engine</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 4px rgba(52,211,153,0.8)' }} />
                    <span className="text-xs text-emerald-400">v4.3-pro</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666]">Sync</span>
                  <span className="text-xs text-emerald-400">Ativo em tempo real</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666]">Edital ativo</span>
                  <span className="text-xs text-slate-300">{activePlanObj?.name || 'Geral'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Center: Main mentor content */}
          <div className="space-y-6">
            {/* Weekly Diagnostic Report */}
            <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
              <WeeklyMentoringCard
                userId={user.uid}
                planId={filterPlanId}
                userName={user.displayName?.split(' ')[0] || 'Estudante'}
                consistency={consistency}
                subjectHours={subjectHours}
                planVsActual={planVsActual}
                weeklyData={weeklyData}
                recentSessions={recentSessions}
                accuracyData={accuracyData}
                activePlanName={activePlanObj?.name || null}
                loading={loading}
              />
            </motion.div>

            {/* Mentor Card */}
            <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
              <MentorCard
                userName={user.displayName?.split(' ')[0] || 'Estudante'}
                consistency={consistency}
                subjectHours={subjectHours}
                planVsActual={planVsActual}
                totalTodaySeconds={recentSessions.filter((s) => s.date === new Date().toISOString().split('T')[0]).reduce((a, b) => a + b.duration, 0)}
                todayDominantSubject={todayDominant}
                weeklyData={weeklyData}
                recentSessions={recentSessions}
                accuracyData={accuracyData}
                activePlanName={activePlanObj?.name || null}
                loading={loading}
              />
            </motion.div>
          </div>

          {/* Right: Strategic Copilot */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show"
            className="space-y-4"
          >
            <div className="rounded-xl border border-[#3150AA]/20 bg-gradient-to-b from-violet-600/10 to-[#0f1825] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#3150AA]/20">
                    <Sparkles className="h-3 w-3 text-[#F59768]" />
                  </div>
                  <p className="text-xs font-semibold text-violet-300">Strategic Copilot</p>
                </div>
                <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300">AI Online</span>
              </div>

              {/* Copilot messages preview */}
              <div className="space-y-3 mb-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded shimmer" />)
                ) : (
                  <>
                    <div className="rounded-lg bg-white/[0.04] p-3">
                      <p className="text-xs text-slate-300">
                        {consistency
                          ? `Analisei seus dados. ${consistency.weeklyProgressPercent >= 80 ? 'Excelente progresso semanal!' : 'Há oportunidades de melhora no ritmo.'} ${neglected.length > 0 ? `Atenção especial com ${neglected[0].subject}.` : 'Distribuição de matérias equilibrada.'}`
                          : 'Começe estudando para ativar o diagnóstico estratégico personalizado.'
                        }
                      </p>
                    </div>
                    {neglected.length > 0 && (
                      <button
                        onClick={() => setChatOpen(true)}
                        className="w-full rounded-lg border border-[#3150AA]/20 bg-violet-500/[0.06] px-3 py-2 text-left text-xs text-violet-300 transition-colors hover:bg-[#3150AA]/10"
                      >
                        Como realocar tempo em {neglected[0].subject}?
                      </button>
                    )}
                    {avgAccuracy !== null && avgAccuracy < 70 && (
                      <button
                        onClick={() => setChatOpen(true)}
                        className="w-full rounded-lg border border-[#3150AA]/20 bg-violet-500/[0.06] px-3 py-2 text-left text-xs text-violet-300 transition-colors hover:bg-[#3150AA]/10"
                      >
                        Como melhorar a taxa de acerto?
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Open chat */}
              <button
                onClick={() => setChatOpen(true)}
                className="flex w-full items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500"
              >
                <MessageCircle className="h-4 w-4" />
                Abrir Copilot
              </button>
            </div>

            {/* Comparative matrix */}
            {planVsActual.length > 0 && (
              <div className="rounded-xl border border-white/[0.07] bg-[#0E111B] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#666]">
                  Matriz Comparativa
                </p>
                <div className="overflow-hidden rounded-lg border border-white/[0.05]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#666]">Matéria</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[#666]">Real</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[#666]">Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {planVsActual.slice(0, 5).map((pva) => (
                        <tr key={pva.subject}>
                          <td className="px-3 py-2 text-slate-300">{pva.subject.length > 18 ? pva.subject.substring(0, 16) + '…' : pva.subject}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`font-medium ${pva.actualPercent >= 70 ? 'text-emerald-400' : pva.actualPercent >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                              {pva.actualPercent.toFixed(0)}%
                            </span>
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${pva.deviation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pva.deviation >= 0 ? '+' : ''}{pva.deviation.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="space-y-2">
              <Link href="/simulations"
                className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#0E111B] px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[#666]" />
                  Fazer simulado
                </div>
                <ChevronRight className="h-4 w-4 text-[#666]" />
              </Link>
              <Link href="/analytics"
                className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#0E111B] px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#666]" />
                  Ver análises
                </div>
                <ChevronRight className="h-4 w-4 text-[#666]" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        userName={user.displayName?.split(' ')[0] || 'Estudante'}
        consistency={consistency}
        subjectHours={subjectHours}
        planVsActual={planVsActual}
        todaySessions={recentSessions.filter((s) => s.date === new Date().toISOString().split('T')[0])}
        totalTodaySeconds={recentSessions.filter((s) => s.date === new Date().toISOString().split('T')[0]).reduce((a, b) => a + b.duration, 0)}
        weeklyData={weeklyData}
        recentSessions={recentSessions}
      />
    </div>
  );
}
