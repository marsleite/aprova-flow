'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Flame, Trophy, Save } from 'lucide-react';
import { StudyConsistency } from '@/types';
import { formatDuration } from '@/lib/utils';

interface GoalAndStreakCardProps {
  data: StudyConsistency | null;
  loading?: boolean;
  onSaveGoal: (hours: number) => Promise<void>;
}

export default function GoalAndStreakCard({
  data,
  loading,
  onSaveGoal,
}: GoalAndStreakCardProps) {
  const [goalInput, setGoalInput] = useState<number>(data?.weeklyGoalHours ?? 10);
  const [saving, setSaving] = useState(false);

  const normalizedGoal = useMemo(() => {
    return Math.max(1, Math.min(80, Math.round(goalInput || 1)));
  }, [goalInput]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveGoal(normalizedGoal);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 h-5 w-40 rounded shimmer" />
        <div className="mb-3 h-10 w-full rounded shimmer" />
        <div className="h-2 w-full rounded shimmer" />
      </div>
    );
  }

  const goalReached = data.weeklyProgressPercent >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
          <Target className="h-4 w-4 text-[var(--primary)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Meta & Consistência</h3>
          <p className="text-xs text-muted-foreground">Seu ritmo da semana</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted p-3">
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            Streak Atual
          </div>
          <p className="text-2xl font-bold text-foreground">{data.currentStreak}d</p>
        </div>
        <div className="rounded-xl border border-border bg-muted p-3">
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            Melhor Streak
          </div>
          <p className="text-2xl font-bold text-foreground">{data.bestStreak}d</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-border bg-muted p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Progresso semanal ({formatDuration(data.weeklyTotalSeconds)} de{' '}
            {data.weeklyGoalHours}h)
          </span>
          <span className={goalReached ? 'text-emerald-400' : 'text-[var(--primary)]/80'}>
            {data.weeklyProgressPercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              goalReached ? 'bg-emerald-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.max(4, data.weeklyProgressPercent)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {goalReached
            ? 'Meta da semana batida. Excelente!'
            : `Faltam ${formatDuration(data.remainingSeconds)} para concluir a meta.`}
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">Meta semanal (horas)</label>
          <input
            type="number"
            min={1}
            max={80}
            value={goalInput}
            onChange={(e) => setGoalInput(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary disabled:opacity-60"
        >
          <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
          Salvar
        </button>
      </div>
    </motion.div>
  );
}
