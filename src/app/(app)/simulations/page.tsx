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
  Sparkles,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
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
  if (acc >= 80) return { text: 'text-emerald-400', bar: 'bg-emerald-500', glow: 'rgba(16,185,129,0.15)', label: 'Excelente' };
  if (acc >= 65) return { text: 'text-[#F59768]', bar: 'bg-[#F59768]', glow: 'rgba(245,151,104,0.15)', label: 'Bom' };
  if (acc >= 50) return { text: 'text-amber-400', bar: 'bg-amber-500', glow: 'rgba(245,158,11,0.15)', label: 'Regular' };
  return { text: 'text-red-400', bar: 'bg-red-500', glow: 'rgba(239,68,68,0.15)', label: 'Crítico' };
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
    <div className="relative min-h-screen bg-[#0A0A0A]">
      {/* ── Atmospheric depth ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-[400px] w-[400px] rounded-full bg-[#3150AA]/8 blur-[140px]" />
        <div className="absolute bottom-1/4 -left-32 h-[350px] w-[350px] rounded-full bg-[#F59768]/5 blur-[120px]" />
      </div>

      {/* ── Hero Header ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative border-b border-white/[0.07] px-6 py-8"
        style={{ background: 'linear-gradient(180deg, rgba(14,17,27,0.9) 0%, rgba(10,10,10,0.95) 100%)' }}
      >
        <div className="rds-grid-bg absolute inset-0 pointer-events-none" />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F59768] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F59768]" style={{ boxShadow: '0 0 10px rgba(245,151,104,0.6)' }} />
              </span>
              <span className="rounded-full border border-[#F59768]/20 bg-[#F59768]/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F59768] font-mono">
                Fase Ativa
              </span>
            </div>
            <h1 className="font-brand text-3xl font-bold tracking-tight text-white">
              Advanced Simulation Center
            </h1>
            <p className="mt-1 text-sm text-[#666]">
              Simulados de precisão com IA para competição de alto nível
            </p>
          </div>

          {/* Projected score card */}
          {projectedScore && (
            <div className="hidden lg:block relative overflow-hidden rounded-2xl border border-white/[0.10] p-5 text-right"
              style={{
                background: 'linear-gradient(135deg, rgba(49,80,170,0.12), rgba(245,151,104,0.08))',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-[#F59768]/10 blur-[40px]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F59768] font-mono">Pontuação Projetada</p>
              <p className="mt-1 font-brand text-4xl font-bold text-white">{projectedScore}<span className="text-lg text-[#666]">/1000</span></p>
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-mono">Ranking {percentile}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(projectedScore / 1000) * 100}%`,
                    background: 'var(--identity-grad)',
                    boxShadow: '0 0 12px rgba(245,151,104,0.3)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="relative px-6 py-6">
        {/* ── Launch Simulation Banner ── */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
          className="mb-6 relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
          style={{
            background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div className="pointer-events-none absolute -bottom-10 right-1/4 h-32 w-64 rounded-full bg-[#3150AA]/8 blur-[60px]" />

          <div className="relative flex items-center gap-5">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'var(--identity-grad)', boxShadow: '0 0 24px rgba(245,151,104,0.15)' }}
            >
              <Target className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-brand text-lg font-bold text-white">Iniciar Novo Simulado</h3>
              <p className="text-sm text-[#666]">Questões com IA calibrada por banca e edital</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Duration selector */}
              <div className="flex rounded-full border border-white/[0.10] overflow-hidden">
                {(['1h', '2h', '4h'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}
                    className={`px-4 py-2 text-xs font-bold transition-all font-mono ${selectedDuration === d
                        ? 'text-white'
                        : 'text-[#666] hover:text-slate-300'
                      }`}
                    style={selectedDuration === d ? { background: 'var(--identity-grad)' } : undefined}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {capabilities.canCreateSimulados ? (
                <Link
                  href="/provas/criar-simulado"
                  className="rds-btn-identity flex items-center gap-2.5 px-6 py-3 text-sm"
                >
                  <Play className="h-4 w-4" />
                  Iniciar
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-2 rounded-full bg-white/[0.05] border border-white/[0.10] px-5 py-2.5 text-sm font-medium text-[#666] cursor-not-allowed"
                >
                  <Lock className="h-4 w-4" />
                  Pro necessário
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Stats Row ── */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl shimmer" />)
          ) : (
            <>
              {[
                { label: 'Precisão Média', value: `${avgAccuracy}%`, icon: CheckCircle2, color: '#10b981', desc: `${accuracyData.length} matérias` },
                { label: 'Tempo Médio/Q', value: '—', icon: Clock, color: '#F59768', desc: 'Indisponível' },
                { label: 'Total de Questões', value: totalQuestions.toLocaleString(), icon: BookOpen, color: '#3150AA', desc: `${totalCorrect} corretas` },
                { label: 'Simulados', value: '—', icon: BarChart2, color: '#f59e0b', desc: 'Ver em Provas' },
              ].map(({ label, value, icon: Icon, color, desc }, i) => (
                <motion.div key={label} custom={i + 1} variants={fadeUp} initial="hidden" animate="show"
                  className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-5"
                  style={{
                    background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="pointer-events-none absolute -top-6 -right-6 h-16 w-16 rounded-full blur-[30px]" style={{ background: `${color}10` }} />
                  <div className="relative">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: `${color}15`, boxShadow: `0 0 16px ${color}10` }}
                    >
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <p className="font-brand text-2xl font-bold text-white">{value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#666] font-mono mt-1">{label}</p>
                    <p className="text-[10px] text-[#666] font-mono">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {/* Error Heatmap */}
            <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show"
              className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
              style={{
                background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15"
                    style={{ boxShadow: '0 0 16px rgba(239,68,68,0.08)' }}
                  >
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-brand text-sm font-bold text-white">Mapa de Erros</h3>
                    <p className="text-[10px] text-[#666] font-mono uppercase tracking-wider">Análise por matéria</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#666] font-mono">
                  <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ background: 'rgba(49,80,170,0.15)' }} /> Baixo</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#3150AA]/50" /> Moderado</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#F59768]" /> Alto</span>
                </div>
              </div>

              {loading ? (
                <div className="h-32 rounded-xl shimmer" />
              ) : accuracyData.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3150AA]/10">
                    <Target className="h-7 w-7 text-[#666]" />
                  </div>
                  <p className="font-brand text-sm text-[#666]">Nenhuma questão respondida ainda</p>
                  <p className="mt-1 text-[10px] text-[#666] font-mono">Faça simulados para ver seu mapa de erros</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {accuracyData.map((s) => {
                      const errorRate = 100 - s.accuracy;
                      const bg = errorRate >= 60 ? '#F59768' : errorRate >= 35 ? 'rgba(49,80,170,0.5)' : 'rgba(49,80,170,0.15)';
                      return (
                        <div key={s.subject}
                          className="flex items-center justify-center rounded-xl px-3 py-2.5 cursor-default transition-all hover:scale-[1.03]"
                          style={{ background: bg, boxShadow: errorRate >= 60 ? '0 0 16px rgba(245,151,104,0.2)' : 'none' }}
                          title={`${s.subject}: ${s.accuracy}% acerto`}
                        >
                          <span className="text-[10px] font-bold text-white/90 font-mono uppercase tracking-wider">
                            {s.subject.length > 14 ? s.subject.substring(0, 12) + '…' : s.subject}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-5 border-t border-white/[0.07] pt-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#666] font-mono">Disciplina mais fraca</p>
                      <p className="font-brand text-sm font-bold text-white mt-1">{worstSubject?.subject || '—'}</p>
                      {worstSubject && <p className="text-xs text-red-400 font-mono">{worstSubject.accuracy}% precisão</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#666] font-mono">Padrão de erro</p>
                      <p className="font-brand text-sm font-bold text-white mt-1">
                        {worstSubject?.accuracy !== undefined && worstSubject.accuracy < 50 ? 'Alta taxa de erro' : 'Em análise'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            {/* Subject Strategic Review */}
            <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show"
              className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
              style={{
                background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#3150AA]/6 blur-[50px]" />

              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--identity-grad)', boxShadow: '0 0 16px rgba(245,151,104,0.1)' }}>
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-brand text-sm font-bold text-white">Revisão Estratégica por Matéria</h3>
                    <p className="text-[10px] text-[#666] font-mono uppercase tracking-wider">Ponderada pelo edital</p>
                  </div>
                </div>
                <div className="flex rounded-full border border-white/[0.10] overflow-hidden">
                  {['Semana', 'Mês', 'Tudo'].map((t) => (
                    <button key={t} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider font-mono transition-colors ${t === 'Mês' ? 'bg-[#F59768]/15 text-[#F59768]' : 'text-[#666] hover:text-slate-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded-xl shimmer" />)}
                </div>
              ) : accuracyData.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#666] font-mono">Responda questões para ver a análise</p>
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
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm text-slate-300">{s.subject}</span>
                              <span className="rounded-full border border-white/[0.10] bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold text-[#666] font-mono">Peso {weight}</span>
                            </div>
                            <span className={`text-sm font-bold font-mono ${c.text}`}>{s.accuracy}%</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${s.accuracy}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className={`h-full rounded-full ${c.bar}`}
                              style={{ boxShadow: `0 0 10px ${c.glow}` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Right Column ── */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show"
            className="space-y-5"
          >
            {/* Recent history */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-5"
              style={{
                background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3150AA]/15">
                    <Clock className="h-4 w-4 text-[#F59768]" />
                  </div>
                  <h3 className="font-brand text-sm font-bold text-white">Histórico</h3>
                </div>
                <Link href="/provas" className="flex items-center gap-1 rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1 text-[10px] text-[#666] transition-colors hover:text-slate-300 font-mono">
                  Ver tudo <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {accuracyData.slice(0, 5).map((s, i) => {
                  const c = getAccuracyColor(s.accuracy);
                  const label = s.accuracy >= 80 ? 'ELITE' : s.accuracy >= 65 ? 'APROVADO' : 'MÉDIO';
                  const labelBg = s.accuracy >= 80 ? 'rgba(16,185,129,0.15)' : s.accuracy >= 65 ? 'rgba(245,151,104,0.15)' : 'rgba(245,158,11,0.15)';
                  const labelColor = s.accuracy >= 80 ? '#10b981' : s.accuracy >= 65 ? '#F59768' : '#f59e0b';
                  return (
                    <div key={s.subject + i}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 transition-all hover:bg-white/[0.04] hover:border-white/[0.10]"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                        <Trophy className="h-4 w-4 text-[#666]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">{s.subject}</p>
                        <p className="text-[10px] text-[#666] font-mono">{s.totalQuestions} questões</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wider"
                          style={{ background: labelBg, color: labelColor }}
                        >
                          {label}
                        </span>
                        <span className={`text-xs font-bold font-mono ${c.text}`}>{s.accuracy}%</span>
                      </div>
                    </div>
                  );
                })}
                {accuracyData.length === 0 && !loading && (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3150AA]/10">
                      <BookOpen className="h-6 w-6 text-[#666]" />
                    </div>
                    <p className="text-xs text-[#666] font-mono">Nenhum simulado realizado</p>
                    <Link href="/provas" className="mt-2 inline-flex items-center gap-1 text-xs text-[#F59768] hover:text-[#F59768]/80 transition-colors font-mono">
                      Acessar banco de questões <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick access */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-5"
              style={{
                background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#666] font-mono">Acesso Rápido</p>
              <div className="space-y-2">
                <Link href="/provas"
                  className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/[0.04] hover:border-white/[0.10]"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-[#666]" />
                    <span>Provas Oficiais</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#666]" />
                </Link>
                {capabilities.canCreateSimulados ? (
                  <Link href="/provas/criar-simulado"
                    className="flex items-center justify-between rounded-xl border border-[#F59768]/20 px-4 py-3 text-sm text-[#F59768] transition-all hover:bg-[#F59768]/5"
                    style={{ background: 'rgba(245,151,104,0.05)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap className="h-4 w-4 text-[#F59768]" />
                      <span>Criar Simulado</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#F59768]/50" />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-[#666]">
                    <div className="flex items-center gap-2.5">
                      <Lock className="h-4 w-4" />
                      <span>Criar Simulado</span>
                    </div>
                    <span className="rounded-full border border-white/[0.10] bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold text-[#666] font-mono uppercase">Pro</span>
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
