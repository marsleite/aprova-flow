/**
 * Heatmap de Atividade — Grid anual estilo GitHub
 *
 * Mostra os últimos 12 meses em grid horizontal (semanas como colunas, dias como linhas).
 * Clicar num dia mostra detalhes (matérias, duração, sessões).
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, BookOpen, CalendarDays } from 'lucide-react';
import { DayActivity } from '@/types';
import { getMonthlyActivity } from '@/lib/firebase/sessions';
import { formatDuration } from '@/lib/utils';

interface ActivityHeatmapProps {
  userId: string;
  planId?: string;
  refreshKey?: number;
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const DAY_LABELS = ['', 'Seg', '', 'Qua', '', 'Sex', ''];

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-white/[0.05]',
  1: 'bg-blue-900/70',
  2: 'bg-blue-700/80',
  3: 'bg-blue-500',
  4: 'bg-blue-400',
};

const LEVEL_INLINE: Record<number, string> = {
  0: 'rgba(255,255,255,0.05)',
  1: 'rgba(30,58,138,0.7)',
  2: 'rgba(29,78,216,0.85)',
  3: '#3b82f6',
  4: '#60a5fa',
};

interface DayCell {
  date: string;
  level: number;
  totalSeconds: number;
  sessionCount: number;
  subjects: string[];
  dayOfWeek: number; // 0=Dom, 6=Sáb
  weekIndex: number;
}

function getLevelFromSeconds(totalSeconds: number): DayActivity['level'] {
  if (totalSeconds <= 0) return 0;

  const minutes = totalSeconds / 60;

  // Escala fixa para manter a leitura consistente em todo o período:
  // 1-29 min -> nível 1, 30-59 -> nível 2, 60-119 -> nível 3, 120+ -> nível 4.
  if (minutes >= 120) return 4;
  if (minutes >= 60) return 3;
  if (minutes >= 30) return 2;
  return 1;
}

export default function ActivityHeatmap({ userId, planId, refreshKey = 0 }: ActivityHeatmapProps) {
  const [allDays, setAllDays] = useState<Map<string, DayActivity>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);

  // Busca dados dos últimos 12 meses
  const fetchYearData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const promises: Promise<DayActivity[]>[] = [];

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        promises.push(getMonthlyActivity(userId, d.getFullYear(), d.getMonth(), planId));
      }

      const results = await Promise.all(promises);
      const dayMap = new Map<string, DayActivity>();

      for (const monthDays of results) {
        for (const day of monthDays) {
          dayMap.set(day.date, day);
        }
      }

      setAllDays(dayMap);
    } catch (err) {
      console.error('Erro ao carregar heatmap:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, planId]);

  useEffect(() => {
    fetchYearData();
  }, [fetchYearData, refreshKey]);

  // Gera grid de ~53 semanas × 7 dias (estilo GitHub)
  const { grid, monthLabels, totalDays, totalSeconds, numWeeks } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // GitHub mostra até o sábado da semana atual
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // avança até sábado

    // Volta ~1 ano: encontra o domingo 52 semanas atrás
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() + 1); // dia seguinte ao mesmo dia do ano passado
    // Recua até o domingo dessa semana
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Total de dias e semanas
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDaysSpan = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
    const weeks = Math.ceil(totalDaysSpan / 7);

    // Grid: 7 linhas (Dom=0..Sáb=6) × N colunas (semanas)
    const gridData: (DayCell | null)[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: weeks }, () => null)
    );

    const months: { label: string; weekIndex: number }[] = [];
    let lastMonthTracked = -1;
    let totalSec = 0;
    let totalD = 0;
    const cursor = new Date(startDate);
    let cellIndex = 0;

    while (cursor <= endDate) {
      const col = Math.floor(cellIndex / 7); // semana (coluna)
      const row = cursor.getDay();            // dia da semana (linha)

      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const d = cursor.getDate();
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFuture = dateStr > todayStr;

      // Track month labels na primeira ocorrência de cada mês (quando é domingo)
      if (m !== lastMonthTracked) {
        if (row === 0) {
          months.push({ label: MONTH_NAMES_SHORT[m], weekIndex: col });
        } else if (d <= 7) {
          // Mês começou no meio da semana, mostra na próxima coluna
          months.push({ label: MONTH_NAMES_SHORT[m], weekIndex: col + 1 });
        }
        lastMonthTracked = m;
      }

      const activity = allDays.get(dateStr);
      const totalSecondsForCell = activity?.totalSeconds ?? 0;

      if (isFuture) {
        // Dias futuros: quadrado vazio (nível 0) para preencher o retângulo
        gridData[row][col] = {
          date: dateStr,
          level: 0,
          totalSeconds: 0,
          sessionCount: 0,
          subjects: [],
          dayOfWeek: row,
          weekIndex: col,
        };
      } else {
        const cell: DayCell = {
          date: dateStr,
          level: getLevelFromSeconds(totalSecondsForCell),
          totalSeconds: totalSecondsForCell,
          sessionCount: activity?.sessionCount ?? 0,
          subjects: activity?.subjects ?? [],
          dayOfWeek: row,
          weekIndex: col,
        };

        if (activity && activity.totalSeconds > 0) {
          totalSec += activity.totalSeconds;
          totalD++;
        }

        gridData[row][col] = cell;
      }

      cursor.setDate(cursor.getDate() + 1);
      cellIndex++;
    }

    return { grid: gridData, monthLabels: months, totalDays: totalD, totalSeconds: totalSec, numWeeks: weeks };
  }, [allDays]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const cellSize = 11;
  const cellGap = 2;
  const dayLabelWidth = 28;
  const gridWidth = numWeeks * cellSize + Math.max(0, numWeeks - 1) * cellGap;
  const heatmapWidth = dayLabelWidth + gridWidth;

  if (loading) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-white/[0.07] bg-[#0f1825] p-5"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.4)', minHeight: 220 }}
      >
        <div className="mb-4 h-5 w-48 rounded-lg shimmer" />
        <div className="flex-1 rounded-xl shimmer" />
        <div className="mt-3 h-3 w-32 rounded shimmer" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex h-full flex-col rounded-2xl border border-white/[0.07] bg-[#0f1825] p-5"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
            <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {totalDays} {totalDays === 1 ? 'dia' : 'dias'} de estudo
            </p>
            <p className="text-[10px] text-slate-600">Último ano</p>
          </div>
        </div>
      </div>

      {/* Heatmap grid — fills available height */}
      <div className="flex-1 overflow-x-auto">
        {/* Month labels */}
        <div className="relative mb-1.5 ml-8 h-4">
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="absolute text-[10px] font-medium text-slate-600"
              style={{ left: `${(m.weekIndex / numWeeks) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex items-stretch">
          {/* Day labels */}
          <div className="mr-1.5 grid w-7 shrink-0 grid-rows-7 gap-[3px]">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="flex items-center">
                <span className="w-6 pr-1 text-right text-[9px] font-medium text-slate-600">{label}</span>
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex min-w-0 flex-1 gap-[3px]">
            {Array.from({ length: numWeeks }).map((_, weekIdx) => (
              <div key={weekIdx} className="flex min-w-0 flex-1 flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const cell = grid[dayIdx][weekIdx];
                  if (!cell) {
                    return <div key={dayIdx} className="aspect-square w-full rounded-sm" />;
                  }
                  const isToday = cell.date === todayStr;
                  const isSelected = selectedDay?.date === cell.date;
                  return (
                    <button
                      key={dayIdx}
                      onClick={() => setSelectedDay(isSelected ? null : cell)}
                      className={`aspect-square w-full rounded-sm transition-all duration-150 hover:scale-110 hover:brightness-125 ${
                        isToday ? 'ring-1 ring-violet-400 ring-offset-1 ring-offset-[#0f1825]' : ''
                      } ${
                        isSelected ? 'ring-1 ring-white ring-offset-1 ring-offset-[#0f1825]' : ''
                      }`}
                      style={{ background: LEVEL_INLINE[cell.level] }}
                      title={
                        cell.totalSeconds > 0
                          ? `${cell.date} — ${formatDuration(cell.totalSeconds)}`
                          : `${cell.date} — sem estudo`
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          {formatDuration(totalSeconds)} no último ano
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-slate-600 mr-1">Menos</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="h-[10px] w-[10px] rounded-sm"
              style={{ background: LEVEL_INLINE[level] }}
            />
          ))}
          <span className="text-[9px] text-slate-600 ml-1">Mais</span>
        </div>
      </div>

      {/* Detalhe do dia selecionado */}
      <AnimatePresence>
        {selectedDay && selectedDay.totalSeconds > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{selectedDay.date}</span>
                <button onClick={() => setSelectedDay(null)} className="text-slate-600 hover:text-slate-400">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <div className="flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-1">
                  <Clock className="h-2.5 w-2.5 text-blue-400" />
                  <span className="text-xs font-medium text-blue-300">{formatDuration(selectedDay.totalSeconds)}</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-1">
                  <span className="text-xs text-violet-300">
                    {selectedDay.sessionCount} {selectedDay.sessionCount === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
                {selectedDay.subjects.map((s) => (
                  <div key={s} className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1">
                    <BookOpen className="h-2.5 w-2.5 text-slate-500" />
                    <span className="text-xs text-slate-400">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {selectedDay && selectedDay.totalSeconds === 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2 text-center">
              <p className="text-xs text-slate-600">Nenhum estudo registrado neste dia</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
