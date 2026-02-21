/**
 * Componente StudyTimer — Premium + Pomodoro
 *
 * Cronômetro com anel circular SVG, glow pulsante, e suporte a:
 * - Modo livre (stopwatch)
 * - Pomodoro 25/5, 50/10, 45/15 (contagem regressiva com fases)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Clock,
  AlertTriangle,
  Save,
  BookOpen,
  SkipForward,
  Timer,
  Coffee,
  Zap,
} from 'lucide-react';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { formatTimerDisplay } from '@/lib/utils';
import { DEFAULT_SUBJECTS, TimerMode, PomodoroPhase, StudyPlanEdital } from '@/types';

interface StudyTimerProps {
  userId: string;
  plans?: StudyPlanEdital[];
  activePlanId?: string | null;
  onSessionSaved?: (session: { subject: string; duration: number }) => void;
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
  focus: { label: 'Foco', color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
  shortBreak: { label: 'Pausa Curta', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  longBreak: { label: 'Pausa Longa', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
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
    else if (phase === 'longBreak') strokeColor = '#3B82F6';
    else strokeColor = '#8B5CF6';
  }

  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <circle
        stroke="#1f2937"
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
          className={`h-2 w-2 rounded-full transition-colors ${
            i < current ? 'bg-violet-400' : 'bg-gray-700'
          }`}
        />
      ))}
      <span className="ml-1 text-[10px] text-gray-500">
        Ciclo {current}/{total}
      </span>
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
  const {
    displaySeconds,
    totalFocusSeconds,
    status,
    mode,
    selectedSubject,
    isTabVisible,
    isAutoPaused,
    pomodoroPhase,
    currentCycle,
    totalCycles,
    pomodoroConfig,
    phaseJustChanged,
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
  const isPaused = status === 'paused' || isAutoPaused;
  const isIdle = status === 'idle' || status === 'stopped';
  const isPomodoro = mode !== 'freeform';
  const isBreak = pomodoroPhase === 'shortBreak' || pomodoroPhase === 'longBreak';

  // Matérias filtradas pelo plano selecionado
  const activePlan = plans.find((p) => p.id === selectedPlanId);
  const isGeneralSelected = !!activePlan?.isDefault;
  const canStart = !!selectedSubject && !isGeneralSelected;
  const availableSubjects = activePlan && activePlan.subjects.length > 0
    ? activePlan.subjects.map((s) => s.subject)
    : DEFAULT_SUBJECTS as unknown as string[];

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
  // Handlers
  // ========================================
  const handleStop = async () => {
    const savedSubject = selectedSubject;
    const savedDuration = isPomodoro ? totalFocusSeconds : displaySeconds;
    await stop();
    onSessionSaved?.({ subject: savedSubject, duration: savedDuration });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-2xl"
    >
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/20 p-2.5">
          <Clock className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Cronômetro de Estudo</h2>
          <p className="text-sm text-gray-400">
            {isPomodoro
              ? `Pomodoro ${pomodoroConfig?.label}`
              : 'Tempo líquido · Pausa automática ao trocar aba'}
          </p>
        </div>
      </div>

      {/* Seletor de Modo */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-gray-400">Modo</label>
        <div className="grid grid-cols-4 gap-1.5">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              disabled={!isIdle}
              className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-center transition-all
                ${
                  mode === opt.value
                    ? 'border-violet-500/50 bg-violet-500/10 text-white'
                    : 'border-white/5 bg-gray-800/30 text-gray-500 hover:border-white/10 hover:text-gray-300'
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
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
            <BookOpen className="h-4 w-4" />
            Edital
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => {
              setSelectedPlanId(e.target.value);
              setSelectedSubject(''); // Reseta matéria ao trocar plano
            }}
            disabled={!isIdle}
            className="w-full rounded-xl border border-white/10 bg-gray-800/50 px-4 py-3 text-white
                       outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
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
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
          <BookOpen className="h-4 w-4" />
          Matéria
        </label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          disabled={!isIdle}
          className="w-full rounded-xl border border-white/10 bg-gray-800/50 px-4 py-3 text-white
                     outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Selecione uma matéria...</option>
          {availableSubjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
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
                className="rounded-lg bg-violet-500/20 px-3 py-2 text-xs font-medium text-violet-100 transition-colors hover:bg-violet-500/30"
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
        <div className="relative flex h-[220px] w-[220px] items-center justify-center">
          <ProgressRing
            seconds={displaySeconds}
            totalSeconds={phaseTotalSeconds}
            isRunning={isRunning}
            isPaused={isPaused}
            phase={pomodoroPhase}
          />

          {/* Glow quando rodando em foco */}
          {isRunning && !isAutoPaused && !isBreak && (
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
              className={`font-mono text-5xl font-bold tracking-wider transition-colors duration-300
                ${isRunning && !isAutoPaused && !isBreak ? 'text-violet-400' : ''}
                ${isRunning && !isAutoPaused && isBreak ? 'text-emerald-400' : ''}
                ${isPaused ? 'text-amber-400' : ''}
                ${isIdle ? 'text-gray-500' : ''}
              `}
            >
              {formatTimerDisplay(displaySeconds)}
            </span>
            {/* Total de foco acumulado (em pomodoro, durante breaks) */}
            {isPomodoro && !isIdle && totalFocusSeconds > 0 && isBreak && (
              <span className="mt-1 text-xs text-gray-500">
                Foco total: {formatTimerDisplay(totalFocusSeconds)}
              </span>
            )}
          </motion.div>
        </div>

        {/* Indicador de status */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${status}-${isAutoPaused}-${pomodoroPhase}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-center gap-2"
          >
            {isRunning && !isAutoPaused && !isBreak && (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-sm text-green-400">Estudando...</span>
              </>
            )}
            {isRunning && !isAutoPaused && isBreak && (
              <>
                <Coffee className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Descansando...</span>
              </>
            )}
            {isAutoPaused && (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-amber-400">Auto-pausado (aba inativa)</span>
              </>
            )}
            {isPaused && !isAutoPaused && (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-sm text-amber-400">Pausado</span>
              </>
            )}
            {isSaving && (
              <>
                <Save className="h-4 w-4 animate-spin text-violet-400" />
                <span className="text-sm text-violet-400">Salvando sessão...</span>
              </>
            )}
            {isIdle && selectedSubject && (
              <span className="text-sm text-gray-500">Pronto para estudar</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Botões de Controle */}
      <div className="flex items-center justify-center gap-4">
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
              className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600
                         shadow-lg shadow-violet-600/30 transition-colors hover:bg-violet-500
                         disabled:cursor-not-allowed disabled:bg-gray-700 disabled:shadow-none"
              title={
                !selectedSubject
                  ? 'Selecione uma matéria primeiro'
                  : isGeneralSelected
                    ? 'Crie uma sessão ou edital para iniciar'
                    : 'Iniciar'
              }
            >
              <Play className="h-6 w-6 text-white" />
            </motion.button>
          )}

          {/* Pause */}
          {isRunning && !isAutoPaused && (
            <motion.button
              key="pause"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={pause}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-600
                         shadow-lg shadow-amber-600/30 transition-colors hover:bg-amber-500"
              title="Pausar"
            >
              <Pause className="h-6 w-6 text-white" />
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
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700
                         shadow-lg transition-colors hover:bg-gray-600"
              title="Pular pausa"
            >
              <SkipForward className="h-5 w-5 text-white" />
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
              disabled={isSaving}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600
                         shadow-lg shadow-red-600/30 transition-colors hover:bg-red-500
                         disabled:cursor-not-allowed disabled:opacity-50"
              title="Parar e salvar"
            >
              <Square className="h-5 w-5 text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Dica */}
      {isIdle && !selectedSubject && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-xs text-gray-500"
        >
          Selecione uma matéria para começar a estudar
        </motion.p>
      )}

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
              O cronômetro está pausado enquanto esta aba estiver em segundo plano
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
