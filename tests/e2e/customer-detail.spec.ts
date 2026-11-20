// HU-PAN-CLI-02 · Ficha de cliente, de punta a punta en móvil y escritorio (TESTING.md, flujo 14: archivar y restaurar).
import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

/** Abre la ficha de «Rubén Darío Vélez» desde la búsqueda de la lista. */
const openRuben = async (page: Page) => {
  await page.goto('/clientes?q=ruben');
  await page
    .getByRole(isMobile(page) ? 'list' : 'table', { name: 'Clientes' })
    .getByRole('link', { name: /Rubén Darío Vélez/ })
    .click();
  if (isMobile(page)) await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+$/);
  else await expect(page).toHaveURL(/[?&]cliente=/);
};

test('flujo 14: archivar y restaurar desde la ficha', async ({ page }) => {
  await openRuben(page);
  // Contacto (CA-2 / I-22).
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
    'href',
    'https://wa.me/573001112233',
  );
  // Un prospecto sin abonos no tiene Pastilla ni franja (BR-PAY-14: «Aún no tiene libro» solo si tiene abonos).
  await expect(page.getByText('Saldo pendiente', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Aún no tiene libro')).toHaveCount(0);

  // CA-4: Archivar pide confirmación y dice qué se cancelará.
  await page.getByRole('button', { name: 'Más acciones' }).click();
  await page.getByRole('menuitem', { name: 'Archivar' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('¿Archivar el cliente?');
  await dialog.getByRole('button', { name: 'Archivar' }).click();
  await expect(page.getByText('Cliente archivado').first()).toBeVisible();
  const restore = page.getByRole('button', { name: 'Restaurar' }).first();
  await expect(restore).toBeVisible();

  // Restaurar lo devuelve a las listas.
  await restore.click();
  await expect(page.getByText('Cliente restaurado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restaurar' })).toHaveCount(0);
});

test('CA-3: con la forma «Página» recordada, otro cliente se abre como página «Clientes / nombre»', async ({
  page,
}) => {
  test.skip(isMobile(page), 'Las formas de la ventana son de escritorio.');
  await page.goto('/clientes');
  await page.evaluate(() => window.localStorage.setItem('colportor.detail-window-mode', 'page'));
  await openRubenAsPage(page);
  const crumbs = page.getByRole('navigation', { name: /ruta|Ruta/ });
  await expect(crumbs).toContainText('Clientes');
  await expect(crumbs).toContainText('Rubén Darío Vélez');
});

async function openRubenAsPage(page: Page) {
  await page.goto('/clientes?q=ruben');
  await page
    .getByRole('table', { name: 'Clientes' })
    .getByRole('link', { name: /Rubén Darío Vélez/ })
    .click();
  await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+$/);
}
