import { buildUsage, estimateTokensFromText, extractOpenAiUsage } from '@/lib/ai/metrics';
import { AiResponse, AiTextRequest } from '@/lib/ai/types';

function getOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY não configurada');
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

export async function generateOpenAiText(params: {
  model: string;
  request: AiTextRequest;
}): Promise<AiResponse> {
  const startedAt = Date.now();
  const endpoint = process.env.OPENAI_RESPONSES_URL || 'https://api.openai.com/v1/responses';

  const body: Record<string, unknown> = {
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
    body.text = { format: { type: 'json_object' } };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message || `OpenAI error ${res.status}`;
    throw new Error(msg);
  }

  const text = extractOpenAiText(data);
  const usage = extractOpenAiUsage(data);

  const inputFallback = estimateTokensFromText(
    `${params.request.systemInstruction || ''}\n${params.request.prompt}`
  );
  const outputFallback = estimateTokensFromText(text);

  return {
    text,
    provider: 'openai',
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
