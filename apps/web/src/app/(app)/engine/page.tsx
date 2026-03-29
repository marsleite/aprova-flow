'use client';

import { FeatureCode } from '@aprovamind/domain';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useEngineData } from '@/hooks/useEngineData';
import StudyTimer from '@/components/StudyTimer';
import QuestionTrackerCard from '@/components/QuestionTrackerCard';
import DailyAiPlannerCard from '@/components/DailyAiPlannerCard';
import PlanEngineSnapshotCard from '@/components/engine/PlanEngineSnapshotCard';
import StudyJourneyCard from '@/components/StudyJourneyCard';
import EntitlementUpgradeCard from '@/components/EntitlementUpgradeCard';
import { getStudyCapacityHoursForDate } from '@/lib/plans/studyCapacity';
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

// RDS Components
import { KPICard, Badge, Button, Card } from '@/components';
import { fadeUp } from '@/design-system/tokens';

export default function EnginePage() {
  const showPlanEngineSnapshot =
    process.env.NEXT_PUBLIC_ENGINE_SNAPSHOT_V1 === 'true';
  const { user } = useAuthContext();
  const { hasFeature, planTier } = useEntitlements(user?.uid, user?.email);
  const { plans, activePlanId, activePlan: activePlanObj } = usePlanContext();

  const {
    recentSessions,
    consistency,
    lastSavedSession,
    loading,
    creatingPlan,
    fetchData,
    handleSessionSaved,
    handleCreateFreePlan,
  } = useEngineData({
    userId: user?.uid,
    activePlanId,
    weeklyGoalHours: activePlanObj?.weeklyGoalHours,
  });

  const initialRecoveryMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('recovery') === 'true';

  if (!user) return null;

  const weeklyHours = consistency ? consistency.weeklyTotalSeconds / 3600 : 0;
  const canSeeFullEngine =
    hasFeature(FeatureCode.SubjectHealthFull) &&
    hasFeature(FeatureCode.PriorityScoreFull) &&
    hasFeature(FeatureCode.RecommendationsFull);

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Flush Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-12 pb-6 px-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="border-white/10 text-am-text-secondary bg-transparent"><Zap className="h-3 w-3 mr-1" /> Motor do Dia</Badge>
          </div>
          <h1 className="font-brand text-[40px] font-light text-am-text-primary tracking-tighter leading-none">
            Sessão
          </h1>
        </div>

        {consistency && (
          <div className="hidden items-center gap-8 lg:flex mt-4 sm:mt-0">
            <div className="text-right">
              <p className="text-[10px] text-am-text-tertiary uppercase font-mono tracking-widest">Esta semana</p>
              <p className="text-[28px] font-light text-am-text-primary tracking-tighter leading-none mt-1">{weeklyHours.toFixed(1)}<span className="text-sm text-am-text-secondary ml-1">h</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-am-text-tertiary uppercase font-mono tracking-widest">Sequência</p>
              <p className="text-[28px] font-light text-am-text-primary tracking-tighter leading-none mt-1 flex items-center justify-end gap-1">{consistency.currentStreak} <Flame className="h-4 w-4 text-am-text-tertiary" /></p>
            </div>
          </div>
        )}
      </div>

      <div className="px-8">
        <div className="space-y-6">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
            <StudyJourneyCard current="engine" />
          </motion.div>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          {/* Left: Timer + Question Tracker */}
          <div className="space-y-6">
            {/* Context bar */}
            {activePlanObj && (
              <motion.div custom={0.5} variants={fadeUp} initial="hidden" animate="show"
                className="flex items-center gap-4 rounded-am-md border border-am-border-default bg-am-surface px-5 py-3 shadow-am-sm"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-am-caption font-bold text-am-text-tertiary uppercase tracking-wider hidden sm:inline-block">Contexto Ativo:</span>
                  <div
                    className="flex items-center gap-2 rounded-am-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${activePlanObj.color} 15%, transparent)`,
                      color: activePlanObj.color,
                      border: `1px solid color-mix(in srgb, ${activePlanObj.color} 30%, transparent)`,
                    }}
                  >
                    <div className="h-2 w-2 rounded-am-full shadow-[0_0_8px_currentColor]" style={{ background: activePlanObj.color }} />
                    {activePlanObj.name}
                  </div>
                </div>
                {activePlanObj.subjects.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-am-caption text-am-text-secondary hidden md:inline-block">
                      {activePlanObj.subjects.length} matérias
                    </span>
                    <Button asChild variant="outline" size="sm" className="h-8">
                      <Link href="/planner">
                        Gerenciar Edital <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Timer */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
              <div className="rounded-am-xl bg-am-surface shadow-am-lg border border-am-border-default overflow-hidden">
                <StudyTimer
                  key={activePlanId || 'all'}
                  userId={user.uid}
                  plans={plans}
                  activePlanId={activePlanId}
                  onSessionSaved={handleSessionSaved}
                  onCreateSession={handleCreateFreePlan}
                  onCreateEdital={() => { }}
                  creatingSession={creatingPlan}
                />
              </div>
            </motion.div>

            {/* Question Tracker */}
            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
              <div className="rounded-am-xl bg-am-surface shadow-am-md border border-am-border-default overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-am-brand-primary/5 blur-3xl pointer-events-none" />
                <QuestionTrackerCard
                  userId={user.uid}
                  planId={activePlanId || undefined}
                  planSubjects={activePlanObj?.subjects}
                  lastSessionSubject={lastSavedSession?.subject ?? (recentSessions[0]?.subject || null)}
                  onSaved={fetchData}
                />
              </div>
            </motion.div>

            {/* Daily AI Planner */}
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="rounded-am-xl bg-am-surface shadow-am-md border border-am-ai-border/40 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-64 h-64 bg-am-ai-glow/10 blur-[80px] pointer-events-none" />
              <DailyAiPlannerCard
                userId={user.uid}
                userName={user.displayName?.split(' ')[0] || 'Estudante'}
                activePlanName={activePlanObj?.name || null}
                consistency={consistency}
                subjectHours={[]}
                planVsActual={[]}
                accuracyData={[]}
                totalTodaySeconds={0}
                availableMinutesToday={Math.round(
                  getStudyCapacityHoursForDate(activePlanObj?.studyCapacityHours) * 60
                )}
                initialRecoveryMode={initialRecoveryMode}
              />
            </motion.div>
          </div>

          {/* Right: Execution Log + Stats */}
          <div className="space-y-6">
            {showPlanEngineSnapshot && (
              <motion.div custom={0.5} variants={fadeUp} initial="hidden" animate="show">
                {canSeeFullEngine ? (
                  <PlanEngineSnapshotCard planId={activePlanId || null} />
                ) : (
                  <EntitlementUpgradeCard
                    title="Destrave a leitura completa do motor"
                    description="O plano gratuito mostra a direcao do dia, mas o score completo, a saude detalhada e as recomendacoes estruturadas ficam no Pro."
                    highlight="Saude completa da materia, priority score detalhado e recomendacoes completas para o plano ativo."
                    recommendedPlan={planTier === 'free' ? 'pro' : 'premium'}
                    ctaLabel="Comparar planos"
                  />
                )}
              </motion.div>
            )}

            {/* Quick stats */}
            <motion.div
              custom={showPlanEngineSnapshot ? 1 : 0}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4"
            >
              <KPICard
                title="Sequência"
                value={`${consistency?.currentStreak || 0}d`}
                icon={Flame}
                loading={false}
              />
              <KPICard
                title="Meta Semanal"
                value={`${consistency?.weeklyProgressPercent || 0}%`}
                icon={Target}
                loading={false}
              />
            </motion.div>

            {/* AI Insight panel */}
            <motion.div
              custom={showPlanEngineSnapshot ? 2 : 1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="rounded-am-xl border border-am-ai-border/40 bg-am-surface p-5 shadow-am-sm relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-am-surface) 0%, rgba(139, 92, 246, 0.04) 100%)' }}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-am-ai-glow/20 blur-[50px] rounded-full pointer-events-none"></div>

              <div className="mb-3 flex items-center gap-2 relative z-10">
                <Badge variant="ai" className="shadow-[0_0_8px_var(--color-am-ai-glow)]"><Sparkles className="h-3 w-3 mr-1" /> Mentor IA</Badge>
              </div>

              {loading ? (
                <div className="space-y-2 relative z-10">
                  <div className="h-4 w-full rounded bg-am-surface-subtle animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-am-surface-subtle animate-pulse" />
                </div>
              ) : recentSessions.length > 0 ? (
                <p className="text-am-body-sm text-am-text-secondary leading-relaxed relative z-10">
                  {consistency && consistency.weeklyProgressPercent >= 80
                    ? `Excelente ritmo! Você já garantiu ${consistency.weeklyProgressPercent}% da carga horária. O algoritmo prediz alta retenção de base estrutural.`
                    : consistency && consistency.weeklyProgressPercent > 0
                      ? `Ponto de controle: a precisão otimizada da semana atual depende da execução de mais ${Math.max(0, parseFloat((consistency.weeklyGoalHours - weeklyHours).toFixed(1)))} horas líquidas.`
                      : 'O cronômetro calibra sua inteligência analítica. Inicie uma sessão para receber tracking de performance.'}
                </p>
              ) : (
                <p className="text-am-body-sm text-am-text-secondary relative z-10">
                  Inicie sua primeira sessão cronometrada para ativar as inferências do motor de performance inteligente.
                </p>
              )}
            </motion.div>

            {/* Execution log (recent sessions) */}
            <motion.div
              custom={showPlanEngineSnapshot ? 3 : 2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
            >
              <Card padding="md" variant="default">
                <div className="mb-4 flex items-center justify-between border-b border-am-border-subtle pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-am-text-tertiary" />
                    <h3 className="text-am-body-sm font-bold text-am-text-primary tracking-wide">Log de Sessões Realizadas</h3>
                  </div>
                  <Link href="/history" className="text-am-caption font-bold text-am-brand-primary hover:text-am-brand-primary/80 transition-colors flex items-center gap-1">
                    Ver Detalhes <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded border border-am-border-subtle bg-am-surface-subtle animate-pulse" />)}
                  </div>
                ) : recentSessions.length === 0 ? (
                  <div className="py-8 text-center bg-am-surface-subtle rounded-am-md border border-am-border-subtle">
                    <div className="mx-auto w-12 h-12 bg-am-surface-elevated rounded-full flex items-center justify-center mb-3">
                      <BookOpen className="h-5 w-5 text-am-text-tertiary" />
                    </div>
                    <p className="text-am-body-sm text-am-text-secondary">Abra o cronômetro para injetar dados.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <AnimatePresence>
                      {recentSessions.slice(0, 7).map((session, i) => {
                        const mins = Math.floor(session.duration / 60);
                        const isRecent = i === 0 && lastSavedSession?.subject === session.subject;
                        return (
                          <motion.div
                            key={session.id || i}
                            initial={isRecent ? { opacity: 0, x: 10 } : false}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-center gap-3 rounded-am-md px-3 py-2.5 transition-colors border ${isRecent ? 'bg-am-brand-primary/5 border-am-brand-primary/20' : 'bg-am-surface-elevated border-am-border-default hover:bg-am-surface-subtle'}`}
                          >
                            <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-am-full ${isRecent ? 'bg-am-brand-primary/20' : 'bg-am-surface-subtle'}`}>
                              {isRecent
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-am-brand-primary" />
                                : <div className="h-2 w-2 rounded-full bg-am-text-tertiary" />
                              }
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-am-body-sm font-medium text-am-text-primary leading-tight">{session.subject}</p>
                              <p className="text-[10px] text-am-text-tertiary font-mono mt-0.5">{session.date}</p>
                            </div>
                            <span className="flex-shrink-0 text-am-caption font-bold text-am-text-secondary">{mins}m</span>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Planner link */}
            {plans.length === 0 && (
              <motion.div
                custom={showPlanEngineSnapshot ? 4 : 3}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="rounded-am-md border border-dashed border-am-border-strong bg-am-surface-subtle p-5 text-center"
              >
                <div className="mx-auto w-10 h-10 bg-am-surface-elevated rounded-full flex items-center justify-center mb-3">
                  <Plus className="h-4 w-4 text-am-text-tertiary" />
                </div>
                <p className="text-am-body-sm font-bold text-am-text-primary mb-1">Sem contexto estrutural</p>
                <p className="text-am-caption text-am-text-secondary mb-4 max-w-[200px] mx-auto">Vincule um edital para liberar o track de consistência.</p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/planner">
                    Configurar Edital
                  </Link>
                </Button>
              </motion.div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
