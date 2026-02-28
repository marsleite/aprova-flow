'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import {
  getStudySummary,
  getHoursBySubject,
  getWeeklyHours,
  getRecentSessions,
  getStudyConsistency,
  getPlanVsActual,
  generateInsights,
  getFilteredSessions,
} from '@/lib/firebase/sessions';
import { getAccuracyAnalytics, getSubjectDeltaMap } from '@/lib/firebase/questions';
import { getTodayISO, formatDuration } from '@/lib/utils';
import {
  StudySummary,
  SubjectHours,
  DailyHours,
  StudySession,
  StudyConsistency,
  PlanVsActual,
  StudyInsight,
  SubjectAccuracy,
} from '@/types';
import SubjectRadarChart from '@/components/SubjectRadarChart';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import InsightsPanel from '@/components/InsightsPanel';
import ChatPanel from '@/components/ChatPanel';
import PostSessionToast from '@/components/PostSessionToast';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Flame,
  Target,
  Zap,
  Brain,
  BarChart2,
  ChevronRight,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
  }),
};

const SUBJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b',
  '#10b981', '#ef4444', '#ec4899', '#84cc16',
];
function subjectColor(subject: string) {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = subject.charCodeAt(i) + ((h << 5) - h);
  return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  color = 'blue',
  index = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: number;
  color?: 'blue' | 'violet' | 'teal' | 'amber';
  index?: number;
}) {
  const colors = {
    blue:   { accent: '#3b82f6', bg: 'bg-blue-500/10',   text: 'text-blue-400',   glow: 'shadow-blue-500/10' },
    violet: { accent: '#8b5cf6', bg: 'bg-violet-500/10', text: 'text-violet-400', glow: 'shadow-violet-500/10' },
    teal:   { accent: '#06b6d4', bg: 'bg-teal-500/10',   text: 'text-teal-400',   glow: 'shadow-teal-500/10' },
    amber:  { accent: '#f59e0b', bg: 'bg-amber-500/10',  text: 'text-amber-400',  glow: 'shadow-amber-500/10' },
  };
  const c = colors[color];

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f1825] p-5 transition-all duration-300 hover:border-white/[0.10] hover:shadow-xl"
      style={{ boxShadow: `0 4px 24px rgba(0,0,0,0.4)` }}
    >
      {/* accent top bar */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.accent}60, transparent)` }} />
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg}`}
          style={{ boxShadow: `0 0 20px ${c.accent}25` }}
        >
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
            trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      {sub && <p className="mt-1.5 text-xs text-slate-600">{sub}</p>}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5">
      <div className="mb-4 h-10 w-10 rounded-xl shimmer" />
      <div className="h-8 w-24 rounded-lg shimmer mb-1.5" />
      <div className="h-3 w-32 rounded shimmer" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { plans, activePlanId, activePlan: activePlanObj } = usePlanContext();
  const [summary, setSummary] = useState<StudySummary>({ totalToday: 0, totalWeek: 0, totalMonth: 0 });
  const [subjectData, setSubjectData] = useState<SubjectHours[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyHours[]>([]);
  const [recentData, setRecentData] = useState<StudySession[]>([]);
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [planVsActual, setPlanVsActual] = useState<PlanVsActual[]>([]);
  const [insights, setInsights] = useState<StudyInsight[]>([]);
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([]);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [lastSavedSession, setLastSavedSession] = useState<{ subject: string; duration: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const filterPlanId = activePlanId || undefined;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [summaryRes, subjectsRes, weeklyRes, recentRes] = await Promise.all([
        getStudySummary(user.uid, filterPlanId),
        getHoursBySubject(user.uid, filterPlanId),
        getWeeklyHours(user.uid, filterPlanId),
        getRecentSessions(user.uid, 6, filterPlanId),
      ]);
      setSummary(summaryRes);
      setSubjectData(subjectsRes);
      setWeeklyData(weeklyRes);
      setRecentData(recentRes);

      try {
        const analytics = await getAccuracyAnalytics(user.uid, filterPlanId);
        setAccuracyData(analytics.month);
      } catch { setAccuracyData([]); }

      const today = getTodayISO();
      const todayRes = await getFilteredSessions(user.uid, { dateFrom: today, dateTo: today, planId: filterPlanId });
      setTodaySessions(todayRes);

      try {
        const [consistencyRes, pvaRes] = await Promise.all([
          getStudyConsistency(user.uid, filterPlanId, activePlanObj?.weeklyGoalHours),
          getPlanVsActual(user.uid, filterPlanId, activePlanObj?.subjects),
        ]);
        setConsistency(consistencyRes);
        setPlanVsActual(pvaRes);
        const insightsRes = await generateInsights(user.uid, consistencyRes, pvaRes);
        setInsights(insightsRes);
      } catch {
        const weeklyTotal = weeklyRes.reduce((acc, d) => acc + Math.round(d.hours * 3600), 0);
        const goal = activePlanObj?.weeklyGoalHours || 10;
        setConsistency({
          currentStreak: 0, bestStreak: 0,
          daysStudiedThisWeek: weeklyRes.filter((d) => d.hours > 0).length,
          weeklyGoalHours: goal,
          weeklyTotalSeconds: weeklyTotal,
          weeklyProgressPercent: Math.min(100, Math.round((weeklyTotal / (goal * 3600)) * 100)),
          remainingSeconds: Math.max(0, goal * 3600 - weeklyTotal),
        });
      }
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user, filterPlanId, activePlanObj]);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData, user, activePlanId]);

  if (!user) return null;

  const weeklyHours = consistency ? consistency.weeklyTotalSeconds / 3600 : 0;
  const todayHours = summary.totalToday / 3600;
  const monthHours = summary.totalMonth / 3600;

  // Build chart data from weekly
  const chartData = weeklyData.map((d) => ({
    day: d.day,
    horas: parseFloat(d.hours.toFixed(1)),
    isToday: d.isToday,
  }));

  // AI diagnostic — best/worst subjects
  const sortedAccuracy = [...accuracyData].sort((a, b) => b.accuracy - a.accuracy);
  const bestSubject = sortedAccuracy[0] || null;
  const worstSubject = sortedAccuracy[sortedAccuracy.length - 1] || null;
  const neglectedSubjects = planVsActual.filter((p) => p.status === 'neglected');

  const avgAccuracy = accuracyData.length
    ? Math.round(accuracyData.reduce((acc, s) => acc + s.accuracy, 0) / accuracyData.length)
    : null;

  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Page header */}
      <div className="relative border-b border-white/[0.05] bg-[#0b1120]/80 px-6 py-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Executive Overview</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Olá, {user.displayName?.split(' ')[0] || 'Estudante'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activePlanObj
                ? <>
                    <span className="text-slate-600">Focando em </span>
                    <span className="font-semibold" style={{ color: activePlanObj.color }}>{activePlanObj.name}</span>
                  </>
                : 'Rastreamento estratégico e diagnóstico por IA em tempo real'}
            </p>
          </div>
          <Link
            href="/engine"
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              boxShadow: '0 4px 20px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <span className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10" />
            <Zap className="h-4 w-4" />
            Nova Sessão
          </Link>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Study Pulse + AI Insight row */}
        <div className="mb-5 grid gap-4 lg:grid-cols-3">
          {/* Study Pulse */}
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
            className="col-span-2 relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0f1825] p-6"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
          >
            {/* subtle radial glow behind chart */}
            <div className="pointer-events-none absolute -bottom-12 left-1/2 h-40 w-96 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />

            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Study Pulse</p>
                <div className="mt-2 flex items-baseline gap-3">
                  {loading ? (
                    <div className="h-12 w-40 rounded-lg shimmer" />
                  ) : (
                    <>
                      <span className="text-5xl font-bold tracking-tight text-white">
                        {Math.floor(weeklyHours)}h {Math.round((weeklyHours % 1) * 60)}m
                      </span>
                      {consistency && consistency.weeklyProgressPercent > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-sm font-semibold text-emerald-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          +{consistency.weeklyProgressPercent}%
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {consistency ? `Meta: ${consistency.weeklyGoalHours}h/semana` : 'Esta semana'}
                </p>
              </div>
              <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">Semanal</span>
            </div>

            {/* Gradient Area Chart */}
            <div className="h-36">
              {loading ? (
                <div className="h-full rounded-xl shimmer" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0', fontSize: 12 }}
                      itemStyle={{ color: '#93c5fd' }}
                      formatter={(v: unknown) => [`${v}h`, 'Horas']}
                      cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="horas"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#pulseGradient)"
                      dot={(props) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isToday: boolean } };
                        if (payload.isToday) {
                          return <circle key="today" cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="#0f1825" strokeWidth={2.5} />;
                        }
                        return <circle key="normal" cx={cx} cy={cy} r={3} fill="#3b82f6" fillOpacity={0.6} stroke="none" />;
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* AI Performance Insight */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-[#0f1825] p-5"
            style={{ background: 'linear-gradient(160deg, #0f1825 60%, #13112a)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
          >
            <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-violet-600/15 blur-2xl" />

            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-violet-600/30"
                style={{ boxShadow: '0 0 20px rgba(124,58,237,0.25)' }}
              >
                <Brain className="h-4 w-4 text-violet-300" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-violet-400">AI Performance Insight</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-16 w-full rounded-xl shimmer" />
                <div className="h-3 w-full rounded shimmer" />
                <div className="h-3 w-3/5 rounded shimmer" />
                <div className="h-8 w-full rounded-lg shimmer mt-4" />
              </div>
            ) : neglectedSubjects.length > 0 ? (
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Alerta Diagnóstico</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      Foque em{' '}
                      <span className="font-semibold text-amber-300">{neglectedSubjects[0]?.subject}</span>.
                      {neglectedSubjects[0] && (
                        <span className="text-amber-200/60">
                          {' '}Déficit de <span className="font-semibold text-amber-300">{Math.abs(neglectedSubjects[0].deviation).toFixed(0)}%</span> do planejado.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {avgAccuracy !== null && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Taxa de Retenção</span>
                        <span className={`text-xs font-bold ${
                          avgAccuracy >= 70 ? 'text-emerald-400' : avgAccuracy >= 50 ? 'text-amber-400' : 'text-red-400'
                        }`}>{avgAccuracy}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${avgAccuracy}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                          className={`h-full rounded-full ${
                            avgAccuracy >= 70 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                            : avgAccuracy >= 50 ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                            : 'bg-gradient-to-r from-red-600 to-red-400'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Prob. de Aprovação</span>
                        <span className="text-xs font-bold text-blue-400">
                          {avgAccuracy >= 70 ? 'Alta (85%+)' : avgAccuracy >= 50 ? 'Média (60%)' : 'Baixa (<40%)'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: avgAccuracy >= 70 ? '85%' : avgAccuracy >= 50 ? '60%' : '40%' }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-400"
                        />
                      </div>
                    </div>
                  </>
                )}

                <Link href="/engine"
                  className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Iniciar Sessão Focada
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10"
                  style={{ boxShadow: '0 0 30px rgba(16,185,129,0.2)' }}
                >
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-white">Tudo em ordem!</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">Continue o ritmo. Todas as matérias estão dentro do planejado.</p>
                <Link href="/engine"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Iniciar Sessão Focada
                </Link>
              </div>
            )}
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard label="Hoje" value={`${Math.floor(todayHours)}h ${Math.round((todayHours % 1) * 60)}m`}
                icon={Clock} color="blue" index={0}
                sub={todaySessions.length > 0 ? `${todaySessions.length} sessões` : 'Nenhuma sessão ainda'} />
              <StatCard label="Esta Semana" value={`${weeklyHours.toFixed(1)}h`}
                icon={TrendingUp} color="violet" index={1}
                sub={`Meta: ${consistency?.weeklyGoalHours || 0}h`}
                trend={consistency?.weeklyProgressPercent} />
              <StatCard label="Sequência" value={`${consistency?.currentStreak || 0} dias`}
                icon={Flame} color="amber" index={2}
                sub={`Melhor: ${consistency?.bestStreak || 0} dias`} />
              <StatCard label="Precisão Média" value={avgAccuracy !== null ? `${avgAccuracy}%` : '—'}
                icon={Target} color="teal" index={3}
                sub={accuracyData.length > 0 ? `${accuracyData.reduce((a, b) => a + b.totalQuestions, 0)} questões` : 'Sem dados'} />
            </>
          )}
        </div>

        {/* Charts row */}
        <div className="mb-5 grid items-stretch gap-4 lg:grid-cols-2">
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="flex">
            <div className="flex-1"><SubjectRadarChart data={subjectData} loading={loading} /></div>
          </motion.div>
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="flex">
            <div className="flex-1"><ActivityHeatmap userId={user.uid} planId={filterPlanId} refreshKey={sessionsRefreshKey} /></div>
          </motion.div>
        </div>

        {/* Bottom row: Insights + Recent Sessions */}
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
            <InsightsPanel insights={insights} loading={loading} />
          </motion.div>

          {/* Recent sessions */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0f1825] p-5"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Sessões Recentes</h3>
              </div>
              <Link href="/history" className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-300">
                Ver todas <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl shimmer" />
                ))}
              </div>
            ) : recentData.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <BarChart2 className="mb-3 h-8 w-8 text-slate-700" />
                <p className="text-sm font-medium text-slate-500">Nenhuma sessão ainda</p>
                <Link href="/engine" className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20">
                  Iniciar primeira sessão <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentData.slice(0, 5).map((session, i) => {
                  const sColor = subjectColor(session.subject);
                  return (
                    <div key={session.id || i}
                      className="group flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3.5 py-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${sColor}15`, boxShadow: `0 0 12px ${sColor}20` }}
                      >
                        <BarChart2 className="h-4 w-4" style={{ color: sColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{session.subject}</p>
                        <p className="text-xs text-slate-600">{session.date}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm font-bold text-slate-300">{formatDuration(session.duration)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Chat FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 shadow-xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110"
        title="Conversar com Coach IA"
      >
        <MessageCircle className="h-5.5 w-5.5 text-white" />
      </motion.button>

      {/* Post-session toast */}
      <PostSessionToast
        session={lastSavedSession}
        context={consistency ? {
          userName: user.displayName?.split(' ')[0] || 'Estudante',
          weeklyProgressPercent: consistency.weeklyProgressPercent,
          currentStreak: consistency.currentStreak,
          weeklyGoalHours: consistency.weeklyGoalHours,
          weeklyTotalHours: consistency.weeklyTotalSeconds / 3600,
        } : null}
        onDismiss={() => setLastSavedSession(null)}
      />

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        userName={user.displayName?.split(' ')[0] || 'Estudante'}
        consistency={consistency}
        subjectHours={subjectData}
        planVsActual={planVsActual}
        todaySessions={todaySessions}
        totalTodaySeconds={summary.totalToday}
        weeklyData={weeklyData}
        recentSessions={recentData}
      />
    </div>
  );
}
