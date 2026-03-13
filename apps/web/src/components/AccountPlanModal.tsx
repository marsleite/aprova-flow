'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, Crown, Loader2, X } from 'lucide-react';
import {
  PlanTier,
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

type DisplayPlanTier = Exclude<PlanTier, 'admin'>;

type PlanDisplay = {
  activePlansLabel: string;
  simulationsLabel: string;
  healthLabel: string;
  weeklyDiagnosticLabel: string;
  mentoringLabel: string;
  editalParseLabel: string;
  aiExplanationsLabel: string;
  contextualChatLabel: string;
  multiEditalLabel: string;
  adaptivePlanLabel: string;
};

const PLAN_CARDS: PlanCard[] = [
  {
    tier: 'free',
    label: 'Free',
    priceLabel: 'R$ 0/mês',
    description: 'Para começar',
    accentClass: 'text-am-text-primary',
    borderClass: 'border-am-border-default',
  },
  {
    tier: 'pro',
    label: 'Pro',
    priceLabel: 'R$ 34,90/mês',
    description: 'Para constância diária',
    highlight: 'Mais escolhido',
    accentClass: 'text-am-brand-primary',
    borderClass: 'border-am-brand-primary/30',
  },
  {
    tier: 'premium',
    label: 'Premium',
    priceLabel: 'R$ 64,90/mês',
    description: 'Para máxima performance',
    accentClass: 'text-am-brand-secondary',
    borderClass: 'border-am-brand-secondary/30',
  },
];

const PLAN_DISPLAY: Record<DisplayPlanTier, PlanDisplay> = {
  free: {
    activePlansLabel: '1 plano ativo',
    simulationsLabel: 'Simulados limitados',
    healthLabel: 'Saude basica',
    weeklyDiagnosticLabel: 'Nao',
    mentoringLabel: 'Nao',
    editalParseLabel: '1 credito inicial',
    aiExplanationsLabel: '3/mês',
    contextualChatLabel: '5/mês',
    multiEditalLabel: 'Nao',
    adaptivePlanLabel: 'Nao',
  },
  pro: {
    activePlansLabel: '1 plano ativo',
    simulationsLabel: 'Simulados completos',
    healthLabel: 'Saude completa',
    weeklyDiagnosticLabel: 'Incluido',
    mentoringLabel: '4/mês',
    editalParseLabel: '3/mês',
    aiExplanationsLabel: '120/mês',
    contextualChatLabel: '60/mês',
    multiEditalLabel: 'Nao',
    adaptivePlanLabel: 'Nao',
  },
  premium: {
    activePlansLabel: '3 planos ativos',
    simulationsLabel: 'Simulados completos',
    healthLabel: 'Saude completa',
    weeklyDiagnosticLabel: 'Incluido',
    mentoringLabel: '8/mês',
    editalParseLabel: '10/mês',
    aiExplanationsLabel: '300/mês',
    contextualChatLabel: '150/mês',
    multiEditalLabel: 'Incluido',
    adaptivePlanLabel: 'Incluido',
  },
};

function dispatchEntitlementsUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('aprova:entitlements-updated'));
}

function toDisplayTier(tier: PlanTier): DisplayPlanTier {
  return tier === 'admin' ? 'premium' : tier;
}

type ComparisonRow = {
  label: string;
  value: (tier: 'free' | 'pro' | 'premium') => string;
};

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: 'Planos ativos',
    value: (tier) => PLAN_DISPLAY[tier].activePlansLabel,
  },
  {
    label: 'Simulados',
    value: (tier) => PLAN_DISPLAY[tier].simulationsLabel,
  },
  {
    label: 'Saúde por matéria',
    value: (tier) => PLAN_DISPLAY[tier].healthLabel,
  },
  {
    label: 'Diagnóstico semanal',
    value: (tier) => PLAN_DISPLAY[tier].weeklyDiagnosticLabel,
  },
  {
    label: 'Mentoria recorrente',
    value: (tier) => PLAN_DISPLAY[tier].mentoringLabel,
  },
  {
    label: 'Parse de edital',
    value: (tier) => PLAN_DISPLAY[tier].editalParseLabel,
  },
  {
    label: 'IA explicativa',
    value: (tier) => PLAN_DISPLAY[tier].aiExplanationsLabel,
  },
  {
    label: 'Chat contextual',
    value: (tier) => PLAN_DISPLAY[tier].contextualChatLabel,
  },
  {
    label: 'Multi-edital',
    value: (tier) => PLAN_DISPLAY[tier].multiEditalLabel,
  },
  {
    label: 'Plano adaptativo',
    value: (tier) => PLAN_DISPLAY[tier].adaptivePlanLabel,
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
  const currentDisplayTier = toDisplayTier(currentTier);

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
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-am-xl border border-am-border-default bg-am-canvas shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-am-border-default bg-gradient-to-r from-am-brand-primary/10 via-am-brand-secondary/5 to-transparent px-5 py-4">
              <div>
                <p className="ds-kicker inline-flex items-center gap-2 text-am-brand-primary">
                  <Crown className="h-3.5 w-3.5" />
                  Conta e Plano
                </p>
                <h2 className="font-brand text-lg font-bold tracking-tight text-am-text-primary">Gerenciar assinatura</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-am-text-tertiary transition hover:bg-am-surface-subtle hover:text-am-text-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5">
              {currentTier === 'admin' && (
                <div className="rounded-am-md border border-am-success/30 bg-am-success/10 px-3 py-2 text-sm text-am-success">
                  Conta em modo <span className="font-semibold">ADMIN</span>. Escolha um plano abaixo para simular a experiência do usuário.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-am-md border border-am-border-default bg-am-surface-subtle p-3 text-sm md:col-span-2">
                  <p className="text-am-text-secondary">
                    Plano atual: <span className="font-semibold uppercase text-am-text-primary">{currentTier}</span>
                  </p>
                  <p className="mt-1 text-xs text-am-text-tertiary">
                    Editais usados: {currentPlansCount}
                  </p>
                </div>
                <div className="rounded-am-md border border-am-border-default bg-am-surface-subtle p-3 text-sm">
                  <p className="text-am-text-secondary">Acesso atual</p>
                  <p className="mt-1 text-xs text-am-text-tertiary">
                    {PLAN_DISPLAY[currentDisplayTier].activePlansLabel}
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-am-md border border-am-error/30 bg-am-error/10 px-3 py-2 text-sm text-am-error">
                  {error}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                {visiblePlans.map((plan) => {
                  const isCurrent = plan.tier === currentTier;
                  const isSaving = savingTier === plan.tier;
                  const display = PLAN_DISPLAY[toDisplayTier(plan.tier)];

                  return (
                    <div
                      key={plan.tier}
                      className={`flex min-h-[420px] flex-col rounded-am-lg border bg-am-surface p-4 backdrop-blur-sm ${plan.borderClass} ${
                        isCurrent ? 'ring-1 ring-am-brand-primary/40' : ''
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-brand text-base font-bold tracking-tight ${plan.accentClass}`}>{plan.label}</h3>
                          <p className="text-sm text-am-text-tertiary">{plan.description}</p>
                          <p className="mt-0.5 font-brand whitespace-nowrap text-[28px] font-bold leading-none text-am-text-primary">{plan.priceLabel}</p>
                        </div>
                        {plan.highlight && (
                          <span className="rounded-full bg-am-brand-primary/15 px-2 py-0.5 text-[10px] font-semibold text-am-brand-primary">
                            {plan.highlight}
                          </span>
                        )}
                      </div>

                      <ul className="space-y-1.5 text-xs text-am-text-secondary">
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          Dashboard completo
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          Cronômetro e histórico
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          {display.activePlansLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          {display.simulationsLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          {display.healthLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          Diagnóstico semanal: {display.weeklyDiagnosticLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          IA explicativa: {display.aiExplanationsLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          Chat contextual: {display.contextualChatLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          Mentoria recorrente: {display.mentoringLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          Parse de edital: {display.editalParseLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          Multi-edital: {display.multiEditalLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-am-success" />
                          Plano adaptativo: {display.adaptivePlanLabel}
                        </li>
                      </ul>

                      <button
                        onClick={() => void handleChangeTier(plan.tier)}
                        disabled={isCurrent || Boolean(savingTier)}
                        className={`mt-auto flex w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          isCurrent
                            ? 'bg-am-surface-subtle text-am-text-secondary'
                            : 'bg-am-brand-gradient text-white hover:brightness-110 shadow-[0_0_16px_rgba(154,117,240,0.2)]'
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {isCurrent ? 'Plano atual' : 'Escolher plano'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-am-md border border-am-border-default bg-am-surface-subtle p-3">
                <button
                  onClick={() => setShowComparison((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition hover:bg-am-surface-subtle"
                >
                  <span className="text-sm font-medium text-am-text-primary">Comparativo lado a lado</span>
                  {showComparison ? (
                    <ChevronUp className="h-4 w-4 text-am-text-tertiary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-am-text-tertiary" />
                  )}
                </button>

                {showComparison && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-[680px] w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-am-border-default">
                          <th className="px-3 py-2 text-am-text-tertiary">Recurso</th>
                          <th className="px-3 py-2 text-am-text-primary">Free</th>
                          <th className="px-3 py-2 text-am-brand-primary">Pro</th>
                          <th className="px-3 py-2 text-am-brand-secondary">Premium</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARISON_ROWS.map((row) => (
                          <tr key={row.label} className="border-b border-am-border-default last:border-b-0">
                            <td className="px-3 py-2 text-am-text-secondary">{row.label}</td>
                            <td className="px-3 py-2 text-am-text-secondary">{row.value('free')}</td>
                            <td className="px-3 py-2 text-am-brand-primary">{row.value('pro')}</td>
                            <td className="px-3 py-2 text-am-brand-secondary">{row.value('premium')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <p className="text-xs text-am-text-tertiary">
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
