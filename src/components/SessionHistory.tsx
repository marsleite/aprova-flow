/**
 * Histórico de Sessões com Filtros + Exportação CSV
 *
 * Filtra por matéria, intervalo de datas e duração mínima.
 * Lista paginada com exportação e ajuste manual de sessões.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
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
  Plus,
  Pencil,
  Save,
  Loader2,
} from 'lucide-react';
import { StudySession, SessionFilters, DEFAULT_SUBJECTS } from '@/types';
import { getFilteredSessions, saveSession, updateSession } from '@/lib/firebase/sessions';
import { formatDuration, formatRelativeDate, exportSessionsCSV, getTodayISO } from '@/lib/utils';

interface SessionHistoryProps {
  userId: string;
  planId?: string;
  onSessionsChanged?: () => Promise<void> | void;
}

interface SessionFormState {
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
}

const PAGE_SIZE = 8;
const MAX_SESSION_SECONDS = 12 * 60 * 60;

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function createDefaultForm(defaultSubject: string): SessionFormState {
  const now = new Date();
  const end = new Date(now.getTime() + 50 * 60 * 1000);

  return {
    subject: defaultSubject,
    date: formatDateForInput(now),
    startTime: formatTimeForInput(now),
    endTime: formatTimeForInput(end),
  };
}

function createFormFromSession(session: StudySession): SessionFormState {
  const start = session.startTime ? new Date(session.startTime) : null;
  const end = session.endTime ? new Date(session.endTime) : null;

  return {
    subject: session.subject,
    date: session.date,
    startTime:
      start && !Number.isNaN(start.getTime()) ? formatTimeForInput(start) : '08:00',
    endTime: end && !Number.isNaN(end.getTime()) ? formatTimeForInput(end) : '09:00',
  };
}

function parseFormToSession(form: SessionFormState): {
  error?: string;
  data?: Pick<StudySession, 'subject' | 'date' | 'startTime' | 'endTime' | 'duration'>;
} {
  const subject = form.subject.trim();
  if (!subject) {
    return { error: 'Informe a matéria.' };
  }

  if (!form.date) {
    return { error: 'Informe a data da sessão.' };
  }

  if (form.date > getTodayISO()) {
    return { error: 'A data não pode estar no futuro.' };
  }

  if (!form.startTime || !form.endTime) {
    return { error: 'Informe horário de início e fim.' };
  }

  const start = new Date(`${form.date}T${form.startTime}:00`);
  const end = new Date(`${form.date}T${form.endTime}:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Horário inválido.' };
  }

  if (end <= start) {
    return { error: 'O horário de fim precisa ser maior que o início.' };
  }

  const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

  if (duration <= 0) {
    return { error: 'A duração precisa ser maior que zero.' };
  }

  if (duration > MAX_SESSION_SECONDS) {
    return { error: 'A duração máxima por sessão é de 12 horas.' };
  }

  return {
    data: {
      subject,
      date: form.date,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration,
    },
  };
}

export default function SessionHistory({ userId, planId, onSessionsChanged }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);

  // Filtros
  const [subject, setSubject] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minMinutes, setMinMinutes] = useState('');

  // Formulário de inclusão/edição
  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [formState, setFormState] = useState<SessionFormState>(() =>
    createDefaultForm(DEFAULT_SUBJECTS[0])
  );
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const subjectOptions = useMemo(
    () =>
      Array.from(new Set([...DEFAULT_SUBJECTS, ...sessions.map((s) => s.subject)])).sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      ),
    [sessions]
  );

  const durationPreview = useMemo(() => {
    if (!formState.date || !formState.startTime || !formState.endTime) return 0;

    const start = new Date(`${formState.date}T${formState.startTime}:00`);
    const end = new Date(`${formState.date}T${formState.endTime}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return 0;
    }

    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }, [formState.date, formState.startTime, formState.endTime]);

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

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const clearFilters = () => {
    setSubject('');
    setDateFrom('');
    setDateTo('');
    setMinMinutes('');
  };

  const openCreateForm = () => {
    setEditingSession(null);
    setFormState(createDefaultForm(subject || DEFAULT_SUBJECTS[0]));
    setSaveError('');
    setFormOpen(true);
  };

  const openEditForm = (session: StudySession) => {
    setEditingSession(session);
    setFormState(createFormFromSession(session));
    setSaveError('');
    setFormOpen(true);
  };

  const forceCloseForm = () => {
    setFormOpen(false);
    setEditingSession(null);
    setSaveError('');
  };

  const closeForm = () => {
    if (saving) return;
    forceCloseForm();
  };

  const handleSubmitSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = parseFormToSession(formState);
    if (!parsed.data) {
      setSaveError(parsed.error || 'Dados inválidos.');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      if (editingSession?.id) {
        await updateSession(editingSession.id, parsed.data);
      } else {
        await saveSession({
          userId,
          planId: planId || undefined,
          ...parsed.data,
          source: 'manual',
          wasEdited: false,
        });
      }

      forceCloseForm();
      await fetchSessions();
      if (onSessionsChanged) {
        try {
          await onSessionsChanged();
        } catch (refreshError) {
          console.warn('Erro ao atualizar dashboard após ajuste manual:', refreshError);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar sessão manual:', error);
      setSaveError('Não foi possível salvar a sessão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = !!(subject || dateFrom || dateTo || minMinutes);
  const totalPages = Math.ceil(sessions.length / PAGE_SIZE);
  const paginatedSessions = sessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl border border-white/[0.07] bg-[#0E111B] p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3150AA]/10">
            <History className="h-4 w-4 text-[#F59768]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Histórico Completo</h3>
            <p className="text-xs text-[#666]">
              {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'} encontradas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white transition hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar tempo
          </button>

          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
              hasFilters
                ? 'border-blue-500/40 text-[#F59768]/80'
                : 'border-white/[0.08] text-[#666] hover:text-white'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasFilters && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
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
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[#666] transition hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="grid gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Matéria</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                >
                  <option value="">Todas</option>
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">De</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">Até</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                />
              </div>

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
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {s.source === 'manual' && (
                      <span className="rounded-md bg-[#3150AA]/15 px-2 py-0.5 text-[10px] font-medium text-[#F59768]/80">
                        Manual
                      </span>
                    )}
                    {s.wasEdited && (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        Ajustado
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatDuration(s.duration)}
                    <span className="text-gray-700">·</span>
                    {s.startTime &&
                      new Date(s.startTime).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    {s.endTime &&
                      ` – ${new Date(s.endTime).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="rounded-lg bg-[#3150AA]/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                    {formatRelativeDate(s.date)}
                  </span>
                  <button
                    onClick={() => openEditForm(s)}
                    className="rounded-lg border border-white/10 p-1.5 text-gray-400 transition hover:text-white"
                    title="Editar sessão"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

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

      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={closeForm}
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-white">
                    {editingSession ? 'Editar sessão' : 'Adicionar sessão manual'}
                  </h4>
                  <p className="text-xs text-gray-400">
                    Ajuste o tempo real estudado quando o timer não refletir sua sessão.
                  </p>
                </div>
                <button
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-white/10 p-1.5 text-gray-400 transition hover:text-white disabled:opacity-50"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitSession} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Matéria</label>
                  <input
                    value={formState.subject}
                    onChange={(e) => {
                      setFormState((prev) => ({ ...prev, subject: e.target.value }));
                      setSaveError('');
                    }}
                    list="session-subject-options"
                    className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                    placeholder="Ex: Direito Constitucional"
                    required
                  />
                  <datalist id="session-subject-options">
                    {subjectOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Data</label>
                    <input
                      type="date"
                      value={formState.date}
                      max={getTodayISO()}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, date: e.target.value }));
                        setSaveError('');
                      }}
                      className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Início</label>
                    <input
                      type="time"
                      value={formState.startTime}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, startTime: e.target.value }));
                        setSaveError('');
                      }}
                      className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Fim</label>
                    <input
                      type="time"
                      value={formState.endTime}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, endTime: e.target.value }));
                        setSaveError('');
                      }}
                      className="w-full rounded-lg border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-gray-800/40 px-3 py-2 text-xs text-gray-300">
                  Tempo calculado: <span className="font-medium text-white">{durationPreview > 0 ? formatDuration(durationPreview) : '--'}</span>
                </div>

                {saveError && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {saveError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 transition hover:text-white disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs text-white transition hover:bg-violet-500 disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        {editingSession ? 'Salvar ajustes' : 'Registrar sessão'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
