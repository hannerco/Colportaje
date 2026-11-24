// #96: cambiar de módulo no espera al servidor: las pantallas de los módulos se traen de fondo al entrar.
import { expect, test, type Request } from '@playwright/test';

// El service worker atiende algunas peticiones fuera de la vista de la prueba: se apaga para ver todas.
test.use({ serviceWorkers: 'block' });

const isRscRequest = (request: Request) =>
  request.headers()['rsc'] === '1' && request.headers()['next-router-prefetch'] === undefined;

test('#96: con las pantallas ya traídas, tocar Inventario no pide la pantalla al servidor', async ({
  page,
}) => {
  const prefetched: string[] = [];
  page.on('request', (request) => {
    if (request.headers()['next-router-prefetch']) prefetched.push(new URL(request.url()).pathname);
  });
  await page.goto('/clientes');
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  // Se traen de fondo cuando el navegador queda libre.
  await expect.poll(() => prefetched.includes('/inventario'), { timeout: 10_000 }).toBe(true);

  const onClick: string[] = [];
  page.on('request', (request) => {
    if (isRscRequest(request)) onClick.push(new URL(request.url()).pathname);
  });
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Inventario' })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
  expect(onClick).not.toContain('/inventario');
});
