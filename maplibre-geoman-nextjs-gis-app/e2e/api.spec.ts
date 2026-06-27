import { expect, test, type APIRequestContext } from '@playwright/test';

// Exercises the full per-user data path through HTTP with a real session,
// without depending on flaky map-canvas interactions.

async function signUp(request: APIRequestContext) {
  const email = `e2e-api-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await request.post('/api/auth/sign-up/email', {
    data: { email, password: 'password123', name: 'E2E API' },
  });
  expect(res.ok()).toBeTruthy();
  return email;
}

test('rejects unauthenticated access', async ({ request }) => {
  const res = await request.get('/api/layers');
  expect(res.status()).toBe(401);
});

test('layer + feature + metadata lifecycle', async ({ playwright, baseURL }) => {
  // Isolated cookie jar for this user.
  const request = await playwright.request.newContext({ baseURL });
  await signUp(request);

  // Create a layer.
  const layerRes = await request.post('/api/layers', {
    data: { name: 'Parcels', color: '#10b981' },
  });
  expect(layerRes.status()).toBe(201);
  const { layer } = await layerRes.json();
  expect(layer.name).toBe('Parcels');
  expect(layer.visible).toBe(true);
  expect(layer.color).toBe('#10b981');
  expect(layer.borderColor).toBeTruthy();

  // border colour round-trips via PATCH
  const recolored = await request.patch(`/api/layers/${layer.id}`, {
    data: { borderColor: '#123456' },
  });
  expect((await recolored.json()).layer.borderColor).toBe('#123456');

  // Create a feature in that layer.
  const feature = {
    id: 'feat-1',
    layerId: layer.id,
    shape: 'marker',
    geojson: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [0, 51] },
    },
    metadata: { name: 'Plot A' },
  };
  const created = await request.post('/api/features', { data: feature });
  expect(created.status()).toBe(201);

  // It shows up filtered by layer.
  const listed = await request.get(`/api/features?layerId=${layer.id}`);
  const { features } = await listed.json();
  expect(features).toHaveLength(1);
  expect(features[0].metadata).toEqual({ name: 'Plot A' });

  // Update metadata.
  const patched = await request.patch(`/api/features/${feature.id}`, {
    data: { metadata: { name: 'Plot A', zoning: 'residential' } },
  });
  expect(patched.status()).toBe(200);
  const reread = await request.get('/api/features');
  const got = (await reread.json()).features[0];
  expect(got.metadata).toEqual({ name: 'Plot A', zoning: 'residential' });

  // Deleting the layer cascades the feature.
  const del = await request.delete(`/api/layers/${layer.id}`);
  expect(del.status()).toBe(200);
  const afterDelete = await request.get('/api/features');
  expect((await afterDelete.json()).features).toHaveLength(0);

  await request.dispose();
});

test('cannot write a feature into another user layer', async ({ playwright, baseURL }) => {
  const userA = await playwright.request.newContext({ baseURL });
  await signUp(userA);
  const { layer } = await (
    await userA.post('/api/layers', { data: { name: 'A-only' } })
  ).json();

  const userB = await playwright.request.newContext({ baseURL });
  await signUp(userB);
  const res = await userB.post('/api/features', {
    data: {
      id: 'x',
      layerId: layer.id, // belongs to user A
      geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } },
    },
  });
  expect(res.status()).toBe(404); // not found / not owned

  await userA.dispose();
  await userB.dispose();
});
