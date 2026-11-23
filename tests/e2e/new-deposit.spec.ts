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

test.describe.configure({ mode: 'serial' });

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
  // En escritorio se abre en la Ventana de la lista (#29); con la forma Página, en su ruta.
  await expect(page).toHaveURL(/\/dinero\/abibonos(\/nuevo$|\?(.*&)?abibono=nuevo)/);
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

// HU-PAN-DIN-05 · Reabrir un Abibono (TESTING.md, flujo 13): sigue al flujo 5, que deja un Abibono entregado.
test('flujo 13: un Abibono entregado se ve como quedó, se edita su nota, se reabre con motivo y se vuelve a entregar', async ({
  page,
}) => {
  test.skip(isMobile(page), 'Un solo proyecto entrega: el Abibono toma todo lo cobrado.');

  await page.goto('/dinero/abibonos');
  const table = page.getByRole('table', { name: 'Abibonos' });
  await table.getByRole('row').filter({ hasText: 'Entregado' }).getByRole('link').first().click();
  await expect(page).toHaveURL(/\/dinero\/abibonos(\/[0-9a-f-]{36}$|\?(.*&)?abibono=[0-9a-f-]{36})/);
  const title = page.getByRole('heading', { name: /^Abibono \(\d+\)$/ }).first();
  await expect(title).toBeVisible();
  const name = (await title.textContent())!;

  // CA-1: solo se edita la nota; «Reabrir» va en la barra de abajo (#71).
  await expect(page.getByRole('button', { name: 'Marcar como entregado' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Abibono E2E/ }).first()).toBeVisible();
  const note = page.getByRole('textbox', { name: /Nota/ });
  await note.fill('Nota del E2E');
  await page.getByRole('button', { name: 'Guardar nota' }).click();
  await expect(page.getByText('Nota guardada')).toBeVisible();

  // CA-2: sin motivo no se reabre; con motivo vuelve a borrador y conserva su número.
  await page.getByRole('button', { name: 'Reabrir', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: 'Reabrir' }).click();
  await expect(dialog.getByText('Escribe el motivo.')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Motivo' }).fill('Incluí un abono por error');
  await dialog.getByRole('button', { name: 'Reabrir' }).click();
  await expect(page.getByText('Abibono reabierto')).toBeVisible();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Abibono E2E' }).first()).toBeChecked();

  // Con el recibo que ya tenía, se vuelve a entregar.
  const confirm = page.getByRole('button', { name: 'Marcar como entregado' });
  await expect(confirm).not.toHaveAttribute('aria-disabled', 'true');
  await confirm.click();
  await expect(page).toHaveURL(/\/dinero\/abibonos$/);
  await expect(page.getByText('Abibono entregado')).toBeVisible();
});
