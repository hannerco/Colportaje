// HU-PAN-INV-01 · Libros en físico y Por resolver, de punta a punta en móvil y escritorio.
import { expect, test, type Page } from '@playwright/test';
import { e2eFlaggedNote } from './support/global-setup';

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

const TITLE = 'Salud y bienestar en familia';

// CA-2 resuelve y deshace el mismo ejemplar que CA-3 consulta: en orden, no en paralelo.
test.describe.configure({ mode: 'serial' });

test('CA-1: un título muestra sus ejemplares en físico y tocar uno abre el Ejemplar', async ({ page }) => {
  await page.goto('/inventario');
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
  const row = page.getByRole('button', { name: new RegExp(`^${TITLE}.*en físico$`) });
  await expect(row).toBeVisible();

  await row.click();
  const window = page.getByRole('dialog', { name: TITLE });
  await expect(window).toContainText('en físico · $75.000');
  const copies = window.getByRole('list', { name: 'Ejemplares' }).getByRole('link');
  expect(await copies.count()).toBeGreaterThan(0);
  await copies.first().click();
  await expect(page).toHaveURL(/\/inventario\/ejemplares\/[0-9a-f-]+$/);
});

test('CA-2: marcar un ejemplar con novedad como Apareció lo saca de Por resolver y «Deshacer» lo devuelve', async ({
  page,
}, testInfo) => {
  const note = e2eFlaggedNote(testInfo.project.name);
  await page.goto('/inventario');
  await page.getByRole('button', { name: /por resolver$/ }).click();
  const item = page.getByRole('listitem').filter({ hasText: note });
  await expect(item).toBeVisible();

  // Sin deslizar (en móvil la acción está detrás de la fila): con el foco la fila se abre y Enter la activa.
  await item.getByRole('button', { name: /^Apareció: / }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/está de nuevo en físico/)).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: note })).toHaveCount(0);

  await page.getByRole('status').getByRole('button', { name: 'Deshacer' }).click();
  // Vuelve a Por resolver. En escritorio la ventana se cierra al tocar el Aviso: se espera a que termine de cerrarse
  // antes de reabrirla (mirarla en pleno cierre decidía mal según el momento).
  if (!isMobile(page)) {
    await expect(page.getByRole('list', { name: 'Por resolver' })).toBeHidden();
    await page.getByRole('button', { name: /por resolver$/ }).click();
  } else if (!(await page.getByRole('list', { name: 'Por resolver' }).isVisible()))
    await page.getByRole('button', { name: /por resolver$/ }).click();
  await expect(page.getByRole('listitem').filter({ hasText: note })).toBeVisible();
});

test('CA-3: sin conexión, Agregar y Resolver están deshabilitados y la lista se consulta', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('/inventario');
  await expect(page.getByRole('button', { name: new RegExp(`^${TITLE}`) })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByRole('status').filter({ hasText: 'Sin conexión' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(`^${TITLE}`) })).toBeVisible();
  const add = page.getByRole('button', { name: /^Agregar/ }).last();
  await expect(add).toHaveAttribute('aria-disabled', 'true');

  await page.getByRole('button', { name: /por resolver$/ }).click();
  const item = page.getByRole('listitem').filter({ hasText: e2eFlaggedNote(testInfo.project.name) });
  await expect(item.getByRole('button', { name: /^Apareció: / })).toHaveAttribute('aria-disabled', 'true');
  await context.setOffline(false);
});
