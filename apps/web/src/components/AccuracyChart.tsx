/**
 * AccuracyChart — Taxa de Acerto por Matéria
 *
 * Visão rápida (Top 3) + modal completo com ordenação.
 * Suporta períodos: mês, últimos 3 meses e acumulado.
 */

'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, ClipboardCheck, X } from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { SubjectAccuracy } from '@/types';
import { AccuracyAnalytics, AccuracyPeriod } from '@/lib/firebase/questions';

interface AccuracyChartProps {
  data: SubjectAccuracy[];
  analytics?: AccuracyAnalytics | null;
  deltaBySubject?: Record<string, number>;
  loading?: boolean;
}

type SortMode = 'volume' | 'accuracy' | 'delta';

function getAccuracyColor(accuracy: number) {
  if (accuracy >= 80) {
    return { bar: 'bg-emerald-500', text: 'text-emerald-400', hex: '#10b981' };
  }
  if (accuracy >= 60) {
    return { bar: 'bg-amber-500', text: 'text-amber-400', hex: '#f59e0b' };
  }
  return { bar: 'bg-red-500', text: 'text-red-400', hex: '#ef4444' };
}

function getSampleBadge(totalQuestions: number) {
  if (totalQuestions >= 40) return 'Amostra alta';
  if (totalQuestions >= 15) return 'Amostra média';
  return 'Amostra baixa';
}

function EmptyState() {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center">
      <div className="mb-3 rounded-xl bg-gray-800/50 p-3">
        <ClipboardCheck className="h-8 w-8 text-gray-600" />
      </div>
      <p className="text-center text-sm text-gray-500">Nenhuma questão registrada</p>
      <p className="mt-1 text-center text-xs text-gray-600">
        Use o registro manual para questões feitas fora do app
      </p>
    </div>
  );
}

function OverallGauge({ accuracy }: { accuracy: number }) {
  const color = getAccuracyColor(accuracy);
  const chartData = [{ name: 'Acerto', value: accuracy, fill: color.hex }];

  return (
    <div className="relative mx-auto h-[140px] w-[140px]">
      <RadialBarChart
        width={140}
        height={140}
        cx={70}
        cy={70}
        innerRadius={48}
        outerRadius={65}
        startAngle={90}
        endAngle={-270}
        barSize={12}
        data={chartData}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar
          dataKey="value"
          cornerRadius={6}
          background={{ fill: 'rgba(255,255,255,0.04)' }}
          isAnimationActive
          animationDuration={1200}
        />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${color.text}`}>{accuracy}%</span>
        <span className="text-[10px] text-am-text-secondary">geral</span>
      </div>
    </div>
  );
}

export default function AccuracyChart({
  data,
  analytics,
  deltaBySubject = {},
  loading,
}: AccuracyChartProps) {
  const [period, setPeriod] = useState<AccuracyPeriod>('month');
  const [showAll, setShowAll] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('volume');

  const periodData = useMemo(() => {
    if (analytics) {
      if (period === 'all') return analytics.all;
      if (period === 'last3months') return analytics.last3months;
      return analytics.month;
    }
    return data;
  }, [analytics, data, period]);

  const previousMonthOverall = useMemo(() => {
    if (!analytics || analytics.previousMonth.length === 0) return null;
    const totalQ = analytics.previousMonth.reduce((acc, item) => acc + item.totalQuestions, 0);
    const totalC = analytics.previousMonth.reduce((acc, item) => acc + item.correctAnswers, 0);
    if (totalQ === 0) return null;
    return Math.round((totalC / totalQ) * 100);
  }, [analytics]);

  const totalQuestions = periodData.reduce((acc, d) => acc + d.totalQuestions, 0);
  const totalCorrect = periodData.reduce((acc, d) => acc + d.correctAnswers, 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const overallDelta = period === 'month' && previousMonthOverall !== null
    ? overallAccuracy - previousMonthOverall
    : null;

  const topSubjects = useMemo(
    () => [...periodData].sort((a, b) => b.totalQuestions - a.totalQuestions).slice(0, 3),
    [periodData]
  );

  const sortedAll = useMemo(() => {
    const arr = [...periodData];
    if (sortMode === 'accuracy') return arr.sort((a, b) => b.accuracy - a.accuracy);
    if (sortMode === 'delta') {
      return arr.sort(
        (a, b) => (deltaBySubject[b.subject] ?? Number.NEGATIVE_INFINITY) - (deltaBySubject[a.subject] ?? Number.NEGATIVE_INFINITY)
      );
    }
    return arr.sort((a, b) => b.totalQuestions - a.totalQuestions);
  }, [periodData, sortMode, deltaBySubject]);

  const insights = useMemo(() => {
    if (periodData.length === 0) return [];

    const cards: string[] = [];
    if (period === 'month') {
      const bestGrowth = periodData
        .map((s) => ({ subject: s.subject, delta: deltaBySubject[s.subject] }))
        .filter((s): s is { subject: string; delta: number } => typeof s.delta === 'number')
        .sort((a, b) => b.delta - a.delta)[0];

      if (bestGrowth && bestGrowth.delta > 0) {
        cards.push(`Maior evolução: ${bestGrowth.subject} (+${bestGrowth.delta} p.p.)`);
      }
    }

    const risk = [...periodData]
      .filter((s) => s.totalQuestions >= 10 && s.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)[0];

    if (risk) {
      cards.push(`Ponto de atenção: ${risk.subject} (${risk.accuracy}% em ${risk.totalQuestions}Q)`);
      cards.push(`Próxima ação: fazer 20 questões de revisão focada em ${risk.subject}.`);
    } else {
      cards.push('Sem matéria crítica no momento. Mantenha o ritmo de revisão.');
    }

    return cards.slice(0, 3);
  }, [periodData, period, deltaBySubject]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="rounded-xl border border-am-border-default bg-am-surface-elevated p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
              <Target className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-am-text-primary">Taxa de Acerto</h2>
              <p className="text-xs text-am-text-secondary">Desempenho por matéria no período</p>
            </div>
          </div>
          {!loading && periodData.length > 0 && (
            <div className="rounded-lg bg-am-surface-subtle px-3 py-1.5 text-xs text-am-text-secondary">
              {totalQuestions} Q
            </div>
          )}
        </div>

        {!loading && periodData.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { key: 'month', label: 'Mês atual' },
              { key: 'last3months', label: 'Últimos 3 meses' },
              { key: 'all', label: 'Todos os meses' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setPeriod(option.key as AccuracyPeriod)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  period === option.key
                    ? 'bg-[#3150AA]/20 text-[#F59768]/80'
                    : 'bg-am-surface-subtle text-am-text-secondary hover:bg-am-surface-subtle hover:text-am-text-secondary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-am-text-secondary">Carregando desempenho...</div>
        ) : periodData.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <OverallGauge accuracy={overallAccuracy} />

            {period === 'month' && overallDelta !== null && (
              <div className="mt-2 text-center text-xs">
                <span className={overallDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {overallDelta >= 0 ? '+' : ''}{overallDelta} p.p.
                </span>
                <span className="text-gray-500"> vs mês anterior</span>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {topSubjects.map((entry) => {
                const color = getAccuracyColor(entry.accuracy);
                const delta = period === 'month' ? deltaBySubject[entry.subject] : undefined;
                return (
                  <div key={entry.subject}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-am-text-primary">{entry.subject}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-am-text-secondary">
                          {entry.correctAnswers}/{entry.totalQuestions}
                        </span>
                        {typeof delta === 'number' && (
                          <span className={`text-[11px] ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {delta >= 0 ? '+' : ''}{delta}
                          </span>
                        )}
                        <span className={`text-sm font-bold ${color.text}`}>{entry.accuracy}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-am-surface-subtle">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${entry.accuracy}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${color.bar}`}
                      />
                    </div>
                    <div className="mt-1 text-right text-[10px] text-am-text-secondary">
                      {getSampleBadge(entry.totalQuestions)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-am-border-default pt-3">
              <span className="text-xs text-am-text-secondary">Top {topSubjects.length} de {periodData.length} matérias</span>
              {periodData.length > topSubjects.length && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-xs font-medium text-[#F59768]/80 hover:text-blue-200"
                >
                  Ver todas ({periodData.length})
                </button>
              )}
            </div>

            <div className="mt-3 space-y-1.5 border-t border-am-border-default pt-3">
              {insights.map((insight) => (
                <p key={insight} className="text-xs text-am-text-secondary">{insight}</p>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-am-border-strong bg-am-surface-elevated p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-am-text-primary">Todas as matérias</h3>
              <button
                onClick={() => setShowAll(false)}
                className="rounded-lg bg-am-surface-subtle p-2 text-am-text-secondary hover:bg-am-surface-subtle"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSortMode('volume')}
                className={`rounded-lg px-3 py-1.5 text-xs ${sortMode === 'volume' ? 'bg-[#3150AA]/20 text-[#F59768]/80' : 'bg-am-surface-subtle text-am-text-secondary'}`}
              >
                Ordenar por questões
              </button>
              <button
                onClick={() => setSortMode('accuracy')}
                className={`rounded-lg px-3 py-1.5 text-xs ${sortMode === 'accuracy' ? 'bg-[#3150AA]/20 text-[#F59768]/80' : 'bg-am-surface-subtle text-am-text-secondary'}`}
              >
                Ordenar por %
              </button>
              <button
                onClick={() => setSortMode('delta')}
                disabled={period !== 'month'}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  sortMode === 'delta' ? 'bg-[#3150AA]/20 text-[#F59768]/80' : 'bg-am-surface-subtle text-am-text-secondary'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Ganho no mês
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {sortedAll.map((entry) => {
                const color = getAccuracyColor(entry.accuracy);
                const delta = deltaBySubject[entry.subject];
                return (
                  <div key={`all-${entry.subject}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-am-text-primary">{entry.subject}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-am-text-secondary">
                          {entry.correctAnswers}/{entry.totalQuestions}
                        </span>
                        {typeof delta === 'number' && period === 'month' && (
                          <span className={`text-[11px] ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {delta >= 0 ? '+' : ''}{delta}
                          </span>
                        )}
                        <span className={`text-sm font-bold ${color.text}`}>{entry.accuracy}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-am-surface-subtle">
                      <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${entry.accuracy}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
