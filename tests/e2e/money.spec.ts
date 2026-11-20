// HU-PAN-DIN-01 · Dinero: resumen y abonos de clientes, de punta a punta en móvil y escritorio.
import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

test('muestra Dinero con sus pestañas, y Por cobrar lista los abonos de los clientes con plan', async ({
  page,
}) => {
  await page.goto('/dinero');
  await expect(page.getByRole('heading', { level: 1, name: 'Dinero' })).toBeVisible();
  const views = page.getByRole('tablist', { name: 'Vistas de abonos' });
  for (const name of ['Todos', 'Por cobrar', 'Por entregar', 'Entregados', 'Cancelados'])
    await expect(views.getByRole('tab', { name: new RegExp(`^${name}`) })).toBeVisible();

  await views.getByRole('tab', { name: /^Por cobrar/ }).click();
  await expect(page).toHaveURL(/vista=por-cobrar/);
  await expect(page.getByRole('link', { name: /Prórroga (mobile|desktop)/ }).first()).toBeVisible();
});

test('CA-4: en móvil «Por entregar» abre la hoja del resumen; en escritorio el resumen está arriba', async ({
  page,
}) => {
  await page.goto('/dinero');
  if (isMobile(page)) {
    await page
      .getByRole('button', { name: /^Por entregar/ })
      .first()
      .click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('Dinero total');
    await expect(sheet.getByRole('button', { name: 'Entregar al líder' })).toBeVisible();
  } else {
    await expect(page.getByText('Dinero total')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entregar al líder' })).toBeVisible();
  }
});

test('buscar un cliente filtra la lista sin cambiar los conteos de las pestañas', async ({ page }) => {
  await page.goto('/dinero?vista=por-cobrar');
  const tab = page.getByRole('tab', { name: /^Por cobrar/ });
  await expect(page.getByRole('link', { name: /Prórroga (mobile|desktop)/ }).first()).toBeVisible();
  const before = await tab.textContent();
  await page.getByRole('searchbox').first().fill('prórroga desktop');
  await expect(page.getByRole('link', { name: /Prórroga mobile/ })).toHaveCount(0);
  await expect(tab).toHaveText(before!);
});
