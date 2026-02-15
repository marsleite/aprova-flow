/**
 * AccuracyChart — Taxa de Acerto por Matéria
 *
 * RadialBar central (taxa geral) + barras horizontais por matéria.
 * Cores dinâmicas: verde (>=80%), amarelo (>=60%), vermelho (<60%).
 */

'use client';

import { motion } from 'framer-motion';
import { Target, ClipboardCheck } from 'lucide-react';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { SubjectAccuracy } from '@/types';

interface AccuracyChartProps {
  data: SubjectAccuracy[];
  loading?: boolean;
}

/* ---------- helpers ---------- */

function getAccuracyColor(accuracy: number) {
  if (accuracy >= 80)
    return { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/20', hex: '#10b981' };
  if (accuracy >= 60)
    return { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/20', hex: '#f59e0b' };
  return { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/20', hex: '#ef4444' };
}

/* ---------- animation variants ---------- */

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, x: -15 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

/* ---------- skeletons & empty ---------- */

function ChartSkeleton() {
  return (
    <div className="space-y-4 py-2">
      {/* Fake radial */}
      <div className="flex justify-center">
        <div className="h-[120px] w-[120px] animate-pulse rounded-full bg-gray-800/60" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="mb-1.5 flex justify-between">
            <div className="h-4 w-28 rounded bg-gray-800" />
            <div className="h-4 w-10 rounded bg-gray-800" />
          </div>
          <div className="h-3 w-full rounded-full bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center">
      <div className="mb-3 rounded-xl bg-gray-800/50 p-3">
        <ClipboardCheck className="h-8 w-8 text-gray-600" />
      </div>
      <p className="text-center text-sm text-gray-500">
        Nenhuma questão registrada
      </p>
      <p className="mt-1 text-center text-xs text-gray-600">
        Use o card de questões para começar
      </p>
    </div>
  );
}

/* ---------- RadialGauge ---------- */

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
        <PolarAngleAxis
          type="number"
          domain={[0, 100]}
          angleAxisId={0}
          tick={false}
        />
        <RadialBar
          dataKey="value"
          cornerRadius={6}
          background={{ fill: 'rgba(255,255,255,0.04)' }}
          isAnimationActive
          animationDuration={1200}
        />
      </RadialBarChart>
      {/* Label central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${color.text}`}>{accuracy}%</span>
        <span className="text-[10px] text-gray-500">geral</span>
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export default function AccuracyChart({ data, loading }: AccuracyChartProps) {
  const totalQuestions = data.reduce((acc, d) => acc + d.totalQuestions, 0);
  const totalCorrect = data.reduce((acc, d) => acc + d.correctAnswers, 0);
  const overallAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-2xl"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/20 p-2.5">
            <Target className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Taxa de Acerto</h2>
            <p className="text-sm text-gray-400">Desempenho por matéria no mês</p>
          </div>
        </div>

        {/* Badge com total de questões */}
        {!loading && data.length > 0 && (
          <div className="rounded-xl bg-gray-800/50 px-3 py-1.5">
            <span className="text-xs text-gray-400">{totalQuestions} Q</span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <ChartSkeleton />
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Gauge radial geral */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <OverallGauge accuracy={overallAccuracy} />
          </motion.div>

          {/* Barras por matéria */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mt-4 space-y-3"
          >
            {data.map((entry) => {
              const color = getAccuracyColor(entry.accuracy);
              return (
                <motion.div key={entry.subject} variants={item}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-white">
                      {entry.subject}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] text-gray-500">
                        {entry.correctAnswers}/{entry.totalQuestions}
                      </span>
                      <span className={`text-sm font-bold ${color.text}`}>
                        {entry.accuracy}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-800/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${entry.accuracy}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${color.bar}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}

      {/* Legenda */}
      {!loading && data.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-4 border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-gray-500">≥80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-gray-500">60-79%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-gray-500">&lt;60%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
