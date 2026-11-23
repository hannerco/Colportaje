// HU-PAN-CLI-04 · Agregar libro, ajustar su precio y quitarlo, de punta a punta en móvil y escritorio.
import { expect, test } from '@playwright/test';

test('agregar un libro en la ficha nueva, ajustar su precio y quitarlo (CA-1, CA-2, HU-CLI-09 R4)', async ({
  page,
}, testInfo) => {
  await page.goto('/clientes/nuevo');
  await page.getByLabel('Nombre del cliente').fill(`Con libro ${testInfo.project.name} ${Date.now()}`);
  const add = page.getByRole('button', { name: 'Agregar libro del inventario' });
  await expect(add).toBeVisible();
  await add.click();

  // CA-1: buscar por título deja ver los ejemplares en físico con número y precio.
  const sheet = page.getByRole('dialog', { name: 'Ejemplares en físico' });
  await sheet.getByRole('searchbox', { name: 'Buscar libro o número' }).fill('salud');
  const selectButtons = sheet.getByRole('button', {
    name: /^Seleccionar Salud y bienestar en familia #\d+$/,
  });
  await expect(selectButtons.first()).toBeVisible();
  await expect(sheet).toContainText('$75.000');

  // Tocar uno lo elige (#57: se vende al guardar el cliente); se ajusta su precio (CA-2).
  await selectButtons.first().click();
  await expect(sheet).toContainText('Elegido para este cliente');
  const price = sheet.getByLabel('Precio acordado');
  await price.fill('70000');
  await expect(sheet).toContainText('antes $75.000');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);

  // De vuelta en la ficha: el libro con $70.000 y el público tachado, y la deuda lo incluye.
  const books = page.getByRole('region', { name: 'Libros vendidos' });
  await expect(books).toContainText('Salud y bienestar en familia');
  await expect(books).toContainText('$70.000');
  await expect(books.locator('s')).toHaveText('antes $75.000');

  // Quitar antes de guardar: no deja nada en el historial (#57).
  await books.getByRole('button', { name: /^Quitar Salud y bienestar en familia #\d+$/ }).click();
  await expect(books).not.toContainText('Salud y bienestar en familia');

  // Salir sin guardar: el cliente nunca existió.
  await page.getByRole('button', { name: 'Descartar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/clientes$/);
});
