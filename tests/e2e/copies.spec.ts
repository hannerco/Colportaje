// HU-PAN-INV-02 · Lista de ejemplares, de punta a punta en móvil y escritorio.
import { expect, test, type Page } from '@playwright/test';

const list = (page: Page) =>
  page.getByRole(page.viewportSize()!.width < 768 ? 'list' : 'table', { name: 'Vistas de ejemplares' });

test('la lista muestra los ejemplares con su estado y tocar uno abre el Ejemplar', async ({ page }) => {
  await page.goto('/inventario/ejemplares');
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Todos/ })).toBeVisible();
  const first = list(page).getByRole('link').first();
  await expect(first).toBeVisible();
  await expect(list(page)).toContainText('Salud y bienestar en familia');
  await first.click();
  await expect(page).toHaveURL(/\/inventario\/ejemplares(\/[0-9a-f-]+$|\?(.*&)?ejemplar=[0-9a-f-]+)/);
});

test('CA-1: buscar un número trae solo ese ejemplar y la vista queda en la URL', async ({ page }) => {
  await page.goto('/inventario/ejemplares');
  await expect(list(page).getByRole('link').first()).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar ejemplar' }).fill('#7');
  await expect(page).toHaveURL(/[?&]q=%237/);
  await expect(list(page)).toContainText('#7');
  await expect(list(page)).not.toContainText('#6');
  await expect(list(page).getByRole('link')).toHaveCount(1);
});

test('las pestañas filtran: Vendidos muestra a quién se vendió', async ({ page }) => {
  await page.goto('/inventario/ejemplares');
  await page.getByRole('tab', { name: /^Vendidos/ }).click();
  await expect(page).toHaveURL(/vista=vendidos/);
  await expect(list(page)).toContainText('Prórroga');
});

test('sin conexión la lista se consulta', async ({ page, context }) => {
  await page.goto('/inventario/ejemplares');
  await expect(list(page).getByRole('link').first()).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.getByRole('searchbox', { name: 'Buscar ejemplar' }).fill('#7');
  await expect(list(page)).toContainText('#7');
  await context.setOffline(false);
});
