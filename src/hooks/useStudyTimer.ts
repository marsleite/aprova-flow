/**
 * Hook do Cronômetro de Estudo com Horas Líquidas + Pomodoro
 *
 * ===== REGRA DAS HORAS LÍQUIDAS =====
 * Utiliza a Page Visibility API para pausar automaticamente o cronômetro
 * quando o usuário muda de aba ou minimiza o navegador.
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
  /** Se o cronômetro foi auto-pausado por troca de aba */
  isAutoPaused: boolean;
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

export function useStudyTimer({ userId }: UseStudyTimerOptions): UseStudyTimerReturn & {
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
  const [isAutoPaused, setIsAutoPaused] = useState(false);
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
  const wasRunningBeforeHide = useRef(false);

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
  }, []);

  const startTicking = useCallback(() => {
    clearTick();
    intervalRef.current = setInterval(() => {
      if (!isPomodoro) {
        // Freeform: conta pra cima
        setElapsedSeconds((prev) => prev + 1);
      } else {
        // Pomodoro: conta pra baixo
        setPhaseSecondsLeft((prev) => {
          if (prev <= 1) return 0; // será tratado pelo effect
          return prev - 1;
        });
        // Acumula foco
        setPomodoroPhase((phase) => {
          if (phase === 'focus') {
            setTotalFocusSeconds((t) => t + 1);
            setElapsedSeconds((e) => e + 1);
          }
          return phase;
        });
      }
    }, 1000);
  }, [isPomodoro, clearTick]);

  // ========================================
  // Pomodoro — transição automática de fase
  // ========================================
  useEffect(() => {
    if (!isPomodoro || status !== 'running' || phaseSecondsLeft > 0) return;
    if (!pomodoroConfig || !pomodoroPhase) return;

    // Fase acabou
    clearTick();

    if (pomodoroPhase === 'focus') {
      // Foco acabou → vai pra pausa
      const isLongBreak = currentCycle >= pomodoroConfig.cyclesBeforeLongBreak;
      const nextPhase: PomodoroPhase = isLongBreak ? 'longBreak' : 'shortBreak';
      const breakMinutes = isLongBreak
        ? pomodoroConfig.longBreakMinutes
        : pomodoroConfig.shortBreakMinutes;

      setPomodoroPhase(nextPhase);
      setPhaseSecondsLeft(breakMinutes * 60);
      setPhaseJustChanged(nextPhase);
      startTicking();
    } else {
      // Pausa acabou → próximo ciclo de foco
      const wasLongBreak = pomodoroPhase === 'longBreak';
      const nextCycle = wasLongBreak ? 1 : currentCycle + 1;

      setCurrentCycle(nextCycle);
      setPomodoroPhase('focus');
      setPhaseSecondsLeft(pomodoroConfig.focusMinutes * 60);
      setPhaseJustChanged('focus');
      startTicking();
    }
  }, [
    phaseSecondsLeft,
    isPomodoro,
    status,
    pomodoroPhase,
    pomodoroConfig,
    currentCycle,
    clearTick,
    startTicking,
  ]);

  // ========================================
  // Page Visibility API — Horas Líquidas
  // ========================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);

      if (!visible && status === 'running') {
        wasRunningBeforeHide.current = true;
        setIsAutoPaused(true);
        clearTick();
      } else if (visible && wasRunningBeforeHide.current) {
        wasRunningBeforeHide.current = false;
        setIsAutoPaused(false);
        startTicking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, clearTick, startTicking]);

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
        setPomodoroPhase('focus');
        setPhaseSecondsLeft(pomodoroConfig.focusMinutes * 60);
        setCurrentCycle(1);
      } else {
        setPomodoroPhase(null);
        setPhaseSecondsLeft(0);
      }
    }

    setStatus('running');
    setIsAutoPaused(false);
    wasRunningBeforeHide.current = false;
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
    setIsAutoPaused(false);
    setPomodoroPhase(null);
    setPhaseSecondsLeft(0);
    setCurrentCycle(1);
    wasRunningBeforeHide.current = false;
  }, [status, isPomodoro, totalFocusSeconds, elapsedSeconds, userId, selectedSubject, clearTick]);

  const skipPhase = useCallback(() => {
    if (!isPomodoro || status !== 'running') return;
    // Força transição zerando o timer da fase
    setPhaseSecondsLeft(0);
  }, [isPomodoro, status]);

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
    isAutoPaused,
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
