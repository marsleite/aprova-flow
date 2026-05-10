import type {
  AiCapability,
  AiCapabilityResponse,
  AiCapabilityState,
  AiFailureInput,
  AiNextAction,
} from '@aprovamind/contracts';

export interface ResolveAiCapabilityStateInput {
  capability: AiCapability;
  enabled: boolean;
  hasRequiredContext?: boolean;
  usageRemaining?: number;
  providerConfigured?: boolean;
  providerAvailable?: boolean;
  retryAfterSeconds?: number;
}

const DEFAULT_MESSAGES: Record<AiCapabilityState, string> = {
  enabled: 'IA pronta para ajudar com esta acao.',
  disabled: 'IA desativada neste momento. Voce ainda pode continuar sem IA.',
  limited: 'Limite de IA atingido por agora. Continue pelo fluxo sem IA ou tente novamente depois.',
  misconfigured: 'IA temporariamente indisponivel por configuracao. Seus dados foram preservados.',
  provider_unavailable: 'IA temporariamente indisponivel. Voce pode tentar novamente ou seguir com uma alternativa.',
  insufficient_data: 'Ainda faltam dados de estudo para usar esta acao de IA.',
  unexpected_failure: 'Nao consegui concluir agora. Seus dados foram preservados e voce pode tentar novamente.',
};

export function resolveAiCapabilityState(
  input: ResolveAiCapabilityStateInput
): AiCapabilityResponse {
  if (!input.enabled) {
    return buildCapability(input.capability, 'disabled', ['continue_without_ai']);
  }

  if (input.hasRequiredContext === false) {
    return buildCapability(input.capability, 'insufficient_data', ['register_activity']);
  }

  if (input.providerConfigured === false) {
    return buildCapability(input.capability, 'misconfigured', ['continue_without_ai']);
  }

  if (input.usageRemaining !== undefined && input.usageRemaining <= 0) {
    return buildCapability(input.capability, 'limited', ['upgrade_or_wait', 'continue_without_ai'], {
      retryAfterSeconds: input.retryAfterSeconds,
      usageRemaining: 0,
    });
  }

  if (input.providerAvailable === false) {
    return buildCapability(input.capability, 'provider_unavailable', ['retry_later', 'continue_without_ai'], {
      retryAfterSeconds: input.retryAfterSeconds,
      usageRemaining: input.usageRemaining,
    });
  }

  return buildCapability(input.capability, 'enabled', [], {
    usageRemaining: input.usageRemaining,
  });
}

export function resolveAiFailureState(input: AiFailureInput): AiCapabilityResponse {
  const message = input.error instanceof Error ? input.error.message.toLowerCase() : '';

  if (message.includes('quota') || message.includes('limit') || message.includes('rate')) {
    return buildCapability(input.capability, 'limited', ['upgrade_or_wait', 'continue_without_ai'], {
      retryAfterSeconds: input.retryAfterSeconds,
      usageRemaining: input.usageRemaining ?? 0,
    });
  }

  if (message.includes('api key') || message.includes('credential') || message.includes('config')) {
    return buildCapability(input.capability, 'misconfigured', ['continue_without_ai']);
  }

  if (input.hasRequiredContext === false) {
    return buildCapability(input.capability, 'insufficient_data', ['register_activity']);
  }

  if (message.includes('timeout') || message.includes('unavailable') || message.includes('fetch failed')) {
    return buildCapability(input.capability, 'provider_unavailable', ['retry_later', 'continue_without_ai'], {
      retryAfterSeconds: input.retryAfterSeconds,
      usageRemaining: input.usageRemaining,
    });
  }

  return buildCapability(input.capability, 'unexpected_failure', ['retry_later', 'continue_without_ai'], {
    retryAfterSeconds: input.retryAfterSeconds,
    usageRemaining: input.usageRemaining,
  });
}

function buildCapability(
  capability: AiCapability,
  state: AiCapabilityState,
  nextActions: AiNextAction[],
  extras: Pick<AiCapabilityResponse, 'retryAfterSeconds' | 'usageRemaining'> = {}
): AiCapabilityResponse {
  return {
    capability,
    state,
    message: DEFAULT_MESSAGES[state],
    nextActions,
    ...extras,
  };
}
