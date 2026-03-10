/**
 * Heatmap de Atividade — Compact grid (últimas 25 semanas)
 *
 * Grade compacta com células grandes que preenchem o card.
 * Eixo X = número da semana, Eixo Y = dia da semana (1-7).
 * Clique no dia para detalhes.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

const DISPLAY_WEEKS = 25;

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const LEVEL_INLINE: Record<number, string> = {
  0: 'var(--color-am-surface-subtle)',
  1: '#8CB4FF', // aprovaBlue 300
  2: '#5E93FF', // aprovaBlue 400
  3: '#3D74F6', // aprovaBlue 500
  4: '#2E5ED9', // aprovaBlue 600
};

interface DayCell {
  date: string;
  level: number;
  totalSeconds: number;
  sessionCount: number;
  subjects: string[];
  dayOfWeek: number;
  weekIndex: number;
}

function getLevelFromSeconds(totalSeconds: number): DayActivity['level'] {
  if (totalSeconds <= 0) return 0;
  const minutes = totalSeconds / 60;
  if (minutes >= 120) return 4;
  if (minutes >= 60) return 3;
  if (minutes >= 30) return 2;
  return 1;
}

export default function ActivityHeatmap({ userId, planId, refreshKey = 0 }: ActivityHeatmapProps) {
  const [allDays, setAllDays] = useState<Map<string, DayActivity>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

  const { grid, totalDays, totalSeconds } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // End at Saturday of current week
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    // Start DISPLAY_WEEKS weeks back, on Sunday
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (DISPLAY_WEEKS * 7 - 1));

    // Grid: 7 rows × DISPLAY_WEEKS cols
    const gridData: (DayCell | null)[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: DISPLAY_WEEKS }, () => null)
    );

    let totalSec = 0;
    let totalD = 0;
    const cursor = new Date(startDate);
    let cellIndex = 0;

    while (cursor <= endDate) {
      const col = Math.floor(cellIndex / 7);
      const row = cursor.getDay();

      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const d = cursor.getDate();
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFuture = dateStr > todayStr;

      const activity = allDays.get(dateStr);
      const totalSecondsForCell = activity?.totalSeconds ?? 0;

      const cell: DayCell = {
        date: dateStr,
        level: isFuture ? 0 : getLevelFromSeconds(totalSecondsForCell),
        totalSeconds: isFuture ? 0 : totalSecondsForCell,
        sessionCount: isFuture ? 0 : (activity?.sessionCount ?? 0),
        subjects: isFuture ? [] : (activity?.subjects ?? []),
        dayOfWeek: row,
        weekIndex: col,
      };

      if (!isFuture && activity && activity.totalSeconds > 0) {
        totalSec += activity.totalSeconds;
        totalD++;
      }

      if (col < DISPLAY_WEEKS) {
        gridData[row][col] = cell;
      }

      cursor.setDate(cursor.getDate() + 1);
      cellIndex++;
    }

    return { grid: gridData, totalDays: totalD, totalSeconds: totalSec };
  }, [allDays]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col min-h-0">
        <div className="mb-3 h-5 w-28 rounded-lg shimmer" />
        <div className="flex-1 rounded-xl shimmer" />
        <div className="mt-3 h-3 w-32 rounded shimmer" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col min-h-0">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-am-brand-primary/10">
            <CalendarDays className="h-3.5 w-3.5 text-am-brand-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-am-text-primary">Activity</p>
            <p className="text-[10px] text-am-text-secondary">
              {totalDays} {totalDays === 1 ? 'dia' : 'dias'} · últimas {DISPLAY_WEEKS} semanas
            </p>
          </div>
        </div>
      </div>

      {/* Grid — fills remaining space */}
      <div ref={gridRef} className="flex-1 min-h-0 flex flex-col">
        {/* 7 rows × DISPLAY_WEEKS cols, cells fill available space */}
        <div className="flex flex-1 min-h-0 gap-0.5">
          {/* Day labels column */}
          <div className="flex flex-col gap-0.5 shrink-0 pr-1.5">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="flex flex-1 items-center justify-end">
                <span className="text-[9px] font-medium text-am-text-secondary">{label}</span>
              </div>
            ))}
          </div>

          {/* Week columns — each cell is flex-1 so they fill space */}
          {Array.from({ length: DISPLAY_WEEKS }).map((_, weekIdx) => (
            <div key={weekIdx} className="flex flex-1 min-w-0 flex-col gap-0.5">
              {Array.from({ length: 7 }).map((_, dayIdx) => {
                const cell = grid[dayIdx][weekIdx];
                if (!cell) {
                  return <div key={dayIdx} className="flex-1 rounded-[3px]" />;
                }
                const isToday = cell.date === todayStr;
                const isSelected = selectedDay?.date === cell.date;
                return (
                  <button
                    key={dayIdx}
                    onClick={() => setSelectedDay(isSelected ? null : cell)}
                    className={`flex-1 rounded-[3px] transition-all duration-150 hover:brightness-150 ${isToday ? 'ring-1 ring-violet-400/70 ring-offset-1 ring-offset-[#0f1825]' : ''
                      } ${isSelected ? 'ring-1 ring-white/60 ring-offset-1 ring-offset-[#0f1825]' : ''
                      }`}
                    style={{ background: LEVEL_INLINE[cell.level], minHeight: 0 }}
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

        {/* Week number axis */}
        <div className="flex mt-1 shrink-0">
          <div className="shrink-0 pr-1.5" style={{ width: 16 }} />
          {Array.from({ length: DISPLAY_WEEKS }).map((_, i) => (
            <div key={i} className="flex-1 min-w-0 text-center">
              {(i + 1) % 5 === 0 || i === 0 ? (
                <span className="text-[8px] text-am-text-tertiary">{i + 1}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Footer — legend + total */}
      <div className="mt-2 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-medium text-am-text-secondary">
          {formatDuration(totalSeconds)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-am-text-tertiary mr-0.5">Menos</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: LEVEL_INLINE[level] }}
            />
          ))}
          <span className="text-[8px] text-am-text-tertiary ml-0.5">Mais</span>
        </div>
      </div>

      {/* Selected day detail */}
      <AnimatePresence>
        {selectedDay && selectedDay.totalSeconds > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden shrink-0"
          >
            <div className="rounded-xl border border-am-border-default bg-am-surface-subtle p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-am-text-primary">{selectedDay.date}</span>
                <button onClick={() => setSelectedDay(null)} className="text-am-text-secondary hover:text-am-text-secondary">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <div className="flex items-center gap-1 rounded-lg bg-am-brand-primary/10 px-2 py-1">
                  <Clock className="h-2.5 w-2.5 text-am-brand-primary" />
                  <span className="text-xs font-medium text-am-brand-primary">{formatDuration(selectedDay.totalSeconds)}</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-am-brand-primary/10 px-2 py-1">
                  <span className="text-xs text-am-brand-primary font-medium">
                    {selectedDay.sessionCount} {selectedDay.sessionCount === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
                {selectedDay.subjects.map((s) => (
                  <div key={s} className="flex items-center gap-1 rounded-lg bg-am-surface-subtle border border-am-border-default px-2 py-1">
                    <BookOpen className="h-2.5 w-2.5 text-am-text-secondary" />
                    <span className="text-xs text-am-text-secondary">{s}</span>
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
            className="mt-2 overflow-hidden shrink-0"
          >
            <div className="rounded-xl border border-am-border-default bg-am-surface-subtle p-2 text-center">
              <p className="text-xs text-am-text-secondary">Nenhum estudo registrado neste dia</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
