import { expect, test } from '@playwright/test';

// Drives the real UI: dev sign-in, then the custom layer controls.
test('dev sign-in, create / hide / delete a layer', async ({ page }) => {
  await page.goto('/');

  // Sign-in panel is shown when signed out.
  await expect(page.getByText('Geoman GIS')).toBeVisible();

  // Dev email/password sign-up.
  const email = `e2e-ui-${Date.now()}@example.com`;
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign up' }).click();

  // Editor chrome appears once hydrated.
  await expect(page.getByRole('heading', { name: 'Layers' })).toBeVisible({
    timeout: 15_000,
  });

  // Create a layer.
  await page.getByLabel('New layer name').fill('Parcels');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('Parcels fill')).toBeVisible();

  // Hide it (eye toggle), then it can be shown again.
  await page.getByRole('button', { name: 'Hide layer' }).first().click();
  await expect(page.getByRole('button', { name: 'Show layer' })).toBeVisible();

  // Delete it.
  await page.getByRole('button', { name: 'Delete Parcels' }).click();
  await expect(page.getByLabel('Parcels fill')).toHaveCount(0);

  // Toolbar (custom controls) is present.
  await expect(page.getByRole('button', { name: 'Polygon' })).toBeVisible();
});

test('multiple layers with active switching + fill/border swatches', async ({ page }) => {
  await page.goto('/');
  const email = `e2e-layers-${Date.now()}@example.com`;
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('heading', { name: 'Layers' })).toBeVisible({ timeout: 15_000 });

  await page.getByLabel('New layer name').fill('Houses');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('Houses fill')).toBeVisible();

  await page.getByLabel('New layer name').fill('Roads');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('Roads fill')).toBeVisible();

  // Exactly one active ("editing") layer; newest is active.
  await expect(page.getByText('editing')).toHaveCount(1);

  // Each layer exposes both a fill and a border swatch.
  await expect(page.getByLabel('Houses fill')).toBeVisible();
  await expect(page.getByLabel('Houses border')).toBeVisible();
  await expect(page.getByLabel('Roads border')).toBeVisible();

  // Switching active layer keeps exactly one editing layer.
  await page.getByRole('button', { name: 'Houses', exact: true }).click();
  await expect(page.getByText('editing')).toHaveCount(1);
});
