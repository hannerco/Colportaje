// HU-PAN-DIN-03 · Lista de Abibonos, de punta a punta en móvil y escritorio.
import { expect, test } from '@playwright/test';

test('el segmento lleva de Abonos de clientes a Abibonos y de vuelta', async ({ page }) => {
  await page.goto('/dinero');
  const sections = page.getByRole('tablist', { name: 'Vistas de Dinero' });
  await sections.getByRole('tab', { name: /^Abibonos/ }).click();
  await expect(page).toHaveURL(/\/dinero\/abibonos$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Dinero' })).toBeVisible();
  await expect(sections.getByRole('tab', { name: /^Abibonos/ })).toHaveAttribute('aria-selected', 'true');

  await sections.getByRole('tab', { name: /^Abonos de clientes/ }).click();
  await expect(page).toHaveURL(/\/dinero$/);
});

test('CA-3: sin Abibonos se ve el estado vacío con «Entregar al líder»', async ({ page }) => {
  await page.goto('/dinero/abibonos');
  await expect(page.getByText('Aún no tienes Abibonos')).toBeVisible();
  await expect(page.getByText('Aparecen aquí cuando entregas dinero con Nuevo Abibono.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entregar al líder' }).first()).toBeVisible();
});
