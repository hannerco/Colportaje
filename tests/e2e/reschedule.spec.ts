// HU-PAN-CLI-05 · Prórroga desde la ficha, de punta a punta (TESTING.md, flujo 4, parte de prórroga).
import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

/** El diálogo de arriba (la prórroga abre su confirmación encima). */
const topDialog = (page: Page) => page.getByRole('alertdialog').last();

/** Elige en el calendario abierto un día movido con el teclado desde el elegido, y guarda. */
const pickWithKeys = async (page: Page, keys: string[]) => {
  const dialog = topDialog(page);
  await dialog.locator('[role="grid"] button[aria-pressed="true"]').focus();
  for (const key of keys) await page.keyboard.press(key);
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: 'Guardar fecha' }).click();
};

test('flujo 4 (prórroga): dar más plazo a un abono deja la fecha original tachada; a más de 2 meses pide confirmar', async ({
  page,
}, testInfo) => {
  await page.goto(`/clientes?q=${encodeURIComponent(`Prórroga ${testInfo.project.name}`)}`);
  await page
    .getByRole(isMobile(page) ? 'list' : 'table', { name: 'Clientes' })
    .getByRole('link', { name: new RegExp(`Prórroga ${testInfo.project.name}`) })
    .click();

  const dates = page.getByRole('button', { name: /^Cambiar fecha, / });
  await expect(dates).toHaveCount(2);
  const first = (await dates.first().textContent())!;

  // Dos días más tarde: solo ese abono se mueve (I-08) y la fecha original queda tachada.
  await dates.first().click();
  await expect(topDialog(page)).toContainText('Abono 1 de 2');
  await pickWithKeys(page, ['ArrowRight', 'ArrowRight']);
  await expect(page.locator('s', { hasText: `antes ${first}` })).toBeVisible();

  // CA-2: a más de 2 meses desde hoy, pide confirmación antes de guardar.
  const second = (await dates.nth(1).textContent())!;
  await dates.nth(1).click();
  await pickWithKeys(page, ['PageDown', 'PageDown', 'PageDown']);
  await expect(topDialog(page)).toContainText('¿Dar tanto plazo?');
  await topDialog(page).getByRole('button', { name: 'Sí, dar el plazo' }).click();
  await expect(page.locator('s', { hasText: `antes ${second}` })).toBeVisible();
});
