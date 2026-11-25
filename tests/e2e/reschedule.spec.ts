// Ronda 38 · Abonos a mano: aplazar y corregir desde la ficha, de punta a punta (TESTING.md, flujo 4).
import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

/** La ventana de arriba. */
const topDialog = (page: Page) => page.getByRole('alertdialog').last();

/** Elige en el calendario abierto un día movido con el teclado desde el elegido. */
const pickWithKeys = async (page: Page, keys: string[]) => {
  const dialog = topDialog(page);
  await dialog.locator('[role="grid"] button[aria-pressed="true"]').focus();
  for (const key of keys) await page.keyboard.press(key);
  await page.keyboard.press('Enter');
};

const dayMonth = (date: string) => date.slice(0, 5);

test('flujo 4: aplazar deja «Aplazado · antes …»; corregir hacia atrás o a más de 2 meses solo avisa', async ({
  page,
}, testInfo) => {
  await page.goto(`/clientes?q=${encodeURIComponent(`Prórroga ${testInfo.project.name}`)}`);
  await page
    .getByRole(isMobile(page) ? 'list' : 'table', { name: 'Clientes' })
    .getByRole('link', { name: new RegExp(`Prórroga ${testInfo.project.name}`) })
    .click();

  const dates = page.getByRole('button', { name: /^Cambiar la fecha del abono / });
  await expect(dates).toHaveCount(2);
  const first = (await dates.first().textContent())!.trim();

  // El cliente pidió aplazar: dos días más tarde; solo ese abono se mueve y queda «Aplazado · antes …».
  await dates.first().click();
  await expect(topDialog(page)).toContainText('Fecha del abono 1 de 2');
  await topDialog(page)
    .getByRole('radio', { name: /El cliente pidió aplazar/ })
    .click();
  await pickWithKeys(page, ['ArrowRight', 'ArrowRight']);
  await expect(topDialog(page)).toContainText('Lo estás aplazando 2 días');
  await topDialog(page).getByRole('button', { name: 'Aplazar' }).click();
  await expect(page.getByText(`Aplazado · antes ${dayMonth(first)}`)).toBeVisible();

  // Me equivoqué: a más de 2 meses desde hoy solo avisa (ya no pide confirmar) y corrige sin «Aplazado».
  await dates.nth(1).click();
  await pickWithKeys(page, ['PageDown', 'PageDown', 'PageDown']);
  await expect(topDialog(page)).toContainText('Es más de 2 meses desde hoy');
  await topDialog(page).getByRole('button', { name: 'Corregir fecha' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByText('Aplazado · antes')).toHaveCount(1);
});
