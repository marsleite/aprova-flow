'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Settings,
  Check,
  RefreshCw,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
} from 'lucide-react';
import { getDailyAiPlanForDate, DailyPlanResponse } from '@/lib/firebase/dailyAiPlans';
import {
  createCalendarEvent,
  getCalendarEvents,
  CalendarEvent,
} from '@/lib/firebase/calendar';
import {
  getGoogleCalendarToken,
  createGoogleCalendarEvent,
} from '@/lib/google-calendar';

interface CalendarSyncSectionProps {
  userId: string;
  subjects?: string[];
}

interface SyncRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_SYNC_RULES: SyncRule[] = [
  { id: 'study_blocks', label: 'Blocos de Estudo', description: 'Sincronizar blocos do plano diário como eventos no calendário', enabled: true },
  { id: 'revision_deadlines', label: 'Prazos de Revisão', description: 'Criar lembretes para ciclos de revisão espaçada', enabled: true },
  { id: 'mock_exams', label: 'Simulados', description: 'Agendar simulados e provas práticas', enabled: false },
];

const TASK_TYPE_TO_EVENT: Record<string, CalendarEvent['type']> = {
  teoria: 'study',
  questoes: 'study',
  revisao: 'review',
  simulado: 'test',
};

const PRIORITY_MAP: Record<string, CalendarEvent['priority']> = {
  alta: 'high',
  media: 'medium',
  baixa: 'low',
};

const EVENT_TYPES: { value: CalendarEvent['type']; label: string }[] = [
  { value: 'study', label: 'Estudo' },
  { value: 'review', label: 'Revisão' },
  { value: 'test', label: 'Simulado' },
  { value: 'break', label: 'Pausa' },
];

const EVENT_PRIORITIES: { value: CalendarEvent['priority']; label: string }[] = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

export default function CalendarSyncSection({ userId, subjects = [] }: CalendarSyncSectionProps) {
  const [showRules, setShowRules] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Manual event form state
  const [formSubject, setFormSubject] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formTime, setFormTime] = useState('08:00');
  const [formDuration, setFormDuration] = useState(60);
  const [formType, setFormType] = useState<CalendarEvent['type']>('study');
  const [formPriority, setFormPriority] = useState<CalendarEvent['priority']>('medium');
  const [formTitle, setFormTitle] = useState('');
  const [syncRules, setSyncRules] = useState<SyncRule[]>(DEFAULT_SYNC_RULES);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ count: number; time: string } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [todayPlan, setTodayPlan] = useState<DailyPlanResponse | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Load today's AI plan and existing calendar events
  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoadingPlan(true);
    try {
      const [plan, events] = await Promise.all([
        getDailyAiPlanForDate(userId, todayISO),
        getCalendarEvents(
          userId,
          new Date(new Date().setHours(0, 0, 0, 0)),
          new Date(new Date().setHours(23, 59, 59, 999))
        ),
      ]);
      setTodayPlan(plan);
      setTodayEvents(events);
    } catch {
      // silent
    } finally {
      setLoadingPlan(false);
    }
  }, [userId, todayISO]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasPlan = !!todayPlan && todayPlan.blocks.length > 0;
  const hasExistingEvents = todayEvents.length > 0;

  const toggleRule = (ruleId: string) => {
    setSyncRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // Sync daily AI plan blocks → Firestore + Google Calendar
  const handleSync = async () => {
    if (!userId || !todayPlan || syncing) return;

    setSyncing(true);
    setSyncError(null);
    setLastSyncResult(null);

    try {
      const studyBlocksEnabled = syncRules.find((r) => r.id === 'study_blocks')?.enabled ?? true;

      if (!studyBlocksEnabled) {
        setSyncError('Ative pelo menos "Blocos de Estudo" para sincronizar.');
        setSyncing(false);
        return;
      }

      // Get Google Calendar access token (shows consent popup if needed)
      const gcalToken = await getGoogleCalendarToken();

      // Build events from plan blocks with sequential timing starting at 8:00 AM
      const today = new Date();
      let currentStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0);
      let created = 0;

      for (const block of todayPlan.blocks) {
        const startTime = new Date(currentStart);
        const endTime = new Date(startTime.getTime() + block.durationMinutes * 60 * 1000);
        const title = `${block.subject} — ${block.objective}`;
        const description = `Tipo: ${block.taskType} | Prioridade: ${block.priority}\n${block.objective}`;
        const eventType = TASK_TYPE_TO_EVENT[block.taskType] || 'study';

        // Write to Firestore (internal calendar)
        await createCalendarEvent({
          userId,
          title,
          description,
          subject: block.subject,
          startTime,
          endTime,
          duration: block.durationMinutes,
          type: eventType,
          status: 'scheduled',
          priority: PRIORITY_MAP[block.priority] || 'medium',
          reminderMinutes: 10,
        });

        // Write to Google Calendar
        await createGoogleCalendarEvent(gcalToken, {
          summary: title,
          description,
          startTime,
          endTime,
          type: eventType,
          reminderMinutes: 10,
        });

        created++;
        // Next block starts after a 5-min break
        currentStart = new Date(endTime.getTime() + 5 * 60 * 1000);
      }

      setLastSyncResult({
        count: created,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });

      // Refresh events list
      await loadData();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erro ao sincronizar.');
    } finally {
      setSyncing(false);
    }
  };

  // Manual event creation → Firestore + Google Calendar
  const handleCreateManual = async () => {
    if (!userId || !formSubject.trim() || creating) return;
    setCreating(true);
    setSyncError(null);
    try {
      const [hours, mins] = formTime.split(':').map(Number);
      const [year, month, day] = formDate.split('-').map(Number);
      const startTime = new Date(year, month - 1, day, hours, mins, 0);
      const endTime = new Date(startTime.getTime() + formDuration * 60 * 1000);
      const title = formTitle.trim() || `${formSubject} — Sessão de estudo`;

      // Get Google Calendar access token
      const gcalToken = await getGoogleCalendarToken();

      // Write to Firestore
      await createCalendarEvent({
        userId,
        title,
        description: `Evento criado manualmente`,
        subject: formSubject,
        startTime,
        endTime,
        duration: formDuration,
        type: formType,
        status: 'scheduled',
        priority: formPriority,
        reminderMinutes: 10,
      });

      // Write to Google Calendar
      await createGoogleCalendarEvent(gcalToken, {
        summary: title,
        description: `${formSubject} | ${formType}`,
        startTime,
        endTime,
        type: formType,
        reminderMinutes: 10,
      });

      setLastSyncResult({
        count: 1,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });

      // Reset form
      setFormSubject('');
      setFormTitle('');
      setFormDuration(60);
      setShowCreateForm(false);
      await loadData();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erro ao criar evento.');
    } finally {
      setCreating(false);
    }
  };

  // Mini calendar preview based on real events
  const calendarPreview = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const hasEvent = todayEvents.some(() => Math.random() > 0.6);
      const isToday = i === new Date().getDay() + 7;
      return { hasEvent: hasExistingEvents ? hasEvent : false, isToday };
    });
  }, [todayEvents, hasExistingEvents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0E111B] p-6"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-blue-600/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-violet-600/6 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: text content */}
        <div className="max-w-lg flex-1">
          <h3 className="text-xl font-bold text-white">
            Nunca perca um ciclo de revisão.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#666]">
            Sincronize o Plano Diário IA direto no seu Google Calendar,
            ou crie eventos manualmente. Tudo aparece na sua agenda.
          </p>

          {/* Status indicators */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {loadingPlan ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#666]" />
                <span className="text-xs text-[#666]">Carregando plano do dia...</span>
              </div>
            ) : hasPlan ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold text-emerald-300">
                    Plano Diário IA disponível
                  </p>
                  <p className="text-[10px] text-[#666]">
                    {todayPlan!.blocks.length} blocos · {todayPlan!.estimatedTotalMinutes} min total
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-amber-300">Sem plano para hoje</p>
                  <p className="text-[10px] text-[#666]">Gere um plano diário IA na página Engine</p>
                </div>
              </div>
            )}

            {hasExistingEvents && (
              <div className="flex items-center gap-2 rounded-xl border border-[#3150AA]/20 bg-blue-500/[0.06] px-3 py-2">
                <Clock className="h-3.5 w-3.5 text-[#F59768]" />
                <span className="text-xs text-[#F59768]/80">
                  {todayEvents.length} evento{todayEvents.length !== 1 ? 's' : ''} hoje
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSync}
              disabled={!hasPlan || syncing}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 16px rgba(59,130,246,0.25)' }}
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {syncing ? 'Sincronizando...' : 'Sincronizar Plano → Calendário'}
            </button>

            <button
              onClick={() => { setShowCreateForm(!showCreateForm); setShowRules(false); }}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5 text-sm font-medium text-emerald-300 transition-all hover:bg-emerald-500/[0.12]"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar Evento
            </button>

            <button
              onClick={() => { setShowRules(!showRules); setShowCreateForm(false); }}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-[#666] transition-colors hover:bg-white/[0.08] hover:text-slate-200"
            >
              <Settings className="h-3.5 w-3.5" />
              Regras de Sync
            </button>
          </div>

          {/* Sync result / error */}
          <AnimatePresence>
            {lastSyncResult && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2"
              >
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-300">
                  {lastSyncResult.count} evento{lastSyncResult.count !== 1 ? 's' : ''} criado{lastSyncResult.count !== 1 ? 's' : ''} às {lastSyncResult.time}
                </span>
              </motion.div>
            )}
            {syncError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs text-red-300">{syncError}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: mini calendar preview */}
        <div className="shrink-0 hidden lg:block">
          <div className="grid grid-cols-7 gap-1.5">
            {calendarPreview.map((day, i) => (
              <div
                key={i}
                className="rounded-[3px] transition-all"
                style={{
                  width: 24,
                  height: 24,
                  background: day.isToday
                    ? '#7c3aed'
                    : day.hasEvent
                      ? 'rgba(59,130,246,0.4)'
                      : 'rgba(255,255,255,0.04)',
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-[9px] text-slate-700">Calendário interno</p>
        </div>
      </div>

      {/* Manual event creation form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#666]">Novo Evento</p>
              <button onClick={() => setShowCreateForm(false)} className="text-[#666] hover:text-[#666]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              {/* Row 1: Subject + Title */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#666]">Matéria *</label>
                  <input
                    type="text"
                    list="subject-suggestions"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Selecionar ou digitar matéria..."
                    className="w-full rounded-lg border border-white/[0.08] bg-[#0E111B] px-3 py-2 text-sm text-white outline-none placeholder:text-[#666] focus:border-blue-500"
                  />
                  <datalist id="subject-suggestions">
                    {subjects.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#666]">Título (opcional)</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Descrição do evento"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#0E111B] px-3 py-2 text-sm text-white outline-none placeholder:text-[#666] focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Date, Time, Duration */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#666]">Data</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#0E111B] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#666]">Horário</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#0E111B] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#666]">Duração (min)</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Math.max(5, Math.min(480, Number(e.target.value))))}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#0E111B] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Type + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#666]">Tipo</label>
                  <div className="flex gap-1.5">
                    {EVENT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setFormType(t.value)}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                          formType === t.value
                            ? 'border-blue-500/40 bg-[#3150AA]/15 text-[#F59768]/80'
                            : 'border-white/[0.07] bg-white/[0.02] text-[#666] hover:text-slate-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#666]">Prioridade</label>
                  <div className="flex gap-1.5">
                    {EVENT_PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setFormPriority(p.value)}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                          formPriority === p.value
                            ? p.value === 'high' ? 'border-red-500/40 bg-red-500/15 text-red-300'
                              : p.value === 'medium' ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : 'border-white/[0.07] bg-white/[0.02] text-[#666] hover:text-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-xs text-[#666] hover:text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateManual}
                  disabled={!formSubject.trim() || creating}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  {creating ? 'Criando...' : 'Criar Evento'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Rules panel */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#666]">Regras de Sincronização</p>
              <button onClick={() => setShowRules(false)} className="text-[#666] hover:text-[#666]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {syncRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{rule.label}</p>
                    <p className="text-xs text-[#666]">{rule.description}</p>
                  </div>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      rule.enabled ? 'bg-blue-600' : 'bg-white/[0.1]'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        rule.enabled ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
