'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  deduplicateDefaultPlans,
  getActivePlan,
  migrateToMultiPlan,
} from '@/lib/firebase/plans';
import { StudyPlanEdital } from '@/types';
import SessionHistory from '@/components/SessionHistory';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { History, Calendar } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05, ease: 'easeOut' as const } }),
};

export default function HistoryPage() {
  const { user } = useAuthContext();
  const [plans, setPlans] = useState<StudyPlanEdital[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const migrated = useRef(false);

  const filterPlanId = activePlanId || undefined;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      if (!migrated.current) {
        await migrateToMultiPlan(user.uid);
        migrated.current = true;
      }
      const allPlans = await deduplicateDefaultPlans(user.uid);
      const active = await getActivePlan(user.uid);
      setPlans(allPlans);
      setActivePlanIdState(active || null);
    } catch { /* */ }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!user) return null;

  const activePlanObj = plans.find((p) => p.id === activePlanId) || null;

  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Header */}
      <div className="border-b border-white/[0.05] bg-[#0b1120]/60 px-6 py-5 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Session History</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Histórico de Sessões</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Registro completo de todas as sessões de estudo
            {activePlanObj && <> — <span style={{ color: activePlanObj.color }}>{activePlanObj.name}</span></>}
          </p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Heatmap */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <ActivityHeatmap
            userId={user.uid}
            planId={filterPlanId}
            refreshKey={refreshKey}
          />
        </motion.div>

        {/* Full history */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
          <SessionHistory
            userId={user.uid}
            planId={filterPlanId}
            onSessionsChanged={() => setRefreshKey((k) => k + 1)}
          />
        </motion.div>
      </div>
    </div>
  );
}
