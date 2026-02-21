import { GoogleGenAI } from '@google/genai';
import { buildUsage, estimateTokensFromText, extractGeminiUsage } from '@/lib/ai/metrics';
import { AiPdfRequest, AiResponse, AiTextRequest } from '@/lib/ai/types';

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY não configurada');
  }
  return key;
}

export async function generateGeminiText(params: {
  model: string;
  request: AiTextRequest;
}): Promise<AiResponse> {
  const startedAt = Date.now();
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

  const response = await ai.models.generateContent({
    model: params.model,
    contents: params.request.prompt,
    config: {
      temperature: params.request.temperature,
      maxOutputTokens: params.request.maxOutputTokens,
      systemInstruction: params.request.systemInstruction,
      ...(params.request.preferJson ? { responseMimeType: 'application/json' } : {}),
    },
  });

  const text = response.text?.trim() || '';
  const usage = extractGeminiUsage(response);

  const inputFallback = estimateTokensFromText(
    `${params.request.systemInstruction || ''}\n${params.request.prompt}`
  );
  const outputFallback = estimateTokensFromText(text);

  return {
    text,
    provider: 'gemini',
    model: params.model,
    latencyMs: Date.now() - startedAt,
    usage: buildUsage({
      model: params.model,
      inputTokens: usage.inputTokens ?? inputFallback,
      outputTokens: usage.outputTokens ?? outputFallback,
    }),
    raw: response,
  };
}

export async function generateGeminiPdf(params: {
  model: string;
  request: AiPdfRequest;
}): Promise<AiResponse> {
  const startedAt = Date.now();
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

  const response = await ai.models.generateContent({
    model: params.model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: params.request.pdfBase64,
            },
          },
          {
            text: params.request.prompt,
          },
        ],
      },
    ],
    config: {
      temperature: params.request.temperature,
      maxOutputTokens: params.request.maxOutputTokens,
      systemInstruction: params.request.systemInstruction,
    },
  });

  const text = response.text?.trim() || '';
  const usage = extractGeminiUsage(response);

  // Estimativa fallback para PDF: base64 tende a inflar input; mantemos heurística conservadora.
  const inputFallback = Math.max(
    estimateTokensFromText(params.request.prompt),
    Math.ceil((params.request.pdfBase64.length * 0.75) / 4)
  );
  const outputFallback = estimateTokensFromText(text);

  return {
    text,
    provider: 'gemini',
    model: params.model,
    latencyMs: Date.now() - startedAt,
    usage: buildUsage({
      model: params.model,
      inputTokens: usage.inputTokens ?? inputFallback,
      outputTokens: usage.outputTokens ?? outputFallback,
    }),
    raw: response,
  };
}
