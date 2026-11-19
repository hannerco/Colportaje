// HU-PAN-INV-05 · Devolver al líder en lote y deshacer, de punta a punta (móvil y escritorio).
import { expect, test, type Page } from '@playwright/test';

const TITLE = 'Salud y bienestar en familia';
const NOTE = 'Fin de campaña, entregados en la oficina';
const isMobile = (page: Page) => page.viewportSize()!.width < 768;
const copyBoxes = (page: Page) => page.getByRole('checkbox', { name: new RegExp(`^${TITLE} #`) });

test('CA-1 y CA-2: elegir un ejemplar, escribir la nota, devolver y deshacer lo regresa a En físico', async ({
  page,
}) => {
  test.skip(
    isMobile(page),
    'Un solo proyecto devuelve: así no se mezclan los ejemplares de las otras pruebas.',
  );
  await page.goto('/inventario/devolver');
  await expect(page.getByRole('heading', { level: 1, name: 'Devolver al líder' })).toBeVisible();
  await expect(copyBoxes(page).first()).toBeVisible();
  const before = await copyBoxes(page).count();

  await copyBoxes(page).first().check();
  await page.getByLabel('Nota', { exact: true }).fill(NOTE);
  await page.getByRole('button', { name: 'Listo' }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Vas a devolver 1 ejemplar');
  await expect(dialog).toContainText(`${TITLE}(1)`);
  await expect(dialog).toContainText(NOTE);
  await dialog.getByRole('button', { name: 'Devolver 1' }).click();

  await expect(page).toHaveURL(/\/inventario$/);
  await expect(page.getByText('1 ejemplar devuelto')).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer' }).click();

  await page.goto('/inventario/devolver');
  await expect(copyBoxes(page)).toHaveCount(before);
});

test('CA-3: sin ejemplares elegidos, «Listo» (o «Siguiente» en móvil) está deshabilitado', async ({
  page,
}) => {
  await page.goto('/inventario/devolver');
  await expect(copyBoxes(page).first()).toBeVisible();
  const next = page.getByRole('button', { name: isMobile(page) ? 'Siguiente' : 'Listo' });
  await expect(next).toHaveAttribute('aria-disabled', 'true');
  await copyBoxes(page).first().check();
  if (isMobile(page)) await expect(next).not.toHaveAttribute('aria-disabled', 'true');
});

test('móvil: de elegir a la nota y de vuelta, sin devolver nada', async ({ page }) => {
  test.skip(!isMobile(page), 'Los dos pasos son de móvil.');
  await page.goto('/inventario/devolver');
  await copyBoxes(page).first().check();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('progressbar', { name: 'Paso 2 de 2' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listo' })).toHaveAttribute('aria-disabled', 'true');
  await page.getByLabel('Nota', { exact: true }).fill(NOTE);
  await expect(page.getByRole('button', { name: 'Listo' })).not.toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'Atrás' }).click();
  await expect(copyBoxes(page).first()).toBeChecked();
});

test('sin conexión, «Listo» queda deshabilitado', async ({ page, context }) => {
  test.skip(isMobile(page), 'En móvil «Listo» está en el segundo paso; la regla es la misma.');
  await page.goto('/inventario/devolver');
  await copyBoxes(page).first().check();
  await page.getByLabel('Nota', { exact: true }).fill(NOTE);
  await context.setOffline(true);
  await expect(page.getByRole('button', { name: 'Listo' })).toHaveAttribute('aria-disabled', 'true');
  await context.setOffline(false);
});
