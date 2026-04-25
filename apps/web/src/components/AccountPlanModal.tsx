'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, Crown, Info, X } from 'lucide-react';
import { PlanTier } from '@/lib/entitlements';
import {
  BETA_PLAN_META,
  BETA_PLAN_ORDER,
  getBetaPlanDisplay,
  getCurrentPlanUsageLabel,
  toDisplayTier,
} from '@/lib/beta-plan-presentation';

interface AccountPlanModalProps {
  isOpen: boolean;
  currentTier: PlanTier;
  currentPlansCount: number;
  onClose: () => void;
}

type ComparisonRow = {
  label: string;
  value: (tier: 'free' | 'pro' | 'premium') => string;
};

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: 'Planos ativos',
    value: (tier) => getBetaPlanDisplay(tier).activePlansLabel,
  },
  {
    label: 'Simulados',
    value: (tier) => getBetaPlanDisplay(tier).simulationsLabel,
  },
  {
    label: 'Saúde por matéria',
    value: (tier) => getBetaPlanDisplay(tier).healthLabel,
  },
  {
    label: 'Diagnóstico semanal',
    value: (tier) => getBetaPlanDisplay(tier).weeklyDiagnosticLabel,
  },
  {
    label: 'Mentoria recorrente',
    value: (tier) => getBetaPlanDisplay(tier).mentoringLabel,
  },
  {
    label: 'Parse de edital',
    value: (tier) => getBetaPlanDisplay(tier).editalParseLabel,
  },
  {
    label: 'IA explicativa',
    value: (tier) => getBetaPlanDisplay(tier).aiExplanationsLabel,
  },
  {
    label: 'Chat contextual',
    value: (tier) => getBetaPlanDisplay(tier).contextualChatLabel,
  },
  {
    label: 'Multi-edital',
    value: (tier) => getBetaPlanDisplay(tier).multiEditalLabel,
  },
  {
    label: 'Recovery plan',
    value: (tier) => getBetaPlanDisplay(tier).recoveryPlanLabel,
  },
  {
    label: 'Plano adaptativo',
    value: (tier) => getBetaPlanDisplay(tier).adaptivePlanLabel,
  },
  {
    label: 'Pos-simulado inteligente',
    value: (tier) => getBetaPlanDisplay(tier).postSimuladoLabel,
  },
];

export default function AccountPlanModal({
  isOpen,
  currentTier,
  currentPlansCount,
  onClose,
}: AccountPlanModalProps) {
  const [showComparison, setShowComparison] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const currentDisplayTier = toDisplayTier(currentTier);
  const currentPlanMeta = BETA_PLAN_META[currentDisplayTier];

  const closeFromEffect = useEffectEvent(() => {
    setShowComparison(false);
    onClose();
  });

  const handleClose = () => {
    setShowComparison(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeFromEffect();
    }

    function handleMouseDown(e: MouseEvent) {
      if (!modalRef.current) return;
      if (!modalRef.current.contains(e.target as Node)) {
        closeFromEffect();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

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
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-am-brand-primary/10 via-am-brand-secondary/5 to-transparent px-5 py-4">
              <div>
                <p className="ds-kicker inline-flex items-center gap-2 text-primary">
                  <Crown className="h-3.5 w-3.5" />
                  Conta e Acesso
                </p>
                <h2 className="font-sans text-lg font-bold tracking-tight text-foreground">Entender acesso no beta</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5">
              {currentTier === 'admin' && (
                <div className="rounded-md border border-am-success/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">
                  Conta em modo <span className="font-semibold">ADMIN</span>. A gestão real de testers segue pelo painel interno da área de configurações.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-border bg-muted p-3 text-sm md:col-span-2">
                  <p className="text-muted-foreground">
                    Plano atual: <span className="font-semibold uppercase text-foreground">{currentTier}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getCurrentPlanUsageLabel(currentDisplayTier, currentPlansCount)}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted p-3 text-sm">
                  <p className="text-muted-foreground">Camada atual do beta</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {currentPlanMeta.focusLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Beta com operação manual</p>
                  <p className="mt-1">
                    Durante o beta, mudanças de plano, upgrade e qualquer ajuste comercial são liberados manualmente pela equipe.
                    Esta tela é informativa e não altera a sua assinatura.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {BETA_PLAN_ORDER.map((tier) => {
                  const plan = BETA_PLAN_META[tier];
                  const isCurrent = plan.tier === currentDisplayTier;
                  const display = getBetaPlanDisplay(plan.tier);
                  const accentClass =
                    plan.tier === 'pro' ? 'text-primary' : 'text-foreground';
                  const borderClass =
                    plan.tier === 'pro'
                      ? 'border-am-brand-primary/30'
                      : plan.tier === 'premium'
                        ? 'border-am-brand-secondary/30'
                        : 'border-border';

                  return (
                    <div
                      key={plan.tier}
                      className={`flex min-h-[420px] flex-col rounded-lg border bg-card p-4 backdrop-blur-sm ${borderClass} ${
                        isCurrent ? 'ring-1 ring-am-brand-primary/40' : ''
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-sans text-base font-bold tracking-tight ${accentClass}`}>{plan.label}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {plan.focusLabel}
                          </p>
                        </div>
                        {plan.highlight && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {plan.highlight}
                          </span>
                        )}
                      </div>

                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Dashboard completo
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Cronômetro e histórico
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          {display.activePlansLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Simulados: {display.simulationsLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Saude por materia: {display.healthLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Diagnóstico semanal: {display.weeklyDiagnosticLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          IA explicativa: {display.aiExplanationsLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Chat contextual: {display.contextualChatLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Mentoria recorrente: {display.mentoringLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Parse de edital: {display.editalParseLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Multi-edital: {display.multiEditalLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Recovery plan: {display.recoveryPlanLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Plano adaptativo: {display.adaptivePlanLabel}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Pos-simulado inteligente: {display.postSimuladoLabel}
                        </li>
                      </ul>

                      <button
                        type="button"
                        disabled
                        className={`mt-auto flex w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          isCurrent
                            ? 'bg-muted text-muted-foreground'
                            : 'border border-border bg-card text-muted-foreground'
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        {isCurrent ? 'Plano atual' : 'Liberacao manual no beta'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-md border border-border bg-muted p-3">
                <button
                  onClick={() => setShowComparison((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition hover:bg-muted"
                >
                  <span className="text-sm font-medium text-foreground">Comparativo lado a lado</span>
                  {showComparison ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {showComparison && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-[680px] w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-muted-foreground">Recurso</th>
                          <th className="px-3 py-2 text-foreground">Free</th>
                          <th className="px-3 py-2 text-primary">Pro</th>
                          <th className="px-3 py-2 text-foreground">Premium</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARISON_ROWS.map((row) => (
                          <tr key={row.label} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.value('free')}</td>
                            <td className="px-3 py-2 text-primary">{row.value('pro')}</td>
                            <td className="px-3 py-2 text-foreground">{row.value('premium')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Gateway e cobranca real entram numa fase posterior, depois da calibracao do beta e da esteira de valor free to pro.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
