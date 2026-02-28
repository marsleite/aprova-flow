/**
 * Gráfico de Barras — Evolução Semanal
 * 
 * Exibe horas estudadas por dia na semana atual (Seg–Dom).
 * O dia atual é destacado em violeta, demais em cinza.
 */

'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { DailyHours } from '@/types';

interface WeeklyBarChartProps {
  data: DailyHours[];
  loading?: boolean;
}

/** Tooltip customizado */
function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: DailyHours }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const { day, hours, isToday } = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0f1825] px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-sm font-medium text-white">
        {day} {isToday && <span className="text-violet-400">(Hoje)</span>}
      </p>
      <p className="text-sm text-violet-400">
        {hours < 1
          ? `${Math.round(hours * 60)} min`
          : `${hours.toFixed(1)}h`}
      </p>
    </div>
  );
}

const SKELETON_HEIGHTS = [45, 72, 30, 60, 50, 78, 38];

function ChartSkeleton() {
  return (
    <div className="flex h-[250px] items-end justify-around px-6 pt-8">
      {SKELETON_HEIGHTS.map((h, i) => (
        <div key={i} className="w-8 rounded-t shimmer" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[250px] flex-col items-center justify-center">
      <div className="mb-3 rounded-xl bg-white/[0.03] p-3">
        <BarChart3 className="h-8 w-8 text-slate-700" />
      </div>
      <p className="text-center text-sm text-slate-600">Nenhum dado nesta semana</p>
      <p className="mt-1 text-center text-xs text-slate-700">Registre sessões para ver a evolução</p>
    </div>
  );
}

export default function WeeklyBarChart({ data, loading }: WeeklyBarChartProps) {
  const hasData = data.some((d) => d.hours > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
      className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Evolução Semanal</h2>
          <p className="text-xs text-slate-500">Horas por dia esta semana</p>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <ChartSkeleton />
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#475569', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#334155', fontSize: 10 }}
              tickFormatter={(v: number) => (v > 0 ? `${v}h` : '')}
              width={35}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(139, 92, 246, 0.05)', radius: 4 }}
            />
            <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isToday ? '#3b82f6' : '#1e293b'}
                  fillOpacity={entry.isToday ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Legenda */}
      {!loading && hasData && (
        <div className="mt-2 flex items-center justify-center gap-4 border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-blue-500" />
            <span className="text-xs text-slate-500">Hoje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-slate-700" />
            <span className="text-xs text-slate-500">Outros dias</span>
          </div>
          <span className="text-xs text-slate-700">|</span>
          <span className="text-xs text-slate-500">
            Semana: {data.reduce((acc, d) => acc + d.hours, 0).toFixed(1)}h
          </span>
        </div>
      )}
    </motion.div>
  );
}
