// HU-PAN-DIN-04 · Abibono completo (TESTING.md, flujo 5): precargado, borrador, borrar y marcar como entregado.
import { expect, test, type Page } from '@playwright/test';
import { E2E_DEPOSIT_CASH, E2E_DEPOSIT_TRANSFER } from './support/global-setup';

/** Una imagen PNG de 1×1 para el recibo. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const isMobile = (page: Page) => page.viewportSize()!.width < 768;
/** El valor de un campo de dinero («110.000») como número. */
const amountOf = async (page: Page, name: string) =>
  Number((await page.getByRole('textbox', { name }).inputValue()).replace(/\D/g, ''));

test('flujo 5: se precarga con lo cobrado, se guarda y borra un borrador, y con el recibo se marca como entregado', async ({
  page,
}) => {
  test.skip(isMobile(page), 'Un solo proyecto entrega: el Abibono toma todo lo cobrado.');

  // CA-1: precargado con el efectivo y la transferencia cobrados, diferencia $0.
  await page.goto('/dinero/abibonos/nuevo');
  await expect(page.getByRole('heading', { name: 'Nuevo Abibono' })).toBeVisible();
  // (Otras pruebas pueden dejar abonos cobrados libres: el precargado suma al menos los de este cliente.)
  await expect(page.getByRole('checkbox', { name: 'Abibono E2E' }).first()).toBeChecked();
  expect(await amountOf(page, 'Efectivo')).toBeGreaterThanOrEqual(E2E_DEPOSIT_CASH);
  expect(await amountOf(page, 'Transferencia')).toBeGreaterThanOrEqual(E2E_DEPOSIT_TRANSFER);
  // CA-3: sin recibo no se puede marcar como entregado y lo explica.
  await expect(page.getByRole('button', { name: 'Marcar como entregado' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(page.getByText('Falta el recibo')).toBeVisible();

  // Un borrador se guarda y aparece en la lista.
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page).toHaveURL(/\/dinero\/abibonos$/);
  await expect(page.getByText('Borrador guardado')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Abibonos' }).getByText('Borrador')).toBeVisible();

  // CA-4: abrirlo, borrarlo con confirmación y sus abonos quedan libres otra vez.
  await page.getByRole('table', { name: 'Abibonos' }).getByRole('link').first().click();
  await page.getByRole('button', { name: 'Más acciones' }).click();
  await page.getByRole('menuitem', { name: 'Borrar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar' }).click();
  await expect(page).toHaveURL(/\/dinero\/abibonos$/);
  await expect(page.getByText('Aún no tienes Abibonos')).toBeVisible();

  // CA-5: con el recibo, «Marcar como entregado» lo deja Entregado.
  // Desde «Entregar al líder» (sin recargar: la lectura ya se actualizó al borrar el borrador).
  await page.getByRole('button', { name: 'Entregar al líder' }).first().click();
  await expect(page).toHaveURL(/\/dinero\/abibonos\/nuevo$/);
  await expect(page.getByRole('checkbox', { name: 'Abibono E2E' }).first()).toBeChecked();
  await page
    .getByTestId('receipt-input')
    .setInputFiles({ name: 'recibo.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('img', { name: 'Foto del recibo 1' })).toBeVisible();
  const confirm = page.getByRole('button', { name: 'Marcar como entregado' });
  await expect(confirm).not.toHaveAttribute('aria-disabled', 'true');
  await confirm.click();

  await expect(page).toHaveURL(/\/dinero\/abibonos$/);
  await expect(page.getByText('Abibono entregado')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Abibonos' }).getByText('Entregado')).toBeVisible();
});
