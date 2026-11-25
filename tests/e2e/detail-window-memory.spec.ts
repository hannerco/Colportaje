// 2026-11-25 · Cada tipo de ventana recuerda su forma, y pasar a otro abono se queda en la ventana, sin recargar.
import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

test('desde un abono en la ventana lateral, «Abonos de …» pasa a otro abono sin salir de la ventana ni dar error', async ({
  page,
}) => {
  test.skip(isMobile(page), 'Las formas de la ventana son de escritorio.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dinero?vista=por-cobrar');
  await page.evaluate(() => window.localStorage.setItem('colportor.detail-window-mode.payment', 'side'));
  await page
    .getByRole('link', { name: /Prórroga desktop/ })
    .first()
    .click();
  await expect(page).toHaveURL(/abono=/);
  const first = new URL(page.url()).searchParams.get('abono');

  const island = page.locator('section', { hasText: 'Abonos de' }).last();
  const other = island.locator('a:not([aria-current="true"])').first();
  await other.click();
  // Sigue en Dinero con la vista «Por cobrar» y otro abono abierto en la ventana (no en su página).
  await expect(page).toHaveURL(/\/dinero\?(.*&)?vista=por-cobrar/);
  await expect.poll(() => new URL(page.url()).searchParams.get('abono')).not.toBe(first);
  await expect(page.getByRole('radio', { name: 'Lateral' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Algo salió mal')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('el abono recuerda «Centrada» y el cliente sigue en «Lateral»', async ({ page }) => {
  test.skip(isMobile(page), 'Las formas de la ventana son de escritorio.');
  await page.goto('/dinero?vista=por-cobrar');
  await page.evaluate(() => {
    window.localStorage.removeItem('colportor.detail-window-mode');
    window.localStorage.setItem('colportor.detail-window-mode.payment', 'center');
    window.localStorage.setItem('colportor.detail-window-mode.customer', 'side');
  });
  await page
    .getByRole('link', { name: /Prórroga desktop/ })
    .first()
    .click();
  await expect(page.getByRole('radio', { name: 'Centrada' })).toHaveAttribute('aria-checked', 'true');

  await page.goto('/clientes?q=Prórroga desktop');
  await page
    .getByRole('table', { name: 'Clientes' })
    .getByRole('link', { name: /Prórroga desktop/ })
    .click();
  await expect(page).toHaveURL(/cliente=/);
  await expect(page.getByRole('radio', { name: 'Lateral' })).toHaveAttribute('aria-checked', 'true');
});
