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
  const migrated = useRef(false);

  const handlePlanChange = useCallback(async (planId: string | null) => {
    if (!user) return;
    setActivePlanId(planId);
    await setActivePlan(user.uid, planId);
  }, [user]);

  const loadPlans = useCallback(async () => {
    if (!user) return;
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
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadPlans();
  }, [user, loadPlans]);

  // Must be before any early returns — Rules of Hooks
  const planContextValue = useMemo(
    () => ({
      plans,
      activePlanId,
      activePlan: plans.find((p) => p.id === activePlanId) ?? null,
      onPlanChange: handlePlanChange,
    }),
    [plans, activePlanId, handlePlanChange]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-am-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full" style={{ background: 'var(--identity-grad)' }}>
            <Zap className="h-6 w-6 text-white" />
          </div>
          <p className="text-am-caption text-am-text-tertiary uppercase tracking-wider font-mono">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <PlanContext.Provider value={planContextValue}>
      <div className="flex min-h-screen bg-am-canvas">
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
          <div className="flex items-center justify-between border-b border-am-border-default bg-am-surface/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-3">
              <MobileMenuButton onClick={() => setMobileOpen(true)} />
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'var(--identity-grad)' }}>
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-brand text-sm font-bold text-am-text-primary">
                  Aprova<span className="text-am-brand-primary">Mind</span>
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
