// #78 · Al pasar de un módulo a otro, el indicador de la navegación sale de donde estaba y se desliza («como en
// WhatsApp»): justo al llegar a la página nueva hay una transición corriendo.
import { expect, test, type Page } from '@playwright/test';

/** Si en el siguiente segundo y medio corre una transición de un indicador (dentro o fuera de la navegación). */
const indicatorMoves = (page: Page, inNav: boolean) =>
  page.evaluate(
    (nav) =>
      new Promise<boolean>((resolve) => {
        const start = performance.now();
        const check = () => {
          const running = document.getAnimations().some((a) => {
            const target = (a.effect as KeyframeEffect | null)?.target as Element | null;
            return (
              a instanceof CSSTransition &&
              String(a.transitionProperty).includes('transform') &&
              Boolean(target?.closest('nav')) === nav &&
              /indicator/i.test(String(target?.className))
            );
          });
          if (running) return resolve(true);
          if (performance.now() - start > 1500) return resolve(false);
          requestAnimationFrame(check);
        };
        check();
      }),
    inNav,
  );

test('el indicador de la navegación se desliza al cambiar de módulo', async ({ page }, testInfo) => {
  const mobile = page.viewportSize()!.width < 768;
  await page.goto('/clientes');
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: mobile ? /.+/ : 'Principal' }).last();
  // #98: el indicador se desliza desde el toque (el módulo se marca de inmediato), no al llegar la página: se escucha
  // desde antes de tocar.
  await page.evaluate(() => {
    (window as unknown as { indicatorMoved: boolean }).indicatorMoved = false;
    document.addEventListener('transitionrun', (event) => {
      const target = event.target as Element;
      if (
        event.propertyName === 'transform' &&
        target.closest('nav') &&
        /indicator/i.test(String(target.className))
      )
        (window as unknown as { indicatorMoved: boolean }).indicatorMoved = true;
    });
  });
  await nav.getByRole('link', { name: 'Inventario', exact: true }).click();
  await expect(page).toHaveURL(/\/inventario/);
  const moving = await page.evaluate(() => (window as unknown as { indicatorMoved: boolean }).indicatorMoved);
  expect(moving, `${testInfo.project.name}: el indicador debe moverse`).toBe(true);
});

test('«Libros en físico / Ejemplares»: el segmento se desliza al cambiar de página', async ({ page }) => {
  await page.goto('/inventario');
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
  await page
    .getByRole('tab', { name: /^Ejemplares/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/inventario\/ejemplares/);
  expect(await indicatorMoves(page, false)).toBe(true);
});
