import type {
  GetUserSubscriptionStateParams,
  GetUserSubscriptionStateResult,
  SubscriptionStateDataSource,
} from '@aprovamind/application/ports/SubscriptionStateDataSource';
import {
  FeatureCode,
  PlanCode,
  SubscriptionStatus,
  type FeatureUsageMap,
} from '@aprovamind/domain';

interface ManualScenarioDefinition {
  userId: string;
  plan: PlanCode;
  status: SubscriptionStatus;
  usage?: FeatureUsageMap;
  description: string;
}

const MANUAL_SCENARIOS: ManualScenarioDefinition[] = [
  {
    userId: 'free-user',
    plan: PlanCode.Free,
    status: SubscriptionStatus.Active,
    usage: {
      [FeatureCode.SimulationsBasic]: 1,
      [FeatureCode.AiExplanations]: 2,
      [FeatureCode.ContextualAiChat]: 1,
    },
    description: 'Usuario free com acesso basico e pequena degustacao de IA.',
  },
  {
    userId: 'pro-user',
    plan: PlanCode.Pro,
    status: SubscriptionStatus.Active,
    usage: {
      [FeatureCode.SimulationsBasic]: 4,
      [FeatureCode.AiExplanations]: 24,
      [FeatureCode.ContextualAiChat]: 15,
      [FeatureCode.WeeklyMentoring]: 1,
    },
    description: 'Usuario pro com motor completo single-plan.',
  },
  {
    userId: 'past-due-user',
    plan: PlanCode.Pro,
    status: SubscriptionStatus.PastDue,
    usage: {
      [FeatureCode.AiExplanations]: 30,
      [FeatureCode.ContextualAiChat]: 20,
    },
    description: 'Usuario pro com assinatura atrasada e features caras restritas.',
  },
  {
    userId: 'expired-user',
    plan: PlanCode.Pro,
    status: SubscriptionStatus.Expired,
    description: 'Usuario pro expirado, caindo para free fallback.',
  },
];

export class ManualSubscriptionStateDataSource
  implements SubscriptionStateDataSource
{
  async getUserSubscriptionState(
    params: GetUserSubscriptionStateParams
  ): Promise<GetUserSubscriptionStateResult> {
    const scenario = MANUAL_SCENARIOS.find((item) => item.userId === params.userId);

    if (!scenario) {
      return {
        found: false,
        reason: 'subscription_not_found',
      };
    }

    return {
      found: true,
      subscription: {
        userId: scenario.userId,
        plan: scenario.plan,
        status: scenario.status,
        usage: scenario.usage,
      },
    };
  }
}

export function listManualSubscriptionScenarios(): ManualScenarioDefinition[] {
  return [...MANUAL_SCENARIOS];
}
