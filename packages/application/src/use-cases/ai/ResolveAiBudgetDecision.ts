import {
  resolveAiBudgetPolicy,
  type ResolveAiBudgetPolicyInput,
  type ResolvedAiBudgetDecision,
} from '@aprovamind/domain';

export type ResolveAiBudgetDecisionInput = ResolveAiBudgetPolicyInput;

export type ResolveAiBudgetDecisionOutput = ResolvedAiBudgetDecision;

export function resolveAiBudgetDecision(input: ResolveAiBudgetDecisionInput): ResolveAiBudgetDecisionOutput {
  return resolveAiBudgetPolicy(input);
}
