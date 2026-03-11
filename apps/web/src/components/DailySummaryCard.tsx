/**
 * Card de Resumo Diário Automático
 *
 * Mostra um resumo inteligente do dia:
 * - Total estudado hoje
 * - Matéria dominante
 * - Matéria ignorada (se tiver plano)
 * - Sessões realizadas
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sun, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';
import { StudySession, PlanVsActual } from '@/types';
import { formatDuration } from '@/lib/utils';

interface DailySummaryCardProps {
  todaySessions: StudySession[];
  totalTodaySeconds: number;
  planVsActual: PlanVsActual[];
  loading?: boolean;
}

export default function DailySummaryCard({
  todaySessions,
  totalTodaySeconds,
  planVsActual,
  loading,
}: DailySummaryCardProps) {
  const analysis = useMemo(() => {
    if (todaySessions.length === 0) return null;

    // Matéria dominante hoje
    const subjectMap = new Map<string, number>();
    for (const s of todaySessions) {
      subjectMap.set(s.subject, (subjectMap.get(s.subject) || 0) + s.duration);
    }
    const sorted = [...subjectMap.entries()].sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0];

    // Matéria negligenciada (do plano)
    const neglected = planVsActual
      .filter((p) => p.status === 'neglected')
      .sort((a, b) => a.deviation - b.deviation)[0];

    return {
      dominantSubject: dominant[0],
      dominantDuration: dominant[1],
      subjectCount: subjectMap.size,
      sessionCount: todaySessions.length,
      neglectedSubject: neglected?.subject || null,
    };
  }, [todaySessions, planVsActual]);

  if (loading) {
    return (
      <div className="rounded-xl border border-am-border-default bg-am-surface-elevated p-5">
        <div className="mb-3 h-4 w-36 rounded shimmer" />
        <div className="h-7 w-24 rounded shimmer" />
      </div>
    );
  }

  // Sem sessões hoje
  if (!analysis) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-xl border border-am-border-default bg-am-surface-elevated p-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-am-surface-subtle">
            <Sun className="h-4 w-4 text-am-text-secondary" />
          </div>
          <div>
            <p className="text-sm font-medium text-am-text-secondary">Resumo de Hoje</p>
            <p className="text-xs text-am-text-tertiary">Nenhuma sessão registrada ainda. Bora estudar?</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-xl border border-violet-500/15 bg-gradient-to-b from-violet-900/10 to-[#0f1825] p-5"
    >
      {/* Decoração */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/5" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-am-text-secondary">Resumo de Hoje</span>
        </div>

        {/* Total */}
        <p className="mb-4 text-2xl font-bold text-am-text-primary sm:text-3xl">
          {formatDuration(totalTodaySeconds)}
          <span className="mt-1 block text-sm font-normal text-am-text-secondary sm:ml-2 sm:mt-0 sm:inline">
            em {analysis.sessionCount} {analysis.sessionCount === 1 ? 'sessão' : 'sessões'}
          </span>
        </p>

        {/* Info pills */}
        <div className="flex flex-wrap gap-2">
          {/* Matéria dominante */}
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5">
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-300">
              Foco: {analysis.dominantSubject} ({formatDuration(analysis.dominantDuration)})
            </span>
          </div>

          {/* Matérias estudadas */}
          {analysis.subjectCount > 1 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-[#3150AA]/10 px-3 py-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-[#F59768]" />
              <span className="text-xs text-violet-300">
                {analysis.subjectCount} matérias
              </span>
            </div>
          )}

          {/* Matéria negligenciada */}
          {analysis.neglectedSubject && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-amber-300">
                Pendente: {analysis.neglectedSubject}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
