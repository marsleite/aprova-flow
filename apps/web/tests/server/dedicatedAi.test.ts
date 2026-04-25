import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let runDedicatedAiPdf: typeof import('@/lib/server/dedicatedAi').runDedicatedAiPdf;
let runDedicatedAiText: typeof import('@/lib/server/dedicatedAi').runDedicatedAiText;

const originalApiBaseUrl = process.env.API_BASE_URL;
const originalPublicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const originalNodeEnv = process.env.NODE_ENV;

beforeAll(async () => {
  ({ runDedicatedAiPdf, runDedicatedAiText } = await import('@/lib/server/dedicatedAi'));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  if (originalApiBaseUrl === undefined) {
    delete process.env.API_BASE_URL;
  } else {
    process.env.API_BASE_URL = originalApiBaseUrl;
  }

  if (originalPublicApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalPublicApiBaseUrl;
  }

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

describe('dedicatedAi', () => {
  it('executes text tasks through the dedicated API', async () => {
    process.env.API_BASE_URL = 'https://api.aprovamind.test';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: '{"ok":true}',
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          latencyMs: 812,
          usage: {
            inputTokens: 120,
            outputTokens: 34,
            totalTokens: 154,
            estimatedCostUsd: 0.0012,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await runDedicatedAiText({
      idToken: 'token-1',
      payload: {
        task: 'smart-schedule',
        prompt: 'Monte o cronograma',
        temperature: 0.2,
        preferJson: true,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.aprovamind.test/ai/text',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer token-1',
          'content-type': 'application/json',
          accept: 'application/json',
        }),
        body: JSON.stringify({
          task: 'smart-schedule',
          prompt: 'Monte o cronograma',
          temperature: 0.2,
          preferJson: true,
        }),
      })
    );

    expect(response.provider).toBe('gemini');
    expect(response.usage.totalTokens).toBe(154);
  });

  it('executes pdf tasks through the dedicated API', async () => {
    process.env.API_BASE_URL = 'https://api.aprovamind.test';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: '{"subjects":[]}',
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          latencyMs: 1040,
          usage: {
            inputTokens: 400,
            outputTokens: 50,
            totalTokens: 450,
            estimatedCostUsd: 0.004,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await runDedicatedAiPdf({
      idToken: 'token-2',
      payload: {
        task: 'parse-edital',
        pdfBase64: 'ZmFrZQ==',
        prompt: 'Analise o edital',
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.aprovamind.test/ai/pdf',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer token-2',
        }),
      })
    );

    expect(response.model).toBe('gemini-2.5-flash');
    expect(response.text).toBe('{"subjects":[]}');
  });

  it('throws a status-aware error when the dedicated API rejects the request', async () => {
    process.env.API_BASE_URL = 'https://api.aprovamind.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'ai_error',
            message: 'Erro ao processar requisição de IA.',
          }),
          { status: 500, headers: { 'content-type': 'application/json' } }
        )
      )
    );

    await expect(
      runDedicatedAiText({
        idToken: 'token-3',
        payload: {
          task: 'chat',
          prompt: 'Oi',
        },
      })
    ).rejects.toMatchObject({
      message: 'Erro ao processar requisição de IA.',
      statusCode: 500,
    });
  });
});
