import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });
test.setTimeout(90_000);

async function saved(page: Page) {
  return page.evaluate(async () => (await fetch('/api/features').then((r) => r.json())).features);
}

test('drawing, undo and redo keep the map and saved data in sync', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('Email').fill(`history-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Layers', exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('New layer name').fill('History');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('History fill')).toBeVisible();
  await page.getByRole('button', { name: 'Polygon', exact: true }).click();
  await page.waitForTimeout(250);
  for (const [x, y] of [[350, 350], [600, 350], [600, 550], [350, 550]]) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(200);
  }
  await page.mouse.click(350, 350);
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
