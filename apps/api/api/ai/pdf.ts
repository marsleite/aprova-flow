import type { IncomingMessage, ServerResponse } from 'node:http';

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

function extractBearerToken(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token || null;
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString('utf-8');
  if (!text.trim()) return null;
  const parsed = JSON.parse(text) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, {
      error: 'method_not_allowed',
      message: 'Use POST para executar esta rota de IA.',
    });
    return;
  }

  const idToken = extractBearerToken(req.headers.authorization);
  if (!idToken) {
    sendJson(res, 401, {
      error: 'unauthorized',
      message: 'Envie um Authorization: Bearer <firebase-id-token> valido.',
    });
    return;
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, {
      error: 'bad_request',
      message: 'JSON invalido.',
    });
    return;
  }

  if (
    !body ||
    body.task !== 'parse-edital' ||
    typeof body.pdfBase64 !== 'string' ||
    typeof body.prompt !== 'string'
  ) {
    sendJson(res, 400, {
      error: 'bad_request',
      message: 'Campos obrigatórios: task (parse-edital), pdfBase64, prompt.',
    });
    return;
  }

  try {
    const [{ verifyFirebaseIdToken }, gateway] = await Promise.all([
      import('@aprovamind/infrastructure-firebase'),
      import('@aprovamind/ai-gateway'),
    ]);

    const user = await verifyFirebaseIdToken(idToken);
    if (!user) {
      sendJson(res, 401, {
        error: 'unauthorized',
        message: 'Token expirado ou invalido.',
      });
      return;
    }

    const result = await gateway.runAiPdf(body as never);
    const status = result.status || 'success';
    const usageEvent = {
      route: '/ai/pdf',
      task: 'parse-edital',
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      estimatedCostUsd: result.usage.estimatedCostUsd,
      success: status !== 'failed' && status !== 'blocked_by_budget',
      status,
      fallbackUsed: Boolean(result.fallbackUsed),
      budgetBlocked: Boolean(result.budgetBlocked),
      statusCode: 200,
      userId: user.uid,
      errorCode: result.errorCode,
    };

    void import('../../src/modules/ai/ai-usage-store')
      .then(({ saveAiUsageEvent }) => saveAiUsageEvent(usageEvent as never, idToken))
      .catch((error) => {
        console.warn('[api-ai] usage persistence failed:', error instanceof Error ? error.message : error);
      });

    sendJson(res, 200, {
      text: result.text,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      usage: result.usage,
      status,
      fallbackUsed: Boolean(result.fallbackUsed),
      budgetBlocked: Boolean(result.budgetBlocked),
      userMessage: result.userMessage,
      errorCode: result.errorCode,
    });
  } catch (error) {
    console.error('[api-ai] pdf execution failed', error);
    sendJson(res, 500, {
      error: 'ai_error',
      message: 'Nao foi possivel concluir a chamada de IA na API dedicada.',
    });
  }
}
