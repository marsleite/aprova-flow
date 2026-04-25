import {
  DEFAULT_ENTITLEMENT_POLICY,
  EntitlementMode,
  EntitlementPeriod,
  FeatureCode,
} from '@aprovamind/domain';
import type { PlanTier } from '@/lib/entitlements';

export type DisplayPlanTier = Exclude<PlanTier, 'admin'>;

export interface BetaPlanMeta {
  tier: DisplayPlanTier;
  label: string;
  focusLabel: string;
  description: string;
  highlight?: string;
}

export interface BetaPlanDisplay {
  activePlansLabel: string;
  simulationsLabel: string;
  healthLabel: string;
  weeklyDiagnosticLabel: string;
  mentoringLabel: string;
  editalParseLabel: string;
  aiExplanationsLabel: string;
  contextualChatLabel: string;
  multiEditalLabel: string;
  recoveryPlanLabel: string;
  adaptivePlanLabel: string;
  postSimuladoLabel: string;
}

export interface BetaUpgradeNarrative {
  recommendedPlan: 'pro' | 'premium';
  planLabel: string;
  focusLabel: string;
  ctaLabel: string;
  bridgeCopy: string;
}

const EFFECTIVELY_UNLIMITED_LIMIT = 999;

export const BETA_PLAN_META: Record<DisplayPlanTier, BetaPlanMeta> = {
  free: {
    tier: 'free',
    label: 'Free',
    focusLabel: 'Ativacao',
    description: 'Para sentir o motor, ganhar habito e validar o valor central.',
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    focusLabel: 'Plano principal',
    description: 'Para estudo serio no single-plan, com leitura completa do motor.',
    highlight: 'Mais aderente ao beta',
  },
  premium: {
    tier: 'premium',
    label: 'Premium',
    focusLabel: 'Rotina complexa',
    description: 'Para coordenacao avancada, recovery e varios editais.',
  },
};

export const BETA_PLAN_ORDER: DisplayPlanTier[] = ['free', 'pro', 'premium'];

const BETA_UPGRADE_NARRATIVES: Record<'pro' | 'premium', BetaUpgradeNarrative> = {
  pro: {
    recommendedPlan: 'pro',
    planLabel: 'Pro',
    focusLabel: BETA_PLAN_META.pro.focusLabel,
    ctaLabel: 'Entender o Pro',
    bridgeCopy:
      'O Free ajuda a ativar o motor. O Pro entra quando voce quer estudar com mais constancia, leitura completa e treino direcionado.',
  },
  premium: {
    recommendedPlan: 'premium',
    planLabel: 'Premium',
    focusLabel: BETA_PLAN_META.premium.focusLabel,
    ctaLabel: 'Entender o Premium',
    bridgeCopy:
      'O Pro resolve bem um edital por vez. O Premium entra quando a rotina pede multi-edital, recovery e uma camada adaptativa mais forte.',
  },
};

function getPlanRule(plan: DisplayPlanTier, featureCode: FeatureCode) {
  return DEFAULT_ENTITLEMENT_POLICY.plans[plan].features[featureCode];
}

function formatMonthlyQuota(limit: number): string {
  return `${limit} por mes`;
}

function formatQuotaLabel(
  plan: DisplayPlanTier,
  featureCode: FeatureCode,
  options?: { unlimitedLabel?: string }
): string {
  const rule = getPlanRule(plan, featureCode);

  if (rule.mode !== EntitlementMode.Quota) {
    return 'Nao';
  }

  if (rule.limit <= 0) {
    return 'Nao';
  }

  if (rule.limit >= EFFECTIVELY_UNLIMITED_LIMIT) {
    return options?.unlimitedLabel ?? 'Ilimitado';
  }

  if (rule.period === EntitlementPeriod.Lifetime) {
    return rule.limit === 1
      ? '1 credito inicial'
      : `${rule.limit} creditos iniciais`;
  }

  return formatMonthlyQuota(rule.limit);
}

function formatBooleanLabel(plan: DisplayPlanTier, featureCode: FeatureCode): string {
  const rule = getPlanRule(plan, featureCode);
  if (rule.mode === EntitlementMode.Quota) {
    return rule.limit > 0 ? 'Incluido' : 'Nao';
  }

  return rule.enabled ? 'Incluido' : 'Nao';
}

function formatActivePlansLabel(plan: DisplayPlanTier): string {
  const rule = getPlanRule(plan, FeatureCode.ActivePlans);

  if (rule.mode !== EntitlementMode.Quota || rule.limit <= 0) {
    return 'Sem editais ativos';
  }

  if (rule.limit >= EFFECTIVELY_UNLIMITED_LIMIT) {
    return 'Editais ilimitados';
  }

  return `${rule.limit} plano${rule.limit === 1 ? '' : 's'} ativo${rule.limit === 1 ? '' : 's'}`;
}

function formatSimulationsLabel(plan: DisplayPlanTier): string {
  const base = formatQuotaLabel(plan, FeatureCode.SimulationsBasic, {
    unlimitedLabel: 'Ilimitados',
  });
  const hasCustom = formatBooleanLabel(plan, FeatureCode.SimulationsCustom) === 'Incluido';

  if (base === 'Nao') {
    return hasCustom ? 'Personalizados' : 'Nao';
  }

  if (hasCustom) {
    return `${base} + personalizados`;
  }

  return base;
}

function formatHealthLabel(plan: DisplayPlanTier): string {
  const hasFull = formatBooleanLabel(plan, FeatureCode.SubjectHealthFull) === 'Incluido';
  if (hasFull) return 'Completa';

  const hasBasic = formatBooleanLabel(plan, FeatureCode.SubjectHealthBasic) === 'Incluido';
  return hasBasic ? 'Basica' : 'Nao';
}

export function toDisplayTier(tier: PlanTier): DisplayPlanTier {
  return tier === 'admin' ? 'premium' : tier;
}

export function getBetaUpgradeNarrative(
  recommendedPlan: 'pro' | 'premium'
): BetaUpgradeNarrative {
  return BETA_UPGRADE_NARRATIVES[recommendedPlan];
}

export function getBetaPlanDisplay(plan: DisplayPlanTier): BetaPlanDisplay {
  return {
    activePlansLabel: formatActivePlansLabel(plan),
    simulationsLabel: formatSimulationsLabel(plan),
    healthLabel: formatHealthLabel(plan),
    weeklyDiagnosticLabel: formatBooleanLabel(plan, FeatureCode.WeeklyDiagnostic),
    mentoringLabel: formatQuotaLabel(plan, FeatureCode.WeeklyMentoring),
    editalParseLabel: formatQuotaLabel(plan, FeatureCode.EditalParse),
    aiExplanationsLabel: formatQuotaLabel(plan, FeatureCode.AiExplanations),
    contextualChatLabel: formatQuotaLabel(plan, FeatureCode.ContextualAiChat),
    multiEditalLabel: formatBooleanLabel(plan, FeatureCode.MultiEdital),
    recoveryPlanLabel: formatBooleanLabel(plan, FeatureCode.RecoveryPlan),
    adaptivePlanLabel: formatBooleanLabel(plan, FeatureCode.AdaptiveDailyPlan),
    postSimuladoLabel: formatQuotaLabel(plan, FeatureCode.PostSimuladoInteligente),
  };
}

export function getCurrentPlanUsageLabel(
  plan: DisplayPlanTier,
  currentPlansCount: number
): string {
  const rule = getPlanRule(plan, FeatureCode.ActivePlans);
  const editalLabel = currentPlansCount === 1 ? 'edital' : 'editais';

  if (rule.mode !== EntitlementMode.Quota) {
    return `${currentPlansCount} ${editalLabel} em uso`;
  }

  if (rule.limit >= EFFECTIVELY_UNLIMITED_LIMIT) {
    return `${currentPlansCount} ${editalLabel} em uso`;
  }

  return `${currentPlansCount}/${rule.limit} ${editalLabel} em uso`;
}
