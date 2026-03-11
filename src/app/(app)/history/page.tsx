'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import SessionHistory from '@/components/SessionHistory';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { History } from 'lucide-react';
import { fadeUp } from '@/design-system/tokens';
import { Badge } from '@/components';

export default function HistoryPage() {
  const { user } = useAuthContext();
  const { activePlanId, activePlan: activePlanObj } = usePlanContext();
  const [refreshKey, setRefreshKey] = useState(0);

  const filterPlanId = activePlanId || undefined;

  // The components below (SessionHistory/ActivityHeatmap) already receive filterPlanId as a prop.
  // We only need refreshKey for manual triggers (like onSessionsChanged).

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-6 border-b border-am-border-default bg-am-surface/30 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline"><History className="h-3 w-3 mr-1" /> Log Geral</Badge>
          </div>
          <h1 className="font-brand text-am-h3 font-bold text-am-text-primary tracking-tight mt-2">
            Histórico de Sessões
          </h1>
          <p className="text-am-caption text-am-text-secondary mt-1">
            Registro cronológico e volumétrico de todas as execuções de estudo
            {activePlanObj && <> — <span className="font-medium text-am-text-primary">{activePlanObj.name}</span></>}
          </p>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Heatmap */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="rounded-am-xl border border-am-border-default bg-am-surface shadow-am-sm overflow-hidden p-6">
          <h3 className="font-brand text-am-body font-bold text-am-text-primary mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-am-brand-primary rounded-full"></span>
            Mapa de Consistência
          </h3>
          <ActivityHeatmap
            userId={user.uid}
            planId={filterPlanId}
            refreshKey={refreshKey}
          />
        </motion.div>

        {/* Full history */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="rounded-am-xl border border-am-border-default bg-am-surface shadow-am-sm overflow-hidden p-6">
          <h3 className="font-brand text-am-body font-bold text-am-text-primary mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-am-ai-default rounded-full"></span>
            Listagem Bruta
          </h3>
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
