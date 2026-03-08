'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { getAccuracyAnalytics } from '@/lib/firebase/questions';
import { SubjectAccuracy } from '@/types';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  Target,
  Play,
  Clock,
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

const ACCURACY_WEIGHTS: Record<string, number> = {
  'Direito Constitucional': 4.0,
  'Direito Administrativo': 4.0,
  'Português': 3.5,
  'Raciocínio Lógico': 3.0,
  'Informática': 2.5,
  'Direito Penal': 3.0,
  'Direito Civil': 3.0,
  'Direito Tributário': 2.5,
};

function getAccuracyColor(acc: number) {
  if (acc >= 80) return { text: 'text-am-success', bar: 'bg-am-success', glow: 'var(--color-am-success)', label: 'Excelente' };
  if (acc >= 65) return { text: 'text-am-brand-primary', bar: 'bg-am-brand-primary', glow: 'var(--color-am-brand-primary)', label: 'Bom' };
  if (acc >= 50) return { text: 'text-am-warning', bar: 'bg-am-warning', glow: 'var(--color-am-warning)', label: 'Regular' };
  return { text: 'text-am-error', bar: 'bg-am-error', glow: 'var(--color-am-error)', label: 'Crítico' };
}

export default function SimulationsPage() {
  const { user } = useAuthContext();
  const { capabilities } = useEntitlements(user?.uid, user?.email);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<'1h' | '2h' | '4h'>('2h');

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

  const totalQuestions = accuracyData.reduce((a, b) => a + b.totalQuestions, 0);
  const totalCorrect = accuracyData.reduce((a, b) => a + b.correctAnswers, 0);
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const worstSubject = [...accuracyData].sort((a, b) => a.accuracy - b.accuracy)[0] || null;

  let totalWeightedAccuracy = 0;
  let totalWeights = 0;
  accuracyData.forEach(item => {
    const weight = ACCURACY_WEIGHTS[item.subject] || 1.0;
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
      {/* Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-6 border-b border-am-border-default bg-am-surface/30 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="ai" className="shadow-[0_0_12px_var(--color-am-ai-glow)]"><Target className="h-3 w-3 mr-1" /> Centro de Simulação Avançada</Badge>
          </div>
          <h1 className="font-brand text-am-h3 font-bold text-am-text-primary tracking-tight mt-2">
            Simulados
          </h1>
          <p className="text-am-caption text-am-text-secondary mt-1 max-w-lg">
            Diagnóstico profundo com questões ranqueadas para calibrar seu nível de prontidão
          </p>
        </div>

        {/* Projected score card - Premium AI Feel */}
        {projectedScore && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-am-caption font-mono uppercase text-am-text-tertiary">Pontuação Preditiva</span>
            <div className="flex items-baseline gap-2">
              <span className="font-brand text-3xl font-bold text-transparent bg-clip-text bg-am-brand-gradient">{projectedScore}</span>
              <span className="text-am-body-sm text-am-text-secondary">/1000</span>
            </div>
            <span className="text-am-caption text-am-success flex items-center gap-1 font-mono mt-1"><CheckCircle2 className="h-3 w-3" /> Ranking {percentile}</span>
          </div>
        )}
      </div>

      <div className="px-6 space-y-6">
        {/* Launch Simulation Banner */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
          className="relative overflow-hidden rounded-am-xl border border-am-brand-primary/30 p-6 shadow-am-md"
          style={{ background: 'linear-gradient(135deg, var(--color-am-surface) 0%, rgba(61, 116, 246, 0.05) 100%)' }}
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-am-brand-primary/10 blur-[80px] pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-am-full bg-am-brand-primary/10 border border-am-brand-primary/20">
                <Play className="h-5 w-5 text-am-brand-primary ml-1" />
              </div>
              <div>
                <h3 className="font-brand text-am-h5 font-bold text-am-text-primary">Iniciar Novo Simulado</h3>
                <p className="text-am-body-sm text-am-text-secondary">Questões calibradas pelo histórico do edital</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-am-full border border-am-border-default bg-am-surface-deep overflow-hidden">
                {(['1h', '2h', '4h'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}
                    className={`px-4 py-2 text-am-caption font-semibold transition-all font-mono ${selectedDuration === d
                      ? 'bg-am-text-primary text-am-surface-deep'
                      : 'text-am-text-secondary hover:text-am-text-primary'
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {capabilities.canCreateSimulados ? (
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

        {/* Stats Row */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Precisão Geral"
            value={`${avgAccuracy}%`}
            icon={Target}
            loading={loading}
            delta={{ value: accuracyData.length, label: 'matérias avl.', trend: 'up' }}
          />
          <KPICard
            title="Tempo Médio"
            value="—"
            icon={Clock}
            loading={loading}
            delta={{ value: 0, label: 'Não Disp.', trend: 'down' }}
          />
          <KPICard
            title="Volume (Mês)"
            value={totalQuestions.toLocaleString()}
            icon={BookOpen}
            loading={loading}
            delta={{ value: totalCorrect, label: 'acertos', trend: 'up' }}
          />
          <KPICard
            title="Provas Executadas"
            value="—"
            icon={BarChart2}
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
                  <AlertTriangle className="h-8 w-8 text-am-text-tertiary mx-auto mb-3" />
                  <p className="text-am-body-sm text-am-text-secondary">Volume estatístico insuficiente para mapeamento de calor.</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {accuracyData.map((s) => {
                      const errorRate = 100 - s.accuracy;
                      let bgClass = 'bg-am-surface-deep text-am-text-secondary border-am-border-default';
                      if (errorRate >= 60) bgClass = 'bg-am-error/10 text-am-error border-am-error/30 shadow-[0_0_12px_var(--color-am-error)_inset]';
                      else if (errorRate >= 35) bgClass = 'bg-am-brand-primary/10 text-am-brand-primary border-am-brand-primary/30';

                      return (
                        <div key={s.subject}
                          className={`flex items-center justify-center rounded-am-md border px-3 py-2 cursor-pointer transition-all hover:scale-[1.03] ${bgClass}`}
                          title={`${s.subject}: ${s.accuracy}% acerto`}
                        >
                          <span className="text-am-caption font-bold font-mono tracking-wider">
                            {s.subject.length > 16 ? s.subject.substring(0, 14) + '…' : s.subject}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-am-border-default">
                    <div className="bg-am-surface-deep p-4 rounded-am-md">
                      <p className="text-am-caption font-mono text-am-text-tertiary uppercase tracking-wider mb-1">Ameaça Principal</p>
                      <p className="font-brand text-am-body font-bold text-am-text-primary">{worstSubject?.subject || '—'}</p>
                      {worstSubject && <p className="text-am-caption text-am-error mt-1">{worstSubject.accuracy}% retenção (Crítico)</p>}
                    </div>
                    <div className="bg-am-surface-deep p-4 rounded-am-md">
                      <p className="text-am-caption font-mono text-am-text-tertiary uppercase tracking-wider mb-1">Padrão Detectado</p>
                      <p className="text-am-body-sm text-am-text-secondary mt-1">
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
                <p className="py-6 text-center text-am-body-sm text-am-text-secondary">Faça testes para popular este quadro.</p>
              ) : (
                <div className="space-y-4">
                  {[...accuracyData]
                    .sort((a, b) => (ACCURACY_WEIGHTS[b.subject] || 1) - (ACCURACY_WEIGHTS[a.subject] || 1))
                    .map((s) => {
                      const weight = ACCURACY_WEIGHTS[s.subject] || 1;
                      const c = getAccuracyColor(s.accuracy);
                      return (
                        <div key={s.subject} className="group">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-am-body-sm text-am-text-primary font-medium">{s.subject}</span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-auto">Peso {weight}</Badge>
                            </div>
                            <span className={`text-am-body-sm font-bold font-mono ${c.text}`}>{s.accuracy}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-am-surface-deep">
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
                <Link href="/provas" className="flex items-center justify-between p-3 rounded-am-md bg-am-surface-elevated border border-am-border-default hover:border-am-brand-primary/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-am-text-secondary group-hover:text-am-brand-primary transition-colors" />
                    <span className="text-am-body-sm font-medium text-am-text-primary">Banco Oficial</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-am-text-tertiary" />
                </Link>
                {capabilities.canCreateSimulados ? (
                  <Link href="/provas/criar-simulado" className="flex items-center justify-between p-3 rounded-am-md bg-am-brand-primary/10 border border-am-brand-primary/30 hover:bg-am-brand-primary/20 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-am-brand-primary" />
                      <span className="text-am-body-sm font-medium text-am-brand-primary">Gerador Inteligente</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-am-brand-primary/50" />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-am-md bg-am-surface-elevated border border-am-border-default opacity-60">
                    <div className="flex items-center gap-3">
                      <Lock className="h-4 w-4 text-am-text-tertiary" />
                      <span className="text-am-body-sm font-medium text-am-text-primary">Gerador Inteligente</span>
                    </div>
                    <Badge variant="outline">Pro</Badge>
                  </div>
                )}
              </div>
            </ChartCard>

            {/* History Snapshot */}
            <ChartCard title="Recentes" subtitle="Performance em baterias" loading={loading}>
              <div className="space-y-3">
                {accuracyData.slice(0, 5).map((s, i) => {
                  const c = getAccuracyColor(s.accuracy);
                  return (
                    <div key={s.subject + i} className="flex items-center justify-between p-3 rounded-am-md bg-am-surface-subtle border border-am-border-subtle">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 bg-am-surface h-8 w-8 rounded-am-md flex items-center justify-center border border-am-border-default">
                          <Trophy className="h-3 w-3 text-am-text-secondary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-am-body-sm font-medium text-am-text-primary truncate">{s.subject}</p>
                          <p className="text-am-caption font-mono text-am-text-tertiary">{s.totalQuestions} qs</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right pl-2">
                        <span className={`text-am-body-sm font-bold font-mono ${c.text}`}>{s.accuracy}%</span>
                      </div>
                    </div>
                  );
                })}
                {accuracyData.length === 0 && !loading && (
                  <div className="text-center py-6">
                    <p className="text-am-caption text-am-text-secondary">Sem baterias recentes.</p>
                    <Link href="/provas" className="text-am-caption text-am-brand-primary hover:underline mt-1 inline-flex items-center gap-1">Realizar Bateria <ChevronRight className="h-3 w-3" /></Link>
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
