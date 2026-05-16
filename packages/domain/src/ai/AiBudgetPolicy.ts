export type AiBudgetBlockReason = 'user_daily_budget' | 'global_monthly_budget' | 'missing_budget_policy';
export type AiBudgetTask = string;

export interface ResolveAiBudgetPolicyInput {
  task: AiBudgetTask;
  estimatedRequestCostUsd: number;
  userDailyBudgetUsd?: number | null;
  globalMonthlyBudgetUsd?: number | null;
  userDailyConsumedUsd?: number | null;
  globalMonthlyConsumedUsd?: number | null;
  userDailyReservedUsd?: number | null;
  globalMonthlyReservedUsd?: number | null;
}

export interface ResolvedAiBudgetLimit {
  scope: 'user' | 'global';
  window: 'day' | 'month';
  limitUsd: number;
  consumedUsd: number;
  reservedUsd: number;
  remainingUsd: number;
}

export interface ResolvedAiBudgetDecision {
  allowed: boolean;
  task: AiBudgetTask;
  estimatedRequestCostUsd: number;
  limits: ResolvedAiBudgetLimit[];
  blockReason?: AiBudgetBlockReason;
}

function toNonNegativeNumber(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, parsed);
}

function buildLimit(params: {
  scope: 'user' | 'global';
  window: 'day' | 'month';
  limitUsd: number;
  consumedUsd?: number | null;
  reservedUsd?: number | null;
}): ResolvedAiBudgetLimit {
  const consumedUsd = toNonNegativeNumber(params.consumedUsd) ?? 0;
  const reservedUsd = toNonNegativeNumber(params.reservedUsd) ?? 0;
  const remainingUsd = Math.max(0, params.limitUsd - consumedUsd - reservedUsd);

  return {
    scope: params.scope,
    window: params.window,
    limitUsd: params.limitUsd,
    consumedUsd,
    reservedUsd,
    remainingUsd: Number(remainingUsd.toFixed(8)),
  };
}

export function resolveAiBudgetPolicy(input: ResolveAiBudgetPolicyInput): ResolvedAiBudgetDecision {
  const estimatedRequestCostUsd = toNonNegativeNumber(input.estimatedRequestCostUsd) ?? 0;
  const userDailyBudgetUsd = toNonNegativeNumber(input.userDailyBudgetUsd);
  const globalMonthlyBudgetUsd = toNonNegativeNumber(input.globalMonthlyBudgetUsd);

  const limits: ResolvedAiBudgetLimit[] = [];

  if (userDailyBudgetUsd !== undefined) {
    limits.push(buildLimit({
      scope: 'user',
      window: 'day',
      limitUsd: userDailyBudgetUsd,
      consumedUsd: input.userDailyConsumedUsd,
      reservedUsd: input.userDailyReservedUsd,
    }));
  }

  if (globalMonthlyBudgetUsd !== undefined) {
    limits.push(buildLimit({
      scope: 'global',
      window: 'month',
      limitUsd: globalMonthlyBudgetUsd,
      consumedUsd: input.globalMonthlyConsumedUsd,
      reservedUsd: input.globalMonthlyReservedUsd,
    }));
  }

  const userLimit = limits.find((limit) => limit.scope === 'user');
  if (userLimit && estimatedRequestCostUsd > userLimit.remainingUsd) {
    return {
      allowed: false,
      task: input.task,
      estimatedRequestCostUsd,
      limits,
      blockReason: 'user_daily_budget',
    };
  }

  const globalLimit = limits.find((limit) => limit.scope === 'global');
  if (globalLimit && estimatedRequestCostUsd > globalLimit.remainingUsd) {
    return {
      allowed: false,
      task: input.task,
      estimatedRequestCostUsd,
      limits,
      blockReason: 'global_monthly_budget',
    };
  }

  return {
    allowed: true,
    task: input.task,
    estimatedRequestCostUsd,
    limits,
  };
}
