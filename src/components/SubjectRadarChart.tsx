/**
 * Gráfico de Radar por Matéria
 * 
 * Exibe a distribuição de horas por matéria no mês atual.
 * - 0 matérias → empty state
 * - 1–2 matérias → barras horizontais com progresso + mensagem para desbloquear radar
 * - 3+ matérias → radar chart completo
 */

'use client';

import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Radar as RadarIcon, Lock } from 'lucide-react';
import { SubjectHours } from '@/types';

interface SubjectRadarChartProps {
  data: SubjectHours[];
  loading?: boolean;
}

// ============================
// Helpers
// ============================

function abbreviateSubject(subject: string): string {
  const abbreviations: Record<string, string> = {
    'Direito Constitucional': 'D. Const.',
    'Direito Administrativo': 'D. Admin.',
    'Direito Civil': 'D. Civil',
    'Direito Penal': 'D. Penal',
    'Direito Processual Civil': 'Proc. Civil',
    'Direito Processual Penal': 'Proc. Penal',
    'Direito do Trabalho': 'D. Trabalho',
    'Direito Tributário': 'D. Tribut.',
    'Raciocínio Lógico': 'Rac. Lógico',
    'Legislação Específica': 'Leg. Espec.',
  };
  return abbreviations[subject] || subject;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)}h`;
}

/** Cor consistente por matéria */
function getSubjectColor(subject: string): string {
  const colors = [
    '#8B5CF6', '#6366F1', '#3B82F6', '#06B6D4', '#10B981',
    '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316',
    '#84CC16', '#A855F7',
  ];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ============================
// Sub-components
// ============================

function CustomTick(props: Record<string, unknown>) {
  const { payload, x, y, textAnchor } = props as {
    payload: { value: string };
    x: number;
    y: number;
    textAnchor: string;
  };
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor as 'start' | 'middle' | 'end'}
      fill="#475569"
      fontSize={10}
      dy={4}
    >
      {payload.value}
    </text>
  );
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { subject: string; hours: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const { subject, hours } = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0f1825] px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-sm font-medium text-white">{subject}</p>
      <p className="text-sm text-blue-400">{formatHours(hours)}</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-40 w-40 rounded-full border-2 border-dashed border-white/[0.06] shimmer" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="mb-3 rounded-xl bg-white/[0.03] p-3">
        <RadarIcon className="h-8 w-8 text-slate-700" />
      </div>
      <p className="text-center text-sm text-slate-600">Nenhuma sessão registrada ainda</p>
      <p className="mt-1 text-center text-xs text-slate-700">Estude usando o cronômetro para ver seu radar</p>
    </div>
  );
}

// ============================
// Visualização para 1-2 matérias (barras horizontais)
// ============================

const barContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const barItem = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

function FewSubjectsView({ data }: { data: SubjectHours[] }) {
  const maxHours = Math.max(...data.map((d) => d.hours), 0.01);
  const remaining = 3 - data.length;

  return (
    <div className="flex flex-1 flex-col justify-between">
      {/* Barras horizontais */}
      <motion.div
        variants={barContainer}
        initial="hidden"
        animate="show"
        className="space-y-4 py-4"
      >
        {data.map((item) => {
          const pct = Math.max((item.hours / maxHours) * 100, 4);
          const color = getSubjectColor(item.subject);
          return (
            <motion.div key={item.subject} variants={barItem}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-white">{item.subject}</span>
                <span className="text-sm font-semibold text-gray-300">{formatHours(item.hours)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Mensagem para desbloquear o radar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-4 flex items-center gap-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.05] px-4 py-3"
      >
        <Lock className="h-4 w-4 shrink-0 text-blue-400" />
        <p className="text-xs text-slate-500">
          Estude mais <span className="font-semibold text-blue-300">{remaining} {remaining === 1 ? 'matéria' : 'matérias'}</span> para desbloquear o gráfico de radar completo
        </p>
      </motion.div>
    </div>
  );
}

// ============================
// Radar Chart (3+ matérias)
// ============================

function FullRadarChart({ data }: { data: SubjectHours[] }) {
  const chartData = data.map((item) => ({
    ...item,
    abbr: abbreviateSubject(item.subject),
  }));

  return (
    <div className="flex-1 min-h-[160px]">
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="52%" outerRadius="72%" data={chartData}>
        <PolarGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="abbr"
          tick={(props: Record<string, unknown>) => <CustomTick {...props} />}
        />
        <PolarRadiusAxis
          tick={{ fill: '#334155', fontSize: 9 }}
          tickFormatter={(value: number) => `${value}h`}
          axisLine={false}
        />
        <Radar
          name="Horas"
          dataKey="hours"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ r: 3.5, fill: '#3b82f6', stroke: '#60a5fa', strokeWidth: 1 }}
          activeDot={{ r: 5, fill: '#60a5fa', stroke: '#93c5fd', strokeWidth: 2 }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
    </div>
  );
}

// ============================
// Componente Principal
// ============================

export default function SubjectRadarChart({ data, loading }: SubjectRadarChartProps) {
  const hasEnoughForRadar = data.length >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex h-full flex-col rounded-2xl border border-white/[0.07] bg-[#0f1825] p-5"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
          <RadarIcon className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">
            {hasEnoughForRadar ? 'Radar por Matéria' : 'Progresso por Matéria'}
          </h2>
          <p className="text-xs text-slate-500">Distribuição de horas no mês</p>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <ChartSkeleton />
      ) : data.length === 0 ? (
        <EmptyState />
      ) : hasEnoughForRadar ? (
        <FullRadarChart data={data} />
      ) : (
        <FewSubjectsView data={data} />
      )}

      {/* Legenda (só para o radar completo) */}
      {!loading && data.length > 0 && (
        <div className="mt-2 flex items-center justify-center gap-4 border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-500">
              {data.length} {data.length === 1 ? 'matéria' : 'matérias'}
            </span>
          </div>
          <span className="text-xs text-slate-700">|</span>
          <span className="text-xs text-slate-500">
            Total: {data.reduce((acc, d) => acc + d.hours, 0).toFixed(1)}h
          </span>
        </div>
      )}
    </motion.div>
  );
}
