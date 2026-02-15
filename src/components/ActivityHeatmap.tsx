/**
 * Heatmap de Atividade — Grid mensal tipo GitHub
 *
 * Mostra cada dia do mês com cor proporcional à intensidade de estudo.
 * Clicar num dia mostra detalhes (matérias, duração, sessões).
 * Navegação entre meses.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, X, Clock, BookOpen } from 'lucide-react';
import { DayActivity } from '@/types';
import { getMonthlyActivity } from '@/lib/firebase/sessions';
import { formatDuration } from '@/lib/utils';

interface ActivityHeatmapProps {
  userId: string;
  planId?: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-gray-800/40',
  1: 'bg-violet-900/60',
  2: 'bg-violet-700/70',
  3: 'bg-violet-500/80',
  4: 'bg-violet-400',
};

const LEVEL_BORDERS: Record<number, string> = {
  0: 'border-gray-800/30',
  1: 'border-violet-800/40',
  2: 'border-violet-600/40',
  3: 'border-violet-400/40',
  4: 'border-violet-300/50',
};

function getLocalDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ActivityHeatmap({ userId, planId }: ActivityHeatmapProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [days, setDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMonthlyActivity(userId, year, month, planId);
      setDays(data);
    } catch (err) {
      console.error('Erro ao carregar heatmap:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, year, month, planId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return; // Não avança além do mês atual

    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayStr = getLocalDateISO(now);

  // Calcula offset do primeiro dia do mês (0=Dom, 1=Seg...)
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Total do mês
  const totalMonthSeconds = days.reduce((acc, d) => acc + d.totalSeconds, 0);
  const daysStudied = days.filter((d) => d.totalSeconds > 0).length;

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
          <div className="rounded-xl bg-green-500/20 p-2.5">
            <Calendar className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Atividade</h3>
            <p className="text-sm text-gray-400">Consistência de estudos</p>
          </div>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[120px] text-center text-sm font-medium text-white">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid do calendário */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-md bg-gray-800/40" />
          ))}
        </div>
      ) : (
        <>
          {/* Labels dos dias da semana */}
          <div className="mb-1.5 grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-gray-600">
                {d}
              </div>
            ))}
          </div>

          {/* Dias */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Espaços vazios antes do primeiro dia */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Dias do mês */}
            {days.map((day) => {
              const dayNum = parseInt(day.date.split('-')[2]);
              const isFuture = day.date > todayStr;
              const isToday = day.date === todayStr;
              const isSelected = selectedDay?.date === day.date;

              return (
                <button
                  key={day.date}
                  onClick={() => !isFuture && setSelectedDay(isSelected ? null : day)}
                  disabled={isFuture}
                  className={`relative aspect-square rounded-md border text-xs font-medium transition-all
                    ${isFuture ? 'cursor-default border-transparent bg-gray-900/20 text-gray-800' : ''}
                    ${!isFuture ? `${LEVEL_COLORS[day.level]} ${LEVEL_BORDERS[day.level]} cursor-pointer hover:brightness-125` : ''}
                    ${isToday ? 'ring-1 ring-violet-400/50' : ''}
                    ${isSelected ? 'ring-2 ring-white/50 brightness-125' : ''}
                  `}
                  title={
                    isFuture
                      ? ''
                      : day.totalSeconds > 0
                      ? `${dayNum} — ${formatDuration(day.totalSeconds)}`
                      : `${dayNum} — sem estudo`
                  }
                >
                  <span
                    className={`absolute left-1 top-0.5 text-[10px] ${
                      isToday ? 'font-bold text-violet-300' : isFuture ? 'text-gray-800' : 'text-gray-400'
                    }`}
                  >
                    {dayNum}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-xs text-gray-500">
              {daysStudied} {daysStudied === 1 ? 'dia' : 'dias'} · {formatDuration(totalMonthSeconds)}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-600">Menos</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-3 w-3 rounded-sm ${LEVEL_COLORS[level]}`}
                />
              ))}
              <span className="text-[10px] text-gray-600">Mais</span>
            </div>
          </div>
        </>
      )}

      {/* Detalhe do dia selecionado */}
      <AnimatePresence>
        {selectedDay && selectedDay.totalSeconds > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {parseInt(selectedDay.date.split('-')[2])} de {MONTH_NAMES[month]}
                </span>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-gray-600 hover:text-gray-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1">
                  <Clock className="h-3 w-3 text-violet-400" />
                  <span className="text-xs text-violet-300">
                    {formatDuration(selectedDay.totalSeconds)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1">
                  <span className="text-xs text-blue-300">
                    {selectedDay.sessionCount} {selectedDay.sessionCount === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
                {selectedDay.subjects.map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-1 rounded-lg bg-gray-800/50 px-2.5 py-1"
                  >
                    <BookOpen className="h-3 w-3 text-gray-400" />
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
            className="mt-3 overflow-hidden"
          >
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
              <p className="text-xs text-gray-500">Nenhum estudo registrado neste dia</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
