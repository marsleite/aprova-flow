'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, Crown, Loader2, X } from 'lucide-react';
import {
  PlanTier,
  getAiQuotasForTier,
  getCapabilitiesForTier,
  isUnlimited,
} from '@/lib/entitlements';
import { setUserPlanTier } from '@/lib/firebase/entitlements';

interface AccountPlanModalProps {
  isOpen: boolean;
  userId: string;
  currentTier: PlanTier;
  currentPlansCount: number;
  onClose: () => void;
  onTierChanged?: (tier: PlanTier) => void;
}

type PlanCard = {
  tier: PlanTier;
  label: string;
  priceLabel: string;
  description: string;
  highlight?: string;
  accentClass: string;
  borderClass: string;
};

const PLAN_CARDS: PlanCard[] = [
  {
    tier: 'free',
    label: 'Free',
    priceLabel: 'R$ 0/mês',
    description: 'Para começar',
    accentClass: 'text-gray-200',
    borderClass: 'border-white/10',
  },
  {
    tier: 'pro',
    label: 'Pro',
    priceLabel: 'R$ 29/mês',
    description: 'Para constância diária',
    highlight: 'Mais escolhido',
    accentClass: 'text-[#F59768]/80',
    borderClass: 'border-[#3150AA]/30',
  },
  {
    tier: 'premium',
    label: 'Premium',
    priceLabel: 'R$ 59/mês',
    description: 'Para máxima performance',
    accentClass: 'text-violet-300',
    borderClass: 'border-violet-500/30',
  },
];

function dispatchEntitlementsUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('aprova:entitlements-updated'));
}

function formatQuotaLabel(planTier: PlanTier, task: 'chat' | 'weekly-mentoring' | 'planner-daily' | 'parse-edital'): string {
  const quotas = getAiQuotasForTier(planTier);
  if (!quotas) return 'Ilimitado';

  const rule = quotas[task];
  if (rule.window === 'day') return `${rule.limit}/dia`;
  if (rule.window === 'week') return `${rule.limit}/semana`;
  return `${rule.limit}/hora`;
}

type ComparisonRow = {
  label: string;
  value: (tier: 'free' | 'pro' | 'premium') => string;
};

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: 'Editais simultâneos',
    value: (tier) => {
      const caps = getCapabilitiesForTier(tier);
      return isUnlimited(caps.maxStudyPlans) ? 'Ilimitado' : String(caps.maxStudyPlans);
    },
  },
  {
    label: 'Calendário avançado',
    value: (tier) => (getCapabilitiesForTier(tier).canUseCalendar ? 'Incluído' : 'Não'),
  },
  {
    label: 'Simulados personalizados',
    value: (tier) => (getCapabilitiesForTier(tier).canCreateSimulados ? 'Incluído' : 'Não'),
  },
  {
    label: 'Treino rápido',
    value: (tier) => (getCapabilitiesForTier(tier).canUseTreinoRapido ? 'Incluído' : 'Não'),
  },
  {
    label: 'Chat IA',
    value: (tier) => formatQuotaLabel(tier, 'chat'),
  },
  {
    label: 'Planner diário IA',
    value: (tier) => formatQuotaLabel(tier, 'planner-daily'),
  },
  {
    label: 'Mentoria semanal IA',
    value: (tier) => formatQuotaLabel(tier, 'weekly-mentoring'),
  },
  {
    label: 'Parse de edital IA',
    value: (tier) => formatQuotaLabel(tier, 'parse-edital'),
  },
];

export default function AccountPlanModal({
  isOpen,
  userId,
  currentTier,
  currentPlansCount,
  onClose,
  onTierChanged,
}: AccountPlanModalProps) {
  const [mounted, setMounted] = useState(false);
  const [savingTier, setSavingTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const visiblePlans = useMemo(() => PLAN_CARDS, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    function handleMouseDown(e: MouseEvent) {
      if (!modalRef.current) return;
      if (!modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setShowComparison(false);
    }
  }, [isOpen]);

  const handleChangeTier = async (tier: PlanTier) => {
    if (!userId || savingTier) return;
    if (tier === currentTier) return;

    setError(null);
    setSavingTier(tier);
    try {
      await setUserPlanTier(userId, tier);
      dispatchEntitlementsUpdated();
      onTierChanged?.(tier);
    } catch {
      setError('Não foi possível atualizar o plano agora. Tente novamente.');
    } finally {
      setSavingTier(null);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-900"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-violet-500/10 via-blue-500/5 to-transparent px-5 py-4">
              <div>
                <p className="inline-flex items-center gap-2 text-xs text-violet-300">
                  <Crown className="h-3.5 w-3.5" />
                  Conta e Plano
                </p>
                <h2 className="text-lg font-semibold text-white">Gerenciar assinatura</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5">
              {currentTier === 'admin' && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  Conta em modo <span className="font-semibold">ADMIN</span>. Escolha um plano abaixo para simular a experiência do usuário.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm md:col-span-2">
                  <p className="text-gray-300">
                    Plano atual: <span className="font-semibold uppercase text-white">{currentTier}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Editais usados: {currentPlansCount}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
                  <p className="text-gray-300">Acesso atual</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {isUnlimited(getCapabilitiesForTier(currentTier).maxStudyPlans)
                      ? 'Editais ilimitados'
                      : `${getCapabilitiesForTier(currentTier).maxStudyPlans} edital(is)`}
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                {visiblePlans.map((plan) => {
                  const caps = getCapabilitiesForTier(plan.tier);
                  const isCurrent = plan.tier === currentTier;
                  const isSaving = savingTier === plan.tier;

                  return (
                    <div
                      key={plan.tier}
                      className={`flex min-h-[420px] flex-col rounded-xl border bg-gray-900/70 p-4 ${plan.borderClass} ${
                        isCurrent ? 'ring-1 ring-violet-400/40' : ''
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`text-base font-semibold ${plan.accentClass}`}>{plan.label}</h3>
                          <p className="text-sm text-gray-400">{plan.description}</p>
                          <p className="mt-0.5 whitespace-nowrap text-[28px] leading-none text-white">{plan.priceLabel}</p>
                        </div>
                        {plan.highlight && (
                          <span className="rounded-full bg-[#3150AA]/20 px-2 py-0.5 text-[10px] text-violet-200">
                            {plan.highlight}
                          </span>
                        )}
                      </div>

                      <ul className="space-y-1.5 text-xs text-gray-300">
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Dashboard completo
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Cronômetro e histórico
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          {isUnlimited(caps.maxStudyPlans)
                            ? 'Editais ilimitados'
                            : `${caps.maxStudyPlans} edital${caps.maxStudyPlans > 1 ? 'is' : ''}`}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className={`h-3.5 w-3.5 ${caps.canUseCalendar ? 'text-emerald-400' : 'text-gray-600'}`} />
                          Calendário avançado
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className={`h-3.5 w-3.5 ${caps.canCreateSimulados ? 'text-emerald-400' : 'text-gray-600'}`} />
                          Simulados personalizados
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className={`h-3.5 w-3.5 ${caps.canUseTreinoRapido ? 'text-emerald-400' : 'text-gray-600'}`} />
                          Treino rápido por matéria
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Chat IA: {formatQuotaLabel(plan.tier, 'chat')}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Planner diário IA: {formatQuotaLabel(plan.tier, 'planner-daily')}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Mentoria semanal IA: {formatQuotaLabel(plan.tier, 'weekly-mentoring')}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Parse de edital IA: {formatQuotaLabel(plan.tier, 'parse-edital')}
                        </li>
                      </ul>

                      <button
                        onClick={() => void handleChangeTier(plan.tier)}
                        disabled={isCurrent || Boolean(savingTier)}
                        className={`mt-auto flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isCurrent
                            ? 'bg-white/10 text-gray-300'
                            : 'bg-gradient-to-r from-[#F59768] to-[#3150AA] text-white hover:brightness-110'
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {isCurrent ? 'Plano atual' : 'Escolher plano'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <button
                  onClick={() => setShowComparison((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition hover:bg-white/5"
                >
                  <span className="text-sm font-medium text-white">Comparativo lado a lado</span>
                  {showComparison ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {showComparison && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-[680px] w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-3 py-2 text-gray-400">Recurso</th>
                          <th className="px-3 py-2 text-gray-200">Free</th>
                          <th className="px-3 py-2 text-[#F59768]/80">Pro</th>
                          <th className="px-3 py-2 text-violet-300">Premium</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARISON_ROWS.map((row) => (
                          <tr key={row.label} className="border-b border-white/5 last:border-b-0">
                            <td className="px-3 py-2 text-gray-300">{row.label}</td>
                            <td className="px-3 py-2 text-gray-300">{row.value('free')}</td>
                            <td className="px-3 py-2 text-blue-200">{row.value('pro')}</td>
                            <td className="px-3 py-2 text-violet-200">{row.value('premium')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500">
                Fluxo de cobrança pode ser conectado aqui na próxima fase com Stripe/Pagar.me.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
