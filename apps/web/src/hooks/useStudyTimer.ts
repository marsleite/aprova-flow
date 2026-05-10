/**
 * Hook do cronômetro com estado autoritativo no Firestore.
 *
 * Regras:
 * - Pausa apenas manual.
 * - Sincroniza entre telas/dispositivos em tempo real.
 * - Limita controle ativo a 2 telas por usuário.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import {
  PomodoroConfig,
  PomodoroPhase,
  POMODORO_PRESETS,
  TimerMode,
  TimerStatus,
} from '@/types';
import { db } from '@/lib/firebase/config';
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
  /** Esta tela pode controlar o cronômetro */
  hasControl: boolean;
  /** Quantidade de telas ativas conectadas no cronômetro */
  activeScreens: number;
  /** Limite máximo de telas com controle ativo */
  maxActiveScreens: number;
  /** Define a matéria */
  setSelectedSubject: (subject: string) => void;
  /** Define o modo */
  setMode: (mode: TimerMode) => void;
  /** Inicia ou retoma o cronômetro */
  play: () => void;
  /** Seleciona a matéria e inicia ou retoma o cronômetro na mesma operação */
  startSubject: (subject: string) => void;
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

type PomodoroMode = Exclude<TimerMode, 'freeform'>;

interface RemoteTimerState {
  userId: string;
  mode: TimerMode;
  status: TimerStatus;
  selectedSubject: string;
  planId: string | null;
  startTime: string;
  runningAnchorAt: string | null;
  accumulatedSeconds: number;
  totalFocusSeconds: number;
  pomodoroPhase: PomodoroPhase | null;
  phaseSecondsLeft: number;
  currentCycle: number;
  updatedAt: string;
  updatedByClientId: string;
}

interface RuntimeSnapshot {
  displaySeconds: number;
  elapsedSeconds: number;
  totalFocusSeconds: number;
  pomodoroPhase: PomodoroPhase | null;
  phaseSecondsLeft: number;
  currentCycle: number;
}

const ACTIVE_TIMERS_COLLECTION = 'active_timers';
const TIMER_PRESENCE_COLLECTION = 'timer_presence';
const MAX_ACTIVE_SCREENS = 2;
const PRESENCE_HEARTBEAT_MS = 15000;
const PRESENCE_TTL_MS = 45000;
const CLIENT_ID_STORAGE_KEY = 'aprova-flow:timer-client-id';

const TIMER_STATUSES: TimerStatus[] = ['idle', 'running', 'paused', 'stopped'];
const TIMER_MODES: TimerMode[] = ['freeform', 'pomodoro-25/5', 'pomodoro-50/10', 'pomodoro-45/15'];
const POMODORO_PHASES: PomodoroPhase[] = ['focus', 'shortBreak', 'longBreak'];

function isTimerStatus(value: unknown): value is TimerStatus {
  return typeof value === 'string' && TIMER_STATUSES.includes(value as TimerStatus);
}

function isTimerMode(value: unknown): value is TimerMode {
  return typeof value === 'string' && TIMER_MODES.includes(value as TimerMode);
}

function isPomodoroPhase(value: unknown): value is PomodoroPhase {
  return typeof value === 'string' && POMODORO_PHASES.includes(value as PomodoroPhase);
}

function toNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function parseIsoMs(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') {
    return `ssr-${Date.now()}`;
  }

  const existing = window.sessionStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;

  const generated =
    typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, generated);
  return generated;
}

function createDefaultTimerState(userId: string): RemoteTimerState {
  const now = new Date().toISOString();
  return {
    userId,
    mode: 'freeform',
    status: 'idle',
    selectedSubject: '',
    planId: null,
    startTime: '',
    runningAnchorAt: null,
    accumulatedSeconds: 0,
    totalFocusSeconds: 0,
    pomodoroPhase: null,
    phaseSecondsLeft: 0,
    currentCycle: 1,
    updatedAt: now,
    updatedByClientId: '',
  };
}

function normalizeTimerState(raw: Record<string, unknown> | undefined, userId: string): RemoteTimerState {
  const fallback = createDefaultTimerState(userId);
  if (!raw) return fallback;

  return {
    userId,
    mode: isTimerMode(raw.mode) ? raw.mode : fallback.mode,
    status: isTimerStatus(raw.status) ? raw.status : fallback.status,
    selectedSubject: typeof raw.selectedSubject === 'string' ? raw.selectedSubject : fallback.selectedSubject,
    planId: typeof raw.planId === 'string' && raw.planId.length > 0 ? raw.planId : null,
    startTime: typeof raw.startTime === 'string' ? raw.startTime : fallback.startTime,
    runningAnchorAt:
      typeof raw.runningAnchorAt === 'string' && raw.runningAnchorAt.length > 0
        ? raw.runningAnchorAt
        : null,
    accumulatedSeconds: toNonNegativeInt(raw.accumulatedSeconds, 0),
    totalFocusSeconds: toNonNegativeInt(raw.totalFocusSeconds, 0),
    pomodoroPhase: isPomodoroPhase(raw.pomodoroPhase) ? raw.pomodoroPhase : null,
    phaseSecondsLeft: toNonNegativeInt(raw.phaseSecondsLeft, 0),
    currentCycle: Math.max(1, toNonNegativeInt(raw.currentCycle, 1)),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : fallback.updatedAt,
    updatedByClientId:
      typeof raw.updatedByClientId === 'string' ? raw.updatedByClientId : fallback.updatedByClientId,
  };
}

function getNextPomodoroState(phase: PomodoroPhase, cycle: number, config: PomodoroConfig) {
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
}

function ensurePomodoroSeedState(
  phase: PomodoroPhase | null,
  phaseSecondsLeft: number,
  cycle: number,
  config: PomodoroConfig
) {
  if (!phase) {
    return {
      phase: 'focus' as const,
      phaseSecondsLeft: config.focusMinutes * 60,
      cycle: 1,
    };
  }
  const seconds = Math.max(0, Math.floor(phaseSecondsLeft));
  return {
    phase,
    phaseSecondsLeft: seconds,
    cycle: Math.max(1, cycle),
  };
}

function simulatePomodoroState({
  phase,
  phaseSecondsLeft,
  cycle,
  totalFocusSeconds,
  elapsedSeconds,
  config,
}: {
  phase: PomodoroPhase | null;
  phaseSecondsLeft: number;
  cycle: number;
  totalFocusSeconds: number;
  elapsedSeconds: number;
  config: PomodoroConfig;
}) {
  const seeded = ensurePomodoroSeedState(phase, phaseSecondsLeft, cycle, config);
  let currentPhase = seeded.phase;
  let secondsLeft = seeded.phaseSecondsLeft;
  let currentCycle = seeded.cycle;
  let focusAccumulated = Math.max(0, Math.floor(totalFocusSeconds));
  let remaining = Math.max(0, Math.floor(elapsedSeconds));

  while (remaining > 0) {
    if (secondsLeft <= 0) {
      const next = getNextPomodoroState(currentPhase, currentCycle, config);
      currentPhase = next.phase;
      currentCycle = next.cycle;
      secondsLeft = next.secondsLeft;
      continue;
    }

    const consumed = Math.min(secondsLeft, remaining);
    if (currentPhase === 'focus') {
      focusAccumulated += consumed;
    }

    secondsLeft -= consumed;
    remaining -= consumed;

    if (secondsLeft === 0) {
      const next = getNextPomodoroState(currentPhase, currentCycle, config);
      currentPhase = next.phase;
      currentCycle = next.cycle;
      secondsLeft = next.secondsLeft;
    }
  }

  return {
    phase: currentPhase,
    phaseSecondsLeft: secondsLeft,
    currentCycle,
    totalFocusSeconds: focusAccumulated,
  };
}

function deriveFreeformElapsedSeconds(state: RemoteTimerState, nowMs: number): number {
  const base = Math.max(0, Math.floor(state.accumulatedSeconds));
  if (state.status !== 'running' || !state.runningAnchorAt) {
    return base;
  }

  const anchorMs = parseIsoMs(state.runningAnchorAt);
  if (anchorMs === null) return base;
  const runningDelta = Math.max(0, Math.floor((nowMs - anchorMs) / 1000));
  return base + runningDelta;
}

function derivePomodoroState(state: RemoteTimerState, nowMs: number) {
  if (state.mode === 'freeform') {
    return {
      phase: null,
      phaseSecondsLeft: 0,
      currentCycle: 1,
      totalFocusSeconds: 0,
    };
  }

  const config = POMODORO_PRESETS[state.mode];
  if (state.status !== 'running' || !state.runningAnchorAt) {
    const seeded = ensurePomodoroSeedState(
      state.pomodoroPhase,
      state.phaseSecondsLeft,
      state.currentCycle,
      config
    );
    return {
      phase: state.pomodoroPhase ? seeded.phase : null,
      phaseSecondsLeft: state.pomodoroPhase ? seeded.phaseSecondsLeft : 0,
      currentCycle: state.pomodoroPhase ? seeded.cycle : 1,
      totalFocusSeconds: Math.max(0, Math.floor(state.totalFocusSeconds)),
    };
  }

  const anchorMs = parseIsoMs(state.runningAnchorAt);
  const elapsedSeconds =
    anchorMs === null ? 0 : Math.max(0, Math.floor((nowMs - anchorMs) / 1000));

  return simulatePomodoroState({
    phase: state.pomodoroPhase,
    phaseSecondsLeft: state.phaseSecondsLeft,
    cycle: state.currentCycle,
    totalFocusSeconds: state.totalFocusSeconds,
    elapsedSeconds,
    config,
  });
}

function deriveRuntimeSnapshot(state: RemoteTimerState, nowMs: number): RuntimeSnapshot {
  if (state.mode === 'freeform') {
    const elapsed = deriveFreeformElapsedSeconds(state, nowMs);
    return {
      displaySeconds: elapsed,
      elapsedSeconds: elapsed,
      totalFocusSeconds: elapsed,
      pomodoroPhase: null,
      phaseSecondsLeft: 0,
      currentCycle: 1,
    };
  }

  const pomodoro = derivePomodoroState(state, nowMs);
  return {
    displaySeconds: pomodoro.phaseSecondsLeft,
    elapsedSeconds: pomodoro.totalFocusSeconds,
    totalFocusSeconds: pomodoro.totalFocusSeconds,
    pomodoroPhase: pomodoro.phase,
    phaseSecondsLeft: pomodoro.phaseSecondsLeft,
    currentCycle: pomodoro.currentCycle,
  };
}

// Alias de compat para código existente
export type { UseStudyTimerReturn };

export function useStudyTimer({ userId, planId }: UseStudyTimerOptions): UseStudyTimerReturn & {
  /** @deprecated use displaySeconds */
  elapsedSeconds: number;
} {
  const clientIdRef = useRef(getOrCreateClientId());
  const presenceCreatedAtRef = useRef(new Date().toISOString());
  const previousPhaseRef = useRef<PomodoroPhase | null>(null);

  const [remoteState, setRemoteState] = useState<RemoteTimerState>(() => createDefaultTimerState(userId));
  const [tickNowMs, setTickNowMs] = useState(Date.now());
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [phaseJustChanged, setPhaseJustChanged] = useState<PomodoroPhase | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasControl, setHasControl] = useState(true);
  const [activeScreens, setActiveScreens] = useState(1);

  useEffect(() => {
    setRemoteState(createDefaultTimerState(userId));
    setTickNowMs(Date.now());
    previousPhaseRef.current = null;
  }, [userId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const timerRef = doc(db, ACTIVE_TIMERS_COLLECTION, userId);

    const unsubscribe = onSnapshot(
      timerRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          const defaults = createDefaultTimerState(userId);
          setRemoteState(defaults);
          void setDoc(timerRef, defaults, { merge: true });
          return;
        }

        const next = normalizeTimerState(snapshot.data() as Record<string, unknown>, userId);
        setRemoteState(next);
      },
      (error) => {
        console.warn('Erro ao sincronizar timer ativo:', error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (remoteState.status !== 'running') {
      setTickNowMs(Date.now());
      return;
    }

    const intervalId = window.setInterval(() => {
      setTickNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [remoteState.status, remoteState.runningAnchorAt, remoteState.mode]);

  useEffect(() => {
    if (!userId) return;

    const clientId = clientIdRef.current;
    const myPresenceRef = doc(db, TIMER_PRESENCE_COLLECTION, userId, 'clients', clientId);
    const clientsRef = collection(db, TIMER_PRESENCE_COLLECTION, userId, 'clients');

    const heartbeat = async () => {
      try {
        await setDoc(
          myPresenceRef,
          {
            userId,
            clientId,
            createdAt: presenceCreatedAtRef.current,
            lastSeenAt: new Date().toISOString(),
            userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent.slice(0, 200),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn('Erro no heartbeat do timer:', error);
      }
    };

    void heartbeat();
    const heartbeatId = window.setInterval(() => {
      void heartbeat();
    }, PRESENCE_HEARTBEAT_MS);

    const unsubscribe = onSnapshot(
      clientsRef,
      (snapshot) => {
        const nowMs = Date.now();
        const staleThresholdMs = PRESENCE_TTL_MS * 3;

        const activeClients = snapshot.docs
          .map((clientDoc) => {
            const data = clientDoc.data() as Record<string, unknown>;
            const createdAtMs = parseIsoMs(data.createdAt) ?? parseIsoMs(data.lastSeenAt) ?? 0;
            const lastSeenAtMs = parseIsoMs(data.lastSeenAt) ?? 0;
            return {
              ref: clientDoc.ref,
              clientId:
                typeof data.clientId === 'string' && data.clientId.length > 0
                  ? data.clientId
                  : clientDoc.id,
              createdAtMs,
              lastSeenAtMs,
            };
          })
          .filter((client) => {
            const isFresh = nowMs - client.lastSeenAtMs <= PRESENCE_TTL_MS;
            const isVeryStale = nowMs - client.lastSeenAtMs > staleThresholdMs;
            if (isVeryStale) {
              void deleteDoc(client.ref).catch(() => {
                // cleanup best effort
              });
            }
            return isFresh;
          })
          .sort((a, b) => {
            if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
            return a.clientId.localeCompare(b.clientId);
          });

        setActiveScreens(activeClients.length);
        const allowedClients = new Set(
          activeClients.slice(0, MAX_ACTIVE_SCREENS).map((client) => client.clientId)
        );
        setHasControl(allowedClients.has(clientId));
      },
      (error) => {
        console.warn('Erro ao observar presença do timer:', error);
      }
    );

    const handleBeforeUnload = () => {
      void deleteDoc(myPresenceRef).catch(() => {
        // cleanup best effort
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(heartbeatId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribe();
      void deleteDoc(myPresenceRef).catch(() => {
        // cleanup best effort
      });
    };
  }, [userId]);

  const mutateTimerState = useCallback(
    async (
      mutator: (current: RemoteTimerState, nowIso: string, nowMs: number) => RemoteTimerState | null
    ) => {
      if (!userId || !hasControl) return;

      const timerRef = doc(db, ACTIVE_TIMERS_COLLECTION, userId);
      const clientId = clientIdRef.current;

      await runTransaction(db, async (transaction) => {
        const currentSnap = await transaction.get(timerRef);
        const current = currentSnap.exists()
          ? normalizeTimerState(currentSnap.data() as Record<string, unknown>, userId)
          : createDefaultTimerState(userId);

        const now = new Date();
        const nowIso = now.toISOString();
        const next = mutator(current, nowIso, now.getTime());
        if (!next) return;

        transaction.set(
          timerRef,
          {
            ...next,
            userId,
            updatedAt: nowIso,
            updatedByClientId: clientId,
          },
          { merge: true }
        );
      });
    },
    [hasControl, userId]
  );

  const runtime = useMemo(() => deriveRuntimeSnapshot(remoteState, tickNowMs), [remoteState, tickNowMs]);

  useEffect(() => {
    const isRunningPomodoro = remoteState.mode !== 'freeform' && remoteState.status === 'running';
    const currentPhase = runtime.pomodoroPhase;

    if (isRunningPomodoro && previousPhaseRef.current && currentPhase && previousPhaseRef.current !== currentPhase) {
      setPhaseJustChanged(currentPhase);
    }

    previousPhaseRef.current = currentPhase;
  }, [remoteState.mode, remoteState.status, runtime.pomodoroPhase]);

  const mode = remoteState.mode;
  const status = remoteState.status;
  const selectedSubject = remoteState.selectedSubject;
  const pomodoroConfig = mode === 'freeform' ? null : POMODORO_PRESETS[mode];
  const pomodoroPhase = mode === 'freeform' ? null : runtime.pomodoroPhase;
  const currentCycle = mode === 'freeform' ? 1 : runtime.currentCycle;

  const setSelectedSubject = useCallback(
    (subject: string) => {
      if (!hasControl) return;
      const normalized = subject.trim().replace(/\s+/g, ' ');
      setRemoteState((prev) => ({ ...prev, selectedSubject: normalized }));
      void mutateTimerState((current) => ({ ...current, selectedSubject: normalized })).catch((error) => {
        console.error('Erro ao definir matéria do timer:', error);
      });
    },
    [hasControl, mutateTimerState]
  );

  const setMode = useCallback(
    (newMode: TimerMode) => {
      if (!hasControl) return;

      setRemoteState((prev) => {
        if (prev.status !== 'idle' && prev.status !== 'stopped') return prev;
        return {
          ...prev,
          mode: newMode,
          accumulatedSeconds: 0,
          totalFocusSeconds: 0,
          pomodoroPhase: null,
          phaseSecondsLeft: 0,
          currentCycle: 1,
          runningAnchorAt: null,
          startTime: '',
        };
      });

      void mutateTimerState((current) => {
        if (current.status !== 'idle' && current.status !== 'stopped') return null;
        return {
          ...current,
          mode: newMode,
          accumulatedSeconds: 0,
          totalFocusSeconds: 0,
          pomodoroPhase: null,
          phaseSecondsLeft: 0,
          currentCycle: 1,
          runningAnchorAt: null,
          startTime: '',
        };
      }).catch((error) => {
        console.error('Erro ao alterar modo do timer:', error);
      });
    },
    [hasControl, mutateTimerState]
  );

  const play = useCallback(() => {
    if (!hasControl) return;
    const optimisticSubject = remoteState.selectedSubject.trim();
    void mutateTimerState((current, nowIso) => {
      const subject = (current.selectedSubject || optimisticSubject).trim();
      if (!subject) return null;
      if (current.status === 'running') return null;

      if (current.status === 'paused') {
        return {
          ...current,
          status: 'running',
          selectedSubject: subject,
          runningAnchorAt: nowIso,
        };
      }

      if (current.status !== 'idle' && current.status !== 'stopped') return null;

      if (current.mode === 'freeform') {
        return {
          ...current,
          status: 'running',
          selectedSubject: subject,
          planId: planId || null,
          startTime: nowIso,
          runningAnchorAt: nowIso,
          accumulatedSeconds: 0,
          totalFocusSeconds: 0,
          pomodoroPhase: null,
          phaseSecondsLeft: 0,
          currentCycle: 1,
        };
      }

      const config = POMODORO_PRESETS[current.mode as PomodoroMode];
      return {
        ...current,
        status: 'running',
        selectedSubject: subject,
        planId: planId || null,
        startTime: nowIso,
        runningAnchorAt: nowIso,
        accumulatedSeconds: 0,
        totalFocusSeconds: 0,
        pomodoroPhase: 'focus',
        phaseSecondsLeft: config.focusMinutes * 60,
        currentCycle: 1,
      };
    }).catch((error) => {
      console.error('Erro ao iniciar/retomar timer:', error);
    });
  }, [hasControl, mutateTimerState, planId, remoteState.selectedSubject]);

  const startSubject = useCallback(
    (subject: string) => {
      if (!hasControl) return;
      const normalized = subject.trim().replace(/\s+/g, ' ');
      if (!normalized) return;

      void mutateTimerState((current, nowIso) => {
        if (current.status === 'running') {
          return {
            ...current,
            selectedSubject: normalized,
            planId: planId || null,
          };
        }

        if (current.status === 'paused') {
          return {
            ...current,
            status: 'running',
            selectedSubject: normalized,
            planId: planId || null,
            runningAnchorAt: nowIso,
          };
        }

        if (current.status !== 'idle' && current.status !== 'stopped') return null;

        if (current.mode === 'freeform') {
          return {
            ...current,
            status: 'running',
            selectedSubject: normalized,
            planId: planId || null,
            startTime: nowIso,
            runningAnchorAt: nowIso,
            accumulatedSeconds: 0,
            totalFocusSeconds: 0,
            pomodoroPhase: null,
            phaseSecondsLeft: 0,
            currentCycle: 1,
          };
        }

        const config = POMODORO_PRESETS[current.mode as PomodoroMode];
        return {
          ...current,
          status: 'running',
          selectedSubject: normalized,
          planId: planId || null,
          startTime: nowIso,
          runningAnchorAt: nowIso,
          accumulatedSeconds: 0,
          totalFocusSeconds: 0,
          pomodoroPhase: 'focus',
          phaseSecondsLeft: config.focusMinutes * 60,
          currentCycle: 1,
        };
      }).catch((error) => {
        console.error('Erro ao iniciar timer pela matéria do plano diário:', error);
      });
    },
    [hasControl, mutateTimerState, planId]
  );

  const pause = useCallback(() => {
    if (!hasControl) return;
    void mutateTimerState((current, _nowIso, nowMs) => {
      if (current.status !== 'running') return null;

      if (current.mode === 'freeform') {
        const elapsed = deriveFreeformElapsedSeconds(current, nowMs);
        return {
          ...current,
          status: 'paused',
          runningAnchorAt: null,
          accumulatedSeconds: elapsed,
        };
      }

      const pomodoro = derivePomodoroState(current, nowMs);
      return {
        ...current,
        status: 'paused',
        runningAnchorAt: null,
        totalFocusSeconds: pomodoro.totalFocusSeconds,
        pomodoroPhase: pomodoro.phase,
        phaseSecondsLeft: pomodoro.phaseSecondsLeft,
        currentCycle: pomodoro.currentCycle,
      };
    }).catch((error) => {
      console.error('Erro ao pausar timer:', error);
    });
  }, [hasControl, mutateTimerState]);

  const stop = useCallback(async () => {
    if (!hasControl) return;

    const finalSessionRef: {
      current:
        | {
            subject: string;
            startTime: string;
            endTime: string;
            duration: number;
            planId?: string;
          }
        | null;
    } = { current: null };

    await mutateTimerState((current, nowIso, nowMs) => {
      if (current.status === 'idle' || current.status === 'stopped') return null;

      if (current.mode === 'freeform') {
        const elapsed = deriveFreeformElapsedSeconds(current, nowMs);
        finalSessionRef.current = {
          subject: current.selectedSubject,
          startTime: current.startTime || nowIso,
          endTime: nowIso,
          duration: elapsed,
          planId: current.planId || planId || undefined,
        };
      } else {
        const pomodoro = derivePomodoroState(current, nowMs);
        finalSessionRef.current = {
          subject: current.selectedSubject,
          startTime: current.startTime || nowIso,
          endTime: nowIso,
          duration: pomodoro.totalFocusSeconds,
          planId: current.planId || planId || undefined,
        };
      }

      return {
        ...current,
        status: 'stopped',
        runningAnchorAt: null,
        accumulatedSeconds: 0,
        totalFocusSeconds: 0,
        pomodoroPhase: null,
        phaseSecondsLeft: 0,
        currentCycle: 1,
        startTime: '',
        planId: null,
      };
    }).catch((error) => {
      console.error('Erro ao parar timer:', error);
    });

    const finalSession = finalSessionRef.current;
    if (!finalSession || finalSession.duration < 10) return;

    setIsSaving(true);
    try {
      await saveSession({
        userId,
        planId: finalSession.planId,
        subject: finalSession.subject,
        startTime: finalSession.startTime,
        endTime: finalSession.endTime,
        duration: finalSession.duration,
        date: getTodayISO(),
        source: 'timer',
      });
    } catch (error) {
      console.error('Erro ao salvar sessão do timer:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasControl, mutateTimerState, planId, userId]);

  const skipPhase = useCallback(() => {
    if (!hasControl) return;
    void mutateTimerState((current, nowIso, nowMs) => {
      if (current.mode === 'freeform' || current.status !== 'running') return null;

      const pomodoro = derivePomodoroState(current, nowMs);
      if (pomodoro.phase !== 'shortBreak' && pomodoro.phase !== 'longBreak') return null;

      const config = POMODORO_PRESETS[current.mode as PomodoroMode];
      const next = getNextPomodoroState(pomodoro.phase, pomodoro.currentCycle, config);

      return {
        ...current,
        status: 'running',
        runningAnchorAt: nowIso,
        totalFocusSeconds: pomodoro.totalFocusSeconds,
        pomodoroPhase: next.phase,
        phaseSecondsLeft: next.secondsLeft,
        currentCycle: next.cycle,
      };
    }).catch((error) => {
      console.error('Erro ao pular fase do pomodoro:', error);
    });
  }, [hasControl, mutateTimerState]);

  const clearPhaseChanged = useCallback(() => {
    setPhaseJustChanged(null);
  }, []);

  return {
    displaySeconds: runtime.displaySeconds,
    elapsedSeconds: runtime.elapsedSeconds,
    totalFocusSeconds: runtime.totalFocusSeconds,
    status,
    mode,
    selectedSubject,
    isTabVisible,
    pomodoroPhase,
    currentCycle,
    totalCycles: pomodoroConfig?.cyclesBeforeLongBreak ?? 4,
    pomodoroConfig,
    phaseJustChanged,
    hasControl,
    activeScreens,
    maxActiveScreens: MAX_ACTIVE_SCREENS,
    setSelectedSubject,
    setMode,
    play,
    startSubject,
    pause,
    stop,
    skipPhase,
    clearPhaseChanged,
    isSaving,
  };
}
