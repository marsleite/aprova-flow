import type {
  AiPdfRequest,
  AiResponse,
  AiTextRequest,
} from '@/lib/ai/types';
import { runAiText, runAiPdf } from '@/lib/ai';
import { resolveBackendApiBaseUrl } from '@/lib/server/backendApi';

function createDedicatedAiError(
  message: string,
  statusCode?: number
): Error & { statusCode?: number } {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('econnrefused') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('connect') ||
    msg.includes('socket') ||
    msg.includes('timeout') ||
    msg.includes('503') ||
    msg.includes('não configurada')
  );
}

async function requestDedicatedAi<TPayload extends AiTextRequest | AiPdfRequest>(params: {
  idToken: string;
  path: '/ai/text' | '/ai/pdf';
  payload: TPayload;
}): Promise<AiResponse> {
  const baseUrl = resolveBackendApiBaseUrl();
  if (!baseUrl) {
    throw createDedicatedAiError(
      'API dedicada não configurada para execução de IA.',
      503
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${baseUrl}${params.path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${params.idToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(params.payload),
      cache: 'no-store',
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => null)) as
      | {
          error?: string;
          message?: string;
          text?: string;
          provider?: string;
          model?: string;
          latencyMs?: number;
          usage?: AiResponse['usage'];
        }
      | null;

    if (!response.ok) {
      throw createDedicatedAiError(
        body?.message || body?.error || 'Falha ao executar IA na API dedicada.',
        response.status
      );
    }

    if (
      !body ||
      typeof body.text !== 'string' ||
      typeof body.provider !== 'string' ||
      typeof body.model !== 'string' ||
      typeof body.latencyMs !== 'number' ||
      !body.usage
    ) {
      throw createDedicatedAiError(
        'Resposta inválida da API dedicada de IA.',
        502
      );
    }

    return {
      text: body.text,
      provider: body.provider as AiResponse['provider'],
      model: body.model,
      latencyMs: body.latencyMs,
      usage: body.usage,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runDedicatedAiText(params: {
  idToken: string;
  payload: AiTextRequest;
}): Promise<AiResponse> {
  try {
    return await requestDedicatedAi({
      idToken: params.idToken,
      path: '/ai/text',
      payload: params.payload,
    });
  } catch (err) {
    if (isConnectionError(err)) {
      console.warn('[dedicatedAi] Fastify indisponível, usando gateway direto para', params.payload.task);
      return runAiText(params.payload);
    }
    throw err;
  }
}

export async function runDedicatedAiPdf(params: {
  idToken: string;
  payload: AiPdfRequest;
}): Promise<AiResponse> {
  try {
    return await requestDedicatedAi({
      idToken: params.idToken,
      path: '/ai/pdf',
      payload: params.payload,
    });
  } catch (err) {
    if (isConnectionError(err)) {
      console.warn('[dedicatedAi] Fastify indisponível, usando gateway direto para', params.payload.task);
      return runAiPdf(params.payload);
    }
    throw err;
  }
}
