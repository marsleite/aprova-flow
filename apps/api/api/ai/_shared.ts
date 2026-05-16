import type { IncomingMessage, ServerResponse } from 'node:http';

type AiPath = '/ai/text' | '/ai/pdf';

interface VerifiedUser {
  uid: string;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function setCors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  res.setHeader('access-control-allow-origin', typeof origin === 'string' ? origin : '*');
  res.setHeader('access-control-allow-methods', 'POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'Content-Type, Authorization');
  res.setHeader('vary', 'Origin');
}

function extractBearerToken(authorizationHeader: string | undefined | string[]): string | null {
  if (typeof authorizationHeader !== 'string') return null;
  if (!authorizationHeader.startsWith('Bearer ')) return null;
  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString('utf-8');
  if (!text.trim()) return null;
  return JSON.parse(text);
}

async function verifyRequestUser(idToken: string): Promise<VerifiedUser | null> {
  const { verifyFirebaseIdToken } = await import('@aprovamind/infrastructure-firebase');
  return verifyFirebaseIdToken(idToken);
}

async function persistUsageEvent(params: {
  event: Record<string, unknown>;
  idToken: string;
}) {
  try {
    const { saveAiUsageEvent } = await import('../../src/modules/ai/ai-usage-store');
    await saveAiUsageEvent(params.event as never, params.idToken);
  } catch (error) {
    console.warn(
      '[api-ai] usage persistence failed:',
      error instanceof Error ? error.message : error
    );
  }
}

async function runAi(path: AiPath, payload: unknown) {
  const gateway = await import('@aprovamind/ai-gateway');
  if (path === '/ai/pdf') {
    return gateway.runAiPdf(payload as never);
  }
  return gateway.runAiText(payload as never);
}

function isValidPayload(path: AiPath, payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return false;
  const body = payload as Record<string, unknown>;
  if (path === '/ai/pdf') {
    return body.task === 'parse-edital' && typeof body.pdfBase64 === 'string' && typeof body.prompt === 'string';
  }
  return typeof body.task === 'string' && typeof body.prompt === 'string';
}

export async function handleAiFunction(params: {
  req: IncomingMessage;
  res: ServerResponse;
  path: AiPath;
}) {
  setCors(params.req, params.res);

  if (params.req.method === 'OPTIONS') {
    params.res.statusCode = 204;
    params.res.end();
    return;
  }

  if (params.req.method !== 'POST') {
    sendJson(params.res, 405, {
      error: 'method_not_allowed',
      message: 'Use POST para executar esta rota de IA.',
    });
    return;
  }

  const idToken = extractBearerToken(params.req.headers.authorization);
  if (!idToken) {
    sendJson(params.res, 401, {
      error: 'unauthorized',
      message: 'Envie um Authorization: Bearer <firebase-id-token> valido.',
    });
    return;
  }

  let user: VerifiedUser | null = null;
  try {
    user = await verifyRequestUser(idToken);
  } catch (error) {
    console.error('[api-ai] auth bootstrap failed', error);
    sendJson(params.res, 500, {
      error: 'api_auth_bootstrap_failed',
      message: 'Nao foi possivel inicializar a autenticacao da API.',
    });
    return;
  }

  if (!user) {
    sendJson(params.res, 401, {
      error: 'unauthorized',
      message: 'Token expirado ou invalido.',
    });
    return;
  }

  let payload: unknown;
  try {
    payload = await readJsonBody(params.req);
  } catch {
    sendJson(params.res, 400, {
      error: 'bad_request',
      message: 'JSON invalido.',
    });
    return;
  }

  if (!isValidPayload(params.path, payload)) {
    sendJson(params.res, 400, {
      error: 'bad_request',
      message: params.path === '/ai/pdf'
        ? 'Campos obrigatórios: task (parse-edital), pdfBase64, prompt.'
        : 'Campos obrigatórios: task, prompt.',
    });
    return;
  }

  try {
    const result = await runAi(params.path, payload);
    const task = String(payload.task);
    const usageEvent = {
      route: params.path,
      task,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      estimatedCostUsd: result.usage.estimatedCostUsd,
      success: result.status !== 'failed' && result.status !== 'blocked_by_budget',
      status: result.status || 'success',
      fallbackUsed: Boolean(result.fallbackUsed),
      budgetBlocked: Boolean(result.budgetBlocked),
      statusCode: result.status === 'blocked_by_budget' ? 429 : 200,
      userId: user.uid,
      errorCode: result.errorCode,
    };

    void persistUsageEvent({ event: usageEvent, idToken });

    sendJson(params.res, 200, {
      text: result.text,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      usage: result.usage,
      status: result.status || 'success',
      fallbackUsed: Boolean(result.fallbackUsed),
      budgetBlocked: Boolean(result.budgetBlocked),
      userMessage: result.userMessage,
      errorCode: result.errorCode,
    });
  } catch (error) {
    console.error('[api-ai] execution failed', error);
    sendJson(params.res, 500, {
      error: 'ai_error',
      message: 'Nao foi possivel concluir a chamada de IA na API dedicada.',
    });
  }
}
