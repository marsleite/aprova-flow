/**
 * Toast de Feedback Pós-Sessão
 *
 * Aparece após o usuário parar o cronômetro.
 * Mostra feedback curto da IA + dados da sessão.
 * Auto-dismiss após 8 segundos.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
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

export default function PostSessionToast({
  session,
  context,
  onDismiss,
}: PostSessionToastProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [prevSession, setPrevSession] = useState(session);

  // Ajusta estado durante render quando session muda (padrão React recomendado)
  if (session !== prevSession) {
    setPrevSession(session);
    setDismissed(false);
    setFeedback(null);
  }

  const visible = !!session && session.duration >= 10 && !dismissed;

  // Ref estável para onDismiss — evita re-trigger do effect quando Dashboard re-renderiza
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!session || session.duration < 10) return;

    // Busca feedback da IA em background (não bloqueia a UI)
    if (context) {
      fetch('/api/post-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: context.userName,
          subject: session.subject,
          durationMinutes: Math.round(session.duration / 60),
          weeklyProgressPercent: context.weeklyProgressPercent,
          currentStreak: context.currentStreak,
          weeklyGoalHours: context.weeklyGoalHours,
          weeklyTotalHours: context.weeklyTotalHours,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.feedback) setFeedback(data.feedback);
        })
        .catch(() => {});
    }

    // Auto-dismiss após 8 segundos
    const timer = setTimeout(() => {
      setDismissed(true);
      setTimeout(() => onDismissRef.current(), 400);
    }, 8000);

    return () => clearTimeout(timer);
  }, [session, context]);

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
          className="fixed bottom-24 right-6 z-50 w-80 overflow-hidden rounded-2xl border border-violet-500/20 bg-gray-900/95 shadow-2xl backdrop-blur-xl"
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

            {/* Feedback da IA */}
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
