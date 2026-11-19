// HU-PAN-CLI-03 · Nuevo cliente (ficha viva), de punta a punta en móvil y escritorio (TESTING.md, flujo 3).
// Los libros se agregan con HU-PAN-CLI-04; aquí la ficha nueva lleva nombre, teléfono y cuota inicial.
import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

test('flujo 3: la ficha viva crea el cliente al escribir el nombre y «Guardar cliente» lleva a su ficha', async ({
  page,
}, testInfo) => {
  const name = `Lucía Fernanda Mejía ${testInfo.project.name}`;
  await page.goto('/clientes/nuevo');
  await expect(page.getByRole('heading', { name: 'Nuevo cliente' })).toBeVisible();
  // Vacía: no hay nada que guardar.
  await expect(page.getByRole('button', { name: 'Guardar cliente' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );

  await page.getByLabel('Nombre del cliente').fill(name);
  await page.getByLabel('Teléfono').fill('301 557 9032');
  await page.getByLabel('Valor', { exact: true }).fill('30000');
  await page.getByRole('radio', { name: 'Efectivo' }).click();

  // CA-1: Guardar muestra el resumen y, al confirmar, el Aviso y la ficha del cliente.
  await page.getByRole('button', { name: 'Guardar cliente' }).click();
  const summary = page.getByRole('alertdialog');
  await expect(summary).toContainText('Resumen');
  await summary.getByRole('button', { name: 'Guardar cliente' }).click();
  await expect(page.getByText('Cliente guardado')).toBeVisible();
  await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name }).first()).toBeVisible();
  // Lo escrito quedó guardado: teléfono y la cuota inicial cobrada en efectivo.
  await expect(page.getByText('301 557 9032').first()).toBeVisible();
  await expect(page.getByText('Cuota inicial')).toBeVisible();
  await expect(page.getByText('Efectivo').first()).toBeVisible();
});

test('descartar borra el cliente nuevo y vuelve a Clientes (BR-CUS-14)', async ({ page }, testInfo) => {
  const name = `Descartado ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/clientes/nuevo');
  await page.getByLabel('Nombre del cliente').fill(name);
  // El cliente existe desde que tiene nombre: «Guardar cliente» se habilita.
  await expect(page.getByRole('button', { name: 'Guardar cliente' })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );

  await page.getByRole('button', { name: 'Descartar' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('¿Descartar este cliente?');
  await dialog.getByRole('button', { name: 'Descartar' }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  // Ya no aparece en ninguna lectura (HU-CLI-03 R3).
  await page.goto(`/clientes?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(`Nadie coincide con «${name}»`)).toBeVisible();
});

test('salir por la navegación con un cliente a medias pregunta lo mismo que Descartar', async ({
  page,
}, testInfo) => {
  test.skip(isMobile(page), 'En móvil la ficha nueva va sin la barra de navegación.');
  await page.goto('/clientes/nuevo');
  await page.getByLabel('Nombre del cliente').fill(`A medias ${testInfo.project.name} ${Date.now()}`);
  await expect(page.getByRole('button', { name: 'Guardar cliente' })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inventario' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('¿Descartar este cliente?');
  await dialog.getByRole('button', { name: 'Descartar' }).click();
  await expect(page).toHaveURL(/\/inventario$/);
});
