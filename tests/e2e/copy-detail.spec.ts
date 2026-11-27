// HU-PAN-INV-03 · Detalle de un ejemplar, de punta a punta en móvil y escritorio.
import { expect, test, type Page } from '@playwright/test';

const list = (page: Page) =>
  page.getByRole(page.viewportSize()!.width < 768 ? 'list' : 'table', { name: 'Vistas de ejemplares' });

test('un ejemplar vendido muestra su cliente, el precio y el historial; no se elimina, se quita del cliente (CA-4)', async ({
  page,
}) => {
  await page.goto('/inventario/ejemplares?vista=vendidos');
  await list(page)
    .getByRole('link', { name: /Salud y bienestar en familia/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/inventario\/ejemplares(\/[0-9a-f-]+$|\?(.*&)?ejemplar=[0-9a-f-]+)/);

  await expect(page.getByText(/Vendido a Prórroga/).first()).toBeVisible();
  await expect(page.getByText('Precio acordado').first()).toBeVisible();
  await expect(page.getByText('$75.000').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible();
  // Vendido: no se elimina ni se marca con novedad; solo se puede quitar del cliente (BR-COPY-09).
  await page.getByRole('button', { name: 'Más acciones' }).click();
  await expect(page.getByRole('menuitem', { name: 'Quitar del cliente' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Eliminar' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Marcar con novedad' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  // El cliente lleva a su ficha, en la forma que recuerdan los clientes (2026-11-25): su página en el celular; en
  // escritorio, la lista con la ficha abierta en la Ventana (lateral por defecto).
  await page
    .getByRole('link', { name: /Prórroga/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/clientes(\/[0-9a-f-]+$|\?(.*&)?cliente=[0-9a-f-]+)/);
});

test('CA-2: eliminar un ejemplar en físico con nota y «Deshacer» lo devuelve', async ({ page }, testInfo) => {
  await page.goto('/inventario/ejemplares?vista=en-fisico');
  const rows = list(page).getByRole('link', { name: /Salud y bienestar en familia/ });
  const before = await rows.count();
  // Cada proyecto toma uno distinto: corren a la vez contra la misma base.
  await (testInfo.project.name === 'mobile' ? rows.first() : rows.last()).click();
  await expect(page).toHaveURL(/\/inventario\/ejemplares(\/[0-9a-f-]+$|\?(.*&)?ejemplar=[0-9a-f-]+)/);

  await page.getByRole('button', { name: 'Más acciones' }).click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Eliminar Salud y bienestar en familia');
  await dialog.getByLabel('Nota').fill('Lo registré dos veces');
  await dialog.getByRole('button', { name: 'Eliminar' }).click();

  await expect(page).toHaveURL(/\/inventario\/ejemplares(\?.*)?$/);
  await expect(page.getByText(/se eliminó/)).toBeVisible();
  await page.getByRole('status').getByRole('button', { name: 'Deshacer' }).click();

  await page.goto('/inventario/ejemplares?vista=en-fisico');
  // Otro proyecto puede agregar ejemplares a la vez: vuelve al menos lo que había.
  await expect
    .poll(() =>
      list(page)
        .getByRole('link', { name: /Salud y bienestar en familia/ })
        .count(),
    )
    .toBeGreaterThanOrEqual(before);
});
