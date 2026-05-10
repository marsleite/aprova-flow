import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './app';

test('GET /entitlements/me still resolves manual scenarios from headers when manual scenarios are enabled', async () => {
  const app = createApp({
    allowSandboxAuth: false,
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/me',
      headers: {
        'x-aprovamind-user-id': 'pro-user',
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.userId, 'pro-user');
    assert.equal(body.entitlements.catalogPlan, 'pro');
    assert.equal(body.entitlements.effectivePlan, 'pro');
  } finally {
    await app.close();
  }
});

test('GET /entitlements/scenarios is not exposed when manual scenarios are disabled', async () => {
  const app = createApp({
    allowManualScenarios: false,
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/scenarios',
    });

    assert.equal(response.statusCode, 404);
  } finally {
    await app.close();
  }
});
