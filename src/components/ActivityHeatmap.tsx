/**
 * Heatmap de Atividade — Grid anual estilo GitHub
 *
 * Mostra os últimos 12 meses em grid horizontal (semanas como colunas, dias como linhas).
 * Clicar num dia mostra detalhes (matérias, duração, sessões).
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, BookOpen } from 'lucide-react';
import { DayActivity } from '@/types';
import { getMonthlyActivity } from '@/lib/firebase/sessions';
import { formatDuration } from '@/lib/utils';

interface ActivityHeatmapProps {
  userId: string;
  planId?: string;
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const DAY_LABELS = ['', 'Seg', '', 'Qua', '', 'Sex', ''];

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-gray-800/40',
  1: 'bg-violet-900/60',
  2: 'bg-violet-700/70',
  3: 'bg-violet-500/80',
  4: 'bg-violet-400',
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

export default function ActivityHeatmap({ userId, planId }: ActivityHeatmapProps) {
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
  }, [fetchYearData]);

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
          level: activity?.level ?? 0,
          totalSeconds: activity?.totalSeconds ?? 0,
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-4 shadow-2xl"
      >
        <div className="animate-pulse">
          <div className="mb-3 h-5 w-64 rounded bg-gray-800"></div>
          <div className="h-24 w-full rounded bg-gray-800"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-4 shadow-2xl"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">
          {totalDays} {totalDays === 1 ? 'dia' : 'dias'} de estudo no último ano
        </span>
      </div>

      {/* Heatmap container */}
      <div className="overflow-x-auto pb-1">
        <div style={{ width: `max(100%, ${heatmapWidth}px)` }}>
          {/* Month labels - mobile (fixo) */}
          <div
            className="relative mb-1 h-4 sm:hidden"
            style={{ marginLeft: `${dayLabelWidth + 4}px`, width: `${gridWidth}px` }}
          >
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="absolute text-[10px] text-gray-500"
                style={{ left: `${m.weekIndex * (cellSize + cellGap)}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Month labels - desktop (elástico) */}
          <div className="relative mb-1 ml-8 hidden h-4 sm:block">
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="absolute text-[10px] text-gray-500"
                style={{ left: `${(m.weekIndex / numWeeks) * 100}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="mr-1 flex shrink-0 flex-col gap-[2px]">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  style={{ height: `${cellSize}px` }}
                  className="flex items-center sm:h-auto"
                >
                  <span className="w-6 pr-1 text-right text-[9px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>

            {/* Weeks columns */}
            <div className="flex gap-[2px] sm:flex-1">
              {Array.from({ length: numWeeks }).map((_, weekIdx) => (
                <div
                  key={weekIdx}
                  className="flex shrink-0 flex-col gap-[2px] sm:flex-1"
                  style={{ width: `${cellSize}px` }}
                >
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const cell = grid[dayIdx][weekIdx];
                    if (!cell) {
                      return (
                        <div
                          key={dayIdx}
                          className="h-[11px] w-[11px] rounded-sm bg-transparent sm:h-auto sm:w-auto sm:aspect-square"
                        />
                      );
                    }

                    const isToday = cell.date === todayStr;
                    const isSelected = selectedDay?.date === cell.date;

                    return (
                      <button
                        key={dayIdx}
                        onClick={() => setSelectedDay(isSelected ? null : cell)}
                        className={`h-[11px] w-[11px] rounded-sm transition-all sm:h-auto sm:w-auto sm:aspect-square
                          ${LEVEL_COLORS[cell.level]}
                          ${isToday ? 'ring-1 ring-violet-400' : ''}
                          ${isSelected ? 'ring-1 ring-white scale-110' : ''}
                          hover:brightness-125 cursor-pointer
                        `}
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
      </div>

      {/* Footer */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-gray-500">
          {formatDuration(totalSeconds)} no último ano
        </span>
        <div className="flex items-center gap-[3px]">
          <span className="text-[9px] text-gray-600 mr-1">Menos</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-[11px] w-[11px] rounded-sm ${LEVEL_COLORS[level]}`}
            />
          ))}
          <span className="text-[9px] text-gray-600 ml-1">Mais</span>
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
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-white">
                  {selectedDay.date}
                </span>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-gray-600 hover:text-gray-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                <div className="flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-0.5">
                  <Clock className="h-2.5 w-2.5 text-violet-400" />
                  <span className="text-xs text-violet-300">
                    {formatDuration(selectedDay.totalSeconds)}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-0.5">
                  <span className="text-xs text-blue-300">
                    {selectedDay.sessionCount} {selectedDay.sessionCount === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
                {selectedDay.subjects.map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-1 rounded-lg bg-gray-800/50 px-2 py-0.5"
                  >
                    <BookOpen className="h-2.5 w-2.5 text-gray-400" />
                    <span className="text-xs text-gray-300">{s}</span>
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
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-center">
              <p className="text-xs text-gray-500">Nenhum estudo registrado neste dia</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
