'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  deduplicateDefaultPlans,
  getActivePlan,
  migrateToMultiPlan,
} from '@/lib/firebase/plans';
import {
  getStudyConsistency,
  getRecentSessions,
} from '@/lib/firebase/sessions';
import { StudyPlanEdital, StudySession, StudyConsistency } from '@/types';
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
  const [plans, setPlans] = useState<StudyPlanEdital[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [lastSavedSession, setLastSavedSession] = useState<{ subject: string; duration: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const migrated = useRef(false);

  const activePlanObj = plans.find((p) => p.id === activePlanId) || null;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      if (!migrated.current) {
        await migrateToMultiPlan(user.uid);
        migrated.current = true;
      }
      const allPlans = await deduplicateDefaultPlans(user.uid);
      const active = await getActivePlan(user.uid);
      setPlans(allPlans);
      setActivePlanIdState(active || null);

      const [recent, cons] = await Promise.all([
        getRecentSessions(user.uid, 8, active || undefined),
        getStudyConsistency(user.uid, active || undefined).catch(() => null),
      ]);
      setRecentSessions(recent);
      setConsistency(cons);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSessionSaved = async (session: { subject: string; duration: number }) => {
    setLastSavedSession(session);
    await loadData();
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
      await loadData();
      setActivePlanIdState(planId);
    } finally {
      setCreatingPlan(false);
    }
  };

  if (!user) return null;

  const weeklyHours = consistency ? consistency.weeklyTotalSeconds / 3600 : 0;

  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Header */}
      <div className="border-b border-white/[0.05] bg-[#0b1120]/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Precision Study Engine</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Sessão de Estudo</h1>
            <p className="mt-0.5 text-sm text-slate-500">Cronômetro de alta performance com foco total</p>
          </div>
          {consistency && (
            <div className="hidden items-center gap-4 lg:flex">
              <div className="text-right">
                <p className="text-xs text-slate-600">Esta semana</p>
                <p className="text-lg font-bold text-white">{weeklyHours.toFixed(1)}h</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">Sequência</p>
                <p className="text-lg font-bold text-white">{consistency.currentStreak}d</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">Meta semanal</p>
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
                className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-[#0f1825] px-4 py-3"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-slate-500">Edital:</span>
                  <div
                    className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
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
                    <span className="text-xs text-slate-600">
                      {activePlanObj.subjects.length} matérias configuradas
                    </span>
                    <Link href="/planner" className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-0.5">
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
                onCreateEdital={() => {}}
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
                onSaved={loadData}
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
                { label: 'Sequência', value: `${consistency?.currentStreak || 0}d`, icon: Flame, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Meta', value: `${consistency?.weeklyProgressPercent || 0}%`, icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-4">
                  <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-600">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* Execution log (recent sessions) */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show"
              className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-white">Log de Execução</h3>
                </div>
                <Link href="/history" className="text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1">
                  Tudo <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 rounded shimmer" />)}
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="py-6 text-center">
                  <BookOpen className="mx-auto mb-2 h-6 w-6 text-slate-700" />
                  <p className="text-xs text-slate-600">Nenhuma sessão registrada</p>
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
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isRecent ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/[0.02]'}`}
                        >
                          <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${isRecent ? 'bg-blue-500/20' : 'bg-white/[0.04]'}`}>
                            {isRecent
                              ? <CheckCircle2 className="h-3 w-3 text-blue-400" />
                              : <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-300">{session.subject}</p>
                            <p className="text-[10px] text-slate-600">{session.date}</p>
                          </div>
                          <span className="flex-shrink-0 text-xs text-slate-500">{mins}m</span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

            {/* AI Insight panel */}
            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show"
              className="rounded-xl border border-violet-500/20 bg-gradient-to-b from-violet-600/10 to-transparent p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/20">
                  <Sparkles className="h-3 w-3 text-violet-400" />
                </div>
                <span className="text-xs font-semibold text-violet-400">AI Insight</span>
              </div>
              {loading ? (
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded shimmer" />
                  <div className="h-3 w-3/4 rounded shimmer" />
                </div>
              ) : recentSessions.length > 0 ? (
                <p className="text-xs text-slate-400 leading-relaxed">
                  {consistency && consistency.weeklyProgressPercent >= 80
                    ? `Excelente ritmo! Você está em ${consistency.weeklyProgressPercent}% da meta semanal. Continue focado.`
                    : consistency && consistency.weeklyProgressPercent > 0
                      ? `Você está em ${consistency.weeklyProgressPercent}% da meta. Sessões mais longas hoje podem fazer a diferença.`
                      : 'Inicie uma sessão para receber insights personalizados sobre sua performance.'}
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Inicie sua primeira sessão para ativar o diagnóstico de IA.
                </p>
              )}
            </motion.div>

            {/* Planner link */}
            {plans.length === 0 && (
              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show"
                className="rounded-xl border border-dashed border-white/[0.08] p-4 text-center"
              >
                <Plus className="mx-auto mb-2 h-5 w-5 text-slate-600" />
                <p className="text-xs font-medium text-slate-500">Nenhum edital configurado</p>
                <Link href="/planner" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
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
