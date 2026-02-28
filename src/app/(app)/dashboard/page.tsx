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

      {/* ── Metric Ribbon ── */}
      <motion.div
        custom={0} variants={fadeUp} initial="hidden" animate="show"
        className="grid grid-cols-3 border-b border-white/[0.06] bg-[#0b1120]/60 backdrop-blur-sm"
      >
        {[
          {
            label: 'Focus Score',
            value: loading ? null : avgAccuracy !== null ? `${avgAccuracy}%` : '—',
            color: '#3b82f6',
          },
          {
            label: 'Retention Rate',
            value: loading ? null : consistency ? `${consistency.weeklyProgressPercent}%` : '—',
            color: '#8b5cf6',
          },
          {
            label: 'Study Velocity',
            value: loading ? null : `${consistency?.currentStreak ?? 0}d`,
            color: '#f59e0b',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-6 py-4 ${i < 2 ? 'border-r border-white/[0.08]' : ''}`}
          >
            <span className="text-sm font-medium text-slate-400">{kpi.label}</span>
            {loading ? (
              <div className="h-8 w-16 rounded-lg shimmer" />
            ) : (
              <span className="text-2xl font-bold tracking-tight" style={{ color: kpi.color }}>{kpi.value}</span>
            )}
          </div>
        ))}
      </motion.div>

      <div className="px-6 py-5">
        {/* Section title */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show"
          className="mb-5 flex items-center justify-between"
        >
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Análise de Performance Executiva
          </h2>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-slate-500">
              <Calendar className="h-3 w-3" />
              Esta semana
            </span>
            <Link href="/analytics"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              <BarChart2 className="h-3 w-3" />
              Analytics
            </Link>
          </div>
        </motion.div>

        {/* ── Row 1: Study Pulse (3/5) + Radar (2/5) — both fixed at 300px ── */}
        <div className="mb-4 grid gap-4 lg:grid-cols-5">
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show"
            className="lg:col-span-3 flex flex-col relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0f1825] p-5"
            style={{ height: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
          >
            <div className="pointer-events-none absolute -bottom-10 left-1/2 h-40 w-[110%] -translate-x-1/2 rounded-full bg-blue-600/8 blur-3xl" />

            <div className="mb-3 flex items-start justify-between shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Study Pulse</p>
                <div className="mt-1 flex items-baseline gap-2.5">
                  {loading ? (
                    <div className="h-9 w-32 rounded-lg shimmer" />
                  ) : (
                    <>
                      <span className="text-3xl font-bold tracking-tight text-white">
                        {Math.floor(weeklyHours)}h {Math.round((weeklyHours % 1) * 60)}m
                      </span>
                      {consistency && consistency.weeklyProgressPercent > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
                          <TrendingUp className="h-3 w-3" />
                          +{consistency.weeklyProgressPercent}%
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {consistency ? `Meta: ${consistency.weeklyGoalHours}h/semana` : 'Esta semana'}
                </p>
              </div>
              <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">Semanal</span>
            </div>

            {/* Chart fills remaining height via flex-1 */}
            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="h-full rounded-xl shimmer" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                    <defs>
                      <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                        <stop offset="75%" stopColor="#3b82f6" stopOpacity={0.04} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0', fontSize: 12 }}
                      itemStyle={{ color: '#93c5fd' }}
                      formatter={(v: unknown) => [`${v}h`, 'Horas']}
                      cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
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
                        return <circle key="normal" cx={cx} cy={cy} r={2.5} fill="#3b82f6" fillOpacity={0.5} stroke="none" />;
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Radar — same fixed height so both cards are equal */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show"
            className="lg:col-span-2"
            style={{ height: 300 }}
          >
            <SubjectRadarChart data={subjectData} loading={loading} />
          </motion.div>
        </div>

        {/* ── Row 2: Diagnostic (3/5) + Heatmap (2/5) — items-stretch so both match height ── */}
        <div className="mb-4 grid gap-4 lg:grid-cols-5">
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show"
            className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-white/[0.07] p-5"
            style={{ background: 'linear-gradient(160deg, #0f1825 60%, #110f1e)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
          >
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl" />

            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/25 to-violet-600/25"
                style={{ boxShadow: '0 0 16px rgba(124,58,237,0.2)' }}
              >
                <Brain className="h-4 w-4 text-violet-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Diagnóstico Estratégico</p>
                <p className="text-[10px] text-slate-600">Baseado nos seus dados de estudo</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-5 w-24 rounded shimmer" />
                <div className="flex gap-3">
                  <div className="h-16 flex-1 rounded-xl shimmer" />
                  <div className="h-16 flex-1 rounded-xl shimmer" />
                  <div className="h-16 w-28 rounded-xl shimmer" />
                </div>
                <div className="h-3 w-3/4 rounded shimmer" />
              </div>
            ) : neglectedSubjects.length > 0 ? (
              <div className="space-y-3">
                {/* Section label */}
                <p className="text-xs font-bold text-slate-400">Action Items</p>

                {/* Horizontal cards row */}
                <div className="flex gap-2.5">
                  {/* Action item cards */}
                  {neglectedSubjects.slice(0, 2).map((s) => (
                    <div key={s.subject} className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border border-white/20" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{s.subject}</p>
                          <p className="text-[10px] text-slate-600">
                            Confiança: {(100 - Math.abs(s.deviation)).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Confidence Score widget */}
                  {avgAccuracy !== null && (
                    <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border border-blue-500/20 px-5 py-2"
                      style={{ background: 'linear-gradient(135deg, #1e3a8a30, #1e1b4b30)' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Confidence Score</p>
                      <p className="text-[10px] text-slate-600">Overview</p>
                      <span className="text-2xl font-bold text-blue-400">{avgAccuracy}%</span>
                    </div>
                  )}
                </div>

                {/* Insight line + CTA */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Priorize <span className="font-semibold text-amber-300">{neglectedSubjects[0]?.subject}</span>
                    {' '}— déficit de {Math.abs(neglectedSubjects[0].deviation).toFixed(0)}%
                  </p>
                  <Link href="/engine"
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                  >
                    <Zap className="h-3 w-3" />
                    Sessão Focada
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Section label */}
                <p className="text-xs font-bold text-slate-400">Status</p>

                {/* Horizontal row: all-good card + confidence score */}
                <div className="flex gap-2.5">
                  <div className="flex-1 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">Performance Equilibrada</p>
                      <p className="text-[11px] text-slate-500">Todas as matérias dentro do planejado.</p>
                    </div>
                  </div>

                  {avgAccuracy !== null && (
                    <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border border-emerald-500/20 px-5 py-2"
                      style={{ background: 'linear-gradient(135deg, #064e3b30, #1e1b4b20)' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Confidence Score</p>
                      <p className="text-[10px] text-slate-600">Overview</p>
                      <span className="text-2xl font-bold text-emerald-400">{avgAccuracy}%</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="flex items-center justify-end">
                  <Link href="/engine"
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                  >
                    <Zap className="h-3 w-3" />
                    Nova Sessão
                  </Link>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2 h-full">
            <ActivityHeatmap userId={user.uid} planId={filterPlanId} refreshKey={sessionsRefreshKey} />
          </motion.div>
        </div>

        {/* ── Row 3: Insights + Recent Sessions ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show" className="h-full">
            <InsightsPanel insights={insights} loading={loading} />
          </motion.div>

          {/* Recent sessions */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show"
            className="h-full relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0f1825] p-5"
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
