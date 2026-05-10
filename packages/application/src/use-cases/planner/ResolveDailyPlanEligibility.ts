import type {
  AiCapabilityResponse,
  DailyPlanEligibility,
  DailyPlanNextAction,
} from '@aprovamind/contracts';

export interface DailyPlanActivitySummary {
  totalQuestions?: number;
  correctAnswers?: number;
  studyMinutes?: number;
  subjectCount?: number;
}

export interface ResolveDailyPlanEligibilityInput {
  activity?: DailyPlanActivitySummary;
  hasActiveEdital?: boolean;
  requiresActiveEdital?: boolean;
  aiCapability?: AiCapabilityResponse;
  evaluatedAt?: string;
}

export function resolveDailyPlanEligibility(
  input: ResolveDailyPlanEligibilityInput
): DailyPlanEligibility {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const missingRequirements: string[] = [];
  const nextActions: DailyPlanNextAction[] = [];
  const hasActivity = hasUsableActivity(input.activity);

  if (!hasActivity) {
    missingRequirements.push('Registre ao menos uma sessao ou questoes validas para montar o plano.');
    nextActions.push('register_activity');
  }

  if (input.requiresActiveEdital && !input.hasActiveEdital) {
    missingRequirements.push('Selecione um edital ativo para orientar o plano.');
    nextActions.push('manage_editais');
  }

  if (missingRequirements.length > 0) {
    return {
      status: input.requiresActiveEdital && !input.hasActiveEdital ? 'missing_active_edital' : 'missing_data',
      canGenerate: false,
      canGenerateFallback: false,
      missingRequirements,
      nextActions,
      evaluatedAt,
    };
  }

  if (input.aiCapability?.state === 'limited') {
    return {
      status: 'usage_limited',
      canGenerate: false,
      canGenerateFallback: true,
      missingRequirements: ['Limite de IA atingido por agora.'],
      nextActions: ['generate_fallback', 'continue_without_ai'],
      evaluatedAt,
    };
  }

  if (
    input.aiCapability &&
    ['disabled', 'misconfigured', 'provider_unavailable', 'unexpected_failure'].includes(input.aiCapability.state)
  ) {
    return {
      status: 'ai_unavailable',
      canGenerate: false,
      canGenerateFallback: true,
      missingRequirements: [input.aiCapability.message],
      nextActions: ['generate_fallback', 'retry_later'],
      evaluatedAt,
    };
  }

  return {
    status: 'eligible',
    canGenerate: true,
    canGenerateFallback: true,
    missingRequirements: [],
    nextActions: [],
    evaluatedAt,
  };
}

function hasUsableActivity(activity: DailyPlanActivitySummary | undefined): boolean {
  if (!activity) {
    return false;
  }

  const totalQuestions = activity.totalQuestions ?? 0;
  const correctAnswers = activity.correctAnswers ?? 0;
  const studyMinutes = activity.studyMinutes ?? 0;
  const subjectCount = activity.subjectCount ?? 0;

  if (totalQuestions < 0 || correctAnswers < 0 || correctAnswers > totalQuestions) {
    return false;
  }

  return totalQuestions > 0 || studyMinutes > 0 || subjectCount > 0;
}
