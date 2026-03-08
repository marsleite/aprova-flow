'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import {
  setActivePlan,
  deleteStudyPlan,
} from '@/lib/firebase/plans';
import {
  getStudySummary,
  getPlanVsActual,
  getStudyConsistency,
  getFilteredSessions,
  generateInsights
} from '@/lib/firebase/sessions';
import { getAccuracyAnalytics } from '@/lib/firebase/questions';
import { getTodayISO, formatDuration } from '@/lib/utils';
import { StudyPlanEdital, PlanVsActual, StudyInsight, StudySession, StudyConsistency, SubjectAccuracy } from '@/types';
import PlanManager from '@/components/PlanManager';
import { useEntitlements } from '@/hooks/useEntitlements';
import { canCreateMorePlans } from '@/lib/entitlements';
import {
  CalendarDays,
  Plus,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  MoreVertical,
  BarChart2,
  Zap,
  Play,
  Calendar,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

// RDS Components
import { KPICard, ChartCard, Skeleton, Button, Badge } from '@/components';
import { fadeUp } from '@/design-system/tokens';

interface PlanStats {
  planId: string;
  totalHoursMonth: number;
  accuracy: number | null;
  progress: number;
  planVsActual: PlanVsActual[];
  lastStudied: string | null;
  urgency: 'critical' | 'medium' | 'low';
}

const URGENCY_CONFIG = {
  critical: { label: 'CRÍTICO', bg: 'bg-am-error/10', text: 'text-am-error', border: 'border-am-error/20' },
  medium: { label: 'MÉDIO', bg: 'bg-am-warning/10', text: 'text-am-warning', border: 'border-am-warning/20' },
  low: { label: 'BAIXO', bg: 'bg-am-success/10', text: 'text-am-success', border: 'border-am-success/20' },
};

export default function PlannerPage() {
  const { user } = useAuthContext();
  const { planTier, capabilities } = useEntitlements(user?.uid, user?.email);
  const { plans, activePlanId, activePlan, onPlanChange } = usePlanContext();

  const [planStats, setPlanStats] = useState<PlanStats[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planManagerOpen, setPlanManagerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlanEdital | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Daily Data
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([]);
  const [insights, setInsights] = useState<StudyInsight[]>([]);
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);

  const canCreate = canCreateMorePlans(planTier, plans.length);

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(activePlanId || plans[0].id || null);
    }
  }, [plans, activePlanId, selectedPlanId]);

  const loadData = useCallback(async () => {
    if (!user || plans.length === 0) return;
    setLoading(true);
    try {
      const today = getTodayISO();

      // Load current plan's specific daily info
      const [todayRes, consRes, pvaRes, accRes] = await Promise.all([
        getFilteredSessions(user.uid, { dateFrom: today, dateTo: today, planId: activePlanId ?? undefined }),
        getStudyConsistency(user.uid, activePlanId ?? undefined, activePlan?.weeklyGoalHours),
        getPlanVsActual(user.uid, activePlanId ?? undefined, activePlan?.subjects),
        getAccuracyAnalytics(user.uid, activePlanId ?? undefined).catch(() => ({ month: [] }))
      ]);

      setTodaySessions(todayRes);
      setConsistency(consRes);
      setAccuracyData(accRes.month || []);

      const insightsRes = await generateInsights(user.uid, consRes, pvaRes);
      setInsights(insightsRes);

      // Load all plans stats for the manager
      const statsArr: PlanStats[] = await Promise.all(
        plans.map(async (plan) => {
          try {
            const [summary, pva, cons] = await Promise.all([
              getStudySummary(user.uid, plan.id),
              getPlanVsActual(user.uid, plan.id, plan.subjects),
              getStudyConsistency(user.uid, plan.id),
            ]);
            const totalHours = summary.totalMonth / 3600;
            const neglectedCount = pva.filter((p) => p.status === 'neglected').length;
            const urgency: 'critical' | 'medium' | 'low' =
              cons.currentStreak === 0 && totalHours < 2 ? 'critical'
                : neglectedCount > 1 ? 'medium'
                  : 'low';
            return {
              planId: plan.id || '',
              totalHoursMonth: totalHours,
              accuracy: null,
              progress: Math.min(100, Math.round((summary.totalMonth / (plan.weeklyGoalHours * 4 * 3600)) * 100)),
              planVsActual: pva,
              lastStudied: null,
              urgency,
            };
          } catch {
            return { planId: plan.id || '', totalHoursMonth: 0, accuracy: null, progress: 0, planVsActual: [], lastStudied: null, urgency: 'low' as const };
          }
        })
      );
      setPlanStats(statsArr);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user, plans, activePlanId, activePlan]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectActive = async (planId: string) => {
    if (!user) return;
    await setActivePlan(user.uid, planId);
    onPlanChange(planId);
  };

  const handleDelete = async (planId: string) => {
    if (!user || !confirm('Excluir este edital? Esta ação é irreversível.')) return;
    await deleteStudyPlan(planId);
    setOpenMenuId(null);
    await loadData();
  };

  if (!user) return null;

  // Compute Daily Recommendations
  const activeStats = planStats.find(s => s.planId === activePlanId);
  const neglectedSubjects = activeStats?.planVsActual.filter(p => p.status === 'neglected').sort((a, b) => a.deviation - b.deviation) || [];
  const nextBestSubject = neglectedSubjects[0]?.subject || activePlan?.subjects?.[0]?.subject || 'Revisão Geral';

  const todayTotalHours = todaySessions.reduce((acc, s) => acc + s.duration, 0) / 3600;

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Flush Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-12 pb-6 px-8">
        <div>
          <h1 className="font-brand text-[40px] font-light text-am-text-primary tracking-tighter leading-none">
            Agenda Estratégica
          </h1>
          <p className="text-[12px] text-am-text-tertiary mt-3 font-mono uppercase tracking-widest">
            Centro de decisão imediata e planejamento
          </p>
        </div>
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <Button onClick={() => canCreate ? (setEditingPlan(null), setPlanManagerOpen(true)) : null} disabled={!canCreate} variant="secondary" className="rounded-full">
            <Plus className="h-4 w-4 mr-2" /> Novo Edital
          </Button>
        </div>
      </div>

      <div className="px-8 space-y-6">
        {/* ROW 1: Hero Próxima Sessão (AI) & Agenda do Dia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Hero: Next Best Session */}
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="h-full">
            <div className="h-full rounded-am-xl bg-am-surface border border-am-ai-border/40 shadow-am-md hover:shadow-am-lg transition-transform duration-300 hover:-translate-y-1 p-8 relative overflow-hidden flex flex-col justify-between" style={{ background: 'linear-gradient(145deg, var(--color-am-surface) 0%, rgba(139,92,246,0.05) 100%)' }}>
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Zap className="h-32 w-32 text-am-ai-default" />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Badge variant="ai" className="shadow-[0_0_12px_var(--color-am-ai-glow)]"><Sparkles className="h-3 w-3 mr-1" /> IA MATCH</Badge>
                  <span className="text-am-caption font-semibold uppercase tracking-wider text-am-text-secondary font-mono">Próxima melhor sessão</span>
                </div>

                <h2 className="font-brand text-4xl font-bold tracking-tight text-am-text-primary mb-3">
                  {loading ? <Skeleton className="h-10 w-48" /> : nextBestSubject}
                </h2>

                <p className="text-am-body-sm text-am-text-secondary max-w-md leading-relaxed">
                  Baseado no seu mapa de calor e edital ativo, você está com um déficit nesta matéria. Uma sessão agora maximizará sua curva de retenção.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Button asChild variant="premium" size="lg" className="shadow-[0_4px_24px_var(--color-am-ai-glow)]">
                  <a href="/engine">
                    <Play className="mr-2 h-5 w-5" /> Iniciar Otimização
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Agenda do Dia */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="h-full">
            <ChartCard title="Agenda do Dia" subtitle={loading ? 'Carregando...' : `${todayTotalHours.toFixed(1)}h estudadas hoje`} loading={loading}>
              <div className="flex flex-col h-full justify-between">
                {todaySessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 flex-1">
                    <Calendar className="h-10 w-10 text-am-border-strong mb-4" />
                    <p className="text-am-body-sm text-am-text-secondary">Nenhuma sessão registrada hoje.</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                    {todaySessions.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-am-md bg-am-surface-subtle border border-am-border-default hover:bg-am-surface-elevated transition-colors cursor-default">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-am-sm bg-am-brand-primary/10 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-am-brand-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-am-body-sm text-am-text-primary">{t.subject}</p>
                            <p className="text-am-caption text-am-text-tertiary">{new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <span className="font-mono text-am-body-sm font-bold text-am-text-primary">{formatDuration(t.duration)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-4 border-t border-am-border-default mt-4">
                  <Button asChild variant="secondary" className="w-full">
                    <Link href="/history">Ver Histórico Completo</Link>
                  </Button>
                </div>
              </div>
            </ChartCard>
          </motion.div>
        </div>

        {/* ROW 2: Backlog & IA Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Backlog Recomendado */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
            <ChartCard title="Backlog Estratégico" subtitle="Matérias atrasadas em relação ao edital ativo" loading={loading}>
              {neglectedSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="h-12 w-12 rounded-full bg-am-success/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-am-success" />
                  </div>
                  <p className="text-am-body-sm text-am-text-secondary font-medium">Belo trabalho!</p>
                  <p className="text-am-caption text-am-text-tertiary">Nenhuma matéria atrasada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {neglectedSubjects.slice(0, 4).map((sub, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-am-md border border-am-warning/20 bg-am-warning/5 hover:border-am-warning/40 transition-colors">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-am-warning" />
                      <div className="flex-1">
                        <p className="font-semibold text-am-body-sm text-am-text-primary">{sub.subject}</p>
                        <p className="text-am-caption text-am-text-secondary">{Math.abs(sub.deviation).toFixed(0)}% abaixo da meta ideal</p>
                      </div>
                      <Button asChild variant="secondary" size="sm">
                        <a href={`/engine?subject=${encodeURIComponent(sub.subject)}`}>Focar</a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </motion.div>

          {/* AI Diagnóstico */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
            <ChartCard title="Insight de Otimização" subtitle="Análise em tempo real do seu desempenho" loading={loading}>
              <div className="flex flex-col h-full justify-center">
                {insights.length > 0 ? (
                  <div className="space-y-4">
                    {insights.slice(0, 2).map((insight, idx) => (
                      <div key={idx} className="p-4 rounded-am-lg bg-am-surface border border-am-ai-border/40 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-am-ai-default" />
                        <div className="flex items-start gap-3">
                          <Zap className="h-4 w-4 mt-1 text-am-ai-default" />
                          <div>
                            <p className="text-am-body-sm text-am-text-primary font-medium mb-1">{insight.type === 'celebrate' ? 'Consistência' : 'Alerta de Retenção'}</p>
                            <p className="text-am-body-sm text-am-text-secondary leading-relaxed">{insight.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-am-text-secondary">Conclua mais sessões para gerar insights robustos de IA.</p>
                )}
              </div>
            </ChartCard>
          </motion.div>
        </div>

        {/* ROW 3: Planner Manager (Legacy Table) */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
          <h3 className="font-brand text-am-h5 font-bold tracking-tight text-am-text-primary mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-am-brand-primary" /> Gerenciamento de Editais
          </h3>
          <div className="rounded-am-xl border border-am-border-default bg-am-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-am-border-default px-5 py-4 bg-am-surface-subtle">
              <div className="flex gap-2">
                <Badge variant="success">Em Dia</Badge>
                <Badge variant="warning">Atenção</Badge>
              </div>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-am-lg" />)}
              </div>
            ) : plans.length === 0 ? (
              <div className="py-12 text-center px-6">
                <CalendarDays className="mx-auto mb-3 h-8 w-8 text-am-text-tertiary" />
                <p className="text-sm font-medium text-am-text-secondary">Nenhum edital configurado</p>
                <button
                  onClick={() => canCreate ? (setEditingPlan(null), setPlanManagerOpen(true)) : null}
                  className="mt-4 inline-flex items-center gap-2 rounded-am-lg bg-am-brand-primary/10 px-4 py-2 text-sm text-am-brand-primary font-semibold transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Criar primeiro edital
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_80px_100px_80px_80px] gap-4 border-b border-am-border-default px-5 py-2.5">
                  {['Edital / Concurso', 'Progresso', 'Último Mês', 'Urgência', 'Visão'].map((h) => (
                    <p key={h} className="text-[10px] font-semibold uppercase tracking-wider text-am-text-tertiary">{h}</p>
                  ))}
                </div>

                <div className="divide-y divide-am-border-default bg-am-surface">
                  {plans.map((plan, i) => {
                    const stats = planStats.find((s) => s.planId === plan.id);
                    const urgency = stats?.urgency || 'low';
                    const uc = URGENCY_CONFIG[urgency];
                    const isActive = plan.id === activePlanId;

                    return (
                      <div
                        key={plan.id}
                        className={`grid grid-cols-[1fr_80px_100px_80px_80px] gap-4 items-center px-5 py-4 transition-colors hover:bg-am-surface-subtle/50`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-am-brand-primary" />
                            <p className="truncate text-sm font-semibold text-am-text-primary">{plan.name}</p>
                            {isActive && (
                              <Badge variant="primary">ATIVO</Badge>
                            )}
                          </div>
                          <p className="mt-0.5 pl-4 text-xs text-am-text-secondary">
                            {plan.subjects.length > 0 ? `${plan.subjects.length} matérias` : 'Sem matérias'} · Meta {plan.weeklyGoalHours}h/sem
                          </p>
                        </div>

                        <div className="text-center font-brand font-bold text-am-text-primary">
                          {stats?.progress || 0}%
                        </div>

                        <p className="text-xs text-am-text-secondary">
                          {stats?.totalHoursMonth ? `${stats.totalHoursMonth.toFixed(1)}h` : '0h'}
                        </p>

                        <span className={`inline-flex items-center justify-center rounded-am-sm px-2 py-0.5 text-[10px] font-bold ${uc.bg} ${uc.text}`}>
                          {uc.label}
                        </span>

                        <div className="flex items-center justify-end gap-1 relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelectActive(plan.id || ''); }}
                            className={`rounded-am-sm px-2 py-1 text-[10px] font-medium transition-colors ${isActive ? 'bg-am-brand-primary/10 text-am-brand-primary' : 'bg-am-surface-deep text-am-text-secondary hover:text-am-text-primary'}`}
                          >
                            {isActive ? 'Ativo' : 'Ativar'}
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === plan.id ? null : (plan.id || null)); }}
                              className="rounded-am-sm p-1 text-am-text-tertiary hover:text-am-text-primary transition-colors"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                            {openMenuId === plan.id && (
                              <div className="absolute right-0 top-6 z-50 w-36 overflow-hidden rounded-am-md border border-am-border-strong bg-am-surface-elevated shadow-am-xl">
                                <button onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); setPlanManagerOpen(true); setOpenMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-am-text-secondary hover:bg-am-surface-subtle transition-colors">
                                  <Edit2 className="h-3 w-3" /> Editar
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(plan.id || ''); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-am-error hover:bg-am-error/10 transition-colors">
                                  <Trash2 className="h-3 w-3" /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      <PlanManager
        isOpen={planManagerOpen}
        userId={user.uid}
        editPlan={editingPlan}
        onClose={() => {
          setPlanManagerOpen(false);
          setEditingPlan(null);
          loadData();
        }}
      />
    </div>
  );
}
