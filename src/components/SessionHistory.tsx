/**
 * Histórico de Sessões com Filtros + Exportação CSV
 *
 * Filtra por matéria, intervalo de datas e duração mínima.
 * Lista paginada com exportação.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  X,
} from 'lucide-react';
import { StudySession, SessionFilters, DEFAULT_SUBJECTS } from '@/types';
import { getFilteredSessions } from '@/lib/firebase/sessions';
import { formatDuration, formatRelativeDate, exportSessionsCSV } from '@/lib/utils';

interface SessionHistoryProps {
  userId: string;
  planId?: string;
}

const PAGE_SIZE = 8;

export default function SessionHistory({ userId, planId }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);

  // Filtros
  const [subject, setSubject] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minMinutes, setMinMinutes] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const filters: SessionFilters = {};
      if (planId) filters.planId = planId;
      if (subject) filters.subject = subject;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (minMinutes && Number(minMinutes) > 0) {
        filters.minDuration = Number(minMinutes) * 60;
      }
      const result = await getFilteredSessions(userId, filters);
      setSessions(result.sort((a, b) => b.startTime.localeCompare(a.startTime)));
      setPage(0);
    } catch (err) {
      console.error('Erro ao buscar sessões:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, planId, subject, dateFrom, dateTo, minMinutes]);

  // Busca inicial
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const clearFilters = () => {
    setSubject('');
    setDateFrom('');
    setDateTo('');
    setMinMinutes('');
  };

  const hasFilters = !!(subject || dateFrom || dateTo || minMinutes);
  const totalPages = Math.ceil(sessions.length / PAGE_SIZE);
  const paginatedSessions = sessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-2xl"
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/20 p-2.5">
            <History className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Histórico Completo</h3>
            <p className="text-sm text-gray-400">
              {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'} encontradas
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
              hasFilters
                ? 'border-violet-500/40 text-violet-300'
                : 'border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasFilters && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] text-white">
                !
              </span>
            )}
            {filtersOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          <button
            onClick={() => exportSessionsCSV(sessions)}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="grid gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Matéria */}
              <div>
                <label className="mb-1 block text-xs text-gray-400">Matéria</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                >
                  <option value="">Todas</option>
                  {DEFAULT_SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Data início */}
              <div>
                <label className="mb-1 block text-xs text-gray-400">De</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                />
              </div>

              {/* Data fim */}
              <div>
                <label className="mb-1 block text-xs text-gray-400">Até</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                />
              </div>

              {/* Duração mínima */}
              <div>
                <label className="mb-1 block text-xs text-gray-400">Duração mín. (min)</label>
                <input
                  type="number"
                  min={0}
                  value={minMinutes}
                  onChange={(e) => setMinMinutes(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
              >
                <X className="h-3 w-3" />
                Limpar filtros
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl bg-gray-900/50 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-gray-800" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-32 rounded bg-gray-800" />
                <div className="h-3 w-20 rounded bg-gray-800" />
              </div>
              <div className="h-5 w-14 rounded bg-gray-800" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <Search className="mb-2 h-8 w-8 text-gray-600" />
          <p className="text-sm text-gray-500">
            {hasFilters ? 'Nenhuma sessão com esses filtros' : 'Nenhuma sessão registrada'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {paginatedSessions.map((s, idx) => (
              <div
                key={s.id || idx}
                className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{s.subject}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatDuration(s.duration)}
                    <span className="text-gray-700">·</span>
                    {s.startTime && new Date(s.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {s.endTime && ` – ${new Date(s.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                  </div>
                </div>
                <span className="self-start rounded-lg bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300 sm:self-auto">
                  {formatRelativeDate(s.date)}
                </span>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-30 sm:px-3"
              >
                Anterior
              </button>
              <span className="text-xs text-gray-500">
                {page + 1} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-30 sm:px-3"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
