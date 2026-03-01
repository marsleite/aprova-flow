'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { getAccuracyAnalytics } from '@/lib/firebase/questions';
import { getRecentSessions } from '@/lib/firebase/sessions';
import { SubjectAccuracy } from '@/types';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  Target,
  Play,
  Clock,
  TrendingUp,
  BarChart2,
  BookOpen,
  Zap,
  Award,
  ChevronRight,
  Lock,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05, ease: 'easeOut' as const } }),
};

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
  if (acc >= 80) return { text: 'text-emerald-400', bar: 'bg-emerald-500', label: 'Excelente' };
  if (acc >= 65) return { text: 'text-blue-400', bar: 'bg-blue-500', label: 'Bom' };
  if (acc >= 50) return { text: 'text-amber-400', bar: 'bg-amber-500', label: 'Regular' };
  return { text: 'text-red-400', bar: 'bg-red-500', label: 'Crítico' };
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
  const bestSubject = [...accuracyData].sort((a, b) => b.accuracy - a.accuracy)[0] || null;

  // Projected score (Weighted by exam relevance)
  let totalWeightedAccuracy = 0;
  let totalWeights = 0;

  accuracyData.forEach(item => {
    const weight = ACCURACY_WEIGHTS[item.subject] || 1.0;
    // Only count subjects where the user has actually answered questions
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

  // Heatmap grid data
  const heatmapSubjects = accuracyData.length > 0 ? accuracyData : [
    { subject: 'Dir. Constitucional', accuracy: 0, totalQuestions: 0, correctAnswers: 0, sessions: 0 },
    { subject: 'Dir. Administrativo', accuracy: 0, totalQuestions: 0, correctAnswers: 0, sessions: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Header */}
      <div className="border-b border-white/[0.05] bg-[#0b1120]/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300 uppercase tracking-wider">
                Fase Ativa
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Advanced Simulation Center</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Simulados de precisão com IA para competição de alto nível
            </p>
          </div>

          {/* Projected score */}
          {projectedScore && (
            <div className="hidden rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-right lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">Pontuação Projetada</p>
              <p className="mt-1 text-3xl font-bold text-white">{projectedScore}<span className="text-base text-slate-500">/1000</span></p>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="text-xs text-emerald-400">Ranking {percentile}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${(projectedScore / 1000) * 100}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-600">Percentil {percentile}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Start simulation + stats */}
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          {/* Start simulation banner */}
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
            className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-gradient-to-r from-[#0f1825] to-[#111827] p-5"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600/20">
              <Target className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Iniciar Novo Simulado</h3>
              <p className="text-sm text-slate-500">Questões com IA calibrada por banca e edital</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Duration selector */}
              <div className="flex rounded-lg border border-white/[0.07] overflow-hidden">
                {(['1h', '2h', '4h'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${selectedDuration === d ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {capabilities.canCreateSimulados ? (
                <Link
                  href="/provas/criar-simulado"
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500"
                >
                  <Play className="h-4 w-4" />
                  Iniciar
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed"
                >
                  <Lock className="h-4 w-4" />
                  Pro necessário
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl shimmer" />)
          ) : (
            <>
              {[
                { label: 'Precisão Média', value: `${avgAccuracy}%`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', desc: `${accuracyData.length} matérias` },
                { label: 'Tempo Médio/Q', value: '—', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Indisponível' },
                { label: 'Total de Questões', value: totalQuestions.toLocaleString(), icon: BookOpen, color: 'text-violet-400', bg: 'bg-violet-500/10', desc: `${totalCorrect} corretas` },
                { label: 'Simulados', value: '—', icon: BarChart2, color: 'text-amber-400', bg: 'bg-amber-500/10', desc: 'Ver em Provas' },
              ].map(({ label, value, icon: Icon, color, bg, desc }, i) => (
                <motion.div key={label} custom={i} variants={fadeUp} initial="hidden" animate="show"
                  className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
                >
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-4.5 w-4.5 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{desc}</p>
                </motion.div>
              ))}
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Heatmap of mistakes + subject review */}
          <div className="space-y-6">
            {/* Heatmap */}
            <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show"
              className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-white">Mapa de Erros</h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-600">
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-700" /> Baixo</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-600/40" /> Moderado</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" /> Alto</span>
                </div>
              </div>

              {loading ? (
                <div className="h-32 rounded-lg shimmer" />
              ) : accuracyData.length === 0 ? (
                <div className="py-8 text-center">
                  <Target className="mx-auto mb-2 h-8 w-8 text-slate-700" />
                  <p className="text-sm text-slate-600">Nenhuma questão respondida ainda</p>
                  <p className="mt-1 text-xs text-slate-700">Faça simulados para ver seu mapa de erros</p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {accuracyData.map((s) => {
                      const errorRate = 100 - s.accuracy;
                      const intensity = errorRate >= 60 ? 'bg-blue-500' : errorRate >= 35 ? 'bg-blue-600/50' : 'bg-slate-700';
                      return (
                        <div key={s.subject}
                          className={`flex items-center justify-center rounded-md px-2.5 py-2 ${intensity} cursor-default transition-opacity hover:opacity-80`}
                          title={`${s.subject}: ${s.accuracy}% acerto`}
                        >
                          <span className="text-[10px] font-medium text-white/80">
                            {s.subject.length > 12 ? s.subject.substring(0, 10) + '…' : s.subject}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-white/[0.05] pt-3">
                    <div>
                      <p className="text-[10px] text-slate-600">Disciplina mais fraca</p>
                      <p className="text-sm font-semibold text-white">{worstSubject?.subject || '—'}</p>
                      {worstSubject && <p className="text-xs text-red-400">{worstSubject.accuracy}% precisão</p>}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-600">Padrão de erro crítico</p>
                      <p className="text-sm font-semibold text-white">
                        {worstSubject?.accuracy !== undefined && worstSubject.accuracy < 50 ? 'Alta taxa de erro' : 'Em análise'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            {/* Subject-Specific Strategic Review */}
            <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show"
              className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Revisão Estratégica por Matéria</h3>
                  <p className="text-xs text-slate-600">Análise ponderada com base no edital vigente</p>
                </div>
                <div className="flex gap-1">
                  {['Semana', 'Mês', 'Tudo'].map((t) => (
                    <button key={t} className={`rounded-md px-2.5 py-1 text-xs transition-colors ${t === 'Mês' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-600 hover:text-slate-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded shimmer" />)}
                </div>
              ) : accuracyData.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-600">Responda questões para ver a análise</p>
              ) : (
                <div className="space-y-3">
                  {[...accuracyData]
                    .sort((a, b) => (ACCURACY_WEIGHTS[b.subject] || 1) - (ACCURACY_WEIGHTS[a.subject] || 1))
                    .map((s) => {
                      const weight = ACCURACY_WEIGHTS[s.subject] || 1;
                      const c = getAccuracyColor(s.accuracy);
                      return (
                        <div key={s.subject}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-300">{s.subject}</span>
                              <span className="text-[10px] text-slate-600">Peso {weight}</span>
                            </div>
                            <span className={`text-sm font-bold ${c.text}`}>{s.accuracy}% Acerto</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className={`h-full rounded-full transition-all ${c.bar}`}
                              style={{ width: `${s.accuracy}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: Recent history */}
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show"
            className="space-y-4"
          >
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-white">Histórico Recente</h3>
                </div>
                <Link href="/provas" className="text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1">
                  Ver tudo <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {accuracyData.slice(0, 5).map((s, i) => {
                  const c = getAccuracyColor(s.accuracy);
                  const label = s.accuracy >= 80 ? 'ELITE' : s.accuracy >= 65 ? 'APROVADO' : 'MÉDIO';
                  const labelColor = s.accuracy >= 80 ? 'bg-violet-500/20 text-violet-300' : s.accuracy >= 65 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300';
                  return (
                    <div key={s.subject + i} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                        <Trophy className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{s.subject}</p>
                        <p className="text-[10px] text-slate-600">{s.totalQuestions} questões</p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${labelColor}`}>{label}</span>
                        <p className={`mt-0.5 text-xs font-bold ${c.text}`}>{s.accuracy}</p>
                      </div>
                    </div>
                  );
                })}
                {accuracyData.length === 0 && !loading && (
                  <div className="py-6 text-center">
                    <BookOpen className="mx-auto mb-2 h-6 w-6 text-slate-700" />
                    <p className="text-xs text-slate-600">Nenhum simulado realizado ainda</p>
                    <Link href="/provas" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      Acessar banco de questões <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick access to provas */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Acesso Rápido</p>
              <div className="space-y-2">
                <Link href="/provas"
                  className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-500" />
                    Provas Oficiais
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                </Link>
                {capabilities.canCreateSimulados ? (
                  <Link href="/provas/criar-simulado"
                    className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-3 py-2.5 text-sm text-blue-300 transition-colors hover:bg-blue-500/10"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-400" />
                      Criar Simulado
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-blue-500" />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Criar Simulado
                    </div>
                    <span className="text-[10px] text-slate-700">Pro</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
