/**
 * Histórico de Sessões Recentes
 * 
 * Lista as últimas sessões de estudo com matéria, duração
 * e data relativa. Animação staggered de entrada.
 */

'use client';

import { motion } from 'framer-motion';
import { History, Clock } from 'lucide-react';
import { StudySession } from '@/types';
import { formatDuration, formatRelativeDate } from '@/lib/utils';

interface RecentSessionsProps {
  sessions: StudySession[];
  loading?: boolean;
}

/** Gera uma cor consistente baseada no nome da matéria */
function getSubjectColor(subject: string): { bg: string; text: string; dot: string } {
  const colors = [
    { bg: 'bg-primary/20', text: 'text-primary', dot: 'bg-primary' },
    { bg: 'bg-[var(--primary)]/15', text: 'text-[var(--primary)]/80', dot: 'bg-primary' },
    { bg: 'bg-primary/20/15', text: 'text-primary', dot: 'bg-primary/20' },
    { bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
    { bg: 'bg-pink-500/15', text: 'text-primary', dot: 'bg-pink-400' },
    { bg: 'bg-primary/20', text: 'text-indigo-300', dot: 'bg-primary' },
    { bg: 'bg-primary/20/15', text: 'text-teal-300', dot: 'bg-primary/20' },
    { bg: 'bg-orange-500/15', text: 'text-orange-300', dot: 'bg-orange-400' },
    { bg: 'bg-rose-500/15', text: 'text-rose-300', dot: 'bg-rose-400' },
    { bg: 'bg-lime-500/15', text: 'text-lime-300', dot: 'bg-lime-400' },
    { bg: 'bg-primary/20/15', text: 'text-fuchsia-300', dot: 'bg-primary/20' },
  ];
  // Hash simples baseado no nome para consistência
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

function SessionItem({ session }: { session: StudySession }) {
  const color = getSubjectColor(session.subject);

  return (
    <motion.div
      variants={item}
      className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3 transition-colors hover:bg-muted"
    >
      {/* Dot colorido */}
      <div className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{session.subject}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(session.duration)}
          </span>
        </div>
      </div>

      {/* Badge de data */}
      <span className={`shrink-0 rounded-lg ${color.bg} px-2.5 py-1 text-xs font-medium ${color.text}`}>
        {formatRelativeDate(session.date)}
      </span>
    </motion.div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl bg-card/50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-gray-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 rounded bg-gray-800" />
            <div className="h-3 w-16 rounded bg-gray-800" />
          </div>
          <div className="h-6 w-14 rounded-lg bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[250px] flex-col items-center justify-center">
      <div className="mb-3 rounded-xl bg-gray-800/50 p-3">
        <History className="h-8 w-8 text-gray-600" />
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Nenhuma sessão registrada
      </p>
      <p className="mt-1 text-center text-xs text-gray-600">
        Suas sessões de estudo aparecerão aqui
      </p>
    </div>
  );
}

export default function RecentSessions({ sessions, loading }: RecentSessionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
      className="rounded-xl border border-border bg-card p-5"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
          <History className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Sessões Recentes</h2>
          <p className="text-xs text-muted-foreground">Últimas sessões de estudo</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <ListSkeleton />
      ) : sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {sessions.map((session, idx) => (
            <SessionItem key={session.id || idx} session={session} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
