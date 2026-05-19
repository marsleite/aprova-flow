import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const requireAuthenticatedUser = vi.fn();
const enforceAiTaskQuota = vi.fn();
const runDedicatedAiText = vi.fn();

vi.mock('@/lib/server/apiGuard', () => ({
  requireAuthenticatedUser,
}));

vi.mock('@/lib/server/aiRateLimit', () => ({
  enforceAiTaskQuota,
}));

vi.mock('@/lib/server/dedicatedAi', () => ({
  runDedicatedAiText,
}));

let POST: typeof import('@/app/api/smart-schedule/route').POST;

beforeAll(async () => {
  ({ POST } = await import('@/app/api/smart-schedule/route'));
});

describe('POST /api/smart-schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPayload = {
    userName: 'John Doe',
    activePlanName: 'Delegado Civil',
    weeklyGoalHours: 28,
    availableSchedule: [
      { day: 'Segunda-feira', availableHours: 4 },
      { day: 'Terça-feira', availableHours: 4 },
      { day: 'Quarta-feira', availableHours: 4 },
    ],
    planSubjects: [
      { subject: 'Direito Penal', weight: 3, hoursStudied: 0, accuracy: 65 },
      { subject: 'Direito Civil', weight: 2, hoursStudied: 0, accuracy: 80 },
    ],
  };

  it('processes normal AI output returning a JSON array successfully', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      uid: 'user-123',
      email: 'user@example.com',
      idToken: 'token-mock',
    });

    enforceAiTaskQuota.mockResolvedValue({
      allowed: true,
      headers: { 'x-quota-remaining': '9' },
    });

    runDedicatedAiText.mockResolvedValue({
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      text: JSON.stringify([
        {
          day: 'Segunda-feira',
          totalHours: 4,
          subjects: [{ name: 'Direito Penal', hours: 4, reason: 'Alta prioridade' }],
        },
      ]),
      latencyMs: 120,
      usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, estimatedCostUsd: 0.0001 },
    });

    const request = new NextRequest('http://localhost/api/smart-schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schedule).toHaveLength(1);
    expect(body.schedule[0].day).toBe('Segunda-feira');
    expect(body.schedule[0].totalHours).toBe(4);
    expect(body.schedule[0].subjects[0].name).toBe('Direito Penal');
  });

  it('successfully extracts schedule array when AI returns a wrapped object', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      uid: 'user-123',
      email: 'user@example.com',
      idToken: 'token-mock',
    });

    enforceAiTaskQuota.mockResolvedValue({
      allowed: true,
      headers: { 'x-quota-remaining': '9' },
    });

    // Object wrapper pattern commonly returned by fallback models like gemini-2.5-flash-lite
    runDedicatedAiText.mockResolvedValue({
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      text: JSON.stringify({
        schedule: [
          {
            day: 'Terça-feira',
            totalHours: 3.5,
            subjects: [{ name: 'Direito Civil', hours: 3.5, reason: 'Importante' }],
          },
        ],
      }),
      latencyMs: 120,
      usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, estimatedCostUsd: 0.0001 },
    });

    const request = new NextRequest('http://localhost/api/smart-schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schedule).toHaveLength(1);
    expect(body.schedule[0].day).toBe('Terça-feira');
    expect(body.schedule[0].totalHours).toBe(3.5);
    expect(body.schedule[0].subjects[0].name).toBe('Direito Civil');
  });

  it('falls back gracefully to buildFallbackSchedule on garbage response without throwing 500 error', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      uid: 'user-123',
      email: 'user@example.com',
      idToken: 'token-mock',
    });

    enforceAiTaskQuota.mockResolvedValue({
      allowed: true,
      headers: { 'x-quota-remaining': '9' },
    });

    runDedicatedAiText.mockResolvedValue({
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      text: 'AI completely failed to output JSON, just returns plain text reasoning here.',
      latencyMs: 120,
      usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, estimatedCostUsd: 0.0001 },
    });

    const request = new NextRequest('http://localhost/api/smart-schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200); // Graceful fallback
    expect(body.fallbackUsed).toBe(true);
    expect(body.schedule).toBeDefined();
    expect(body.schedule.length).toBeGreaterThan(0);
    expect(body.userMessage).toContain('Cronograma resiliente gerado');
  });
});
