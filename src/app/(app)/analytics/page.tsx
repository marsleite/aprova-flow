'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getStudySummary,
  getHoursBySubject,
  getWeeklyHours,
  getStudyConsistency,
  getPlanVsActual,
} from '@/lib/firebase/sessions';
import { getAccuracyAnalytics, getSubjectDeltaMap } from '@/lib/firebase/questions';
import {
  deduplicateDefaultPlans,
  getActivePlan,
  migrateToMultiPlan,
} from '@/lib/firebase/plans';
import {
  StudyPlanEdital,
  StudyConsistency,
  SubjectHours,
  PlanVsActual,
  DailyHours,
  SubjectAccuracy,
} from '@/types';
import SubjectRadarChart from '@/components/SubjectRadarChart';
import WeeklyBarChart from '@/components/WeeklyBarChart';
import AccuracyChart from '@/components/AccuracyChart';
import BenchmarkCard from '@/components/BenchmarkCard';
import { AccuracyAnalytics } from '@/lib/firebase/questions';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05, ease: 'easeOut' as const } }),
};

export default function AnalyticsPage() {
  const { user } = useAuthContext();
  const [plans, setPlans] = useState<StudyPlanEdital[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [subjectHours, setSubjectHours] = useState<SubjectHours[]>([]);
  const [planVsActual, setPlanVsActual] = useState<PlanVsActual[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyHours[]>([]);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);
  const [accuracyAnalytics, setAccuracyAnalytics] = useState<AccuracyAnalytics | null>(null);
  const [accuracyDelta, setAccuracyDelta] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState({ totalToday: 0, totalWeek: 0, totalMonth: 0 });
  const [loading, setLoading] = useState(true);
  const migrated = useRef(false);

  const activePlanObj = plans.find((p) => p.id === activePlanId) || null;
  const filterPlanId = activePlanId || undefined;

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
      const pid = active || undefined;
      const activePlan = allPlans.find((p) => p.id === active) || null;

      const [summaryRes, hours, weekly, cons, pva] = await Promise.all([
        getStudySummary(user.uid, pid),
        getHoursBySubject(user.uid, pid),
        getWeeklyHours(user.uid, pid),
        getStudyConsistency(user.uid, pid, activePlan?.weeklyGoalHours).catch(() => null),
        getPlanVsActual(user.uid, pid, activePlan?.subjects).catch(() => []),
      ]);
      setSummary(summaryRes);
      setSubjectHours(hours);
      setWeeklyData(weekly);
      setConsistency(cons);
      setPlanVsActual(pva);

      try {
        const analytics = await getAccuracyAnalytics(user.uid, pid);
        setAccuracyAnalytics(analytics);
        setAccuracyData(analytics.month);
        setAccuracyDelta(getSubjectDeltaMap(analytics.month, analytics.previousMonth));
      } catch {
        setAccuracyData([]);
        setAccuracyDelta({});
      }
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!user) return null;

  const weeklyHours = consistency ? consistency.weeklyTotalSeconds / 3600 : 0;
  const monthHours = summary.totalMonth / 3600;
  const totalQuestions = accuracyData.reduce((a, b) => a + b.totalQuestions, 0);
  const avgAccuracy = accuracyData.length
    ? Math.round(accuracyData.reduce((a, b) => a + b.accuracy, 0) / accuracyData.length)
    : 0;

  // Trends vs prev month
  const deltas = Object.values(accuracyDelta);
  const avgDelta = deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0;

  // Subjects to focus on
  const criticalSubjects = planVsActual.filter((p) => p.status === 'neglected');
  const strongSubjects = planVsActual.filter((p) => p.status === 'over' || p.status === 'ok');

  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Header */}
      <div className="border-b border-white/[0.05] bg-[#0b1120]/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Performance Analytics</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Análises de Performance</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Visão detalhada do seu progresso estratégico
              {activePlanObj && <> — <span style={{ color: activePlanObj.color }}>{activePlanObj.name}</span></>}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* KPI row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: 'Horas este mês',
              value: loading ? '—' : `${monthHours.toFixed(0)}h`,
              sub: `Esta semana: ${weeklyHours.toFixed(1)}h`,
              icon: Clock,
              trend: null,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
            {
              label: 'Sequência',
              value: loading ? '—' : `${consistency?.currentStreak || 0} dias`,
              sub: `Recorde: ${consistency?.bestStreak || 0} dias`,
              icon: Flame,
              trend: null,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
            },
            {
              label: 'Total Questões',
              value: loading ? '—' : totalQuestions.toLocaleString(),
              sub: `${accuracyData.reduce((a, b) => a + b.correctAnswers, 0)} corretas`,
              icon: Target,
              trend: null,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10',
            },
            {
              label: 'Precisão Média',
              value: loading ? '—' : `${avgAccuracy}%`,
              sub: avgDelta !== 0 ? `${avgDelta > 0 ? '+' : ''}${avgDelta}% vs mês anterior` : 'Sem dados anteriores',
              icon: Brain,
              trend: avgDelta,
              color: 'text-teal-400',
              bg: 'bg-teal-500/10',
            },
          ].map(({ label, value, sub, icon: Icon, trend, color, bg }, i) => (
            <motion.div key={label} custom={i} variants={fadeUp} initial="hidden" animate="show"
              className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${color}`} />
                </div>
                {trend !== null && trend !== 0 && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(trend)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
              {sub && <p className="mt-1 text-[10px] text-slate-600">{sub}</p>}
            </motion.div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
            <WeeklyBarChart data={weeklyData} loading={loading} />
          </motion.div>
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
            <SubjectRadarChart data={subjectHours} loading={loading} />
          </motion.div>
        </div>

        {/* Charts row 2 */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
            <AccuracyChart
              data={accuracyData}
              analytics={accuracyAnalytics}
              deltaBySubject={accuracyDelta}
              loading={loading}
            />
          </motion.div>

          {/* Plan vs Actual */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show"
            className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-white">Planejado vs. Real</h3>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded shimmer" />)}
              </div>
            ) : planVsActual.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-600">Configure um plano de estudos para ver a comparação</p>
              </div>
            ) : (
              <div className="space-y-3">
                {planVsActual.map((pva) => {
                  const isOk = pva.status === 'ok';
                  const isOver = pva.status === 'over';
                  const isNeglected = pva.status === 'neglected';
                  return (
                    <div key={pva.subject}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isNeglected
                            ? <AlertTriangle className="h-3 w-3 text-amber-400" />
                            : <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          }
                          <span className="text-sm text-slate-300">{pva.subject.length > 22 ? pva.subject.substring(0, 20) + '…' : pva.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600">{pva.plannedPercent}% plan</span>
                          <span className={`text-xs font-medium ${isNeglected ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {pva.deviation >= 0 ? '+' : ''}{pva.deviation.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className="absolute h-full rounded-full bg-slate-600/50" style={{ width: `${pva.plannedPercent}%` }} />
                        <div
                          className={`absolute h-full rounded-full transition-all ${isNeglected ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, pva.actualPercent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Benchmark */}
        <motion.div custom={8} variants={fadeUp} initial="hidden" animate="show" className="mb-6">
          <BenchmarkCard
            weeklyGoalHours={consistency?.weeklyGoalHours || 0}
            weeklyHours={weeklyHours}
            userId={user.uid}
            loading={loading}
          />
        </motion.div>

        {/* Strategic summary */}
        <motion.div custom={9} variants={fadeUp} initial="hidden" animate="show"
          className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Resumo Estratégico</h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">Forças Identificadas</p>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-6 rounded shimmer" />)}</div>
              ) : strongSubjects.length > 0 ? (
                <div className="space-y-1.5">
                  {strongSubjects.slice(0, 3).map((s) => (
                    <div key={s.subject} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                      <span className="text-sm text-slate-300">{s.subject}</span>
                      <span className="ml-auto text-xs text-emerald-400">{s.actualPercent.toFixed(0)}% real</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Configure matérias para identificar forças</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">Gargalos Estratégicos</p>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-6 rounded shimmer" />)}</div>
              ) : criticalSubjects.length > 0 ? (
                <div className="space-y-1.5">
                  {criticalSubjects.slice(0, 3).map((s) => (
                    <div key={s.subject} className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                      <span className="text-sm text-slate-300">{s.subject}</span>
                      <span className="ml-auto text-xs text-amber-400">{Math.abs(s.deviation).toFixed(0)}% abaixo</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Todas as matérias estão equilibradas</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
