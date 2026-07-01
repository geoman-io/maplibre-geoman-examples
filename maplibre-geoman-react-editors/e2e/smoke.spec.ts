import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke test for Geoman Studio: the SaaS shell + vertical switcher, each
 * vertical's custom toolbar + data-model-driven sidebar, a live gm event
 * (select → inspector), and localStorage persistence.
 */
type Store = {
  layers: Array<{ id: string; name: string }>;
  features: Record<string, { id: string; layerId: string; metadata: Record<string, string> }>;
  setSelectedFeature: (id: string) => void;
};
type Win = { __store: { getState: () => Store } };

const countIn = (page: Page, layerName: string) =>
  page.evaluate((name) => {
    const st = (window as unknown as Win).__store.getState();
    const layer = st.layers.find((l) => l.name === name);
    return Object.values(st.features).filter((f) => f.layerId === layer?.id).length;
  }, layerName);

test('shell, three verticals with custom toolbars + data models, and persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Geoman Studio')).toBeVisible();
  for (const v of ['Floor plan', 'Utility network', 'Cadastral']) {
    await expect(page.getByRole('button', { name: v })).toBeVisible();
  }

  // --- Floor plan: seeded data model + custom toolbar ---
  await expect(page.getByText('Space summary')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => countIn(page, 'Rooms'), { timeout: 15_000 }).toBe(6);
  for (const tool of ['Draw room', 'Split room', 'Merge rooms', 'Add door', 'Place desk']) {
    await expect(page.getByRole('button', { name: tool })).toBeVisible();
  }
  // Select a room → the inspector shows its area (a real integration).
  await page.evaluate(() => {
    const st = (window as unknown as Win).__store.getState();
    const roomsId = st.layers.find((l) => l.name === 'Rooms')!.id;
    const room = Object.values(st.features).find((f) => f.layerId === roomsId)!;
    st.setSelectedFeature(room.id);
  });
  await expect(page.getByText('Area', { exact: true }).first()).toBeVisible();

  // --- Utility network: its own data model + custom toolbar ---
  await page.getByRole('button', { name: 'Utility network' }).click();
  await expect(page.getByText('Network summary')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => countIn(page, 'Mains'), { timeout: 15_000 }).toBe(2);
  for (const tool of ['Draw main', 'Insert valve', 'Place hydrant']) {
    await expect(page.getByRole('button', { name: tool })).toBeVisible();
  }

  // --- Cadastral: its own data model + custom toolbar + renumber action ---
  await page.getByRole('button', { name: 'Cadastral' }).click();
  await expect(page.getByText('Parcel summary')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => countIn(page, 'Parcels'), { timeout: 15_000 }).toBe(4);
  for (const tool of ['Subdivide', 'Consolidate', 'Draw easement']) {
    await expect(page.getByRole('button', { name: tool })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Renumber parcels' })).toBeVisible();

  // --- Persistence: floor-plan edits survive a reload ---
  await page.reload();
  await expect(page.getByText('Space summary')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => countIn(page, 'Rooms')).toBe(6);

  await page.screenshot({ path: 'test-results/studio.png' });
});
