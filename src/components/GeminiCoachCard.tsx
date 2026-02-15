/**
 * Mini-card do Coach IA
 *
 * Mostra uma dica rápida contextual baseada nos dados
 * e botão para abrir o chat conversacional completo.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, MessageCircle, Sparkles, Target, AlertTriangle, Flame } from 'lucide-react';
import { StudyConsistency, SubjectHours, PlanVsActual } from '@/types';

interface GeminiCoachCardProps {
  consistency: StudyConsistency | null;
  subjectHours: SubjectHours[];
  planVsActual: PlanVsActual[];
  totalTodaySeconds: number;
  onOpenChat: () => void;
  loading?: boolean;
}

interface QuickTip {
  icon: React.ReactNode;
  text: string;
  color: string;
}

export default function GeminiCoachCard({
  consistency,
  subjectHours,
  planVsActual,
  totalTodaySeconds,
  onOpenChat,
  loading,
}: GeminiCoachCardProps) {
  // Gera dica contextual baseada nos dados (sem chamar IA)
  const tip: QuickTip = useMemo(() => {
    if (!consistency) {
      return {
        icon: <Sparkles className="h-4 w-4 text-violet-400" />,
        text: 'Configure sua meta semanal e plano de estudo para receber dicas personalizadas.',
        color: 'border-violet-500/15 bg-violet-500/5',
      };
    }

    // Streak prestes a quebrar (estudou ontem mas não hoje)
    if (consistency.currentStreak > 0 && totalTodaySeconds === 0) {
      return {
        icon: <Flame className="h-4 w-4 text-orange-400" />,
        text: `Seu streak de ${consistency.currentStreak} dias depende de hoje. Até 15 minutos já contam!`,
        color: 'border-orange-500/15 bg-orange-500/5',
      };
    }

    // Matéria negligenciada
    const neglected = planVsActual
      .filter((p) => p.status === 'neglected')
      .sort((a, b) => a.deviation - b.deviation)[0];
    if (neglected) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
        text: `${neglected.subject} está ${Math.abs(neglected.deviation)}% abaixo do planejado. Foque nela hoje.`,
        color: 'border-amber-500/15 bg-amber-500/5',
      };
    }

    // Meta semanal quase batida
    if (consistency.weeklyProgressPercent >= 70 && consistency.weeklyProgressPercent < 100) {
      const remainMins = Math.round(consistency.remainingSeconds / 60);
      return {
        icon: <Target className="h-4 w-4 text-cyan-400" />,
        text: `Faltam ${remainMins} min para bater a meta semanal. Você está quase lá!`,
        color: 'border-cyan-500/15 bg-cyan-500/5',
      };
    }

    // Meta batida
    if (consistency.weeklyProgressPercent >= 100) {
      return {
        icon: <Sparkles className="h-4 w-4 text-emerald-400" />,
        text: 'Meta semanal batida! Continue estudando para ir além ou descanse — você merece.',
        color: 'border-emerald-500/15 bg-emerald-500/5',
      };
    }

    // Default: sugestão baseada na matéria com menos horas
    if (subjectHours.length > 0) {
      const least = [...subjectHours].sort((a, b) => a.hours - b.hours)[0];
      return {
        icon: <Sparkles className="h-4 w-4 text-violet-400" />,
        text: `${least.subject} é sua matéria com menos horas. Que tal dedicar um tempo a ela?`,
        color: 'border-violet-500/15 bg-violet-500/5',
      };
    }

    return {
      icon: <Sparkles className="h-4 w-4 text-violet-400" />,
      text: 'Comece a estudar para receber dicas inteligentes do seu coach.',
      color: 'border-violet-500/15 bg-violet-500/5',
    };
  }, [consistency, planVsActual, subjectHours, totalTodaySeconds]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-white/10 bg-gray-900/70 p-5">
        <div className="mb-3 h-5 w-32 rounded bg-gray-800" />
        <div className="h-12 rounded bg-gray-800" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-gray-900 to-gray-950 p-5 shadow-2xl"
    >
      {/* Decoração */}
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/5 blur-xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-violet-500/30 to-blue-500/20 p-2">
            <Brain className="h-4 w-4 text-violet-300" />
          </div>
          <span className="text-sm font-semibold text-white">Coach IA</span>
          <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
            Gemini
          </span>
        </div>

        {/* Dica do dia */}
        <div className={`mb-4 flex items-start gap-2.5 rounded-xl border ${tip.color} px-3.5 py-3`}>
          <div className="mt-0.5 shrink-0">{tip.icon}</div>
          <p className="text-sm leading-relaxed text-gray-300">{tip.text}</p>
        </div>

        {/* Botão conversar */}
        <button
          onClick={onOpenChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/15 transition-all hover:shadow-violet-500/25 hover:brightness-110"
        >
          <MessageCircle className="h-4 w-4" />
          Conversar com o Coach
        </button>
      </div>
    </motion.div>
  );
}
