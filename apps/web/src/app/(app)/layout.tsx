'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import Sidebar, { MobileMenuButton } from '@/components/layout/Sidebar';
import {
  deduplicateDefaultPlans,
  getActivePlan,
  migrateToMultiPlan,
  setActivePlan,
} from '@/lib/firebase/plans';
import { StudyPlanEdital } from '@/types';
import { Zap } from 'lucide-react';
import { PlanContext } from '@/contexts/PlanContext';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [plans, setPlans] = useState<StudyPlanEdital[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const migrated = useRef(false);

  const handlePlanChange = useCallback(async (planId: string | null) => {
    if (!user) return;
    setActivePlanId(planId);
    await setActivePlan(user.uid, planId);
  }, [user]);

  const loadPlans = useCallback(async () => {
    if (!user || loadingPlans) return;
    setLoadingPlans(true);
    try {
      if (!migrated.current) {
        await migrateToMultiPlan(user.uid);
        migrated.current = true;
      }
      const allPlans = await deduplicateDefaultPlans(user.uid);
      const active = await getActivePlan(user.uid);
      setPlans(allPlans);
      setActivePlanId(active || null);
    } catch {
      // silently fail
    } finally {
      setLoadingPlans(false);
    }
  }, [user, loadingPlans]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !loadingPlans && plans.length === 0) {
      loadPlans();
    }
  }, [user, loadPlans, loadingPlans, plans.length]);

  // Must be before any early returns — Rules of Hooks
  const planContextValue = useMemo(
    () => ({
      plans,
      activePlanId,
      activePlan: plans.find((p) => p.id === activePlanId) ?? null,
      onPlanChange: handlePlanChange,
      refreshPlans: async () => {
        if (!user) return;
        try {
          const allPlans = await deduplicateDefaultPlans(user.uid);
          setPlans(allPlans);
        } catch {
          // silent error
        }
      },
    }),
    [plans, activePlanId, handlePlanChange, user]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-card">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full" style={{ background: 'var(--identity-grad)' }}>
            <Zap className="h-6 w-6 text-white" />
          </div>
          <p className="text-am-caption text-muted-foreground uppercase tracking-wider font-mono">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <PlanContext.Provider value={planContextValue}>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar */}
        <Sidebar
          plans={plans}
          activePlanId={activePlanId}
          onPlanChange={handlePlanChange}
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen((v) => !v)}
        />

        {/* Main area */}
        <div className="flex-1 w-full min-h-screen flex flex-col lg:pl-64">
          {/* Mobile top bar */}
          <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-3">
              <MobileMenuButton onClick={() => setMobileOpen(true)} />
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'var(--identity-grad)' }}>
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-sans text-sm font-bold text-foreground">
                  Aprova<span className="text-primary">Mind</span>
                </span>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </PlanContext.Provider>
  );
}
