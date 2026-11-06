import { expect, test, type Page } from '@playwright/test';
import type { Geoman } from '@geoman-io/maplibre-geoman-pro';

type InstrumentedWindow = Window & {
  __gm: Geoman;
  __transitionWaiting?: boolean;
  __releaseTransition?: () => void;
};

test.use({ viewport: { width: 1440, height: 900 } });
test.setTimeout(90_000);

async function saved(page: Page) {
  return page.evaluate(async () => (await fetch('/api/features').then((r) => r.json())).features);
}

async function openEditor(page: Page) {
  await page.goto('/');
  await page.getByLabel('Email').fill(`history-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Layers', exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('New layer name').fill('History');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('History fill')).toBeVisible();
}

async function drawPolygon(page: Page) {
  await page.getByRole('button', { name: 'Polygon', exact: true }).click();
  await page.waitForTimeout(250);
  for (const [x, y] of [[350, 350], [600, 350], [600, 550], [350, 550]]) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(200);
  }
  await page.mouse.click(350, 350);
}

test('drawing, undo and redo keep the map and saved data in sync', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openEditor(page);
  await drawPolygon(page);
  await expect.poll(async () => (await saved(page)).length).toBe(1);
  const original = (await saved(page))[0];
  console.log('draw persisted', original.id);
  await page.getByRole('button', { name: 'Undo (⌘Z)', exact: true }).click();
  await expect.poll(async () => (await saved(page)).length).toBe(0);
  console.log('undo persisted');
  await page.getByRole('button', { name: 'Redo (⇧⌘Z)', exact: true }).click();
  await expect.poll(async () => (await saved(page)).length).toBe(1);
  expect((await saved(page))[0].geojson.geometry).toEqual(original.geojson.geometry);
  console.log('redo persisted');
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  await page.mouse.click(450, 450);
  await expect(page.getByRole('button', { name: 'Buffer', exact: true })).toBeVisible();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect.poll(async () => (await saved(page)).length).toBe(2);
  console.log('paste persisted');
  await page.getByRole('button', { name: 'Undo (⌘Z)', exact: true }).click();
  await expect.poll(async () => (await saved(page)).length).toBe(1);
  expect((await saved(page))[0].id).toBe(original.id);
  console.log('undo paste persisted');
  await page.locator('canvas.maplibregl-canvas').focus();
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(async () => (await saved(page)).length).toBe(2);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await saved(page)).length).toBe(1);
  console.log('keyboard redo/undo paste persisted');

  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await page.waitForTimeout(250);
  await page.mouse.move(450, 450);
  await page.mouse.down();
  await page.mouse.move(510, 490, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => JSON.stringify((await saved(page))[0].geojson.geometry)).not.toBe(JSON.stringify(original.geojson.geometry));
  console.log('drag persisted');
  await page.getByRole('button', { name: 'Undo (⌘Z)', exact: true }).click();
  await expect.poll(async () => (await saved(page))[0].geojson.geometry).toEqual(original.geojson.geometry);
  console.log('undo drag persisted');
  for (const mode of ['Scale', 'Rotate', 'Edit vertices']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.waitForTimeout(300);
    await page.mouse.move(350, 350);
    await page.mouse.down();
    await page.mouse.move(310, 320, { steps: 12 });
    await page.mouse.up();
    await expect.poll(async () => JSON.stringify((await saved(page))[0].geojson.geometry)).not.toBe(JSON.stringify(original.geojson.geometry));
    console.log(`${mode} persisted`);
    await page.getByRole('button', { name: 'Undo (⌘Z)', exact: true }).click();
    await expect.poll(async () => (await saved(page))[0].geojson.geometry).toEqual(original.geojson.geometry);
    console.log(`undo ${mode} persisted`);
  }
  await page.getByLabel('New layer name').fill('Roads');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('Roads fill')).toBeVisible();
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await page.waitForTimeout(250);
  await page.mouse.click(700, 600);
  await page.waitForTimeout(200);
  await page.mouse.click(900, 650);
  await page.waitForTimeout(200);
  await page.mouse.click(900, 650);
  await expect.poll(async () => (await saved(page)).length).toBe(2);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('button', { name: 'History editing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo (⌘Z)', exact: true }).click();
  await expect.poll(async () => (await saved(page)).length).toBe(1);
  expect((await saved(page))[0].id).toBe(original.id);
  console.log('undo on inactive layer persisted');
  await page.getByRole('button', { name: 'Redo (⇧⌘Z)', exact: true }).click();
  await expect.poll(async () => (await saved(page)).length).toBe(2);
  const rows = await saved(page);
  expect(rows.find((row: { id: string }) => row.id === original.id).layerId).toBe(original.layerId);
  expect(rows.find((row: { id: string }) => row.id !== original.id).layerId).not.toBe(original.layerId);
  console.log('redo preserves original layer');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Layers', exact: true })).toBeVisible();
  expect(await saved(page)).toHaveLength(2);
  expect((await saved(page)).find((row: { id: string }) => row.id === original.id).geojson.geometry).toEqual(original.geojson.geometry);
  console.log('reload preserves undone geometry and layer membership');
  expect(errors).toEqual([]);
});

test('undo before a create saves does not resurrect the feature', async ({ page }) => {
  await openEditor(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let started!: () => void;
  const requestStarted = new Promise<void>((resolve) => { started = resolve; });
  await page.route('**/api/features', async (route) => {
    if (route.request().method() === 'POST') {
      started();
      await held;
    }
    await route.continue();
  });
  try {
    await drawPolygon(page);
    await requestStarted;
    await page.getByRole('button', { name: 'Undo (⌘Z)', exact: true }).click();
    const deleted = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/api/features/'));
    release();
    expect((await deleted).status()).toBe(200);
    await expect.poll(async () => (await saved(page)).length).toBe(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Layers', exact: true })).toBeVisible();
    expect(await saved(page)).toHaveLength(0);
    console.log('delayed create + immediate undo stays deleted after reload');
  } finally {
    release();
  }
});

test('rapid undo writes stay ordered under a delayed network response', async ({ page }) => {
  await openEditor(page);
  await drawPolygon(page);
  await expect.poll(async () => (await saved(page)).length).toBe(1);
  const original = (await saved(page))[0].geojson.geometry;
  for (const [x, y] of [[450, 450], [510, 490]]) {
    const before = (await saved(page))[0].geojson.geometry;
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    await page.waitForTimeout(250);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y + 40, { steps: 12 });
    await page.mouse.up();
    await expect.poll(async () => JSON.stringify((await saved(page))[0].geojson.geometry)).not.toBe(JSON.stringify(before));
    await page.keyboard.press('Escape');
  }
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let started!: () => void;
  const requestStarted = new Promise<void>((resolve) => { started = resolve; });
  let patches = 0;
  await page.route('**/api/features/*', async (route) => {
    if (route.request().method() === 'PATCH' && ++patches === 1) {
      started();
      await held;
    }
    await route.continue();
  });
  try {
    await page.locator('canvas.maplibregl-canvas').focus();
    await page.keyboard.press('Control+z');
    await requestStarted;
    await page.keyboard.press('Control+z');
    // Wait for the second map replay, without releasing the first write.
    await expect.poll(() => page.evaluate(() => {
      const gm = (window as unknown as InstrumentedWindow).__gm;
      return [...gm.features.featureStore.values()][0]?.getGeoJson().geometry;
    })).toEqual(original);
    expect(patches).toBe(1);
    release();
    await expect.poll(() => patches).toBe(2);
    await expect.poll(async () => (await saved(page))[0].geojson.geometry).toEqual(original);
    console.log('rapid undos persist in order despite delayed first PATCH');
  } finally {
    release();
  }
});

test('paste and engine Delete cannot mutate during a layer transition', async ({ page }) => {
  await openEditor(page);
  await drawPolygon(page);
  await expect.poll(async () => (await saved(page)).length).toBe(1);
  await page.getByLabel('New layer name').fill('Roads');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Roads editing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('button', { name: 'History editing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  await page.mouse.click(450, 450);
  await page.keyboard.press('Control+c');
  await page.evaluate(() => {
    const w = window as unknown as InstrumentedWindow;
    const api = w.__gm.dataLayers;
    const original = api.setEditable.bind(api);
    const held = new Promise<void>((resolve) => { w.__releaseTransition = resolve; });
    api.setEditable = async (id, editable) => {
      api.setEditable = original;
      w.__transitionWaiting = true;
      await held;
      return original(id, editable);
    };
  });
  try {
    await page.getByRole('button', { name: 'Roads', exact: true }).click();
    await expect.poll(() => page.evaluate(() =>
      (window as unknown as InstrumentedWindow).__transitionWaiting,
    )).toBe(true);
    await page.locator('canvas.maplibregl-canvas').focus();
    await page.keyboard.press('Control+v');
    await page.keyboard.press('Delete');
  } finally {
    await page.evaluate(() => (window as unknown as InstrumentedWindow).__releaseTransition?.());
  }
  await expect(page.getByRole('button', { name: 'Roads editing', exact: true })).toBeVisible();
  expect(await saved(page)).toHaveLength(1);
  await page.getByRole('button', { name: 'Undo (⌘Z)', exact: true }).click();
  await expect.poll(async () => (await saved(page)).length).toBe(0);
  console.log('layer transition blocks mutations without consuming history');
});
