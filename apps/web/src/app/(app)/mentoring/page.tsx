'use client';

import { FeatureCode } from '@aprovamind/domain';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  getStudyConsistency,
  getHoursBySubject,
  getPlanVsActual,
  getWeeklyHours,
  getRecentSessions,
} from '@/lib/firebase/sessions';
import { getAccuracyAnalytics } from '@/lib/firebase/questions';
import {
  StudyConsistency,
  SubjectHours,
  PlanVsActual,
  DailyHours,
  StudySession,
  SubjectAccuracy,
} from '@/types';
import WeeklyMentoringCard from '@/components/WeeklyMentoringCard';
import MentorCard from '@/components/MentorCard';
import ChatPanel from '@/components/ChatPanel';
import EntitlementUpgradeCard from '@/components/EntitlementUpgradeCard';
import TrackedUpgradeLink from '@/components/TrackedUpgradeLink';
import {
  Brain,
  Sparkles,
  MessageCircle,
  Clock,
  TrendingUp,
  Activity,
  BarChart2,
  ChevronRight,
  Target,
} from 'lucide-react';

// RDS Components
import { KPICard, ChartCard, Skeleton, Button, Badge } from '@/components';
import { fadeUp } from '@/design-system/tokens';

export default function MentoringPage() {
  const { user } = useAuthContext();
  const { activePlanId, activePlan: activePlanObj } = usePlanContext();
  const { hasFeature, planTier } = useEntitlements(user?.uid, user?.email);

  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [subjectHours, setSubjectHours] = useState<SubjectHours[]>([]);
  const [planVsActual, setPlanVsActual] = useState<PlanVsActual[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyHours[]>([]);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const filterPlanId = activePlanId || undefined;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [cons, hours, pva, weekly, recent] = await Promise.all([
        getStudyConsistency(user.uid, filterPlanId, activePlanObj?.weeklyGoalHours).catch(() => null),
        getHoursBySubject(user.uid, filterPlanId).catch(() => []),
        getPlanVsActual(user.uid, filterPlanId, activePlanObj?.subjects).catch(() => []),
        getWeeklyHours(user.uid, filterPlanId).catch(() => []),
        getRecentSessions(user.uid, 10, filterPlanId).catch(() => []),
      ]);
      setConsistency(cons);
      setSubjectHours(hours);
      setPlanVsActual(pva);
      setWeeklyData(weekly);
      setRecentSessions(recent);

      try {
        const analytics = await getAccuracyAnalytics(user.uid, filterPlanId);
        setAccuracyData(analytics.month);
      } catch { setAccuracyData([]); }
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user, filterPlanId, activePlanObj]);

  useEffect(() => { if (user) fetchData(); }, [fetchData, user, activePlanId]);

  if (!user) return null;

  const canUseWeeklyDiagnostic = hasFeature(FeatureCode.WeeklyDiagnostic);
  const canUseWeeklyMentoring = hasFeature(FeatureCode.WeeklyMentoring);
  const canUseContextualChat = hasFeature(FeatureCode.ContextualAiChat);
  const recommendedPlanForMentoring = planTier === 'free' ? 'pro' : 'premium';

  const todayDominant = recentSessions.length > 0
    ? [...recentSessions].sort((a, b) => b.duration - a.duration)[0].subject
    : null;

  const avgAccuracy = accuracyData.length
    ? Math.round(accuracyData.reduce((a, b) => a + b.accuracy, 0) / accuracyData.length)
    : null;

  const neglected = planVsActual.filter((p) => p.status === 'neglected').sort((a, b) => a.deviation - b.deviation);
  const strengths = planVsActual.filter((p) => p.status === 'ok' || p.status === 'over');

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* ── Topbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 px-6 border-b border-border bg-card/30 backdrop-blur-md">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Mentoria Analítica
          </p>
          <h1 className="font-sans text-am-h2 md:text-[42px] font-bold text-foreground tracking-tight leading-[1.1]">
            Mentoria & <br className="sm:hidden" /> Diagnóstico
          </h1>
          <p className="text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed">
            Leituras orientadas da sua semana para identificar lacunas de retenção,
            redistribuir esforço e decidir o próximo ajuste com mais clareza.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setChatOpen(true)} variant="primary" className="rounded-full px-6 shadow-am-md">
            <MessageCircle className="h-4 w-4 mr-2" /> Abrir Mentor IA
          </Button>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* ROW 1: KPIs Rápidos */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Sua Semana"
            value={consistency ? `${(consistency.weeklyTotalSeconds / 3600).toFixed(1)}h` : '—'}
            icon={Clock}
            loading={loading}
            delta={consistency ? { value: consistency.weeklyGoalHours, trend: 'up', label: 'meta de horas' } : undefined}
          />
          <KPICard
            title="Retenção"
            value={consistency ? `${consistency.weeklyProgressPercent}%` : '—'}
            icon={TrendingUp}
            loading={loading}
          />
          <KPICard
            title="Sequência"
            value={consistency ? `${consistency.currentStreak}d` : '—'}
            icon={Activity}
            loading={loading}
            delta={consistency ? { value: consistency.bestStreak, trend: 'up', label: 'recorde' } : undefined}
          />
          <KPICard
            title="Precisão Média"
            value={avgAccuracy !== null ? `${avgAccuracy}%` : '—'}
            icon={Target}
            loading={loading}
            delta={{ value: accuracyData.reduce((a, b) => a + b.totalQuestions, 0), trend: 'up', label: 'resolvidas' }}
          />
        </motion.div>

        {/* MENTORIA CORE - Componentes complexos legados convertidos esteticamente ou encapsulados */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Col 1: Log de Ajustes & Diagnósticos Ativos */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            {/* Log IA */}
            <ChartCard title="Log de Ajustes IA" subtitle="Micro-correções de rota" loading={loading}>
              <div className="relative space-y-4 pl-4 before:absolute before:inset-y-0 before:left-[7px] before:w-[2px] before:bg-am-border-strong rounded-md">
                {planVsActual.length > 0 ? (
                  <>
                    {neglected.slice(0, 2).map((pva, i) => (
                      <div key={pva.subject} className="relative">
                        <div className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-am-surface ${i === 0 ? 'bg-primary shadow-[0_0_8px_var(--color-am-ai-glow)]' : 'bg-am-border-strong'}`} />
                        <div className="bg-card p-3 rounded-md border border-border shadow-am-sm">
                          <p className="text-am-caption text-muted-foreground font-mono">{i === 0 ? 'HOJE' : 'ONTEM'}</p>
                          <p className="font-semibold text-am-body-sm text-foreground">Ajuste de Carga</p>
                          <p className="text-am-caption text-muted-foreground mt-1">{pva.subject}: <span className="text-am-error font-medium">{Math.abs(pva.deviation).toFixed(0)}% sugerido</span></p>
                        </div>
                      </div>
                    ))}
                    {strengths.slice(0, 1).map((pva) => (
                      <div key={pva.subject} className="relative">
                        <div className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-am-surface bg-green-500" />
                        <div className="bg-card p-3 rounded-md border border-border shadow-am-sm">
                          <p className="text-am-caption text-muted-foreground font-mono">NESTA SEMANA</p>
                          <p className="font-semibold text-am-body-sm text-foreground">Marco Atingido</p>
                          <p className="text-am-caption text-muted-foreground mt-1">{pva.subject}: cobertura equilibrada.</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-am-body-sm text-muted-foreground">Sem volume estatístico suficiente. Continue estudando.</p>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Matriz Comparativa" subtitle="Real vs Planejado (Top 5)">
              <div className="overflow-hidden">
                <table className="w-full text-am-body-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="px-3 py-2 text-left text-am-caption font-semibold uppercase tracking-wider text-muted-foreground">Matéria</th>
                      <th className="px-3 py-2 text-right text-am-caption font-semibold uppercase tracking-wider text-muted-foreground">Real</th>
                      <th className="px-3 py-2 text-right text-am-caption font-semibold uppercase tracking-wider text-muted-foreground">Gap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {planVsActual.slice(0, 5).map((pva) => (
                      <tr key={pva.subject}>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]" title={pva.subject}>{pva.subject}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-medium ${pva.actualPercent >= 70 ? 'text-green-500' : pva.actualPercent >= 40 ? 'text-am-warning' : 'text-am-error'}`}>
                            {pva.actualPercent.toFixed(0)}%
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-right font-medium font-mono ${pva.deviation >= 0 ? 'text-green-500' : 'text-am-error'}`}>
                          {pva.deviation > 0 ? '+' : ''}{pva.deviation.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </motion.div>

          {/* Col 2 & 3: Relatório Avançado e Mentor AI Card */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2 space-y-6">
            {canUseWeeklyDiagnostic && canUseWeeklyMentoring ? (
              <>
                <WeeklyMentoringCard
                  userId={user.uid}
                  planId={filterPlanId}
                  userName={user.displayName?.split(' ')[0] || 'Estudante'}
                  consistency={consistency}
                  subjectHours={subjectHours}
                  planVsActual={planVsActual}
                  weeklyData={weeklyData}
                  recentSessions={recentSessions}
                  accuracyData={accuracyData}
                  activePlanName={activePlanObj?.name || null}
                  loading={loading}
                />

                <MentorCard
                  userName={user.displayName?.split(' ')[0] || 'Estudante'}
                  consistency={consistency}
                  subjectHours={subjectHours}
                  planVsActual={planVsActual}
                  totalTodaySeconds={recentSessions.filter((s) => s.date === new Date().toISOString().split('T')[0]).reduce((a, b) => a + b.duration, 0)}
                  todayDominantSubject={todayDominant}
                  weeklyData={weeklyData}
                  recentSessions={recentSessions}
                  accuracyData={accuracyData}
                  activePlanName={activePlanObj?.name || null}
                  loading={loading}
                />
              </>
            ) : (
              <EntitlementUpgradeCard
                title="Mentoria semanal entra no Pro"
                description="No Free voce sente o motor e acompanha a execucao. O Pro entra quando voce quer diagnostico semanal, leitura orientada e uma camada mais analitica da sua rotina."
                highlight="Diagnostico semanal, leitura estrategica da semana, orientacoes acionaveis e acompanhamento mais profundo."
                recommendedPlan={recommendedPlanForMentoring}
                currentPlan={planTier}
                surface="mentoring_weekly_gate"
                featureCode={FeatureCode.WeeklyMentoring}
                eventMetadata={{
                  blockedFeatures: [
                    FeatureCode.WeeklyDiagnostic,
                    FeatureCode.WeeklyMentoring,
                  ].join(','),
                }}
              />
            )}

            {/* AI Action Block Extendido */}
            <div className="rounded-xl border border-border/50/30 bg-card p-6 relative overflow-hidden flex flex-col sm:flex-row gap-6 items-center justify-between" style={{ background: 'linear-gradient(145deg, var(--color-am-surface) 0%, rgba(139,92,246,0.05) 100%)' }}>
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Brain className="h-40 w-40 text-primary" />
              </div>

              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-sans text-am-h5 font-bold text-foreground">Pergunte ao Mentor IA</h3>
                </div>
                <p className="text-am-body-sm text-muted-foreground">A IA do AprovaMind compilou essa base de dados gerencial. Abra o chat contextual para simular cenários de tempo real ou pedir novos roteiros de distribuição.</p>
              </div>

              <div className="w-full sm:w-auto flex-shrink-0 relative z-10 space-y-2">
                {canUseContextualChat && neglected.length > 0 && (
                  <button onClick={() => setChatOpen(true)} className="block w-full text-left bg-card hover:bg-primary/10 border border-border hover:border-border/50 text-am-body-sm text-foreground transition-colors px-4 py-2.5 rounded-md shadow-am-sm">
                    Reorganizar {neglected[0].subject}?
                  </button>
                )}
                {canUseContextualChat ? (
                  <Button onClick={() => setChatOpen(true)} variant="premium" className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" /> Iniciar Conversa
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full">
                    <TrackedUpgradeLink
                      href="/settings"
                      surface="mentoring_chat_locked_cta"
                      recommendedPlan="pro"
                      currentPlan={planTier}
                      featureCode={FeatureCode.ContextualAiChat}
                      eventMetadata={{ title: 'Entender o Pro' }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" /> Entender o Pro
                    </TrackedUpgradeLink>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {canUseContextualChat && (
        <ChatPanel
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          userName={user.displayName?.split(' ')[0] || 'Estudante'}
          consistency={consistency}
          subjectHours={subjectHours}
          planVsActual={planVsActual}
          todaySessions={recentSessions.filter((s) => s.date === new Date().toISOString().split('T')[0])}
          totalTodaySeconds={recentSessions.filter((s) => s.date === new Date().toISOString().split('T')[0]).reduce((a, b) => a + b.duration, 0)}
          weeklyData={weeklyData}
          recentSessions={recentSessions}
          activePlanName={activePlanObj?.name || null}
        />
      )}
    </div>
  );
}
