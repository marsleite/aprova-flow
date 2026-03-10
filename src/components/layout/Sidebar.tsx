'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import Image from 'next/image';
import {
  LayoutDashboard,
  Timer,
  CalendarDays,
  Brain,
  Target,
  BookX,
  BarChart2,
  History,
  Settings,
  Zap,
  LogOut,
  Crown,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AccountPlanModal from '@/components/AccountPlanModal';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'Visão geral',
  },
  {
    href: '/engine',
    icon: Timer,
    label: 'Sessão de Estudo',
    description: 'Timer e foco',
  },
  {
    href: '/planner',
    icon: CalendarDays,
    label: 'Planner',
    description: 'Multi-edital',
  },
  {
    href: '/mentoring',
    icon: Brain,
    label: 'Mentoria IA',
    description: 'Diagnóstico semanal',
  },
  {
    href: '/simulations',
    icon: Target,
    label: 'Simulados',
    description: 'Centro de provas',
  },
  {
    href: '/caderno-erros',
    icon: BookX,
    label: 'Caderno de Erros',
    description: 'Erros e padrões',
  },
  {
    href: '/analytics',
    icon: BarChart2,
    label: 'Análises',
    description: 'Performance',
  },
  {
    href: '/history',
    icon: History,
    label: 'Histórico',
    description: 'Sessões passadas',
  },
];

interface SidebarProps {
  plans?: { id?: string; name: string; color: string }[];
  activePlanId?: string | null;
  onPlanChange?: (planId: string | null) => void;
  onToggleMobile?: () => void;
  mobileOpen?: boolean;
}

export default function Sidebar({
  plans = [],
  activePlanId,
  onPlanChange,
  onToggleMobile,
  mobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();
  const { planTier, capabilities, refresh } = useEntitlements(user?.uid, user?.email);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const planPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!planPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (planPickerRef.current && !planPickerRef.current.contains(e.target as Node)) {
        setPlanPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [planPickerOpen]);

  const activePlan = plans.find((p) => p.id === activePlanId);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onToggleMobile}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-am-canvas border-r border-white/5 transition-transform duration-300 lg:translate-x-0 flex flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-am-surface-elevated ring-1 ring-white/10">
            <Zap className="h-4 w-4 text-am-text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-brand text-[15px] font-medium tracking-tight text-am-text-primary leading-none mt-1">
              AprovaMind
            </p>
            <p className="mt-1 text-[9px] text-am-text-tertiary uppercase tracking-[0.2em] font-mono">
              Strategic Engine
            </p>
          </div>
          {/* Mobile close */}
          {onToggleMobile && (
            <button
              onClick={onToggleMobile}
              className="ml-auto text-am-text-tertiary hover:text-am-text-primary lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Active plan badge / picker */}
        {plans.length > 0 && (
          <div className="relative mx-3 mt-3" ref={planPickerRef}>
            <button
              onClick={() => setPlanPickerOpen((v) => !v)}
              className="flex w-full items-center gap-2 rounded-full border border-am-border-default bg-am-surface-subtle px-3 py-2 text-left transition-colors hover:bg-am-surface-subtle"
            >
              <div
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{
                  background: activePlan?.color ?? '#666',
                  boxShadow: `0 0 6px ${activePlan?.color ?? '#666'}80`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-am-text-secondary font-mono">
                {activePlan?.name ?? 'Todos os Editais'}
              </span>
              <ChevronRight
                className={`h-3 w-3 flex-shrink-0 text-am-text-secondary transition-transform duration-150 ${planPickerOpen ? 'rotate-90' : ''
                  }`}
              />
            </button>

            <AnimatePresence>
              {planPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-am-border-default bg-[#0E111B] shadow-xl"
                >
                  {/* Geral — aggregate all plans */}
                  <button
                    onClick={() => {
                      onPlanChange?.(null);
                      setPlanPickerOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 border-b border-am-border-default px-3 py-2.5 text-left text-xs transition-colors ${activePlanId === null
                      ? 'bg-[#3150AA]/15 text-[#F59768]'
                      : 'text-am-text-secondary hover:bg-am-surface-subtle hover:text-slate-200'
                      }`}
                  >
                    <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[#666]" />
                    <span className="flex-1 truncate font-medium font-mono">Todos os Editais</span>
                    <span className="text-[10px] text-am-text-secondary">Agregado</span>
                    {activePlanId === null && (
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#F59768]" />
                    )}
                  </button>

                  {plans.map((plan) => {
                    const isActive = plan.id === activePlanId;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => {
                          onPlanChange?.(plan.id ?? null);
                          setPlanPickerOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors ${isActive
                          ? 'bg-[#3150AA]/15 text-[#F59768]'
                          : 'text-am-text-secondary hover:bg-am-surface-subtle hover:text-slate-200'
                          }`}
                      >
                        <div
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ background: plan.color }}
                        />
                        <span className="flex-1 truncate font-mono">{plan.name}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#F59768]" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <p className="mb-4 px-2 text-[10px] uppercase tracking-widest text-am-text-tertiary font-mono">
            Navegação
          </p>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => mobileOpen && onToggleMobile?.()}
                className={`
                  relative flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-white/5 text-am-text-primary'
                    : 'text-am-text-secondary hover:bg-white/5 hover:text-am-text-primary'
                  }
                `}
              >
                <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-am-text-primary' : 'text-am-text-tertiary'}`} strokeWidth={isActive ? 2 : 1.5} />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="absolute right-2 h-1 w-1 rounded-full bg-am-brand-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-am-border-default p-3 space-y-1">
          {/* Plan tier badge */}
          <button
            onClick={() => setAccountModalOpen(true)}
            className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-xs text-am-text-secondary hover:bg-am-surface-subtle hover:text-slate-200 transition-colors"
          >
            <Crown className="h-3.5 w-3.5 text-[#F59768] flex-shrink-0" />
            <span className="uppercase font-medium tracking-wide font-mono">{planTier}</span>
            <span className="ml-auto text-[10px] text-am-text-secondary hover:text-am-text-secondary font-mono">
              Gerenciar
            </span>
          </button>

          {/* Settings & Theme */}
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="flex-1 flex items-center gap-3 rounded-full px-3 py-2 text-sm text-am-text-secondary hover:bg-am-surface-subtle hover:text-slate-200 transition-colors"
            >
              <Settings className="h-4 w-4 flex-shrink-0 text-am-text-secondary" />
              <span>Configurações</span>
            </Link>
            <ThemeToggle />
          </div>

          {/* User + logout */}
          {user && (
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  width={24}
                  height={24}
                  className="rounded-full ring-1 ring-white/10 flex-shrink-0 grayscale opacity-80"
                />
              ) : (
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-am-surface-elevated text-[10px] text-am-text-secondary font-mono ring-1 ring-white/10">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-am-text-primary">
                  {user.displayName?.split(' ')[0] || user.email}
                </p>
                <p className="truncate text-[9px] text-am-text-tertiary font-mono">
                  {user.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="flex-shrink-0 text-am-text-tertiary hover:text-am-error transition-colors p-1"
                title="Sair"
              >
                <LogOut className="h-[14px] w-[14px]" />
              </button>
            </div>
          )}

          {/* System status */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="status-dot flex-shrink-0" />
            <span className="text-[10px] text-am-text-secondary font-mono uppercase tracking-wide">AI Engine · Online</span>
          </div>
        </div>
      </aside>

      {/* Account Modal */}
      {user && (
        <AccountPlanModal
          isOpen={accountModalOpen}
          userId={user.uid}
          currentTier={planTier}
          currentPlansCount={plans.length}
          onClose={() => setAccountModalOpen(false)}
          onTierChanged={() => {
            void refresh();
            setAccountModalOpen(false);
          }}
        />
      )}
    </>
  );
}

/* Mobile toggle button — rendered in AppLayout header */
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-am-border-default text-am-text-secondary hover:bg-am-surface-subtle hover:text-am-text-primary transition-colors lg:hidden"
    >
      <Menu className="h-4.5 w-4.5" />
    </button>
  );
}
