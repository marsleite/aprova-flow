'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import {
  getStudySummary,
  getHoursBySubject,
  getWeeklyHours,
  getStudyConsistency,
  getPlanVsActual,
  generateInsights,
} from '@/lib/firebase/sessions';
import { getAccuracyAnalytics } from '@/lib/firebase/questions';
import {
  StudySummary,
  SubjectHours,
  DailyHours,
  StudyConsistency,
  PlanVsActual,
  StudyInsight,
  SubjectAccuracy,
} from '@/types';
import SubjectRadarChart from '@/components/SubjectRadarChart';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import SmartScheduleCard from '@/components/SmartScheduleCard';
import InsightsPanel from '@/components/InsightsPanel';
import PlanSelector from '@/components/PlanSelector';
import {
  TrendingUp,
  Zap,
  Target,
  Flame,
  Play,
} from 'lucide-react';

// New RDS Components
import { KPICard, ChartCard, Skeleton, Button } from '@/components';
import { fadeUp } from '@/design-system/tokens';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { plans, activePlanId, activePlan, onPlanChange } = usePlanContext();

  const [summary, setSummary] = useState<StudySummary>({ totalToday: 0, totalWeek: 0, totalMonth: 0 });
  const [subjectData, setSubjectData] = useState<SubjectHours[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyHours[]>([]);
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [planVsActual, setPlanVsActual] = useState<PlanVsActual[]>([]);
  const [insights, setInsights] = useState<StudyInsight[]>([]);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [summaryRes, subjectsRes, weeklyRes] = await Promise.all([
        getStudySummary(user.uid, activePlanId ?? undefined),
        getHoursBySubject(user.uid, activePlanId ?? undefined),
        getWeeklyHours(user.uid, activePlanId ?? undefined),
      ]);
      setSummary(summaryRes);
      setSubjectData(subjectsRes);
      setWeeklyData(weeklyRes);

      try {
        const analytics = await getAccuracyAnalytics(user.uid, activePlanId ?? undefined);
        setAccuracyData(analytics.month);
      } catch { setAccuracyData([]); }

      try {
        const [consistencyRes, pvaRes] = await Promise.all([
          getStudyConsistency(user.uid, activePlanId ?? undefined, activePlan?.weeklyGoalHours),
          getPlanVsActual(user.uid, activePlanId ?? undefined, activePlan?.subjects),
        ]);
        setConsistency(consistencyRes);
        setPlanVsActual(pvaRes);
        const insightsRes = await generateInsights(user.uid, consistencyRes, pvaRes);
        setInsights(insightsRes);
      } catch {
        const goal = activePlan?.weeklyGoalHours || 10;
        const weeklyTotal = weeklyRes.reduce((acc, d) => acc + Math.round(d.hours * 3600), 0);
        setConsistency({
          currentStreak: 0, bestStreak: 0,
          daysStudiedThisWeek: weeklyRes.filter((d) => d.hours > 0).length,
          weeklyGoalHours: goal,
          weeklyTotalSeconds: weeklyTotal,
          weeklyProgressPercent: Math.min(100, Math.round((weeklyTotal / (goal * 3600)) * 100)),
          remainingSeconds: Math.max(0, goal * 3600 - weeklyTotal),
        });
      }
    } catch { /* Error fetching dashboard */ } finally {
      setLoading(false);
    }
  }, [user, activePlanId, activePlan]);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData, user]);

  if (!user) return null;

  const avgAccuracy = accuracyData.length
    ? Math.round(accuracyData.reduce((acc, s) => acc + s.accuracy, 0) / accuracyData.length)
    : null;

  const chartData = weeklyData.map((d) => ({
    day: d.day,
    horas: parseFloat(d.hours.toFixed(1)),
    isToday: d.isToday,
  }));

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* 1. Flush Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-12 pb-6 px-8">
        <div>
          <h1 className="font-brand text-[40px] font-light text-am-text-primary tracking-tighter leading-none">
            Dashboard
          </h1>
          <p className="text-[12px] text-am-text-tertiary mt-3 font-mono uppercase tracking-widest">
            Análise Estratégica
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <Button asChild variant="primary" className="rounded-full px-6">
            <a href="/engine">
              <Play className="mr-2 h-4 w-4" fill="currentColor" /> Iniciar
            </a>
          </Button>
        </div>
      </div>

      <div className="px-8 space-y-6">
        {/* 2. KPIs principais */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="Focus Score"
            value={avgAccuracy !== null ? `${avgAccuracy}%` : '—'}
            icon={Target}
            loading={loading}
          />
          <KPICard
            title="Retenção Semanal"
            value={consistency ? `${consistency.weeklyProgressPercent}%` : '—'}
            icon={TrendingUp}
            loading={loading}
          />
          <KPICard
            title="Study Velocity"
            value={consistency ? `${consistency.currentStreak}d` : '—'}
            icon={Flame}
            loading={loading}
            delta={consistency && consistency.currentStreak > 0 ? { value: consistency.currentStreak, trend: 'up', label: 'dias seguidos' } : undefined}
          />
        </motion.div>

        {/* 3. Gráfico de Tendência (Study Pulse) & 4. Radar por Matéria */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <ChartCard title="Study Pulse" subtitle="Evolução de horas líquidas na semana atual" loading={loading} height={320}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTempo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-am-brand-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-am-brand-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-am-border-default)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-am-text-secondary)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-am-text-secondary)', fontSize: 12 }} tickFormatter={(v) => `${v}h`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-am-surface-elevated)', border: '1px solid var(--color-am-border-default)', borderRadius: 'var(--radius-am-md)' }}
                    itemStyle={{ color: 'var(--color-am-brand-primary)' }}
                  />
                  <Area type="monotone" dataKey="horas" stroke="var(--color-am-brand-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTempo)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="lg:col-span-2">
            <ChartCard title="Mapa de Foco" subtitle="Distribuição atual por matéria" loading={loading} height={320}>
              <SubjectRadarChart data={subjectData} loading={loading} />
            </ChartCard>
          </div>
        </motion.div>

        {/* 5. Heatmap de consistência */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <ChartCard title="Consistência Anual" subtitle="Mapa de calor de horas diárias">
            <ActivityHeatmap userId={user.uid} planId={activePlanId ?? undefined} refreshKey={summary.totalToday} />
          </ChartCard>
        </motion.div>

        {/* 6. Ação Recomendada & Insights (AI Block) */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
          <h3 className="font-brand text-am-h5 font-bold tracking-tight text-am-text-primary mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-am-ai-default" /> Inteligência & Estratégia
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-full">
              <SmartScheduleCard
                userId={user.uid}
                userName={user.displayName?.split(' ')[0] || 'Estudante'}
                consistency={consistency}
                planWeights={activePlan?.subjects || []}
                accuracyData={accuracyData}
              />
            </div>
            <div className="h-full">
              <InsightsPanel insights={insights} loading={loading} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
