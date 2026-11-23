// HU-PAN-CLI-03 · Nuevo cliente, de punta a punta en móvil y escritorio (TESTING.md, flujo 3). Ronda 35 (#57): el
// cliente solo existe al guardarlo.
// Los libros se agregan con HU-PAN-CLI-04; aquí la ficha nueva lleva nombre, teléfono y cuota inicial.
import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

test('flujo 3: «Guardar cliente» guarda todo de una vez y lleva a su ficha', async ({ page }, testInfo) => {
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

test('#57: salir sin guardar no deja nada y vuelve a Clientes', async ({ page }, testInfo) => {
  const name = `Descartado ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/clientes/nuevo');
  await page.getByLabel('Nombre del cliente').fill(name);
  // Con nombre ya se puede guardar, pero el cliente aún no existe.
  await expect(page.getByRole('button', { name: 'Guardar cliente' })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );

  await page.getByRole('button', { name: 'Descartar' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('¿Salir sin guardar?');
  await dialog.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  // Nunca existió: no aparece en ninguna lectura.
  await page.goto(`/clientes?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(`Nadie coincide con «${name}»`)).toBeVisible();
});

test('#57: salir por la navegación con un cliente a medias pregunta antes', async ({ page }, testInfo) => {
  test.skip(isMobile(page), 'En móvil la ficha nueva va sin la barra de navegación.');
  await page.goto('/clientes/nuevo');
  await page.getByLabel('Nombre del cliente').fill(`A medias ${testInfo.project.name} ${Date.now()}`);
  await expect(page.getByRole('button', { name: 'Guardar cliente' })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Inventario', exact: true })
    .click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('¿Salir sin guardar?');
  await dialog.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/inventario$/);
});
