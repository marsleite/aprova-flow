/**
 * Hook do Cronômetro de Estudo com Horas Líquidas + Pomodoro
 *
 * ===== REGRA DE EXECUÇÃO =====
 * O cronômetro continua contando em background (troca de aba/tela bloqueada).
 * A pausa acontece apenas por ação explícita do usuário.
 *
 * ===== MODOS =====
 * - freeform: cronômetro livre (comportamento original)
 * - pomodoro-25/5: 25min foco + 5min pausa (clássico)
 * - pomodoro-50/10: 50min foco + 10min pausa (intenso)
 * - pomodoro-45/15: 45min foco + 15min pausa (equilibrado)
 *
 * No modo Pomodoro o timer faz contagem regressiva durante cada fase.
 * Apenas fases de foco são salvas como sessão de estudo.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TimerStatus,
  TimerMode,
  PomodoroPhase,
  PomodoroConfig,
  POMODORO_PRESETS,
} from '@/types';
import { saveSession } from '@/lib/firebase/sessions';
import { getTodayISO } from '@/lib/utils';

interface UseStudyTimerOptions {
  userId: string;
  planId?: string;
}

interface UseStudyTimerReturn {
  /** Segundos no display (contagem progressiva em freeform, regressiva em pomodoro) */
  displaySeconds: number;
  /** Segundos totais de foco acumulados (para salvar) */
  totalFocusSeconds: number;
  /** Estado atual do cronômetro */
  status: TimerStatus;
  /** Modo selecionado */
  mode: TimerMode;
  /** Matéria selecionada */
  selectedSubject: string;
  /** Se a aba está visível ou não */
  isTabVisible: boolean;
  /** Fase atual do Pomodoro (null em freeform) */
  pomodoroPhase: PomodoroPhase | null;
  /** Ciclo atual (1-indexed) */
  currentCycle: number;
  /** Total de ciclos antes do long break */
  totalCycles: number;
  /** Config do Pomodoro atual (null em freeform) */
  pomodoroConfig: PomodoroConfig | null;
  /** Se acabou de transicionar de fase (para notificação) */
  phaseJustChanged: PomodoroPhase | null;
  /** Define a matéria */
  setSelectedSubject: (subject: string) => void;
  /** Define o modo */
  setMode: (mode: TimerMode) => void;
  /** Inicia ou retoma o cronômetro */
  play: () => void;
  /** Pausa manualmente o cronômetro */
  pause: () => void;
  /** Para o cronômetro e salva a sessão */
  stop: () => Promise<void>;
  /** Pula a fase atual (pula pausa, por ex.) */
  skipPhase: () => void;
  /** Limpa o sinal de transição de fase */
  clearPhaseChanged: () => void;
  /** Se está salvando no Firestore */
  isSaving: boolean;
}

// Alias de compat para código existente
export type { UseStudyTimerReturn };

export function useStudyTimer({ userId, planId }: UseStudyTimerOptions): UseStudyTimerReturn & {
  /** @deprecated use displaySeconds */
  elapsedSeconds: number;
} {
  // ========================================
  // Estado
  // ========================================
  const [mode, setModeState] = useState<TimerMode>('freeform');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Freeform: contagem progressiva
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Pomodoro
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase | null>(null);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [totalFocusSeconds, setTotalFocusSeconds] = useState(0);
  const [phaseJustChanged, setPhaseJustChanged] = useState<PomodoroPhase | null>(null);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<string>('');
  const lastTickAtRef = useRef<number | null>(null);
  const pomodoroPhaseRef = useRef<PomodoroPhase | null>(null);
  const phaseSecondsLeftRef = useRef(0);
  const currentCycleRef = useRef(1);

  const isPomodoro = mode !== 'freeform';
  const pomodoroConfig = isPomodoro ? POMODORO_PRESETS[mode] : null;

  // ========================================
  // Helpers
  // ========================================

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    lastTickAtRef.current = null;
  }, []);

  const getNextPomodoroState = useCallback(
    (phase: PomodoroPhase, cycle: number, config: PomodoroConfig) => {
      if (phase === 'focus') {
        const isLongBreak = cycle >= config.cyclesBeforeLongBreak;
        return {
          phase: isLongBreak ? ('longBreak' as const) : ('shortBreak' as const),
          cycle,
          secondsLeft: (isLongBreak ? config.longBreakMinutes : config.shortBreakMinutes) * 60,
        };
      }

      const wasLongBreak = phase === 'longBreak';
      const nextCycle = wasLongBreak ? 1 : cycle + 1;
      return {
        phase: 'focus' as const,
        cycle: nextCycle,
        secondsLeft: config.focusMinutes * 60,
      };
    },
    []
  );

  const startTicking = useCallback(() => {
    clearTick();
    lastTickAtRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const lastTickAt = lastTickAtRef.current ?? now;
      const deltaSeconds = Math.floor((now - lastTickAt) / 1000);
      if (deltaSeconds <= 0) return;
      lastTickAtRef.current = lastTickAt + deltaSeconds * 1000;

      if (!isPomodoro) {
        // Freeform: conta com base no tempo real decorrido
        setElapsedSeconds((prev) => prev + deltaSeconds);
      } else {
        if (!pomodoroConfig || !pomodoroPhaseRef.current) return;

        let remaining = deltaSeconds;
        let phase = pomodoroPhaseRef.current;
        let secondsLeft = phaseSecondsLeftRef.current;
        let cycle = currentCycleRef.current;
        let focusSecondsToAdd = 0;
        let changedPhase: PomodoroPhase | null = null;

        while (remaining > 0 && phase) {
          if (secondsLeft <= 0) {
            const next = getNextPomodoroState(phase, cycle, pomodoroConfig);
            phase = next.phase;
            cycle = next.cycle;
            secondsLeft = next.secondsLeft;
            changedPhase = phase;
            continue;
          }

          const secondsToConsume = Math.min(secondsLeft, remaining);
          if (phase === 'focus') {
            focusSecondsToAdd += secondsToConsume;
          }

          secondsLeft -= secondsToConsume;
          remaining -= secondsToConsume;

          if (secondsLeft === 0) {
            const next = getNextPomodoroState(phase, cycle, pomodoroConfig);
            phase = next.phase;
            cycle = next.cycle;
            secondsLeft = next.secondsLeft;
            changedPhase = phase;
          }
        }

        if (focusSecondsToAdd > 0) {
          setTotalFocusSeconds((total) => total + focusSecondsToAdd);
          setElapsedSeconds((elapsed) => elapsed + focusSecondsToAdd);
        }

        pomodoroPhaseRef.current = phase;
        phaseSecondsLeftRef.current = secondsLeft;
        currentCycleRef.current = cycle;
        setPomodoroPhase(phase);
        setPhaseSecondsLeft(secondsLeft);
        setCurrentCycle(cycle);

        if (changedPhase) {
          setPhaseJustChanged(changedPhase);
        }
      }
    }, 1000);
  }, [clearTick, getNextPomodoroState, isPomodoro, pomodoroConfig]);

  // ========================================
  // Page Visibility API — apenas status visual da aba
  // ========================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    pomodoroPhaseRef.current = pomodoroPhase;
  }, [pomodoroPhase]);

  useEffect(() => {
    phaseSecondsLeftRef.current = phaseSecondsLeft;
  }, [phaseSecondsLeft]);

  useEffect(() => {
    currentCycleRef.current = currentCycle;
  }, [currentCycle]);

  // Limpa ao desmontar
  useEffect(() => {
    return () => clearTick();
  }, [clearTick]);

  // ========================================
  // Controles
  // ========================================

  const setMode = useCallback(
    (newMode: TimerMode) => {
      if (status !== 'idle' && status !== 'stopped') return; // só muda se parado
      setModeState(newMode);
    },
    [status]
  );

  const play = useCallback(() => {
    if (!selectedSubject) return;

    if (status === 'idle' || status === 'stopped') {
      // Novo estudo: reseta tudo
      setElapsedSeconds(0);
      setTotalFocusSeconds(0);
      startTimeRef.current = new Date().toISOString();

      if (isPomodoro && pomodoroConfig) {
        const initialFocusSeconds = pomodoroConfig.focusMinutes * 60;
        setPomodoroPhase('focus');
        setPhaseSecondsLeft(initialFocusSeconds);
        setCurrentCycle(1);
        pomodoroPhaseRef.current = 'focus';
        phaseSecondsLeftRef.current = initialFocusSeconds;
        currentCycleRef.current = 1;
      } else {
        setPomodoroPhase(null);
        setPhaseSecondsLeft(0);
        pomodoroPhaseRef.current = null;
        phaseSecondsLeftRef.current = 0;
        currentCycleRef.current = 1;
      }
    }

    setStatus('running');
    startTicking();
  }, [selectedSubject, status, isPomodoro, pomodoroConfig, startTicking]);

  const pause = useCallback(() => {
    if (status !== 'running') return;
    setStatus('paused');
    clearTick();
  }, [status, clearTick]);

  const stop = useCallback(async () => {
    if (status === 'idle') return;
    clearTick();

    const finalDuration = isPomodoro ? totalFocusSeconds : elapsedSeconds;

    if (finalDuration >= 10) {
      setIsSaving(true);
      try {
        await saveSession({
          userId,
          planId: planId || undefined,
          subject: selectedSubject,
          startTime: startTimeRef.current,
          endTime: new Date().toISOString(),
          duration: finalDuration,
          date: getTodayISO(),
        });
      } catch (error) {
        console.error('Erro ao salvar sessão:', error);
      } finally {
        setIsSaving(false);
      }
    }

    // Reseta
    setStatus('stopped');
    setElapsedSeconds(0);
    setTotalFocusSeconds(0);
    setPomodoroPhase(null);
    setPhaseSecondsLeft(0);
    setCurrentCycle(1);
    pomodoroPhaseRef.current = null;
    phaseSecondsLeftRef.current = 0;
    currentCycleRef.current = 1;
  }, [status, isPomodoro, totalFocusSeconds, elapsedSeconds, userId, planId, selectedSubject, clearTick]);

  const skipPhase = useCallback(() => {
    if (!isPomodoro || status !== 'running' || !pomodoroConfig || !pomodoroPhaseRef.current) return;
    const next = getNextPomodoroState(pomodoroPhaseRef.current, currentCycleRef.current, pomodoroConfig);
    pomodoroPhaseRef.current = next.phase;
    phaseSecondsLeftRef.current = next.secondsLeft;
    currentCycleRef.current = next.cycle;
    setPomodoroPhase(next.phase);
    setPhaseSecondsLeft(next.secondsLeft);
    setCurrentCycle(next.cycle);
    setPhaseJustChanged(next.phase);
  }, [getNextPomodoroState, isPomodoro, pomodoroConfig, status]);

  const clearPhaseChanged = useCallback(() => {
    setPhaseJustChanged(null);
  }, []);

  // ========================================
  // Display seconds
  // ========================================
  const displaySeconds = isPomodoro ? phaseSecondsLeft : elapsedSeconds;

  return {
    displaySeconds,
    elapsedSeconds, // compat
    totalFocusSeconds,
    status,
    mode,
    selectedSubject,
    isTabVisible,
    pomodoroPhase,
    currentCycle,
    totalCycles: pomodoroConfig?.cyclesBeforeLongBreak ?? 4,
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
  };
}
