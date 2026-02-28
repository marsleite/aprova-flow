/**
 * Cards de Resumo do Dashboard
 * 
 * Exibe 3 cards com o total de horas de estudo (Hoje, Semana, Mês)
 * com animações staggered de entrada e números impactantes.
 */

'use client';

import { motion } from 'framer-motion';
import { Clock, CalendarDays, CalendarRange, TrendingUp } from 'lucide-react';
import { StudySummary } from '@/types';
import { formatDuration } from '@/lib/utils';

interface SummaryCardsProps {
  summary: StudySummary;
  loading?: boolean;
}

interface CardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  glowColor: string;
  index: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

function Card({ title, value, subtitle, icon, gradient, iconBg, glowColor }: CardProps) {
  return (
    <motion.div
      variants={item}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f1825] p-5`}
    >
      {/* Decoração de fundo */}
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/[0.02]" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl ${iconBg} p-2.5 shadow-lg ${glowColor}`}>
              {icon}
            </div>
            <span className="text-xs font-medium text-slate-500">{title}</span>
          </div>
          <TrendingUp className="h-3.5 w-3.5 text-slate-700" />
        </div>
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg shimmer" />
        <div className="h-3 w-24 rounded shimmer" />
      </div>
      <div className="h-8 w-28 rounded shimmer" />
      <div className="mt-2 h-2.5 w-20 rounded shimmer" />
    </div>
  );
}

/** Calcula a meta diária com base no total da semana */
function getDailyGoalText(totalWeek: number, totalToday: number): string {
  if (totalToday === 0) return 'Comece sua jornada!';
  const avgPerDay = totalWeek > 0 ? Math.round(totalWeek / 7 / 60) : 0;
  if (avgPerDay > 0) return `Média: ${avgPerDay}min/dia`;
  return 'Continue assim!';
}

export default function SummaryCards({ summary, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Card
        title="Total Hoje"
        value={formatDuration(summary.totalToday)}
        subtitle={summary.totalToday === 0 ? 'Nenhuma sessão hoje' : 'Bom trabalho!'}
        icon={<Clock className="h-5 w-5 text-violet-300" />}
        gradient="from-violet-900/80 to-violet-950/80"
        iconBg="bg-violet-500/20"
        glowColor="shadow-violet-500/20"
        index={0}
      />
      <Card
        title="Total Semana"
        value={formatDuration(summary.totalWeek)}
        subtitle={getDailyGoalText(summary.totalWeek, summary.totalToday)}
        icon={<CalendarDays className="h-5 w-5 text-blue-300" />}
        gradient="from-blue-900/80 to-blue-950/80"
        iconBg="bg-blue-500/20"
        glowColor="shadow-blue-500/20"
        index={1}
      />
      <Card
        title="Total Mês"
        value={formatDuration(summary.totalMonth)}
        subtitle={summary.totalMonth > 0 ? `${Math.round(summary.totalMonth / 3600)}h acumuladas` : 'Mês começando'}
        icon={<CalendarRange className="h-5 w-5 text-cyan-300" />}
        gradient="from-cyan-900/80 to-cyan-950/80"
        iconBg="bg-cyan-500/20"
        glowColor="shadow-cyan-500/20"
        index={2}
      />
    </motion.div>
  );
}
