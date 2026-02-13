/**
 * Hook do Cronômetro de Estudo com Horas Líquidas
 * 
 * ===== REGRA DAS HORAS LÍQUIDAS =====
 * Utiliza a Page Visibility API para pausar automaticamente o cronômetro
 * quando o usuário muda de aba ou minimiza o navegador.
 * Isso garante que apenas o tempo real de estudo ativo seja contabilizado.
 * 
 * Fluxo:
 * 1. Ao clicar "Play", o timer começa a contar
 * 2. Se a aba ficar inativa (document.hidden === true), o timer pausa
 * 3. Ao retornar para a aba, o timer retoma automaticamente
 * 4. Ao clicar "Stop", a duração líquida é calculada e salva no Firestore
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerStatus } from '@/types';
import { saveSession } from '@/lib/firebase/sessions';
import { getTodayISO } from '@/lib/utils';

interface UseStudyTimerOptions {
  userId: string;
}

interface UseStudyTimerReturn {
  /** Segundos acumulados (tempo líquido) */
  elapsedSeconds: number;
  /** Estado atual do cronômetro */
  status: TimerStatus;
  /** Matéria selecionada */
  selectedSubject: string;
  /** Se a aba está visível ou não */
  isTabVisible: boolean;
  /** Se o cronômetro foi auto-pausado por troca de aba */
  isAutoPaused: boolean;
  /** Define a matéria */
  setSelectedSubject: (subject: string) => void;
  /** Inicia ou retoma o cronômetro */
  play: () => void;
  /** Pausa manualmente o cronômetro */
  pause: () => void;
  /** Para o cronômetro e salva a sessão */
  stop: () => Promise<void>;
  /** Se está salvando no Firestore */
  isSaving: boolean;
}

export function useStudyTimer({ userId }: UseStudyTimerOptions): UseStudyTimerReturn {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs para controle interno
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<string>('');
  const wasRunningBeforeHide = useRef(false);

  // ========================================
  // Page Visibility API - Horas Líquidas
  // ========================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);

      if (!visible && status === 'running') {
        // Aba ficou inativa → pausa automática
        wasRunningBeforeHide.current = true;
        setIsAutoPaused(true);
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      } else if (visible && wasRunningBeforeHide.current) {
        // Aba voltou a ficar ativa → retoma automaticamente
        wasRunningBeforeHide.current = false;
        setIsAutoPaused(false);
        startTicking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Limpa o intervalo ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Inicia o tick do cronômetro (1 segundo)
  const startTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  // ========================================
  // Controles do Cronômetro
  // ========================================

  /** Play - Inicia ou retoma a contagem */
  const play = useCallback(() => {
    if (!selectedSubject) return;

    if (status === 'idle' || status === 'stopped') {
      // Novo estudo: reseta tudo
      setElapsedSeconds(0);
      startTimeRef.current = new Date().toISOString();
    }

    setStatus('running');
    setIsAutoPaused(false);
    wasRunningBeforeHide.current = false;
    startTicking();
  }, [selectedSubject, status, startTicking]);

  /** Pause - Pausa manualmente */
  const pause = useCallback(() => {
    if (status !== 'running') return;

    setStatus('paused');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [status]);

  /** Stop - Para e salva a sessão no Firestore */
  const stop = useCallback(async () => {
    if (status === 'idle') return;

    // Para o timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const finalDuration = elapsedSeconds;
    
    // Só salva se tiver ao menos 10 segundos de estudo
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

    // Reseta o estado
    setStatus('stopped');
    setElapsedSeconds(0);
    setIsAutoPaused(false);
    wasRunningBeforeHide.current = false;
  }, [status, elapsedSeconds, userId, selectedSubject]);

  return {
    elapsedSeconds,
    status,
    selectedSubject,
    isTabVisible,
    isAutoPaused,
    setSelectedSubject,
    play,
    pause,
    stop,
    isSaving,
  };
}
