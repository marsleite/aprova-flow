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
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AccountPlanModal from '@/components/AccountPlanModal';

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
  onToggleMobile?: () => void;
  mobileOpen?: boolean;
}

export default function Sidebar({
  plans = [],
  activePlanId,
  onToggleMobile,
  mobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();
  const { planTier, capabilities, refresh } = useEntitlements(user?.uid, user?.email);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

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
        className={`app-sidebar ${mobileOpen ? 'open' : ''} flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-none">
              Aprova<span className="text-blue-400">Mind</span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 uppercase tracking-wider">
              Strategic Engine
            </p>
          </div>
          {/* Mobile close */}
          {onToggleMobile && (
            <button
              onClick={onToggleMobile}
              className="ml-auto text-slate-500 hover:text-white lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Active plan badge */}
        {activePlan && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
            <div
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: activePlan.color, boxShadow: `0 0 6px ${activePlan.color}80` }}
            />
            <span className="min-w-0 truncate text-xs text-slate-300">{activePlan.name}</span>
            <ChevronRight className="ml-auto h-3 w-3 flex-shrink-0 text-slate-600" />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
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
                  relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150
                  ${isActive
                    ? 'bg-blue-600/15 text-blue-300 font-medium'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }
                `}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/5 p-3 space-y-1">
          {/* Plan tier badge */}
          <button
            onClick={() => setAccountModalOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors"
          >
            <Crown className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
            <span className="uppercase font-medium tracking-wide">{planTier}</span>
            <span className="ml-auto text-[10px] text-slate-600 hover:text-slate-400">
              Gerenciar
            </span>
          </button>

          {/* Settings */}
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors"
          >
            <Settings className="h-4 w-4 flex-shrink-0 text-slate-500" />
            <span>Configurações</span>
          </Link>

          {/* User + logout */}
          {user && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  width={26}
                  height={26}
                  className="rounded-full ring-1 ring-white/10 flex-shrink-0"
                />
              ) : (
                <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-300">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-300">
                  {user.displayName?.split(' ')[0] || user.email}
                </p>
                <p className="truncate text-[10px] text-slate-600">
                  {user.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* System status */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="status-dot flex-shrink-0" />
            <span className="text-[10px] text-slate-600">AI Engine · Online</span>
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
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/[0.04] hover:text-white transition-colors lg:hidden"
    >
      <Menu className="h-4.5 w-4.5" />
    </button>
  );
}
