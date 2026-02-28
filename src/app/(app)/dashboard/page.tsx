'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
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
import {
  deduplicateDefaultPlans,
  getActivePlan,
  migrateToMultiPlan,
  setActivePlan,
} from '@/lib/firebase/plans';
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
  StudyPlanEdital,
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
  LineChart,
  Line,
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
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500/20' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', ring: 'ring-violet-500/20' },
    teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', ring: 'ring-teal-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', ring: 'ring-amber-500/20' },
  };
  const c = colors[color];

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.bg} ring-1 ${c.ring}`}>
          <Icon className={`h-4.5 w-4.5 ${c.text}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-600">{sub}</p>}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5">
      <div className="mb-3 h-9 w-9 rounded-lg shimmer" />
      <div className="h-7 w-20 rounded shimmer mb-1" />
      <div className="h-3 w-28 rounded shimmer" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthContext();
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
  const [plans, setPlans] = useState<StudyPlanEdital[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const migrated = useRef(false);

  const activePlanObj = plans.find((p) => p.id === activePlanId) || null;
  const filterPlanId = activePlanId || undefined;

  const loadPlans = useCallback(async () => {
    if (!user) return;
    try {
      if (!migrated.current) {
        await migrateToMultiPlan(user.uid);
        migrated.current = true;
      }
      const allPlans = await deduplicateDefaultPlans(user.uid);
      const active = await getActivePlan(user.uid);
      setPlans(allPlans);
      setActivePlanId(active || null);
    } catch { /* */ }
  }, [user]);

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

  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => {
    if (plans.length > 0 || migrated.current) fetchData();
  }, [fetchData, plans.length]);

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
      <div className="border-b border-white/[0.05] bg-[#0b1120]/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="status-dot h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Executive Overview</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Olá, {user.displayName?.split(' ')[0] || 'Estudante'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {activePlanObj
                ? <>Focando em <span className="font-medium" style={{ color: activePlanObj.color }}>{activePlanObj.name}</span></>
                : 'Rastreamento estratégico em tempo real'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/engine"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30"
            >
              <Zap className="h-4 w-4" />
              Nova Sessão
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Study Pulse + AI Insight row */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {/* Study Pulse */}
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
            className="col-span-2 rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Study Pulse</p>
                <div className="mt-1 flex items-baseline gap-2">
                  {loading ? (
                    <div className="h-9 w-32 rounded shimmer" />
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-white">
                        {Math.floor(weeklyHours)}h {Math.round((weeklyHours % 1) * 60)}m
                      </span>
                      {consistency && consistency.weeklyProgressPercent > 0 && (
                        <span className="flex items-center gap-0.5 text-sm font-medium text-emerald-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {consistency.weeklyProgressPercent}% da meta
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-600">Esta semana</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-300">Semanal</span>
              </div>
            </div>

            {/* Weekly chart */}
            <div className="h-32">
              {loading ? (
                <div className="h-full rounded-lg shimmer" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: '#0f1825', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e2e8f0' }}
                      itemStyle={{ color: '#93c5fd' }}
                      formatter={(v: unknown) => [`${v}h`, 'Horas']}
                    />
                    <Line
                      type="monotone"
                      dataKey="horas"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isToday: boolean } };
                        if (payload.isToday) {
                          return <circle key="today" cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="#1e3a5f" strokeWidth={2} />;
                        }
                        return <circle key="normal" cx={cx} cy={cy} r={2.5} fill="#3b82f6" fillOpacity={0.5} stroke="none" />;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* AI Performance Insight */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show"
            className="rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-600/10 to-transparent p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
                <Brain className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">AI Performance Insight</span>
            </div>

            {loading ? (
              <div className="space-y-2">
                <div className="h-3 w-full rounded shimmer" />
                <div className="h-3 w-4/5 rounded shimmer" />
                <div className="h-3 w-3/5 rounded shimmer" />
              </div>
            ) : neglectedSubjects.length > 0 ? (
              <>
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-amber-300">Alerta Diagnóstico</p>
                    <p className="mt-0.5 text-xs text-amber-200/70">
                      <span className="font-medium text-amber-300">{neglectedSubjects[0]?.subject}</span> precisa de atenção.
                      {neglectedSubjects[0] && ` Déficit de ${Math.abs(neglectedSubjects[0].deviation).toFixed(0)}% do planejado.`}
                    </p>
                  </div>
                </div>
                {avgAccuracy !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Taxa de retenção</span>
                      <span className={`font-medium ${avgAccuracy >= 70 ? 'text-emerald-400' : avgAccuracy >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {avgAccuracy}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={`h-full rounded-full transition-all ${avgAccuracy >= 70 ? 'bg-emerald-500' : avgAccuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${avgAccuracy}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600">
                      {avgAccuracy >= 70 ? 'Excelente performance' : avgAccuracy >= 50 ? 'Performance moderada' : 'Precisa melhorar'}
                    </p>
                  </div>
                )}
                <Link href="/engine" className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600/20 py-2 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-600/30">
                  <Zap className="h-3.5 w-3.5" />
                  Iniciar Sessão Focada
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-sm font-medium text-white">Tudo em ordem!</p>
                <p className="mt-1 text-xs text-slate-500">Continue o ritmo. Todas as matérias estão dentro do planejado.</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Radar */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
            <SubjectRadarChart data={subjectData} loading={loading} />
          </motion.div>

          {/* Activity Heatmap */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
            <ActivityHeatmap userId={user.uid} planId={filterPlanId} refreshKey={sessionsRefreshKey} />
          </motion.div>
        </div>

        {/* Bottom row: Insights + Recent Sessions */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Insights */}
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
            <InsightsPanel insights={insights} loading={loading} />
          </motion.div>

          {/* Recent sessions */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show"
            className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-white">Sessões Recentes</h3>
              </div>
              <Link href="/history" className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors">
                Ver todas <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg shimmer" />
                ))}
              </div>
            ) : recentData.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-600">Nenhuma sessão ainda</p>
                <Link href="/engine" className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Iniciar primeira sessão <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentData.slice(0, 5).map((session, i) => (
                  <div key={session.id || i} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{session.subject}</p>
                      <p className="text-xs text-slate-600">{session.date}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-medium text-slate-400">
                      {formatDuration(session.duration)}
                    </span>
                  </div>
                ))}
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
