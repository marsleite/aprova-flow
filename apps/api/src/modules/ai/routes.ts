/**
 * AI Routes — Fastify Module
 *
 * Proxies AI requests through the server-side AI Gateway.
 * API keys (GEMINI_API_KEY, OPENAI_API_KEY) live here and
 * are NEVER exposed to the frontend.
 *
 * Routes:
 *   POST /ai/text  — text generation via Gemini/OpenAI
 *   POST /ai/pdf   — PDF parsing via Gemini multimodal
 */

import type { FastifyInstance } from 'fastify';
import { runAiText, runAiPdf, logAiUsageEvent } from '@aprovamind/ai-gateway';
import type { AiTextRequest, AiPdfRequest } from '@aprovamind/ai-gateway';
import { extractBearerToken } from '@aprovamind/infrastructure-firebase';
import { saveAiUsageEvent } from './ai-usage-store';
import { resolveAiFailureState } from '@aprovamind/application/use-cases/ai/ResolveAiCapabilityState';
import type { AiCapability } from '@aprovamind/contracts';

function toAiCapability(task: string): AiCapability {
  if (task === 'planner-daily') return 'daily_plan';
  if (task === 'smart-schedule') return 'smart_schedule';
  if (task === 'weekly-mentoring') return 'weekly_mentoring';
  if (task === 'error-diagnosis') return 'error_diagnosis';
  if (task === 'explain-answer') return 'explain_answer';
  if (task === 'chat') return 'chat';
  return 'next_session';
}

export async function registerAiRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /ai/text ──
  app.post('/ai/text', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const body = request.body as AiTextRequest | null;

    if (!body || !body.task || !body.prompt) {
      return reply.code(400).send({
        error: 'bad_request',
        message: 'Campos obrigatórios: task, prompt.',
      });
    }

    const validTasks = [
      'chat', 'weekly-mentoring', 'planner-daily', 'smart-schedule',
      'interrogation', 'predictive-exam', 'explain-answer', 'error-diagnosis',
    ];

    if (!validTasks.includes(body.task)) {
      return reply.code(400).send({
        error: 'bad_request',
        message: `Task inválida. Válidas: ${validTasks.join(', ')}`,
      });
    }

    try {
      const result = await runAiText(body);
      const userId = request.user?.uid;
      const idToken = extractBearerToken(request.headers.authorization);

      const usageEvent = {
        route: '/ai/text',
        task: body.task,
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
        userId,
        errorCode: result.errorCode,
      } as const;

      logAiUsageEvent(usageEvent);
      void saveAiUsageEvent(usageEvent, idToken || undefined);

      return reply.send({
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
    } catch (err) {
      request.log.error(err);
      const aiCapability = resolveAiFailureState({
        capability: toAiCapability(body.task),
        error: err,
      });
      return reply.code(500).send({
        error: 'ai_error',
        message: aiCapability.message,
        aiCapability,
      });
    }
  });

  // ── POST /ai/pdf ──
  app.post('/ai/pdf', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const body = request.body as AiPdfRequest | null;

    if (!body || body.task !== 'parse-edital' || !body.pdfBase64 || !body.prompt) {
      return reply.code(400).send({
        error: 'bad_request',
        message: 'Campos obrigatórios: task (parse-edital), pdfBase64, prompt.',
      });
    }

    try {
      const result = await runAiPdf(body);
      const userId = request.user?.uid;
      const idToken = extractBearerToken(request.headers.authorization);

      const usageEvent = {
        route: '/ai/pdf',
        task: body.task,
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
        statusCode: 200,
        userId,
        errorCode: result.errorCode,
      } as const;

      logAiUsageEvent(usageEvent);
      void saveAiUsageEvent(usageEvent, idToken || undefined);

      return reply.send({
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
    } catch (err) {
      request.log.error(err);
      const aiCapability = resolveAiFailureState({
        capability: 'next_session',
        error: err,
      });
      return reply.code(500).send({
        error: 'ai_error',
        message: aiCapability.message,
        aiCapability,
      });
    }
  });
}
