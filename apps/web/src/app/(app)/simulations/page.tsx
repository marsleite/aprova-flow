'use client';

import { FeatureCode } from '@aprovamind/domain';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import { getAccuracyAnalytics } from '@/lib/firebase/questions';
import { SubjectAccuracy } from '@/types';
import { useEntitlements } from '@/hooks/useEntitlements';
import EntitlementUpgradeCard from '@/components/EntitlementUpgradeCard';
import {
  Target,
  Play,
  BookOpen,
  Zap,
  ChevronRight,
  Lock,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  BarChart2
} from 'lucide-react';
import Link from 'next/link';

// RDS Components
import { KPICard, ChartCard, Skeleton, Button, Badge } from '@/components';
import { fadeUp } from '@/design-system/tokens';

function getAccuracyColor(acc: number) {
  if (acc >= 80) return { text: 'text-green-500', bar: 'bg-green-500', glow: 'var(--color-am-success)', label: 'Excelente' };
  if (acc >= 65) return { text: 'text-primary', bar: 'bg-primary', glow: 'var(--color-am-brand-primary)', label: 'Bom' };
  if (acc >= 50) return { text: 'text-am-warning', bar: 'bg-am-warning', glow: 'var(--color-am-warning)', label: 'Regular' };
  return { text: 'text-am-error', bar: 'bg-am-error', glow: 'var(--color-am-error)', label: 'Crítico' };
}

export default function SimulationsPage() {
  const { user } = useAuthContext();
  const { activePlan } = usePlanContext();
  const { hasFeature } = useEntitlements(user?.uid, user?.email);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<'1h' | '2h' | '4h'>('2h');

  // Helper para buscar pesos das disciplinas do plano ativo
  const getSubjectWeight = useCallback((subjectName: string) => {
    if (!activePlan || !activePlan.subjects) return 1.0;
    const s = activePlan.subjects.find((item) => item.subject.toLowerCase() === subjectName.toLowerCase());
    // Normaliza o percentual (ex: 15 -> 1.5x) ou assume 1.0 de base
    return s ? Math.max(1.0, s.weight / 10) : 1.0;
  }, [activePlan]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const analytics = await getAccuracyAnalytics(user.uid);
      setAccuracyData(analytics.month);
    } catch {
      setAccuracyData([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!user) return null;

  const canUseCustomSimulations = hasFeature(FeatureCode.SimulationsCustom);
  const canUseSimulationAnalytics = hasFeature(FeatureCode.SimulationsAnalytics);
  const canUsePostSimulado = hasFeature(FeatureCode.PostSimuladoInteligente);

  const totalQuestions = accuracyData.reduce((a, b) => a + b.totalQuestions, 0);
  const totalCorrect = accuracyData.reduce((a, b) => a + b.correctAnswers, 0);
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const trackedSubjects = accuracyData.filter((item) => item.totalQuestions > 0);
  const criticalSubjects = accuracyData.filter((item) => item.totalQuestions >= 5 && item.accuracy < 50);

  const worstSubject = [...accuracyData].sort((a, b) => a.accuracy - b.accuracy)[0] || null;

  let totalWeightedAccuracy = 0;
  let totalWeights = 0;
  accuracyData.forEach(item => {
    const weight = getSubjectWeight(item.subject);
    if (item.totalQuestions > 0) {
      totalWeightedAccuracy += item.accuracy * weight;
      totalWeights += weight;
    }
  });

  const weightedAvgAccuracy = totalWeights > 0 ? totalWeightedAccuracy / totalWeights : avgAccuracy;
  const projectedScore = weightedAvgAccuracy > 0 ? Math.round((weightedAvgAccuracy / 100) * 1000) : null;
  const percentile = projectedScore
    ? projectedScore >= 900 ? 'Top 1%' : projectedScore >= 800 ? 'Top 5%' : projectedScore >= 700 ? 'Top 15%' : 'Top 30%'
    : null;

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* ── Topbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 px-6 border-b border-border bg-card/30 backdrop-blur-md">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Centro de Simulação Avançada
          </p>
          <h1 className="font-sans text-am-h2 md:text-[42px] font-bold text-foreground tracking-tight leading-[1.1]">
            Provas & <br className="sm:hidden" /> Simulados
          </h1>
          <p className="text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed">
            Treine com banco oficial, simulados personalizados e leitura de desempenho
            para calibrar seu nível de prontidão antes da prova real.
          </p>
        </div>

        {/* Projected score card - Premium AI Feel */}
        {projectedScore && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">Índice Estimado</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-4xl font-bold text-transparent bg-clip-text bg-am-brand-gradient tracking-tighter">
                {projectedScore}
              </span>
              <span className="text-am-body-sm font-bold text-muted-foreground">/1000</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-am-success/20 mt-2">
              <Sparkles className="h-3 w-3 text-green-500" />
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Faixa estimada {percentile}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 space-y-6">
        {/* Launch Simulation Banner */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
          className="relative overflow-hidden rounded-xl border border-am-brand-secondary/30 p-6 shadow-am-md"
          style={{ background: 'linear-gradient(135deg, var(--color-am-surface) 0%, rgba(218, 202, 255, 0.08) 100%)' }}
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-foreground/10 blur-[80px] pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-am-full bg-foreground/10 border border-am-brand-secondary/20">
                <Play className="h-5 w-5 text-foreground ml-1" />
              </div>
              <div>
                <h3 className="font-sans text-am-h5 font-bold text-foreground">Iniciar Novo Simulado</h3>
                <p className="text-am-body-sm text-muted-foreground">Questões calibradas pelo histórico do edital</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-am-full border border-border bg-muted p-1">
                {(['1h', '2h', '4h'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}
                    className={`px-4 py-1.5 text-xs font-bold transition-all rounded-am-full ${selectedDuration === d
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <Button asChild variant="outline">
                <Link href="/provas">Banco Oficial</Link>
              </Button>
              {canUseCustomSimulations ? (
                <Button asChild variant="primary">
                  <Link href="/provas/criar-simulado">Configurar e Iniciar</Link>
                </Button>
              ) : (
                <Button disabled variant="outline">
                  <Lock className="h-4 w-4 mr-2" /> Pro Requirido
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {!canUseSimulationAnalytics && (
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
            <EntitlementUpgradeCard
              title="Os simulados completos entram no Pro"
              description="No Free voce ainda sente a proposta da experiencia, mas o Pro libera simulados customizados e leitura de desempenho com profundidade suficiente para treino serio."
              highlight="Simulados personalizados, analytics de desempenho e rotina de prova mais consistente."
              recommendedPlan="pro"
              ctaLabel="Ver beneficios do Pro"
            />
          </motion.div>
        )}

        {canUseCustomSimulations && !canUsePostSimulado && (
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
            <EntitlementUpgradeCard
              title="O pos-simulado inteligente fica no Premium"
              description="No Pro voce ja monta simulados e acompanha a sua performance. O Premium entra para analisar o resultado com mais profundidade e transformar prova em ajuste de rota."
              highlight="Pos-simulado inteligente, leitura de padroes de erro e camada premium de correcao estrategica."
              recommendedPlan="premium"
              ctaLabel="Ver beneficios do Premium"
            />
          </motion.div>
        )}

        {/* Stats Row */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Precisão Geral"
            value={`${avgAccuracy}%`}
            icon={Target}
            loading={loading}
          />
          <KPICard
            title="Matérias Mapeadas"
            value={trackedSubjects.length}
            icon={BookOpen}
            loading={loading}
          />
          <KPICard
            title="Questões no Mês"
            value={totalQuestions.toLocaleString()}
            icon={BarChart2}
            loading={loading}
          />
          <KPICard
            title="Alertas Críticos"
            value={criticalSubjects.length}
            icon={AlertTriangle}
            loading={loading}
          />
        </motion.div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">

          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2 space-y-6">

            {/* Error Map */}
            <ChartCard title="Mapa de Calor (Erros)" subtitle="Zonas de atrito e vulnerabilidade" loading={loading}>
              {accuracyData.length === 0 ? (
                <div className="py-10 text-center">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-am-body-sm text-muted-foreground">Volume estatístico insuficiente para mapeamento de calor.</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {accuracyData.map((s) => {
                      const errorRate = 100 - s.accuracy;
                      let bgClass = 'bg-muted text-muted-foreground border-border';
                      if (errorRate >= 60) bgClass = 'bg-am-error/10 text-am-error border-am-error/30 shadow-[0_0_12px_var(--color-am-error)_inset]';
                      else if (errorRate >= 35) bgClass = 'bg-primary/10 text-primary border-am-brand-primary/30';

                      return (
                        <div key={s.subject}
                          className={`flex items-center justify-center rounded-md border px-3 py-2 cursor-pointer transition-all hover:scale-[1.03] ${bgClass}`}
                          title={`${s.subject}: ${s.accuracy}% acerto`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {s.subject.length > 16 ? s.subject.substring(0, 14) + '…' : s.subject}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">Ameaça Principal</p>
                      <p className="font-sans text-am-body font-bold text-foreground">{worstSubject?.subject || '—'}</p>
                      {worstSubject && <p className="text-xs font-bold text-am-error mt-2">{worstSubject.accuracy}% Retenção (Crítico)</p>}
                    </div>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">Padrão Detectado</p>
                      <p className="text-am-body-sm text-muted-foreground mt-1">
                        {worstSubject?.accuracy !== undefined && worstSubject.accuracy < 50 ? 'Viés consistente de erro conceitual. Demandando reestudo de teoria base.' : 'Em análise neural contínua.'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </ChartCard>

            {/* Strategic Review */}
            <ChartCard title="Efetividade por Disciplina" subtitle="Volume vs Taxa de Acerto" loading={loading}>
              {accuracyData.length === 0 ? (
                <p className="py-6 text-center text-am-body-sm text-muted-foreground">Faça testes para popular este quadro.</p>
              ) : (
                <div className="space-y-4">
                  {[...accuracyData]
                    .sort((a, b) => getSubjectWeight(b.subject) - getSubjectWeight(a.subject))
                    .map((s) => {
                      const weight = getSubjectWeight(s.subject);
                      const c = getAccuracyColor(s.accuracy);
                      return (
                        <div key={s.subject} className="group">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-am-body-sm text-foreground font-medium">{s.subject}</span>
                              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter py-0 px-1.5 h-auto">Peso {weight.toFixed(1)}</Badge>
                            </div>
                            <span className={`text-sm font-bold ${c.text}`}>{s.accuracy}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${s.accuracy}%` }}
                              transition={{ duration: 0.8, delay: 0.1 }}
                              className={`h-full rounded-full ${c.bar}`}
                              style={{ boxShadow: s.accuracy >= 65 ? `0 0 10px ${c.glow}` : 'none' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </ChartCard>
          </motion.div>

          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="space-y-6">

            {/* Quick Access */}
            <ChartCard title="Acesso Rápido" loading={false}>
              <div className="space-y-3">
                <Link href="/provas" className="flex items-center justify-between p-3 rounded-md bg-card border border-border hover:border-am-brand-primary/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-am-body-sm font-medium text-foreground">Banco Oficial</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                {canUseCustomSimulations ? (
                  <Link href="/provas/criar-simulado" className="flex items-center justify-between p-3 rounded-md bg-primary/10 border border-am-brand-primary/30 hover:bg-primary/20 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-am-body-sm font-medium text-primary">Gerador Inteligente</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-primary/50" />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-md bg-card border border-border opacity-60">
                    <div className="flex items-center gap-3">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-am-body-sm font-medium text-foreground">Gerador Inteligente</span>
                    </div>
                    <Badge variant="outline">Pro</Badge>
                  </div>
                )}
              </div>
            </ChartCard>

            {/* Volume Snapshot */}
            <ChartCard title="Disciplinas Mais Exercitadas" subtitle="Volume recente por matéria" loading={loading}>
              <div className="space-y-3">
                {accuracyData.slice(0, 5).map((s, i) => {
                  const c = getAccuracyColor(s.accuracy);
                  return (
                    <div key={s.subject + i} className="flex items-center justify-between p-3 rounded-md bg-muted border border-am-border-subtle">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 bg-card h-8 w-8 rounded-md flex items-center justify-center border border-border">
                          <Trophy className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-am-body-sm font-bold text-foreground truncate">{s.subject}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.totalQuestions} qs</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right pl-2">
                        <span className={`text-sm font-bold ${c.text}`}>{s.accuracy}%</span>
                      </div>
                    </div>
                  );
                })}
                {accuracyData.length === 0 && !loading && (
                  <div className="text-center py-6">
                    <p className="text-am-caption text-muted-foreground">Sem baterias recentes.</p>
                    <Link href="/provas" className="text-am-caption text-primary hover:underline mt-1 inline-flex items-center gap-1">Realizar Bateria <ChevronRight className="h-3 w-3" /></Link>
                  </div>
                )}
              </div>
            </ChartCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
