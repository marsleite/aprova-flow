'use client';

/**
 * useEngineData
 *
 * Custom hook that encapsulates all infrastructure (Firebase) calls
 * previously scattered inside EnginePage.
 *
 * The page component becomes a pure "presenter" that receives data
 * from this hook instead of calling Firestore/plans directly.
 *
 * This is the extraction layer recommended by the architecture audit:
 * UI components must NOT talk to infrastructure directly.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getStudyConsistency,
  getRecentSessions,
} from '@/lib/firebase/sessions';
import { createStudyPlan, setActivePlan } from '@/lib/firebase/plans';
import type { StudySession, StudyConsistency } from '@/types';

export interface EngineDataState {
  recentSessions: StudySession[];
  consistency: StudyConsistency | null;
  lastSavedSession: { subject: string; duration: number } | null;
  loading: boolean;
  creatingPlan: boolean;
}

export interface UseEngineDataReturn extends EngineDataState {
  fetchData: () => Promise<void>;
  handleSessionSaved: (session: { subject: string; duration: number }) => Promise<void>;
  handleCreateFreePlan: () => Promise<void>;
}

export function useEngineData(params: {
  userId: string | undefined;
  activePlanId: string | null;
  weeklyGoalHours: number | undefined;
}): UseEngineDataReturn {
  const { userId, activePlanId, weeklyGoalHours } = params;
  const filterPlanId = activePlanId || undefined;

  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [lastSavedSession, setLastSavedSession] = useState<{
    subject: string;
    duration: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPlan, setCreatingPlan] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [recent, cons] = await Promise.all([
        getRecentSessions(userId, 8, filterPlanId),
        getStudyConsistency(userId, filterPlanId, weeklyGoalHours).catch(
          () => null
        ),
      ]);
      setRecentSessions(recent);
      setConsistency(cons);
    } catch {
      /* silent — matches existing behaviour */
    } finally {
      setLoading(false);
    }
  }, [userId, filterPlanId, weeklyGoalHours]);

  useEffect(() => {
    if (userId) fetchData();
  }, [fetchData, userId, activePlanId]);

  const handleSessionSaved = useCallback(
    async (session: { subject: string; duration: number }) => {
      setLastSavedSession(session);
      await fetchData();
    },
    [fetchData]
  );

  const handleCreateFreePlan = useCallback(async () => {
    if (!userId || creatingPlan) return;
    setCreatingPlan(true);
    try {
      const name = 'Sessão Livre';
      const planId = await createStudyPlan(userId, {
        name,
        subjects: [],
        weeklyGoalHours: 10,
        color: '#06b6d4',
        isDefault: false,
      });
      await setActivePlan(userId, planId);
      await fetchData();
    } finally {
      setCreatingPlan(false);
    }
  }, [userId, creatingPlan, fetchData]);

  return {
    recentSessions,
    consistency,
    lastSavedSession,
    loading,
    creatingPlan,
    fetchData,
    handleSessionSaved,
    handleCreateFreePlan,
  };
}
