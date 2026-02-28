'use client';

import { createContext, useContext } from 'react';
import { StudyPlanEdital } from '@/types';

interface PlanContextValue {
  plans: StudyPlanEdital[];
  activePlanId: string | null;
  activePlan: StudyPlanEdital | null;
  onPlanChange: (planId: string | null) => void;
}

export const PlanContext = createContext<PlanContextValue>({
  plans: [],
  activePlanId: null,
  activePlan: null,
  onPlanChange: () => {},
});

export function usePlanContext() {
  return useContext(PlanContext);
}
