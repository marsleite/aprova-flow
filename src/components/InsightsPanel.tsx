/**
 * Painel de Insights Automáticos
 *
 * Exibe recomendações acionáveis baseadas nos dados de estudo:
 * matéria negligenciada, sugestão do dia, streak, equilíbrio.
 */

'use client';

import { motion } from 'framer-motion';
import {
  Lightbulb,
  AlertTriangle,
  Flame,
  Trophy,
  CheckCircle,
  Star,
  Target,
  Sparkles,
} from 'lucide-react';
import { StudyInsight } from '@/types';

interface InsightsPanelProps {
  insights: StudyInsight[];
  loading?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb,
  AlertTriangle,
  Flame,
  Trophy,
  CheckCircle,
  Star,
  Target,
  Sparkles,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

function InsightItem({ insight }: { insight: StudyInsight }) {
  const Icon = iconMap[insight.icon] || Lightbulb;

  return (
    <motion.div
      variants={item}
      className="flex gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-3 transition-colors hover:bg-white/[0.04]"
    >
      <div className="mt-0.5 shrink-0">
        <Icon className={`h-5 w-5 ${insight.color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{insight.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#666]">
          {insight.message}
        </p>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Sparkles className="mb-2 h-8 w-8 text-slate-700" />
      <p className="text-sm text-[#666]">Nenhum insight disponível</p>
      <p className="mt-1 text-xs text-slate-700">Configure seu plano de estudo e registre sessões para receber dicas</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-3">
          <div className="h-4 w-4 rounded shimmer" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded shimmer" />
            <div className="h-2.5 w-48 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InsightsPanel({ insights, loading }: InsightsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      className="h-full rounded-2xl border border-white/[0.07] bg-[#0E111B] p-5"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3150AA]/10">
          <Sparkles className="h-4 w-4 text-[#F59768]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Insights Estratégicos</h3>
          <p className="text-xs text-[#666]">Recomendações baseadas nos seus dados</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <Skeleton />
      ) : insights.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {insights.map((insight, idx) => (
            <InsightItem key={`${insight.type}-${idx}`} insight={insight} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
