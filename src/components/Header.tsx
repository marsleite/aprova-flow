/**
 * Header da Aplicação
 * 
 * Exibe o logo, seletor de edital, nome do usuário e botão de logout.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, Zap, User, ChevronDown, Crown, CreditCard } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import Image from 'next/image';
import PlanSelector from './PlanSelector';
import { StudyPlanEdital } from '@/types';
import { useEntitlements } from '@/hooks/useEntitlements';
import { isUnlimited } from '@/lib/entitlements';
import AccountPlanModal from './AccountPlanModal';

interface HeaderProps {
  plans?: StudyPlanEdital[];
  activePlanId?: string | null;
  onSelectPlan?: (planId: string | null) => void;
  onCreatePlan?: () => void;
  onEditPlan?: (plan: StudyPlanEdital) => void;
  onDeletePlan?: (planId: string) => void;
}

export default function Header({
  plans = [],
  activePlanId = null,
  onSelectPlan,
  onCreatePlan,
  onEditPlan,
  onDeletePlan,
}: HeaderProps) {
  const { user, logout } = useAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { planTier, capabilities, refresh } = useEntitlements(user?.uid, user?.email);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {/* Logo & Nome */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 shadow-lg shadow-[#3150AA]/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Aprova<span className="text-[#F59768]">Mind</span>
            </h1>
            <p className="hidden text-xs text-gray-500 sm:block">
              Rastreie seu progresso
            </p>
          </div>
        </div>

        {/* Centro: Plan Selector (desktop) */}
        {user && plans.length > 0 && onSelectPlan && onCreatePlan && (
          <div className="hidden sm:block">
            <PlanSelector
              plans={plans}
              activePlanId={activePlanId}
              onSelect={onSelectPlan}
              onCreatePlan={onCreatePlan}
              onEditPlan={onEditPlan}
              onDeletePlan={onDeletePlan}
            />
          </div>
        )}

        {/* Linha mobile: seletor + ações */}
        {user && (
          <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
            {/* Plan Selector mobile */}
            {plans.length > 0 && onSelectPlan && onCreatePlan && (
              <div className="min-w-0 flex-1 sm:hidden">
                <PlanSelector
                  plans={plans}
                  activePlanId={activePlanId}
                  onSelect={onSelectPlan}
                  onCreatePlan={onCreatePlan}
                  onEditPlan={onEditPlan}
                  onDeletePlan={onDeletePlan}
                />
              </div>
            )}

            <div ref={menuRef} className="relative shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-sm text-gray-300 transition-colors hover:border-white/20 hover:bg-gray-900"
              >
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    width={28}
                    height={28}
                    className="rounded-full ring-2 ring-violet-500/30"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <span className="hidden max-w-[140px] truncate sm:inline">
                  {user.displayName || user.email}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl shadow-black/50">
                  <div className="border-b border-white/5 px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-white">{user.displayName || 'Usuário'}</p>
                    <p className="truncate text-xs text-gray-400">{user.email}</p>
                  </div>

                  <div className="space-y-1 border-b border-white/5 px-3 py-2.5">
                    <p className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Crown className="h-3.5 w-3.5 text-violet-300" />
                      Plano atual
                    </p>
                    <p className="text-sm font-medium uppercase text-violet-300">{planTier}</p>
                    <p className="text-xs text-gray-400">
                      {isUnlimited(capabilities.maxStudyPlans)
                        ? 'Editais ilimitados'
                        : `Editais: ${plans.length}/${capabilities.maxStudyPlans}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      Calendário: {capabilities.canUseCalendar ? 'incluído' : 'bloqueado no Free'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Simulados: {capabilities.canCreateSimulados ? 'incluído' : 'bloqueado no Free'}
                    </p>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setAccountModalOpen(true);
                      }}
                      className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-200 transition-colors hover:bg-white/10"
                    >
                      <CreditCard className="h-4 w-4 text-violet-300" />
                      Conta e plano
                    </button>
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
    </header>
  );
}
