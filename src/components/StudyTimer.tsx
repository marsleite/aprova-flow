/**
 * Componente StudyTimer — Premium
 * 
 * Cronômetro com anel circular SVG que completa a cada minuto,
 * glow pulsante quando rodando, e animações via framer-motion.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Clock, AlertTriangle, Save, BookOpen } from 'lucide-react';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { formatTimerDisplay } from '@/lib/utils';
import { DEFAULT_SUBJECTS } from '@/types';

interface StudyTimerProps {
  userId: string;
  onSessionSaved?: () => void;
}

/** Anel circular SVG que preenche de 0-60 segundos */
function ProgressRing({
  seconds,
  isRunning,
  isPaused,
}: {
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
}) {
  const radius = 110;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Progresso de 0-60 dentro do minuto corrente
  const progress = (seconds % 60) / 60;
  const offset = circumference - progress * circumference;

  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      {/* Track de fundo */}
      <circle
        stroke="#1f2937"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      {/* Arco de progresso */}
      <circle
        stroke={isPaused ? '#F59E0B' : isRunning ? '#8B5CF6' : '#374151'}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="transition-all duration-1000 ease-linear"
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
        }}
      />
    </svg>
  );
}

export default function StudyTimer({ userId, onSessionSaved }: StudyTimerProps) {
  const {
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
  } = useStudyTimer({ userId });

  const handleStop = async () => {
    await stop();
    onSessionSaved?.();
  };

  const isRunning = status === 'running';
  const isPaused = status === 'paused' || isAutoPaused;
  const isIdle = status === 'idle' || status === 'stopped';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-2xl"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/20 p-2.5">
          <Clock className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Cronômetro de Estudo</h2>
          <p className="text-sm text-gray-400">Tempo líquido · Pausa automática ao trocar aba</p>
        </div>
      </div>

      {/* Seletor de Matéria */}
      <div className="mb-6">
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
          {DEFAULT_SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      {/* Display do Timer com Anel Circular */}
      <div className="mb-6 flex flex-col items-center">
        <div className="relative flex h-[220px] w-[220px] items-center justify-center">
          {/* Anel de progresso */}
          <ProgressRing
            seconds={elapsedSeconds}
            isRunning={isRunning}
            isPaused={isPaused}
          />

          {/* Glow quando rodando */}
          {isRunning && !isAutoPaused && (
            <div className="absolute inset-0 animate-timer-glow rounded-full" />
          )}

          {/* Tempo no centro */}
          <motion.div
            key={status}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`relative z-10 font-mono text-5xl font-bold tracking-wider transition-colors duration-300 
              ${isRunning && !isAutoPaused ? 'text-violet-400' : ''}
              ${isPaused ? 'text-amber-400' : ''}
              ${isIdle ? 'text-gray-500' : ''}
            `}
          >
            {formatTimerDisplay(elapsedSeconds)}
          </motion.div>
        </div>

        {/* Indicador de status */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${status}-${isAutoPaused}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-center gap-2"
          >
            {isRunning && !isAutoPaused && (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-sm text-green-400">Estudando...</span>
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
              disabled={!selectedSubject}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 
                         shadow-lg shadow-violet-600/30 transition-colors hover:bg-violet-500
                         disabled:cursor-not-allowed disabled:bg-gray-700 disabled:shadow-none"
              title={!selectedSubject ? 'Selecione uma matéria primeiro' : 'Iniciar'}
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

        {/* Stop (sempre visível quando não idle) */}
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
