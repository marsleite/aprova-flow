import { generateGeminiPdf, generateGeminiText } from '@/lib/ai/providers/gemini';
import { generateOpenAiText } from '@/lib/ai/providers/openai';
import { AiPdfRequest, AiProvider, AiResponse, AiTask, AiTextRequest } from '@/lib/ai/types';

interface TaskConfig {
  provider: AiProvider;
  model: string;
}

const DEFAULTS: Record<AiTask, TaskConfig> = {
  chat: { provider: 'gemini', model: 'gemini-2.5-flash' },
  'weekly-mentoring': { provider: 'gemini', model: 'gemini-2.5-flash' },
  'parse-edital': { provider: 'gemini', model: 'gemini-2.5-flash' },
  'planner-daily': { provider: 'gemini', model: 'gemini-2.5-flash' },
  'smart-schedule': { provider: 'gemini', model: 'gemini-2.5-flash' },
  'interrogation': { provider: 'gemini', model: 'gemini-2.5-flash' },
  'predictive-exam': { provider: 'gemini', model: 'gemini-2.5-flash' },
  'explain-answer': { provider: 'gemini', model: 'gemini-2.5-flash' },
  'error-diagnosis': { provider: 'gemini', model: 'gemini-2.5-flash' },
};

function resolveConfig(task: AiTask): TaskConfig {
  const fallback = DEFAULTS[task];

  const globalProvider = (process.env.AI_PROVIDER_DEFAULT || '').toLowerCase();
  const globalModel = process.env.AI_MODEL_DEFAULT;

  const providerByTask =
    (task === 'chat' && process.env.AI_PROVIDER_CHAT) ||
    (task === 'weekly-mentoring' && process.env.AI_PROVIDER_WEEKLY_MENTORING) ||
    (task === 'planner-daily' && process.env.AI_PROVIDER_PLANNER_DAILY) ||
    (task === 'parse-edital' && process.env.AI_PROVIDER_PARSE_EDITAL) ||
    globalProvider;

  const modelByTask =
    (task === 'chat' && process.env.AI_MODEL_CHAT) ||
    (task === 'weekly-mentoring' && process.env.AI_MODEL_WEEKLY_MENTORING) ||
    (task === 'planner-daily' && process.env.AI_MODEL_PLANNER_DAILY) ||
    (task === 'parse-edital' && process.env.AI_MODEL_PARSE_EDITAL) ||
    globalModel;

  const provider = providerByTask === 'openai' ? 'openai' : providerByTask === 'gemini' ? 'gemini' : fallback.provider;

  return {
    provider,
    model: modelByTask?.trim() || fallback.model,
  };
}

function shouldFallbackToGemini(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes('openai_api_key') || msg.includes('openai') || msg.includes('429') || msg.includes('quota');
}

export async function runAiText(request: AiTextRequest): Promise<AiResponse> {
  const config = resolveConfig(request.task);

  if (config.provider === 'openai') {
    try {
      return await generateOpenAiText({ model: config.model, request });
    } catch (err) {
      if (!shouldFallbackToGemini(err)) throw err;
      return generateGeminiText({
        model: DEFAULTS[request.task].model,
        request,
      });
    }
  }

  return generateGeminiText({ model: config.model, request });
}

export async function runAiPdf(request: AiPdfRequest): Promise<AiResponse> {
  const config = resolveConfig(request.task);

  // Parse de PDF multimodal: fallback direto para Gemini nesta fase.
  return generateGeminiPdf({
    model: config.provider === 'gemini' ? config.model : DEFAULTS[request.task].model,
    request,
  });
}
