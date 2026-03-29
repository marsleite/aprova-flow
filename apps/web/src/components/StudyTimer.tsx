/**
 * Componente StudyTimer — Premium + Pomodoro
 *
 * Cronômetro com anel circular SVG, glow pulsante, e suporte a:
 * - Modo livre (stopwatch)
 * - Pomodoro 25/5, 50/10, 45/15 (contagem regressiva com fases)
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Clock,
  Save,
  BookOpen,
  SkipForward,
  Timer,
  Coffee,
  Zap,
  Search,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { useUserCustomSubjects } from '@/hooks/useUserCustomSubjects';
import { mergeSubjectOptions } from '@/lib/firebase/subjects';
import { formatTimerDisplay } from '@/lib/utils';
import InterrogationModal from '@/components/InterrogationModal';
import { DEFAULT_SUBJECTS, TimerMode, PomodoroPhase, StudyPlanEdital } from '@/types';

interface StudyTimerProps {
  userId: string;
  plans?: StudyPlanEdital[];
  activePlanId?: string | null;
  onSessionSaved?: (session: { subject: string; duration: number; retentionScore?: number }) => void;
  onCreateSession?: () => Promise<void> | void;
  onCreateEdital?: () => void;
  creatingSession?: boolean;
}

// ========================================
// Constantes de configuração de modos
// ========================================
const MODE_OPTIONS: { value: TimerMode; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: 'freeform',
    label: 'Livre',
    icon: <Clock className="h-3.5 w-3.5" />,
    desc: 'Sem limite',
  },
  {
    value: 'pomodoro-25/5',
    label: '25/5',
    icon: <Timer className="h-3.5 w-3.5" />,
    desc: 'Clássico',
  },
  {
    value: 'pomodoro-50/10',
    label: '50/10',
    icon: <Zap className="h-3.5 w-3.5" />,
    desc: 'Intenso',
  },
  {
    value: 'pomodoro-45/15',
    label: '45/15',
    icon: <Coffee className="h-3.5 w-3.5" />,
    desc: 'Equilibrado',
  },
];

const PHASE_LABELS: Record<PomodoroPhase, { label: string; color: string; bgColor: string }> = {
  focus: { label: 'Foco', color: 'text-[var(--primary)]', bgColor: 'bg-[var(--primary)]/20' },
  shortBreak: { label: 'Pausa Curta', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  longBreak: { label: 'Pausa Longa', color: 'text-[var(--primary)]', bgColor: 'bg-[var(--primary)]/20' },
};

// ========================================
// Anel circular SVG
// ========================================
function ProgressRing({
  seconds,
  totalSeconds,
  isRunning,
  isPaused,
  phase,
}: {
  seconds: number;
  totalSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  phase: PomodoroPhase | null;
}) {
  const radius = 110;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  let progress: number;
  if (totalSeconds > 0) {
    // Pomodoro: progresso baseado na fração consumida da fase
    progress = 1 - seconds / totalSeconds;
  } else {
    // Freeform: progresso de 0-60 dentro do minuto corrente
    progress = (seconds % 60) / 60;
  }
  const offset = circumference - progress * circumference;

  // Cor do anel baseada na fase
  let strokeColor = '#374151';
  if (isPaused) {
    strokeColor = '#F59E0B';
  } else if (isRunning) {
    if (phase === 'shortBreak') strokeColor = '#10B981';
    else if (phase === 'longBreak') strokeColor = 'var(--primary)';
    else strokeColor = 'var(--primary)';
  }

  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <circle
        stroke="rgba(255,255,255,0.07)"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke={strokeColor}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="transition-all duration-1000 ease-linear"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
    </svg>
  );
}

// ========================================
// Indicadores de ciclo (dots)
// ========================================
function CycleIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${i < current ? 'bg-primary' : 'bg-gray-700'
            }`}
        />
      ))}
      <span className="ml-1 text-[10px] text-muted-foreground">
        Ciclo {current}/{total}
      </span>
    </div>
  );
}

function SubjectDropdown({
  value,
  options,
  disabled,
  onSelect,
  onAdd,
}: {
  value: string;
  options: string[];
  disabled: boolean;
  onSelect: (subject: string) => void;
  onAdd: (subject: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();

  const filteredOptions = options
    .filter((item) => trimmed === '' || item.toLowerCase().includes(trimmed.toLowerCase()));

  const isExactOption = options.some((item) => item.toLowerCase() === trimmed.toLowerCase());
  const canAddCustom = trimmed.length > 0 && !isExactOption;
  const showDropdown = !disabled && open;

  const handleSelect = (subject: string) => {
    onSelect(subject);
    setOpen(false);
    setQuery('');
  };

  const handleAdd = (subject: string) => {
    const normalized = subject.trim();
    if (!normalized) return;
    onAdd(normalized);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setQuery('');
      return;
    }

    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (canAddCustom) {
      handleAdd(trimmed);
      return;
    }

    const match =
      filteredOptions.find((item) => item.toLowerCase() === trimmed.toLowerCase()) ||
      filteredOptions[0];

    if (match) {
      handleSelect(match);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => {
            const next = !prev;
            if (!next) setQuery('');
            return next;
          });
        }}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-muted px-4 py-2.5 text-left text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value || 'Selecione uma matéria...'}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          >
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar ou digitar matéria..."
                  className="w-full rounded-lg border border-border bg-muted py-2 pl-9 pr-3 text-sm text-slate-200 outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto">
              {canAddCustom && (
                <button
                  type="button"
                  onClick={() => handleAdd(trimmed)}
                  className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar &quot;{trimmed}&quot;</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSelect('')}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <span className="flex-1">Selecione uma matéria...</span>
              </button>

              {filteredOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <span className="flex-1">{item}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ========================================
// Componente Principal
// ========================================
export default function StudyTimer({
  userId,
  plans = [],
  activePlanId,
  onSessionSaved,
  onCreateSession,
  onCreateEdital,
  creatingSession = false,
}: StudyTimerProps) {
  // Plano selecionado para esta sessão (herda do header, mas pode ser trocado)
  const [selectedPlanId, setSelectedPlanId] = useState(activePlanId || '');
  const timer = useStudyTimer({ userId, planId: selectedPlanId || undefined });
  const { customSubjects, persistSubject } = useUserCustomSubjects(userId);
  const {
    displaySeconds,
    totalFocusSeconds,
    status,
    mode,
    selectedSubject,
    isTabVisible,
    pomodoroPhase,
    currentCycle,
    totalCycles,
    pomodoroConfig,
    phaseJustChanged,
    hasControl,
    activeScreens,
    maxActiveScreens,
    setSelectedSubject,
    setMode,
    play,
    pause,
    stop,
    skipPhase,
    clearPhaseChanged,
    isSaving,
  } = timer;

  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle' || status === 'stopped';
  const isPomodoro = mode !== 'freeform';
  const isBreak = pomodoroPhase === 'shortBreak' || pomodoroPhase === 'longBreak';

  // Matérias filtradas pelo plano selecionado
  const activePlan = plans.find((p) => p.id === selectedPlanId);
  const isGeneralSelected = !!activePlan?.isDefault;
  const canStart = !!selectedSubject && !isGeneralSelected && hasControl;
  const baseSubjects = useMemo(() => {
    if (activePlan && activePlan.subjects.length > 0) {
      return activePlan.subjects.map((s) => s.subject);
    }

    return [...DEFAULT_SUBJECTS] as unknown as string[];
  }, [activePlan]);

  const availableSubjects = useMemo(() => {
    return mergeSubjectOptions(baseSubjects, customSubjects, selectedSubject ? [selectedSubject] : []);
  }, [baseSubjects, customSubjects, selectedSubject]);

  // Calcula total de segundos da fase (para o anel de progresso)
  const phaseTotalSeconds = (() => {
    if (!isPomodoro || !pomodoroConfig || !pomodoroPhase) return 0;
    if (pomodoroPhase === 'focus') return pomodoroConfig.focusMinutes * 60;
    if (pomodoroPhase === 'shortBreak') return pomodoroConfig.shortBreakMinutes * 60;
    return pomodoroConfig.longBreakMinutes * 60;
  })();

  // ========================================
  // Notificação sonora ao trocar de fase
  // ========================================
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Silencioso se AudioContext não disponível
    }
  }, []);

  useEffect(() => {
    if (phaseJustChanged) {
      playNotificationSound();
      clearPhaseChanged();
    }
  }, [phaseJustChanged, playNotificationSound, clearPhaseChanged]);

  // ========================================
  // Integração com Plano Diário IA
  // ========================================
  useEffect(() => {
    function handleStartSubject(event: Event) {
      const custom = event as CustomEvent<{ subject?: string }>;
      const subject = custom.detail?.subject;
      if (!subject || typeof subject !== 'string') return;
      setSelectedSubject(subject);
    }

    window.addEventListener('aprova:start-subject', handleStartSubject as EventListener);
    return () => window.removeEventListener('aprova:start-subject', handleStartSubject as EventListener);
  }, [setSelectedSubject]);

  // ========================================
  // Interrogation Mode State
  // ========================================
  const [showInterrogation, setShowInterrogation] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ subject: string; duration: number } | null>(null);

  // ========================================
  // Handlers
  // ========================================
  const handleStop = async () => {
    const savedSubject = selectedSubject;
    const savedDuration = isPomodoro ? totalFocusSeconds : displaySeconds;
    await stop();

    // If the session had meaningful duration (>= 60s), offer the interrogation
    if (savedDuration >= 60 && savedSubject) {
      setPendingSession({ subject: savedSubject, duration: savedDuration });
      setShowInterrogation(true);
    } else {
      onSessionSaved?.({ subject: savedSubject, duration: savedDuration });
    }
  };

  const handleInterrogationSkip = () => {
    setShowInterrogation(false);
    if (pendingSession) {
      onSessionSaved?.(pendingSession);
      setPendingSession(null);
    }
  };

  const handleInterrogationComplete = (score: number) => {
    setShowInterrogation(false);
    if (pendingSession) {
      onSessionSaved?.({ ...pendingSession, retentionScore: score });
      setPendingSession(null);
    }
  };

  const handleAddSubject = useCallback((subjectName: string) => {
    const trimmed = subjectName.trim();
    if (!trimmed) return;

    setSelectedSubject(trimmed);
    void persistSubject(trimmed, availableSubjects)
      .then((savedSubject) => {
        if (savedSubject !== trimmed) {
          setSelectedSubject(savedSubject);
        }
      })
      .catch((error) => {
        console.error('Erro ao persistir matéria customizada do timer:', error);
      });
  }, [availableSubjects, persistSubject, setSelectedSubject]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-xl border border-border bg-card p-5"
    >
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
          <Clock className="h-4 w-4 text-[var(--primary)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Cronômetro de Estudo</h2>
          <p className="text-xs text-muted-foreground">
            {isPomodoro
              ? `Pomodoro ${pomodoroConfig?.label}`
              : 'Tempo corrido · Pausa manual'}
          </p>
        </div>
      </div>

      {!hasControl && (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-xs text-amber-200">
            Só é possível usar o cronômetro em {maxActiveScreens} telas/2 navegadores ao mesmo
            tempo. Esta tela ficou em modo visualização.
          </p>
        </div>
      )}

      {/* Seletor de Modo */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Modo</label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              disabled={!isIdle || !hasControl}
              className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-center transition-all
                ${mode === opt.value
                  ? 'border-primary/40 bg-[var(--primary)]/10 text-foreground'
                  : 'border-border bg-muted text-muted-foreground hover:border-border hover:text-muted-foreground'
                }
                disabled:cursor-not-allowed disabled:opacity-40
              `}
            >
              {opt.icon}
              <span className="text-xs font-medium">{opt.label}</span>
              <span className="text-[9px] opacity-60">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Seletor de Edital (só aparece se houver mais de 1 plano) */}
      {plans.length > 1 && (
        <div className="mb-4">
          <label className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            Edital
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => {
              setSelectedPlanId(e.target.value);
              setSelectedSubject(''); // Reseta matéria ao trocar plano
            }}
            disabled={!isIdle || !hasControl}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-foreground
                       outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Seletor de Matéria */}
      <div className="mb-5">
        <label className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          Matéria
        </label>
        <SubjectDropdown
          value={selectedSubject}
          options={availableSubjects}
          disabled={!isIdle || !hasControl}
          onSelect={setSelectedSubject}
          onAdd={handleAddSubject}
        />
      </div>

      {/* CTA quando "Geral" está selecionado */}
      <AnimatePresence>
        {isIdle && isGeneralSelected && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
          >
            <p className="text-xs text-amber-200">
              O plano <strong>Geral</strong> é seu histórico consolidado. Para estudar agora, crie uma sessão ou um edital.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onCreateSession?.()}
                disabled={creatingSession}
                className="rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingSession ? 'Criando sessão...' : 'Criar Sessão'}
              </button>
              <button
                onClick={onCreateEdital}
                className="rounded-lg bg-[var(--primary)]/20 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Criar Edital
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge de fase (Pomodoro) */}
      <AnimatePresence mode="wait">
        {isPomodoro && pomodoroPhase && !isIdle && (
          <motion.div
            key={pomodoroPhase}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-4 flex items-center justify-center gap-3"
          >
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${PHASE_LABELS[pomodoroPhase].bgColor} ${PHASE_LABELS[pomodoroPhase].color}`}
            >
              {PHASE_LABELS[pomodoroPhase].label}
            </span>
            <CycleIndicator current={currentCycle} total={totalCycles} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Display do Timer com Anel Circular */}
      <div className="mb-5 flex flex-col items-center">
        <div className="relative flex h-[190px] w-[190px] items-center justify-center sm:h-[220px] sm:w-[220px]">
          <ProgressRing
            seconds={displaySeconds}
            totalSeconds={phaseTotalSeconds}
            isRunning={isRunning}
            isPaused={isPaused}
            phase={pomodoroPhase}
          />

          {/* Glow quando rodando em foco */}
          {isRunning && !isBreak && (
            <div className="absolute inset-0 animate-timer-glow rounded-full" />
          )}

          {/* Tempo no centro */}
          <motion.div
            key={`${status}-${pomodoroPhase}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col items-center"
          >
            <span
              className={`font-mono text-4xl font-bold tracking-wider transition-colors duration-300 sm:text-5xl
                ${isRunning && !isBreak ? 'text-[var(--primary)]' : ''}
                ${isRunning && isBreak ? 'text-emerald-400' : ''}
                ${isPaused ? 'text-amber-400' : ''}
                ${isIdle ? 'text-muted-foreground' : ''}
              `}
            >
              {formatTimerDisplay(displaySeconds)}
            </span>
            {/* Total de foco acumulado (em pomodoro, durante breaks) */}
            {isPomodoro && !isIdle && totalFocusSeconds > 0 && isBreak && (
              <span className="mt-1 text-xs text-muted-foreground">
                Foco total: {formatTimerDisplay(totalFocusSeconds)}
              </span>
            )}
          </motion.div>
        </div>

        {/* Indicador de status */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${status}-${pomodoroPhase}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-center gap-2"
          >
            {isRunning && !isBreak && (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-sm text-green-400">Estudando...</span>
              </>
            )}
            {isRunning && isBreak && (
              <>
                <Coffee className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Descansando...</span>
              </>
            )}
            {isPaused && (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-sm text-amber-400">Pausado</span>
              </>
            )}
            {isSaving && (
              <>
                <Save className="h-4 w-4 animate-spin text-[var(--primary)]" />
                <span className="text-sm text-[var(--primary)]">Salvando sessão...</span>
              </>
            )}
            {isIdle && selectedSubject && (
              <span className="text-sm text-muted-foreground">Pronto para estudar</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Botões de Controle */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <AnimatePresence mode="wait">
          {/* Play */}
          {(isIdle || isPaused) && (
            <motion.button
              key="play"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={play}
              disabled={!canStart}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary
                         shadow-lg shadow-primary/20/30 transition-colors hover:bg-primary
                         disabled:cursor-not-allowed disabled:bg-slate-800 disabled:shadow-none"
              title={
                !selectedSubject
                  ? 'Selecione uma matéria primeiro'
                  : isGeneralSelected
                    ? 'Crie uma sessão ou edital para iniciar'
                    : 'Iniciar'
              }
            >
              <Play className="h-6 w-6 text-foreground" />
            </motion.button>
          )}

          {/* Pause */}
          {isRunning && (
            <motion.button
              key="pause"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={pause}
              disabled={!hasControl}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-600
                         shadow-lg shadow-amber-600/30 transition-colors hover:bg-amber-500
                         disabled:cursor-not-allowed disabled:opacity-40"
              title="Pausar"
            >
              <Pause className="h-6 w-6 text-foreground" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Skip (pular pausa) */}
        <AnimatePresence>
          {isPomodoro && isRunning && isBreak && (
            <motion.button
              key="skip"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={skipPhase}
              disabled={!hasControl}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700
                         shadow-lg transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              title="Pular pausa"
            >
              <SkipForward className="h-5 w-5 text-foreground" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Stop */}
        <AnimatePresence>
          {!isIdle && (
            <motion.button
              key="stop"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleStop}
              disabled={isSaving || !hasControl}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-700
                         shadow-lg shadow-red-700/25 transition-colors hover:bg-red-600
                         disabled:cursor-not-allowed disabled:opacity-50"
              title="Parar e salvar"
            >
              <Square className="h-5 w-5 text-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Dica */}
      {isIdle && !selectedSubject && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Selecione uma matéria para começar a estudar
        </p>
      )}

      <p
        className={`mt-3 text-center text-[11px] ${activeScreens > maxActiveScreens ? 'text-amber-300' : 'text-muted-foreground'
          }`}
      >
        Sincronizado em {activeScreens} tela{activeScreens === 1 ? '' : 's'}
        {activeScreens > maxActiveScreens ? ` · limite de ${maxActiveScreens}` : ''}
      </p>

      {/* Info de Visibilidade */}
      <AnimatePresence>
        {!isTabVisible && (isRunning || isPaused) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2"
          >
            <p className="text-center text-xs text-amber-300">
              O cronômetro continua rodando mesmo com esta aba em segundo plano
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interrogation Modal */}
      <InterrogationModal
        isOpen={showInterrogation}
        subjectName={pendingSession?.subject || selectedSubject || 'Matéria'}
        onSkip={handleInterrogationSkip}
        onEvaluationComplete={handleInterrogationComplete}
      />
    </motion.div>
  );
}
