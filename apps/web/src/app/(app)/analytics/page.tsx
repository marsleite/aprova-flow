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
} from '@/lib/firebase/sessions';
import { getAccuracyAnalytics, getSubjectDeltaMap } from '@/lib/firebase/questions';
import {
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
  TrendingDown,
  Clock,
  Target,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  TrendingUp,
} from 'lucide-react';

// RDS Components
import { KPICard, ChartCard, Badge } from '@/components';
import { fadeUp } from '@/design-system/tokens';

export default function AnalyticsPage() {
  const { user } = useAuthContext();
  const { activePlanId, activePlan: activePlanObj } = usePlanContext();
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [subjectHours, setSubjectHours] = useState<SubjectHours[]>([]);
  const [planVsActual, setPlanVsActual] = useState<PlanVsActual[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyHours[]>([]);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);
  const [accuracyAnalytics, setAccuracyAnalytics] = useState<AccuracyAnalytics | null>(null);
  const [accuracyDelta, setAccuracyDelta] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState({ totalToday: 0, totalWeek: 0, totalMonth: 0 });
  const [loading, setLoading] = useState(true);

  const filterPlanId = activePlanId || undefined;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [summaryRes, hours, weekly, cons, pva] = await Promise.all([
        getStudySummary(user.uid, filterPlanId),
        getHoursBySubject(user.uid, filterPlanId),
        getWeeklyHours(user.uid, filterPlanId),
        getStudyConsistency(user.uid, filterPlanId, activePlanObj?.weeklyGoalHours).catch(() => null),
        getPlanVsActual(user.uid, filterPlanId, activePlanObj?.subjects).catch(() => []),
      ]);
      setSummary(summaryRes);
      setSubjectHours(hours);
      setWeeklyData(weekly);
      setConsistency(cons);
      setPlanVsActual(pva);

      try {
        const analytics = await getAccuracyAnalytics(user.uid, filterPlanId);
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
  }, [user, filterPlanId, activePlanObj]);

  useEffect(() => { if (user) fetchData(); }, [fetchData, user, activePlanId]);

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
    <div className="flex flex-col gap-8 pb-10">
      {/* Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-6 border-b border-border bg-card/30 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline"><BarChart2 className="h-3 w-3 mr-1" /> Analytics</Badge>
          </div>
          <h1 className="font-sans text-am-h3 font-bold text-foreground tracking-tight mt-2">
            Inteligência de Performance
          </h1>
          <p className="text-am-caption text-muted-foreground mt-1">
            Métricas aprofundadas sobre execução e retenção
            {activePlanObj && <> — <span className="font-medium text-foreground">{activePlanObj.name}</span></>}
          </p>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* KPI Row */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Volume Mensal"
            value={loading ? '—' : `${monthHours.toFixed(0)}h`}
            icon={Clock}
            loading={loading}
            delta={{ value: parseFloat(weeklyHours.toFixed(1)), label: 'h na semana', trend: 'up' }}
          />
          <KPICard
            title="Sequência de Vitórias"
            value={loading ? '—' : `${consistency?.currentStreak || 0}d`}
            icon={Flame}
            loading={loading}
            delta={{ value: consistency?.bestStreak || 0, label: 'dias (recorde)', trend: 'up' }}
          />
          <KPICard
            title="Volume de Questões"
            value={loading ? '—' : totalQuestions.toLocaleString()}
            icon={Target}
            loading={loading}
            delta={{ value: accuracyData.reduce((a, b) => a + b.correctAnswers, 0), label: 'corretas', trend: 'up' }}
          />
          <KPICard
            title="Precisão Média Real"
            value={loading ? '—' : `${avgAccuracy}%`}
            icon={Brain}
            loading={loading}
            delta={{ value: Math.abs(avgDelta), label: `% delta vs mês`, trend: avgDelta >= 0 ? 'up' : 'down' }}
          />
        </motion.div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
            <ChartCard title="Execução Semanal" loading={loading} subtitle="Carga horária acumulada dos últimos 7 dias">
              <WeeklyBarChart data={weeklyData} loading={loading} />
            </ChartCard>
          </motion.div>
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
            <ChartCard title="Distribuição do Edital" loading={loading} subtitle="Esforço radial por disciplina base">
              <SubjectRadarChart data={subjectHours} loading={loading} />
            </ChartCard>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
            <ChartCard title="Evolução de Precisão" loading={loading} subtitle="Curva de acertos comparativa (Mês vs Anterior)">
              <AccuracyChart
                data={accuracyData}
                analytics={accuracyAnalytics}
                deltaBySubject={accuracyDelta}
                loading={loading}
              />
            </ChartCard>
          </motion.div>

          {/* Plan vs Actual Strategic Snapshot */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
            <ChartCard title="Carga Horária vs. Peso" loading={false} subtitle="Análise de desvio sobre pesos do edital">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded-md border border-am-border-subtle bg-muted animate-pulse" />)}
                </div>
              ) : planVsActual.length === 0 ? (
                <div className="py-8 text-center bg-muted rounded-md border border-am-border-subtle">
                  <p className="text-am-caption text-muted-foreground">Atribua pesos no painel de edital para acompanhar aderência.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {planVsActual.map((pva) => {
                    const isNeglected = pva.status === 'neglected';
                    return (
                      <div key={pva.subject} className="bg-card p-3 rounded-md border border-border">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isNeglected
                              ? <AlertTriangle className="h-3.5 w-3.5 text-am-warning" />
                              : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            }
                            <span className="text-am-body-sm text-foreground font-medium">{pva.subject.length > 22 ? pva.subject.substring(0, 20) + '…' : pva.subject}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-am-caption text-muted-foreground">{pva.plannedPercent}% Plan</span>
                            <span className={`text-am-caption font-bold font-mono ${isNeglected ? 'text-am-warning' : 'text-green-500'}`}>
                              {pva.deviation >= 0 ? '+' : ''}{pva.deviation.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="absolute h-full rounded-full bg-am-border-strong" style={{ width: `${pva.plannedPercent}%` }} />
                          <div
                            className={`absolute h-full rounded-full transition-all ${isNeglected ? 'bg-am-warning' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, pva.actualPercent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </motion.div>
        </div>

        {/* Benchmark Card */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
          <BenchmarkCard
            weeklyGoalHours={consistency?.weeklyGoalHours || 0}
            weeklyHours={weeklyHours}
            userId={user.uid}
            loading={loading}
          />
        </motion.div>

        {/* Actionable Report Bottom */}
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-2">
          <div className="bg-card p-6 rounded-xl border border-border shadow-am-md">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-4 w-4 text-green-500" />
              <h3 className="font-sans text-am-body font-bold text-foreground">Pilares Consistentes</h3>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-8 rounded border border-am-border-subtle bg-muted animate-pulse" />)}</div>
            ) : strongSubjects.length > 0 ? (
              <div className="space-y-2">
                {strongSubjects.slice(0, 3).map((s) => (
                  <div key={s.subject} className="flex items-center justify-between p-3 rounded-md bg-green-500/5 border border-am-success/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-am-body-sm text-foreground">{s.subject}</span>
                    </div>
                    <span className="text-am-caption font-bold text-green-500 font-mono">{s.actualPercent.toFixed(0)}% de Retenção de Base</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-am-body-sm text-muted-foreground bg-muted p-4 rounded-md italic">Carga de estudo não polarizou forças ainda.</p>
            )}
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-am-md">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-am-warning" />
              <h3 className="font-sans text-am-body font-bold text-foreground">Gargalos Preditivos</h3>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-8 rounded border border-am-border-subtle bg-muted animate-pulse" />)}</div>
            ) : criticalSubjects.length > 0 ? (
              <div className="space-y-2">
                {criticalSubjects.slice(0, 3).map((s) => (
                  <div key={s.subject} className="flex items-center justify-between p-3 rounded-md bg-am-warning/5 border border-am-warning/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-am-warning flex-shrink-0" />
                      <span className="text-am-body-sm text-foreground">{s.subject}</span>
                    </div>
                    <span className="text-am-caption font-bold text-am-warning font-mono">{Math.abs(s.deviation).toFixed(0)}% Abaixo do Pleno</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-am-body-sm text-muted-foreground bg-muted p-4 rounded-md italic">Todas as disciplinas base controladas no quadrante seguro.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
