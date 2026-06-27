import { expect, test } from '@playwright/test';

// Clicks every toolbar control and asserts no runtime error — the modes are
// real engine modes, so a broken wiring surfaces as a pageerror.
test('every toolbar tool activates without error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByLabel('Email').fill(`e2e-tools-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('heading', { name: 'Layers' })).toBeVisible({ timeout: 15_000 });

  // A layer + feature so draw target and selection-required tools are valid.
  await page.getByLabel('New layer name').fill('Test');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('Test fill')).toBeVisible();
  await page.evaluate(async () => {
    const layers = await fetch('/api/layers').then((r) => r.json());
    await fetch('/api/features', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'f1',
        layerId: layers.layers[0].id,
        shape: 'polygon',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 50], [2, 50], [2, 52], [0, 52], [0, 50]]] } },
        metadata: {},
      }),
    });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Layers' })).toBeVisible({ timeout: 15_000 });

  // Tools that work without a selection.
  const tools = [
    'Point', 'Line', 'Polygon', 'Rectangle', 'Circle', 'Ellipse', 'Freehand', 'Text',
    'Edit vertices', 'Move', 'Rotate', 'Scale',
    'Split', 'Union', 'Difference', 'Simplify',
    'Select', 'Lasso select', 'Copy', 'Cut', 'Delete',
  ];
  for (const name of tools) {
    await page.getByRole('button', { name, exact: true }).click();
  }

  // Helpers (toggles + action).
  await page.getByRole('button', { name: 'Measure (length / area)' }).click();
  await page.getByRole('button', { name: 'Snapping' }).click();
  await page.getByRole('button', { name: 'Zoom to features' }).click();

  // Selection-required geometry tools: select the feature first.
  await page.getByRole('button', { name: '▴ Attribute table' }).click();
  await page.locator('tbody tr').first().click();
  for (const name of ['Add part', 'Add hole', 'Remove ring', 'Merge parts']) {
    await page.getByRole('button', { name, exact: true }).click();
  }

  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});
