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
import SmartScheduleCard from '@/components/SmartScheduleCard';
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
  Flame,
  Clock,
  Target,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RecoveryBanner from '@/components/RecoveryBanner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* ── Framer Motion variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const SUBJECT_COLORS = [
  '#F59768', '#3150AA', '#06b6d4', '#f59e0b',
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
  const router = useRouter();

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

  const chartData = weeklyData.map((d) => ({
    day: d.day,
    horas: parseFloat(d.hours.toFixed(1)),
    isToday: d.isToday,
  }));

  const sortedAccuracy = [...accuracyData].sort((a, b) => b.accuracy - a.accuracy);
  const bestSubject = sortedAccuracy[0] || null;
  const worstSubject = sortedAccuracy[sortedAccuracy.length - 1] || null;
  const neglectedSubjects = planVsActual.filter((p) => p.status === 'neglected');

  const avgAccuracy = accuracyData.length
    ? Math.round(accuracyData.reduce((acc, s) => acc + s.accuracy, 0) / accuracyData.length)
    : null;

  return (
    <div className="relative min-h-screen bg-[#0A0A0A]">
      {/* ── Atmospheric depth layers ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#3150AA]/8 blur-[150px]" />
        <div className="absolute top-1/3 -right-40 h-[400px] w-[400px] rounded-full bg-[#F59768]/5 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-[#3150AA]/5 blur-[120px]" />
      </div>

      {/* ── Hero Header ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative border-b border-white/[0.07] px-6 py-8"
        style={{ background: 'linear-gradient(180deg, rgba(14,17,27,0.9) 0%, rgba(10,10,10,0.95) 100%)' }}
      >
        {/* Radial mask grid */}
        <div className="rds-grid-bg absolute inset-0 pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F59768] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F59768]" style={{ boxShadow: '0 0 10px rgba(245,151,104,0.6)' }} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#666] font-mono">
                Executive Overview
              </span>
            </div>
            <h1 className="font-brand text-4xl font-bold tracking-tight text-white">
              Olá, {user.displayName?.split(' ')[0] || 'Estudante'}
            </h1>
            <p className="mt-1 text-sm text-[#666]">
              {activePlanObj
                ? <>
                  <span className="text-[#666]">Focando em </span>
                  <span className="font-semibold" style={{ color: activePlanObj.color }}>{activePlanObj.name}</span>
                </>
                : 'Rastreamento estratégico e diagnóstico por IA em tempo real'}
            </p>
          </div>
          <Link
            href="/engine"
            className="rds-btn-identity group relative flex items-center gap-2 overflow-hidden px-6 py-3 text-sm"
          >
            <Zap className="h-4 w-4" />
            Nova Sessão
          </Link>
        </div>
      </motion.div>

      {/* ── Metric Ribbon — KPI strip ── */}
      <motion.div
        custom={0} variants={fadeUp} initial="hidden" animate="show"
        className="relative grid grid-cols-3 border-b border-white/[0.07]"
      >
        {[
          {
            label: 'Focus Score',
            value: loading ? null : avgAccuracy !== null ? `${avgAccuracy}%` : '—',
            icon: Target,
            color: '#F59768',
          },
          {
            label: 'Retention Rate',
            value: loading ? null : consistency ? `${consistency.weeklyProgressPercent}%` : '—',
            icon: TrendingUp,
            color: '#3150AA',
          },
          {
            label: 'Study Velocity',
            value: loading ? null : `${consistency?.currentStreak ?? 0}d`,
            icon: Flame,
            color: (() => {
              const s = consistency?.currentStreak ?? 0;
              if (s >= 7) return '#ef4444';
              if (s >= 3) return '#F59768';
              if (s >= 1) return '#f59e0b';
              return '#666';
            })(),
            streak: consistency?.currentStreak ?? 0,
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`rds-glass flex items-center gap-4 px-6 py-5 ${i < 2 ? 'border-r border-white/[0.07]' : ''}`}
            style={{ background: i === 0 ? 'rgba(14,17,27,0.4)' : i === 1 ? 'rgba(14,17,27,0.3)' : 'rgba(14,17,27,0.2)' }}
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${kpi.color}15`, boxShadow: `0 0 20px ${kpi.color}10` }}
            >
              <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#666] font-mono">{kpi.label}</span>
              {loading ? (
                <div className="mt-1 h-7 w-16 rounded-lg shimmer" />
              ) : (
                <div className="flex items-center gap-1.5">
                  {'streak' in kpi && (kpi as { streak: number }).streak > 0 && (
                    <Flame className={`h-4 w-4 ${(kpi as { streak: number }).streak >= 7 ? 'animate-pulse' : ''}`} style={{ color: kpi.color }} />
                  )}
                  <span className="text-2xl font-bold tracking-tight text-white">{kpi.value}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Content Area ── */}
      <div className="relative px-6 py-6">
        <RecoveryBanner
          consistency={consistency}
          onActivateRecovery={() => router.push('/engine?recovery=true')}
        />

        {/* Section header */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show"
          className="mb-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-[#F59768] to-transparent" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#666] font-mono">
              Análise de Performance
            </h2>
            <div className="h-px w-8 bg-gradient-to-l from-[#3150AA] to-transparent" />
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1.5 text-xs text-[#666] font-mono">
              <Calendar className="h-3 w-3" />
              Esta semana
            </span>
            <Link href="/analytics"
              className="rds-btn-identity flex items-center gap-1.5 px-4 py-1.5 text-xs"
            >
              <BarChart2 className="h-3 w-3" />
              Analytics
            </Link>
          </div>
        </motion.div>

        {/* ── Row 1: Study Pulse (3/5) + Radar (2/5) ── */}
        <div className="mb-5 grid gap-5 lg:grid-cols-5">
          {/* Study Pulse chart */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show"
            className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
            style={{
              height: 320,
              background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Atmospheric glow */}
            <div className="pointer-events-none absolute -bottom-16 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full bg-[#3150AA]/8 blur-[80px]" />
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[#F59768]/6 blur-[60px]" />

            <div className="relative mb-4 flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#3150AA]" style={{ boxShadow: '0 0 8px rgba(49,80,170,0.5)' }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666] font-mono">Study Pulse</p>
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  {loading ? (
                    <div className="h-10 w-36 rounded-lg shimmer" />
                  ) : (
                    <>
                      <span className="font-brand text-4xl font-bold tracking-tight text-white">
                        {Math.floor(weeklyHours)}h {Math.round((weeklyHours % 1) * 60)}m
                      </span>
                      {consistency && consistency.weeklyProgressPercent > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                          <TrendingUp className="h-3 w-3" />
                          +{consistency.weeklyProgressPercent}%
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#666] font-mono">
                  {consistency ? `Meta: ${consistency.weeklyGoalHours}h/semana` : 'Esta semana'}
                </p>
              </div>
              <span className="rounded-full border border-[#F59768]/20 bg-[#F59768]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F59768] font-mono"
                style={{ boxShadow: '0 0 12px rgba(245,151,104,0.1)' }}
              >Semanal</span>
            </div>

            <div className="relative flex-1 min-h-0" style={{ height: 'calc(100% - 100px)' }}>
              {loading ? (
                <div className="h-full rounded-xl shimmer" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                    <defs>
                      <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3150AA" stopOpacity={0.5} />
                        <stop offset="50%" stopColor="#3150AA" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#3150AA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#444', fontSize: 9, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#0E111B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      itemStyle={{ color: '#F59768' }}
                      formatter={(v: unknown) => [`${v}h`, 'Horas']}
                      cursor={{ stroke: 'rgba(245,151,104,0.1)', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="horas"
                      stroke="#3150AA"
                      strokeWidth={2.5}
                      fill="url(#pulseGradient)"
                      dot={(props) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isToday: boolean } };
                        if (payload.isToday) {
                          return (
                            <g key="today">
                              <circle cx={cx} cy={cy} r={8} fill="#F59768" fillOpacity={0.15} stroke="none" />
                              <circle cx={cx} cy={cy} r={5} fill="#F59768" stroke="#0E111B" strokeWidth={2.5} />
                            </g>
                          );
                        }
                        return <circle key="normal" cx={cx} cy={cy} r={2.5} fill="#3150AA" fillOpacity={0.6} stroke="none" />;
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Radar */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show"
            className="lg:col-span-2"
            style={{ height: 320 }}
          >
            <SubjectRadarChart data={subjectData} loading={loading} />
          </motion.div>
        </div>

        {/* ── Row 2: Diagnostic (3/5) + Heatmap (2/5) ── */}
        <div className="mb-5 grid gap-5 lg:grid-cols-5">
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show"
            className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
            style={{
              background: 'linear-gradient(160deg, #0E111B 60%, #120F1A)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Corner glow */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#F59768]/8 blur-[60px]" />

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'var(--identity-grad)', boxShadow: '0 0 20px rgba(245,151,104,0.15)' }}
              >
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-brand text-sm font-bold text-white">Diagnóstico Estratégico</p>
                <p className="text-[10px] text-[#666] font-mono uppercase tracking-wider">Powered by AI</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-5 w-24 rounded shimmer" />
                <div className="flex gap-3">
                  <div className="h-20 flex-1 rounded-xl shimmer" />
                  <div className="h-20 flex-1 rounded-xl shimmer" />
                  <div className="h-20 w-28 rounded-xl shimmer" />
                </div>
              </div>
            ) : neglectedSubjects.length > 0 ? (
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666] font-mono">Action Items</p>
                <div className="flex gap-3">
                  {neglectedSubjects.slice(0, 2).map((s) => (
                    <div key={s.subject} className="flex-1 rounded-xl border border-white/[0.10] bg-white/[0.03] p-4 transition-all hover:bg-white/[0.05]">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-[#F59768]/30 bg-[#F59768]/10 flex-shrink-0">
                          <AlertTriangle className="h-3 w-3 text-[#F59768]" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{s.subject}</p>
                          <p className="text-[10px] text-[#666] font-mono">
                            Confiança: {(100 - Math.abs(s.deviation)).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {avgAccuracy !== null && (
                    <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border border-[#F59768]/20 px-6 py-3"
                      style={{ background: 'linear-gradient(135deg, rgba(49,80,170,0.15), rgba(245,151,104,0.1))', boxShadow: '0 0 24px rgba(245,151,104,0.05)' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#F59768] font-mono">Confidence</p>
                      <span className="font-brand text-3xl font-bold text-white">{avgAccuracy}%</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#666]">
                    Priorize <span className="font-semibold text-[#F59768]">{neglectedSubjects[0]?.subject}</span>
                    {' '}— déficit de {Math.abs(neglectedSubjects[0].deviation).toFixed(0)}%
                  </p>
                  <Link href="/engine"
                    className="rds-btn-identity flex items-center gap-1.5 px-4 py-2 text-xs"
                  >
                    <Zap className="h-3 w-3" />
                    Sessão Focada
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666] font-mono">Status</p>
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-brand text-sm font-bold text-white">Performance Equilibrada</p>
                      <p className="text-[11px] text-[#666] font-mono">Todas as matérias dentro do planejado.</p>
                    </div>
                  </div>

                  {avgAccuracy !== null && (
                    <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border border-emerald-500/20 px-6 py-3"
                      style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(49,80,170,0.05))' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">Confidence</p>
                      <span className="font-brand text-3xl font-bold text-emerald-400">{avgAccuracy}%</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end">
                  <Link href="/engine"
                    className="rds-btn-identity flex items-center gap-1.5 px-4 py-2 text-xs"
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

        {/* ── Row 3: Insights + SmartSchedule + Recent Sessions ── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show" className="h-full">
              <InsightsPanel insights={insights} loading={loading} />
            </motion.div>

            <motion.div custom={6.5} variants={fadeUp} initial="hidden" animate="show">
              <SmartScheduleCard
                userId={user.uid}
                userName={user.displayName?.split(' ')[0] || 'Estudante'}
                consistency={consistency}
                planWeights={activePlanObj?.subjects || []}
                accuracyData={accuracyData}
              />
            </motion.div>
          </div>

          {/* Recent sessions */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
            style={{
              background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3150AA]/15"
                  style={{ boxShadow: '0 0 16px rgba(49,80,170,0.1)' }}
                >
                  <Clock className="h-4 w-4 text-[#F59768]" />
                </div>
                <h3 className="font-brand text-sm font-bold text-white">Sessões Recentes</h3>
              </div>
              <Link href="/history" className="flex items-center gap-1 rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1.5 text-xs text-[#666] transition-colors hover:text-slate-300 font-mono">
                Ver todas <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl shimmer" />
                ))}
              </div>
            ) : recentData.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3150AA]/10 mb-4"
                  style={{ boxShadow: '0 0 24px rgba(49,80,170,0.1)' }}
                >
                  <BarChart2 className="h-7 w-7 text-[#666]" />
                </div>
                <p className="font-brand text-sm font-medium text-[#666]">Nenhuma sessão ainda</p>
                <Link href="/engine" className="rds-btn-identity mt-4 flex items-center gap-1.5 px-4 py-2 text-xs">
                  Iniciar primeira sessão <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentData.slice(0, 5).map((session, i) => {
                  const sColor = subjectColor(session.subject);
                  return (
                    <motion.div key={session.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-all hover:bg-white/[0.04] hover:border-white/[0.10]"
                    >
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${sColor}15`, boxShadow: `0 0 16px ${sColor}15` }}
                      >
                        <BarChart2 className="h-4 w-4" style={{ color: sColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{session.subject}</p>
                        <p className="text-[10px] text-[#666] font-mono">{session.date}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm font-bold text-white font-mono">{formatDuration(session.duration)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Chat FAB ── */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all hover:-translate-y-1 hover:shadow-[#F59768]/20"
        style={{
          background: 'var(--identity-grad)',
          boxShadow: '0 8px 30px rgba(245,151,104,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
        title="Conversar com Coach IA"
      >
        <MessageCircle className="h-6 w-6 text-white" />
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
