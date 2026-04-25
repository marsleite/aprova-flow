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
    href: '/planner',
    icon: CalendarDays,
    label: 'Planner',
    description: 'Macro e viabilidade',
  },
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'Ritmo da semana',
  },
  {
    href: '/engine',
    icon: Timer,
    label: 'Engine',
    description: 'Sessão de hoje',
  },
  {
    href: '/mentoring',
    icon: Brain,
    label: 'Mentoria',
    description: 'Diagnóstico e apoio',
  },
  {
    href: '/provas',
    icon: Target,
    label: 'Provas e Simulados',
    description: 'Hub de treino',
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
  const { planTier, usingSandbox, sandboxScenarioUserId } = useEntitlements(
    user?.uid,
    user?.email
  );
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
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          background: 'var(--background)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo — DS glass pill style */}
        <div
          className="flex items-center gap-3 px-5 py-5 mx-3 mt-3 rounded-full"
          style={{
            background: 'rgba(253, 252, 251, 0.06)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--primary)' }}
          >
            <Zap className="h-4 w-4" style={{ color: 'var(--primary-foreground)' }} />
          </div>
          <div className="min-w-0">
            <p
              className="text-[15px] font-medium tracking-tight leading-none"
              style={{ fontFamily: 'var(--ds-font-display, inherit)', color: 'var(--foreground)' }}
            >
              AprovaMind
            </p>
            <p
              className="mt-1 text-[9px] uppercase tracking-[0.2em]"
              style={{ fontFamily: 'var(--ds-font-display, inherit)', color: 'var(--am-text-tertiary)' }}
            >
              Alta Performance
            </p>
          </div>
          {/* Mobile close */}
          {onToggleMobile && (
            <button
              onClick={onToggleMobile}
              className="ml-auto lg:hidden"
              style={{ color: 'var(--am-text-tertiary)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Active plan badge / picker */}
        {plans.length > 0 && (
          <div className="relative z-50 mx-3 mt-3" ref={planPickerRef}>
            <button
              onClick={() => setPlanPickerOpen((v) => !v)}
              className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left transition-colors"
              style={{
                background: 'var(--am-bg-surface-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{
                  background: activePlan?.color ?? '#666',
                  boxShadow: `0 0 6px ${activePlan?.color ?? '#666'}80`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                {activePlan?.name ?? 'Todos os Editais'}
              </span>
              <ChevronRight
                className={`h-3 w-3 flex-shrink-0 transition-transform duration-150 ${planPickerOpen ? 'rotate-90' : ''}`}
                style={{ color: 'var(--muted-foreground)' }}
              />
            </button>

            <AnimatePresence>
              {planPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl shadow-xl"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {/* Geral — aggregate all plans */}
                  <button
                    onClick={() => {
                      onPlanChange?.(null);
                      setPlanPickerOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: activePlanId === null ? 'rgba(234, 88, 12, 0.15)' : 'transparent',
                      color: activePlanId === null ? 'var(--primary)' : 'var(--muted-foreground)',
                    }}
                  >
                    <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[#666]" />
                    <span className="flex-1 truncate font-medium">Todos os Editais</span>
                    <span className="text-[10px]" style={{ color: 'var(--am-text-tertiary)' }}>Agregado</span>
                    {activePlanId === null && (
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'var(--primary)' }} />
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
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-white/5"
                        style={{
                          background: isActive ? 'rgba(234, 88, 12, 0.15)' : 'transparent',
                          color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                        }}
                      >
                        <div
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ background: plan.color }}
                        />
                        <span className="flex-1 truncate font-medium">{plan.name}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'var(--primary)' }} />
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
          <p
            className="mb-4 px-2 text-[10px] uppercase tracking-widest font-mono"
            style={{
              fontFamily: 'var(--ds-font-display, inherit)',
              letterSpacing: '0.06em',
              color: 'var(--am-text-tertiary)',
            }}
          >
            Navegação
          </p>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => mobileOpen && onToggleMobile?.()}
                className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(253, 252, 251, 0.08)' : 'transparent',
                  color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                }}
              >
                <Icon
                  className="h-[18px] w-[18px] flex-shrink-0"
                  style={{ color: isActive ? 'var(--foreground)' : 'var(--am-text-tertiary)' }}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span
                    className="absolute right-2 h-1.5 w-1.5 rounded-full"
                    style={{ background: 'var(--primary)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Plan tier badge */}
          <button
            onClick={() => setAccountModalOpen(true)}
            className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-xs transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <Crown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--am-accent-lime, #e6ff5b)' }} />
            <span className="uppercase font-semibold tracking-wide text-[11px]">{planTier}</span>
            <span
              className="ml-auto text-[10px]"
              style={{ color: 'var(--am-text-tertiary)' }}
            >
              Gerenciar
            </span>
          </button>

          {usingSandbox && sandboxScenarioUserId && (
            <div
              className="mx-2 rounded-full px-3 py-1.5 text-[10px] font-mono uppercase tracking-wide"
              style={{
                background: 'rgba(245, 151, 104, 0.08)',
                border: '1px solid rgba(245, 151, 104, 0.18)',
                color: 'var(--am-warning)',
              }}
            >
              Sandbox · {sandboxScenarioUserId}
            </div>
          )}

          {/* Settings & Theme */}
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="flex-1 flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <Settings className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              <span>Configurações</span>
            </Link>
            <ThemeToggle />
          </div>

          {/* User + logout */}
          {user && (
            <div className="flex items-center gap-2 rounded-xl px-2 py-2">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  width={24}
                  height={24}
                  className="rounded-full ring-1 ring-white/10 flex-shrink-0 grayscale opacity-80"
                />
              ) : (
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-white/10"
                  style={{ background: 'var(--am-bg-elevated)', color: 'var(--muted-foreground)' }}
                >
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs" style={{ color: 'var(--foreground)' }}>
                  {user.displayName?.split(' ')[0] || user.email}
                </p>
                <p className="truncate text-[9px]" style={{ color: 'var(--am-text-tertiary)' }}>
                  {user.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="flex-shrink-0 transition-colors p-1"
                style={{ color: 'var(--am-text-tertiary)' }}
                title="Sair"
              >
                <LogOut className="h-[14px] w-[14px]" />
              </button>
            </div>
          )}

          {/* System status — lime accent */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div
              className="h-2 w-2 rounded-full flex-shrink-0 animate-pulse"
              style={{ background: 'var(--am-accent-lime, #e6ff5b)', boxShadow: '0 0 8px rgba(230, 255, 91, 0.5)' }}
            />
            <span
              className="text-[10px] font-mono uppercase tracking-wide"
              style={{ color: 'var(--am-text-tertiary)' }}
            >
              Motor de IA · Online
            </span>
          </div>
        </div>
      </aside>

      {/* Account Modal */}
      {user && (
        <AccountPlanModal
          isOpen={accountModalOpen}
          currentTier={planTier}
          currentPlansCount={plans.length}
          onClose={() => setAccountModalOpen(false)}
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
      className="flex h-9 w-9 items-center justify-center rounded-full transition-colors lg:hidden"
      style={{
        border: '1px solid var(--border)',
        color: 'var(--muted-foreground)',
      }}
    >
      <Menu className="h-4.5 w-4.5" />
    </button>
  );
}
