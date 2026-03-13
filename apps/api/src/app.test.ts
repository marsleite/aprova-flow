import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './app';

test('GET /health returns ok', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      service: 'aprovamind-api',
      status: 'ok',
    });
  } finally {
    await app.close();
  }
});

test('GET /entitlements/scenarios exposes manual scenarios for testing', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/scenarios',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.ok(Array.isArray(body.scenarios));
    assert.ok(body.scenarios.some((item: { userId: string }) => item.userId === 'free-user'));
    assert.ok(body.scenarios.some((item: { userId: string }) => item.userId === 'premium-user'));
  } finally {
    await app.close();
  }
});

test('GET /entitlements/me returns the entitlement snapshot for a test user', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/me?userId=pro-user',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.userId, 'pro-user');
    assert.equal(body.entitlements.catalogPlan, 'pro');
    assert.equal(body.entitlements.effectivePlan, 'pro');
    assert.equal(body.entitlements.features.subject_health_full.enabled, true);
    assert.equal(body.entitlements.features.multi_edital.enabled, false);
  } finally {
    await app.close();
  }
});

test('GET /entitlements/me returns 400 when no user id is provided', async () => {
  const app = createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/entitlements/me',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, 'missing_user_id');
  } finally {
    await app.close();
  }
});
