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
      <div className="animate-pulse rounded-2xl border border-white/10 bg-gray-900/70 p-6">
        <div className="mb-4 h-6 w-40 rounded bg-gray-800" />
        <div className="mb-3 h-10 w-full rounded bg-gray-800" />
        <div className="h-2 w-full rounded bg-gray-800" />
      </div>
    );
  }

  const goalReached = data.weeklyProgressPercent >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-2xl"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/20 p-2.5">
          <Target className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Meta & Consistência</h3>
          <p className="text-sm text-gray-400">Seu ritmo da semana</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            Streak Atual
          </div>
          <p className="text-2xl font-bold text-white">{data.currentStreak}d</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            Melhor Streak
          </div>
          <p className="text-2xl font-bold text-white">{data.bestStreak}d</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
          <span>
            Progresso semanal ({formatDuration(data.weeklyTotalSeconds)} de{' '}
            {data.weeklyGoalHours}h)
          </span>
          <span className={goalReached ? 'text-emerald-400' : 'text-violet-300'}>
            {data.weeklyProgressPercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full transition-all ${
              goalReached ? 'bg-emerald-500' : 'bg-violet-500'
            }`}
            style={{ width: `${Math.max(4, data.weeklyProgressPercent)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {goalReached
            ? 'Meta da semana batida. Excelente!'
            : `Faltam ${formatDuration(data.remainingSeconds)} para concluir a meta.`}
        </p>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-400">Meta semanal (horas)</label>
          <input
            type="number"
            min={1}
            max={80}
            value={goalInput}
            onChange={(e) => setGoalInput(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-gray-800/60 px-3 py-2 text-white outline-none focus:border-violet-500"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
        >
          <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
          Salvar
        </button>
      </div>
    </motion.div>
  );
}

