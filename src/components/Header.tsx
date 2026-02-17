/**
 * Header da Aplicação
 * 
 * Exibe o logo, seletor de edital, nome do usuário e botão de logout.
 */

'use client';

import { LogOut, Zap, User } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import Image from 'next/image';
import PlanSelector from './PlanSelector';
import { StudyPlanEdital } from '@/types';

interface HeaderProps {
  plans?: StudyPlanEdital[];
  activePlanId?: string | null;
  onSelectPlan?: (planId: string | null) => void;
  onCreatePlan?: () => void;
  onDeletePlan?: (planId: string) => void;
}

export default function Header({
  plans = [],
  activePlanId = null,
  onSelectPlan,
  onCreatePlan,
  onDeletePlan,
}: HeaderProps) {
  const { user, logout } = useAuthContext();

  return (
    <header className="relative z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Logo & Nome */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 shadow-lg shadow-violet-500/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Aprova<span className="text-violet-400">Mind</span>
            </h1>
            <p className="hidden text-xs text-gray-500 sm:block">
              Rastreie seu progresso
            </p>
          </div>
        </div>

        {/* Centro: Plan Selector */}
        {user && plans.length > 0 && onSelectPlan && onCreatePlan && (
          <div className="hidden sm:block">
            <PlanSelector
              plans={plans}
              activePlanId={activePlanId}
              onSelect={onSelectPlan}
              onCreatePlan={onCreatePlan}
              onDeletePlan={onDeletePlan}
            />
          </div>
        )}

        {/* Usuário */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Plan Selector mobile */}
            {plans.length > 0 && onSelectPlan && onCreatePlan && (
              <div className="sm:hidden">
                <PlanSelector
                  plans={plans}
                  activePlanId={activePlanId}
                  onSelect={onSelectPlan}
                  onCreatePlan={onCreatePlan}
                  onDeletePlan={onDeletePlan}
                />
              </div>
            )}

            <div className="hidden items-center gap-2 sm:flex">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  width={32}
                  height={32}
                  className="rounded-full ring-2 ring-violet-500/30"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
              )}
              <span className="text-sm text-gray-300">
                {user.displayName || user.email}
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm 
                         text-gray-400 transition-colors hover:border-red-500/30 hover:text-red-400"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
