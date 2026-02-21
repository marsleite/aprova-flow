/**
 * Toast de Feedback Pós-Sessão — Motor de regras local
 *
 * Aparece após o usuário parar o cronômetro.
 * Feedback 100% local (zero chamadas à IA):
 * - Classificação da sessão (curta/boa/longa)
 * - Progresso da meta semanal
 * - Dica contextual
 * Auto-dismiss após 8 segundos.
 */

'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles, X } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface PostSessionToastProps {
  /** Dados da sessão que acabou de ser salva */
  session: {
    subject: string;
    duration: number;
  } | null;
  /** Contexto para gerar feedback */
  context: {
    userName: string;
    weeklyProgressPercent: number;
    currentStreak: number;
    weeklyGoalHours: number;
    weeklyTotalHours: number;
  } | null;
  /** Callback para fechar */
  onDismiss: () => void;
}

// ============================================================
// Motor de feedback local
// ============================================================

function buildLocalFeedback(
  session: { subject: string; duration: number },
  context: {
    userName: string;
    weeklyProgressPercent: number;
    currentStreak: number;
    weeklyGoalHours: number;
    weeklyTotalHours: number;
  }
): string {
  const minutes = Math.round(session.duration / 60);
  const { subject, } = session;
  const { weeklyProgressPercent, currentStreak, weeklyGoalHours, weeklyTotalHours } = context;
  const remaining = Math.max(0, weeklyGoalHours - weeklyTotalHours);

  const parts: string[] = [];

  // Classificação da sessão
  if (minutes >= 60) {
    parts.push(`Sessão intensa de ${minutes} min em ${subject}!`);
  } else if (minutes >= 25) {
    parts.push(`Boa sessão de ${minutes} min em ${subject}.`);
  } else if (minutes >= 10) {
    parts.push(`${minutes} min em ${subject} — cada minuto conta.`);
  } else {
    parts.push(`${minutes} min rápidos em ${subject}.`);
  }

  // Progresso da meta
  if (weeklyProgressPercent >= 100) {
    parts.push('Meta semanal atingida! Continue para ir além.');
  } else if (weeklyProgressPercent >= 80) {
    parts.push(`Quase lá — ${weeklyProgressPercent}% da meta. Faltam ${remaining.toFixed(1)}h.`);
  } else if (weeklyProgressPercent > 0) {
    parts.push(`${weeklyProgressPercent}% da meta semanal. Faltam ${remaining.toFixed(1)}h.`);
  }

  // Streak
  if (currentStreak >= 7) {
    parts.push(`🔥 ${currentStreak} dias seguidos!`);
  } else if (currentStreak >= 3) {
    parts.push(`Streak de ${currentStreak} dias — não quebre a sequência.`);
  }

  return parts.join(' ');
}

// ============================================================
// Componente
// ============================================================

export default function PostSessionToast({
  session,
  context,
  onDismiss,
}: PostSessionToastProps) {
  const [dismissed, setDismissed] = useState(false);
  const [prevSession, setPrevSession] = useState(session);

  // Ajusta estado durante render quando session muda (padrão React recomendado)
  if (session !== prevSession) {
    setPrevSession(session);
    setDismissed(false);
  }

  const visible = !!session && session.duration >= 10 && !dismissed;

  // Feedback local (sem chamada de API)
  const feedback = useMemo(() => {
    if (!session || !context || session.duration < 10) return null;
    return buildLocalFeedback(session, context);
  }, [session, context]);

  // Ref estável para onDismiss — evita re-trigger do effect quando Dashboard re-renderiza
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  // Auto-dismiss após 8 segundos
  useEffect(() => {
    if (!session || session.duration < 10) return;

    const timer = setTimeout(() => {
      setDismissed(true);
      setTimeout(() => onDismissRef.current(), 400);
    }, 8000);

    return () => clearTimeout(timer);
  }, [session]);

  const handleClose = () => {
    setDismissed(true);
    setTimeout(() => onDismissRef.current(), 400);
  };

  if (!session || session.duration < 10) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 z-50 overflow-hidden rounded-2xl border border-violet-500/20 bg-gray-900/95 shadow-2xl backdrop-blur-xl sm:bottom-24 sm:left-auto sm:right-6 sm:w-80"
        >
          {/* Barra de progresso auto-dismiss */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 8, ease: 'linear' }}
            className="h-0.5 bg-violet-500"
          />

          <div className="p-4">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">Sessão salva!</span>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-600 hover:text-gray-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Info da sessão */}
            <p className="text-sm text-white">
              <span className="font-semibold">{session.subject}</span>
              <span className="mx-1 text-gray-500">·</span>
              {formatDuration(session.duration)}
            </p>

            {/* Feedback local */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 flex items-start gap-2 rounded-lg bg-violet-500/10 px-3 py-2"
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                  <p className="text-xs leading-relaxed text-gray-300">{feedback}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
