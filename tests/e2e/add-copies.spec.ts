// HU-PAN-INV-04 · Agregar al inventario, de punta a punta en móvil y escritorio.
import { expect, test, type Page } from '@playwright/test';

const TITLE = 'Salud y bienestar en familia';
const isMobile = (page: Page) => page.viewportSize()!.width < 768;
const addOne = (page: Page) =>
  page.getByRole('button', { name: new RegExp(`^Agregar un ejemplar de ${TITLE}`) });

test('CA-1 y CA-2: tocar un título suma, el resumen lo cuenta y «Agregar N» crea el lote y vuelve a Inventario', async ({
  page,
}) => {
  test.skip(isMobile(page), 'Un solo proyecto agrega: así no se mezclan los conteos de las otras pruebas.');
  await page.goto('/inventario/agregar');
  await expect(page.getByRole('heading', { level: 1, name: 'Agregar al inventario' })).toBeVisible();
  await addOne(page).click();
  await addOne(page).click();
  await page.getByRole('button', { name: 'Agregar 2' }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Vas a agregar 2 ejemplares');
  await expect(dialog).toContainText(`${TITLE}(2)`);
  await dialog.getByRole('button', { name: 'Agregar 2' }).click();

  await expect(page).toHaveURL(/\/inventario$/);
  await expect(page.getByText('2 ejemplares agregados')).toBeVisible();
});

test('el lote es local: descartar lo vacía y no se crea nada', async ({ page }) => {
  await page.goto('/inventario/agregar');
  if (isMobile(page)) {
    await page.getByRole('button', { name: new RegExp(`^Agregar un ejemplar de ${TITLE}`) }).click();
    await expect(page.getByRole('group', { name: `Cantidad de ${TITLE}` })).toBeVisible();
    await page
      .getByRole('link', { name: 'Cancelar' })
      .or(page.getByRole('button', { name: 'Cancelar' }))
      .click();
    await expect(page).toHaveURL(/\/inventario$/);
    return;
  }
  await addOne(page).click();
  await expect(page.getByRole('button', { name: 'Agregar 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByRole('button', { name: 'Agregar 1' })).toHaveCount(0);
});

test('sin conexión, «Agregar N» queda deshabilitado', async ({ page, context }) => {
  test.skip(isMobile(page), 'La barra «Agregar N» es de escritorio; en móvil, «Listo».');
  await page.goto('/inventario/agregar');
  await addOne(page).click();
  await context.setOffline(true);
  await expect(page.getByRole('button', { name: 'Agregar 1' })).toHaveAttribute('aria-disabled', 'true');
  await context.setOffline(false);
});

test('#94: al volver a Agregar con el catálogo ya cargado, el «+» suma', async ({ page }) => {
  const addAny = () =>
    page.getByRole('button', { name: new RegExp(`^Agregar (un|otro) ejemplar de ${TITLE}`) }).first();
  await page.goto('/inventario/agregar');
  await addAny().waitFor();
  // Se sale a Inventario y se vuelve sin recargar la página: el catálogo queda en la caché.
  if (isMobile(page))
    await page
      .getByRole('link', { name: 'Cancelar' })
      .or(page.getByRole('button', { name: 'Cancelar' }))
      .first()
      .click();
  else
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Inventario' })
      .first()
      .click();
  await expect(page).toHaveURL(/\/inventario$/);
  // Móvil: el botón flotante «Agregar al inventario»; escritorio: «Agregar» en el encabezado.
  await page
    .getByRole('button', { name: isMobile(page) ? 'Agregar al inventario' : 'Agregar', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/inventario\/agregar$/);
  await addAny().click();
  if (isMobile(page)) await expect(page.getByRole('group', { name: `Cantidad de ${TITLE}` })).toBeVisible();
  else await expect(page.getByRole('button', { name: 'Agregar 1' })).toBeVisible();
});
