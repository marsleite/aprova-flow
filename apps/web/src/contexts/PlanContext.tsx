'use client';

import { createContext, useContext } from 'react';
import { StudyPlanEdital } from '@/types';

interface PlanContextValue {
  plans: StudyPlanEdital[];
  activePlanId: string | null;
  activePlan: StudyPlanEdital | null;
  onPlanChange: (planId: string | null) => void;
  refreshPlans: () => Promise<void>;
}

export const PlanContext = createContext<PlanContextValue>({
  plans: [],
  activePlanId: null,
  activePlan: null,
  onPlanChange: () => {},
  refreshPlans: async () => {},
});

export function usePlanContext() {
  return useContext(PlanContext);
}
