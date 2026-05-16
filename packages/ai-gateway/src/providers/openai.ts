import { buildUsage, estimateTokensFromText, extractOpenAiUsage } from '../metrics';
import type { AiProvider, AiResponse, AiTextRequest } from '../types';

function getOpenAiApiKey(provider: AiProvider): string {
  const key = provider === 'openrouter'
    ? process.env.AI_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || process.env.AI_OPENAI_COMPAT_API_KEY
    : process.env.AI_OPENAI_COMPAT_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(provider === 'openrouter'
      ? 'AI_OPENROUTER_API_KEY/OPENROUTER_API_KEY não configurada'
      : 'AI_OPENAI_COMPAT_API_KEY/OPENAI_API_KEY não configurada');
  }
  return key;
}

function extractOpenAiText(data: unknown): string {
  const response = data as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const fromContent = response.output
    ?.flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text' || part.type === 'text')
    .map((part) => part.text || '')
    .join('\n')
    .trim();

  return fromContent || '';
}

function extractChatCompletionText(data: unknown): string {
  const response = data as {
    choices?: Array<{
      message?: { content?: string | Array<{ type?: string; text?: string }> };
      text?: string;
    }>;
  };
  const first = response.choices?.[0];
  const content = first?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.map((part) => part.text || '').join('\n').trim();
  }
  return first?.text?.trim() || '';
}

function buildOpenRouterHeaders(apiKey: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const referer = process.env.AI_OPENROUTER_SITE_URL || process.env.OPENROUTER_SITE_URL;
  const title = process.env.AI_OPENROUTER_APP_NAME || process.env.OPENROUTER_APP_NAME || 'AprovaMind';
  if (referer) headers['HTTP-Referer'] = referer;
  if (title) headers['X-Title'] = title;
  return headers;
}

export async function generateOpenAiText(params: {
  provider?: AiProvider;
  model: string;
  request: AiTextRequest;
}): Promise<AiResponse> {
  const startedAt = Date.now();
  const provider = params.provider || 'openai-compatible';
  const isOpenRouter = provider === 'openrouter';

  const compatBaseUrl = (
    isOpenRouter
      ? process.env.AI_OPENROUTER_BASE_URL || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
      : process.env.AI_OPENAI_COMPAT_BASE_URL || ''
  ).replace(/\/$/, '');

  const endpoint = isOpenRouter
    ? process.env.AI_OPENROUTER_CHAT_COMPLETIONS_URL || `${compatBaseUrl}/chat/completions`
    : process.env.AI_OPENAI_COMPAT_RESPONSES_URL ||
      process.env.OPENAI_RESPONSES_URL ||
      (compatBaseUrl ? `${compatBaseUrl}/responses` : 'https://api.openai.com/v1/responses');

  const body: Record<string, unknown> = isOpenRouter
    ? {
        model: params.model,
        messages: [
          ...(params.request.systemInstruction
            ? [{ role: 'system', content: params.request.systemInstruction }]
            : []),
          { role: 'user', content: params.request.prompt },
        ],
        temperature: params.request.temperature,
        max_tokens: params.request.maxOutputTokens,
      }
    : {
        model: params.model,
        input: [
      ...(params.request.systemInstruction
        ? [
            {
              role: 'system',
              content: [{ type: 'input_text', text: params.request.systemInstruction }],
            },
          ]
        : []),
      {
        role: 'user',
        content: [{ type: 'input_text', text: params.request.prompt }],
      },
    ],
        temperature: params.request.temperature,
        max_output_tokens: params.request.maxOutputTokens,
      };

  if (params.request.preferJson) {
    if (isOpenRouter) {
      body.response_format = { type: 'json_object' };
    } else {
      body.text = { format: { type: 'json_object' } };
    }
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: isOpenRouter
      ? buildOpenRouterHeaders(getOpenAiApiKey(provider))
      : {
          Authorization: `Bearer ${getOpenAiApiKey(provider)}`,
          'Content-Type': 'application/json',
        },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message || `${provider} error ${res.status}`;
    throw new Error(msg);
  }

  const text = isOpenRouter ? extractChatCompletionText(data) : extractOpenAiText(data);
  const usage = extractOpenAiUsage(data);

  const inputFallback = estimateTokensFromText(
    `${params.request.systemInstruction || ''}\n${params.request.prompt}`
  );
  const outputFallback = estimateTokensFromText(text);

  return {
    text,
    provider,
    model: params.model,
    latencyMs: Date.now() - startedAt,
    usage: buildUsage({
      model: params.model,
      inputTokens: usage.inputTokens ?? inputFallback,
      outputTokens: usage.outputTokens ?? outputFallback,
    }),
    raw: data,
  };
}
