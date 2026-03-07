'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import {
  getStudyConsistency,
  getRecentSessions,
} from '@/lib/firebase/sessions';
import { StudySession, StudyConsistency } from '@/types';
import StudyTimer from '@/components/StudyTimer';
import QuestionTrackerCard from '@/components/QuestionTrackerCard';
import DailyAiPlannerCard from '@/components/DailyAiPlannerCard';
import { createStudyPlan, setActivePlan } from '@/lib/firebase/plans';
import {
  CheckCircle2,
  Sparkles,
  Clock,
  Target,
  Flame,
  BookOpen,
  ChevronRight,
  Plus,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.3, delay: i * 0.05, ease: 'easeOut' as const },
  }),
};

export default function EnginePage() {
  const { user } = useAuthContext();
  const { plans, activePlanId, activePlan: activePlanObj } = usePlanContext();
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [lastSavedSession, setLastSavedSession] = useState<{ subject: string; duration: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPlan, setCreatingPlan] = useState(false);

  const initialRecoveryMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('recovery') === 'true';

  const filterPlanId = activePlanId || undefined;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [recent, cons] = await Promise.all([
        getRecentSessions(user.uid, 8, filterPlanId),
        getStudyConsistency(user.uid, filterPlanId).catch(() => null),
      ]);
      setRecentSessions(recent);
      setConsistency(cons);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user, filterPlanId]);

  useEffect(() => { if (user) fetchData(); }, [fetchData, user, activePlanId]);

  const handleSessionSaved = async (session: { subject: string; duration: number }) => {
    setLastSavedSession(session);
    await fetchData();
  };

  const handleCreateSession = async () => {
    if (!user || creatingPlan) return;
    setCreatingPlan(true);
    try {
      const name = 'Sessão Livre';
      const planId = await createStudyPlan(user.uid, {
        name, subjects: [], weeklyGoalHours: 10, color: '#06b6d4', isDefault: false,
      });
      await setActivePlan(user.uid, planId);
      await fetchData();
    } finally {
      setCreatingPlan(false);
    }
  };

  if (!user) return null;

  const weeklyHours = consistency ? consistency.weeklyTotalSeconds / 3600 : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-white/[0.07] bg-[#0E111B]/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-[#F59768]" />
              <span className="text-xs text-[#666] uppercase tracking-wider font-mono">Precision Study Engine</span>
            </div>
            <h1 className="font-brand text-2xl font-bold text-white">Sessão de Estudo</h1>
            <p className="mt-0.5 text-sm text-[#666]">Cronômetro de alta performance com foco total</p>
          </div>
          {consistency && (
            <div className="hidden items-center gap-4 lg:flex">
              <div className="text-right">
                <p className="text-xs text-[#666] font-mono">Esta semana</p>
                <p className="text-lg font-bold text-white">{weeklyHours.toFixed(1)}h</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#666] font-mono">Sequência</p>
                <p className="text-lg font-bold text-white">{consistency.currentStreak}d</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#666] font-mono">Meta semanal</p>
                <p className="text-lg font-bold text-white">{consistency.weeklyGoalHours}h</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: Timer + Question Tracker */}
          <div className="space-y-6">
            {/* Context bar */}
            {activePlanObj && (
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0E111B] px-4 py-3"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-[#666] font-mono">Edital:</span>
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium font-mono"
                    style={{
                      background: `${activePlanObj.color}15`,
                      color: activePlanObj.color,
                      border: `1px solid ${activePlanObj.color}30`,
                    }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: activePlanObj.color }} />
                    {activePlanObj.name}
                  </div>
                </div>
                {activePlanObj.subjects.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#666] font-mono">
                      {activePlanObj.subjects.length} matérias configuradas
                    </span>
                    <Link href="/planner" className="text-xs text-[#F59768] hover:text-[#F59768]/80 transition-colors flex items-center gap-0.5 font-mono">
                      Gerenciar <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {/* Timer */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
              <StudyTimer
                key={activePlanId || 'all'}
                userId={user.uid}
                plans={plans}
                activePlanId={activePlanId}
                onSessionSaved={handleSessionSaved}
                onCreateSession={handleCreateSession}
                onCreateEdital={() => { }}
                creatingSession={creatingPlan}
              />
            </motion.div>

            {/* Question Tracker */}
            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
              <QuestionTrackerCard
                userId={user.uid}
                planId={activePlanId || undefined}
                planSubjects={activePlanObj?.subjects}
                lastSessionSubject={lastSavedSession?.subject ?? (recentSessions[0]?.subject || null)}
                onSaved={fetchData}
              />
            </motion.div>

            {/* Daily AI Planner */}
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
              <DailyAiPlannerCard
                userId={user.uid}
                userName={user.displayName?.split(' ')[0] || 'Estudante'}
                activePlanName={activePlanObj?.name || null}
                consistency={consistency}
                subjectHours={[]}
                planVsActual={[]}
                accuracyData={[]}
                totalTodaySeconds={0}
                initialRecoveryMode={initialRecoveryMode}
              />
            </motion.div>
          </div>

          {/* Right: Execution Log + Stats */}
          <div className="space-y-4">
            {/* Quick stats */}
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: 'Sequência', value: `${consistency?.currentStreak || 0}d`, icon: Flame, color: 'text-[#F59768]', bg: 'bg-[#F59768]/10' },
                { label: 'Meta', value: `${consistency?.weeklyProgressPercent || 0}%`, icon: Target, color: 'text-[#3150AA]', bg: 'bg-[#3150AA]/10' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0E111B] p-4">
                  <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-xs text-[#666] font-mono">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* Execution log (recent sessions) */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show"
              className="rounded-xl border border-white/[0.07] bg-[#0E111B] p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#666]" />
                  <h3 className="text-sm font-semibold text-white font-brand">Log de Execução</h3>
                </div>
                <Link href="/history" className="text-xs text-[#666] hover:text-slate-400 transition-colors flex items-center gap-1 font-mono">
                  Tudo <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 rounded shimmer" />)}
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="py-6 text-center">
                  <BookOpen className="mx-auto mb-2 h-6 w-6 text-[#666]/50" />
                  <p className="text-xs text-[#666]">Nenhuma sessão registrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {recentSessions.slice(0, 7).map((session, i) => {
                      const mins = Math.floor(session.duration / 60);
                      const isRecent = i === 0 && lastSavedSession?.subject === session.subject;
                      return (
                        <motion.div
                          key={session.id || i}
                          initial={isRecent ? { opacity: 0, x: 10 } : false}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isRecent ? 'bg-[#3150AA]/10 border border-[#3150AA]/20' : 'bg-white/[0.02]'}`}
                        >
                          <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${isRecent ? 'bg-[#3150AA]/20' : 'bg-white/[0.04]'}`}>
                            {isRecent
                              ? <CheckCircle2 className="h-3 w-3 text-[#F59768]" />
                              : <div className="h-1.5 w-1.5 rounded-full bg-[#666]" />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-300">{session.subject}</p>
                            <p className="text-[10px] text-[#666] font-mono">{session.date}</p>
                          </div>
                          <span className="flex-shrink-0 text-xs text-[#666] font-mono">{mins}m</span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

            {/* AI Insight panel */}
            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show"
              className="rounded-xl border border-[#3150AA]/20 bg-gradient-to-b from-[#3150AA]/10 to-transparent p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F59768]/20">
                  <Sparkles className="h-3 w-3 text-[#F59768]" />
                </div>
                <span className="text-xs font-semibold text-[#F59768] font-mono uppercase">AI Insight</span>
              </div>
              {loading ? (
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded shimmer" />
                  <div className="h-3 w-3/4 rounded shimmer" />
                </div>
              ) : recentSessions.length > 0 ? (
                <p className="text-xs text-[#666] leading-relaxed">
                  {consistency && consistency.weeklyProgressPercent >= 80
                    ? `Excelente ritmo! Você está em ${consistency.weeklyProgressPercent}% da meta semanal. Continue focado.`
                    : consistency && consistency.weeklyProgressPercent > 0
                      ? `Você está em ${consistency.weeklyProgressPercent}% da meta. Sessões mais longas hoje podem fazer a diferença.`
                      : 'Inicie uma sessão para receber insights personalizados sobre sua performance.'}
                </p>
              ) : (
                <p className="text-xs text-[#666]">
                  Inicie sua primeira sessão para ativar o diagnóstico de IA.
                </p>
              )}
            </motion.div>

            {/* Planner link */}
            {plans.length === 0 && (
              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show"
                className="rounded-xl border border-dashed border-white/[0.10] p-4 text-center"
              >
                <Plus className="mx-auto mb-2 h-5 w-5 text-[#666]" />
                <p className="text-xs font-medium text-[#666]">Nenhum edital configurado</p>
                <Link href="/planner" className="mt-2 inline-flex items-center gap-1 text-xs text-[#F59768] hover:text-[#F59768]/80 transition-colors font-mono">
                  Criar plano de estudos <ChevronRight className="h-3 w-3" />
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
