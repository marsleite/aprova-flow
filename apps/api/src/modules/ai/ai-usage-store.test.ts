import assert from 'node:assert/strict';
import test from 'node:test';
import { saveAiUsageEvent, AI_USAGE_COLLECTION } from './ai-usage-store';

test('saveAiUsageEvent persists ai_usage_events with createdAt when idToken is present', async () => {
  const writes: Array<{
    collection: string;
    data: Record<string, string | number | boolean | null | undefined>;
    idToken: string;
  }> = [];

  await saveAiUsageEvent(
    {
      route: '/api/chat',
      task: 'chat',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      latencyMs: 812,
      inputTokens: 120,
      outputTokens: 32,
      totalTokens: 152,
      estimatedCostUsd: 0.0012,
      success: true,
      statusCode: 200,
      userId: 'user-1',
    },
    'token-1',
    async (params) => {
      writes.push(params);
      return { ok: true, status: 200 };
    }
  );

  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.collection, AI_USAGE_COLLECTION);
  assert.equal(writes[0]?.idToken, 'token-1');
  assert.equal(writes[0]?.data.route, '/api/chat');
  assert.equal(writes[0]?.data.task, 'chat');
  assert.equal(writes[0]?.data.userId, 'user-1');
  assert.equal(typeof writes[0]?.data.createdAt, 'string');
});

test('saveAiUsageEvent skips persistence when idToken is missing', async () => {
  let called = false;

  await saveAiUsageEvent(
    {
      route: '/api/chat',
      task: 'chat',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      latencyMs: 100,
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      estimatedCostUsd: 0.0001,
      success: true,
      statusCode: 200,
    },
    undefined,
    async () => {
      called = true;
      return { ok: true, status: 200 };
    }
  );

  assert.equal(called, false);
});
