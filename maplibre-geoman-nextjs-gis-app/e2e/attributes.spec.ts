import { expect, test } from '@playwright/test';

// QGIS-style attribute table: listing, schema-less metadata columns, search,
// and GeoJSON import.
test('attribute table: list / search / import GeoJSON', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(`e2e-attr-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('heading', { name: 'Layers' })).toBeVisible({ timeout: 15_000 });

  // Create a layer through the UI, then seed two features (with metadata) via API.
  await page.getByLabel('New layer name').fill('Parcels');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('Parcels fill')).toBeVisible();

  await page.evaluate(async () => {
    const layers = await fetch('/api/layers').then((r) => r.json());
    const id = layers.layers[0].id;
    const poly = (cx: number, cy: number) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[cx, cy], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1], [cx, cy]]] },
    });
    const mk = (fid: string, g: unknown, metadata: Record<string, string>) =>
      fetch('/api/features', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: fid, layerId: id, shape: 'polygon', geojson: g, metadata }),
      });
    await mk('a1', poly(-3, 53), { name: 'Plot A', use: 'residential' });
    await mk('a2', poly(0, 52), { name: 'Plot B', use: 'commercial' });
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Layers' })).toBeVisible({ timeout: 15_000 });

  // Open the attribute table.
  await page.getByRole('button', { name: '▴ Attribute table' }).click();
  await expect(page.getByRole('heading', { name: /Parcels — attributes/ })).toBeVisible();

  // Metadata keys became columns; both rows are counted.
  await expect(page.getByRole('columnheader', { name: 'name' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'use' })).toBeVisible();
  await expect(page.getByText('2/2')).toBeVisible();

  // Search filters by attribute value.
  await page.getByPlaceholder('Search attributes…').fill('commercial');
  await expect(page.getByText('1/2')).toBeVisible();
  await page.getByPlaceholder('Search attributes…').fill('');

  // Import a GeoJSON feature → it appears as a new row.
  const fc = JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Plot C', use: 'park' },
        geometry: { type: 'Polygon', coordinates: [[[2, 51], [3, 51], [3, 52], [2, 52], [2, 51]]] },
      },
    ],
  });
  await page.setInputFiles('input[type=file]', {
    name: 'import.geojson',
    mimeType: 'application/geo+json',
    buffer: Buffer.from(fc),
  });
  await expect(page.getByText('3/3')).toBeVisible({ timeout: 10_000 });
});
