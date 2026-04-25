import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './app';

function createAuthenticatedApp() {
  return createApp({
    allowSandboxAuth: false,
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'firebase-user', email: 'firebase-user@example.com' }
          : null,
    },
  });
}

test('POST /engine/snapshot rejects invalid maxRecommendations before running the engine', async () => {
  const app = createAuthenticatedApp();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/engine/snapshot',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      payload: {
        planId: 'plan-1',
        maxRecommendations: 0,
      },
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), {
      error: 'bad_request',
      message: 'Campo "maxRecommendations" deve ser um inteiro entre 1 e 5.',
    });
  } finally {
    await app.close();
  }
});

test('GET /engine/portfolio rejects non-positive globalWeeklyBudget values', async () => {
  const app = createAuthenticatedApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/engine/portfolio?globalWeeklyBudget=0',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), {
      error: 'bad_request',
      message: 'Query "globalWeeklyBudget" deve ser um inteiro maior que zero.',
    });
  } finally {
    await app.close();
  }
});
