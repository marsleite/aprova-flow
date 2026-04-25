import type {
  AiPdfRequest,
  AiResponse,
  AiTextRequest,
} from '@/lib/ai/types';
import { resolveBackendApiBaseUrl } from '@/lib/server/backendApi';

function createDedicatedAiError(
  message: string,
  statusCode?: number
): Error & { statusCode?: number } {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
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

  const response = await fetch(`${baseUrl}${params.path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.idToken}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(params.payload),
    cache: 'no-store',
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
}

export async function runDedicatedAiText(params: {
  idToken: string;
  payload: AiTextRequest;
}): Promise<AiResponse> {
  return requestDedicatedAi({
    idToken: params.idToken,
    path: '/ai/text',
    payload: params.payload,
  });
}

export async function runDedicatedAiPdf(params: {
  idToken: string;
  payload: AiPdfRequest;
}): Promise<AiResponse> {
  return requestDedicatedAi({
    idToken: params.idToken,
    path: '/ai/pdf',
    payload: params.payload,
  });
}
