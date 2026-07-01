import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end smoke test of the rooftop-solar demo: the SaaS shell renders, the
 * sample rooftop auto-seeds + auto-lays-out into localStorage, and the planning
 * features work (per-roof auto-layout, setback area, system summary).
 */

type DemoStore = {
  layers: Array<{ id: string; name: string }>;
  features: Record<string, { id: string; layerId: string; metadata: Record<string, string> }>;
  setSelectedFeature: (id: string) => void;
};
type WinWithStore = { __store: { getState: () => DemoStore } };

const countIn = (page: Page, layerName: string) =>
  page.evaluate((name) => {
    const st = (window as unknown as WinWithStore).__store.getState();
    const layer = st.layers.find((l) => l.name === name);
    return Object.values(st.features).filter((f) => f.layerId === layer?.id).length;
  }, layerName);

async function selectRoof(page: Page, roofName: string): Promise<string> {
  return page.evaluate((wanted) => {
    const st = (window as unknown as WinWithStore).__store.getState();
    const roof = Object.values(st.features).find((f) => f.metadata.name === wanted)!;
    st.setSelectedFeature(roof.id);
    return roof.id;
  }, roofName);
}

test('SaaS shell, seeded rooftop, and the solar planning features', async ({ page }) => {
  await page.goto('/');

  // --- Shell + auto-seeded project ---
  await expect(page.getByText('SunPlan')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Array designer' })).toBeVisible({ timeout: 45_000 });
  const sidebar = page.locator('aside').first();
  for (const name of ['Roof Planes', 'PV Modules', 'Obstructions', 'Setback Area']) {
    await expect(sidebar.getByText(name, { exact: true }).first()).toBeVisible();
  }

  // --- Auto-layout ran on seed → panels + non-zero system size ---
  await expect.poll(() => countIn(page, 'PV Modules'), { timeout: 15_000 }).toBeGreaterThan(0);
  await expect(page.getByText('System size')).toBeVisible();

  // --- Roof inspector: per-roof auto-layout ---
  await selectRoof(page, 'South Roof');
  await expect(page.getByText('Roof plane', { exact: true })).toBeVisible();
  await expect(page.getByText('Annual est.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Auto-layout this roof' }).click();
  await expect(page.getByText(/Placed \d+ panels on South Roof/)).toBeVisible({ timeout: 15_000 });

  // --- Setback area generation ---
  await page.getByRole('button', { name: 'Show setback area' }).click();
  await expect.poll(() => countIn(page, 'Setback Area'), { timeout: 15_000 }).toBeGreaterThan(0);

  // --- Re-layout in landscape: modules pick up the new orientation ---
  await page.getByRole('button', { name: 'landscape', exact: true }).click();
  await page.getByRole('button', { name: 'Auto-layout all roofs' }).click();
  const orientation = () =>
    page.evaluate(() => {
      const st = (window as unknown as WinWithStore).__store.getState();
      const layer = st.layers.find((l) => l.name === 'PV Modules');
      const panel = Object.values(st.features).find((f) => f.layerId === layer?.id);
      return panel?.metadata.orientation ?? null;
    });
  await expect.poll(orientation, { timeout: 15_000 }).toBe('landscape');

  // --- Persistence: the design survives a reload (localStorage) ---
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Array designer' })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => countIn(page, 'PV Modules')).toBeGreaterThan(0);

  await page.screenshot({ path: 'test-results/shell.png', fullPage: false });
});
