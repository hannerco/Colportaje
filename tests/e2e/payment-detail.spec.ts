// HU-PAN-DIN-02 · Detalle de un abono: cobrar (con Deshacer), cobro parcial y deslizar en móvil.
import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

/** Abre el primer abono por cobrar del cliente con plan de este proyecto (los de «Prórroga …»). */
const openFirstPayment = async (page: Page, project: string) => {
  await page.goto('/dinero?vista=por-cobrar');
  await page
    .getByRole('link', { name: new RegExp(`Prórroga ${project}`) })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dinero(\/abonos\/|\?(.*&)?abono=)/);
};

test('CA-1 y CA-3: abrir un abono por cobrar, cobrarlo con los valores por defecto y «Deshacer» lo devuelve a por cobrar', async ({
  page,
}, testInfo) => {
  await openFirstPayment(page, testInfo.project.name);
  await expect(page.getByText(/Faltan \d+ días?|Vence hoy/)).toBeVisible();
  await page.getByRole('button', { name: 'Cobrar', exact: true }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText(`Cobrar · Prórroga ${testInfo.project.name}`);
  await expect(dialog.getByRole('radio', { name: 'Transferencia' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Cobrar', exact: true }).click();

  await expect(page.getByText('Abono cobrado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cobrar', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer' }).click();

  await expect(page.getByText('Cobro deshecho')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cobrar', exact: true })).toBeVisible();
});

test('CA-2: un valor menor avisa del cobro parcial con lo que falta, antes de confirmar', async ({
  page,
}, testInfo) => {
  await openFirstPayment(page, testInfo.project.name);
  await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  const amount = dialog.getByRole('textbox', { name: 'Valor real' });
  await amount.fill('20000');
  await expect(dialog).toContainText('faltan $17.500');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('button', { name: 'Cobrar', exact: true })).toBeVisible();
});

test('CA-5: en móvil, «Cobrar» de la fila de la lista lleva al mismo formulario', async ({
  page,
}, testInfo) => {
  test.skip(!isMobile(page), 'Deslizar es de móvil.');
  await page.goto('/dinero?vista=por-cobrar');
  await page
    .getByRole('button', { name: `Cobrar a Prórroga ${testInfo.project.name}` })
    .first()
    .dispatchEvent('click');
  await expect(page).toHaveURL(/accion=cobrar/);
  await expect(page.getByRole('alertdialog')).toContainText('Cobrar · ');
});

test('propuesta 12: «⋯» de un abono cobrado corrige el medio de pago (queda en el historial) y elimina el cobro', async ({
  page,
}, testInfo) => {
  await openFirstPayment(page, testInfo.project.name);
  await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cobrar', exact: true }).click();
  await expect(page.getByText('Abono cobrado')).toBeVisible();

  // Corregir: de Transferencia (por defecto) a Efectivo.
  await page.getByRole('button', { name: 'Opciones del cobro' }).click();
  await page.getByRole('menuitem', { name: 'Corregir' }).click();
  const correct = page.getByRole('alertdialog', { name: 'Corregir cobro' });
  await correct.getByRole('radio', { name: 'Efectivo' }).click();
  await expect(correct).toContainText('Antes: Transferencia');
  await correct.getByRole('button', { name: 'Guardar corrección' }).click();
  await expect(page.getByText('Cobro corregido', { exact: true })).toBeVisible();
  await expect(page.getByText('Cobro corregido: Transferencia → Efectivo')).toBeVisible();

  // Eliminar el cobro: vuelve a «Por cobrar».
  await page.getByRole('button', { name: 'Opciones del cobro' }).click();
  await page.getByRole('menuitem', { name: 'Eliminar cobro' }).click();
  await page
    .getByRole('alertdialog', { name: '¿Eliminar el cobro?' })
    .getByRole('button', { name: 'Eliminar cobro' })
    .click();
  await expect(page.getByText('Cobro eliminado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cobrar', exact: true })).toBeVisible();
});
