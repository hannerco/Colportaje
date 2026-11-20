// HU-PAN-BASE-01 · Armazón de la app, de punta a punta en móvil y escritorio (y la lectura sin conexión de HU-BASE-06).
import { expect, test, type Page } from '@playwright/test';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Principal' });
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

test('CA-1 / CA-2: / lleva a Clientes con la navegación de cada plataforma, con todos los módulos', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/clientes$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  if (isMobile(page)) {
    // CA-1: barra inferior (Hoy, Clientes, Inventario, Más) y, en «Más», el resto.
    await expect(nav(page).locator('li > a, li > button')).toHaveText([
      'Hoy',
      'Clientes',
      'Inventario',
      'Más',
    ]);
    await nav(page).getByRole('button', { name: 'Más' }).click();
    await expect(page.getByRole('dialog').getByRole('link')).toHaveText([
      'Minibooks',
      'Calendario',
      'Dinero',
      'Hacer inventario',
      'Ajustes',
    ]);
  } else {
    // CA-2: barra lateral con todos los módulos (Admin solo para administradores: el usuario de prueba no lo es).
    await expect(nav(page).getByRole('button')).toHaveText(['Nuevo cliente', 'Trabajo', 'Dinero']);
    await expect(nav(page).getByRole('link')).toHaveText([
      'Hoy',
      'Clientes',
      'Inventario',
      'Minibooks',
      'Calendario',
      'Dinero',
      'Hacer inventario',
      'Ajustes',
    ]);
  }
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
});

test('un módulo sin terminar abre «Próximamente» dentro del armazón', async ({ page }) => {
  await page.goto('/calendario');
  await expect(page.getByRole('heading', { level: 1, name: 'Calendario' })).toBeVisible();
  await expect(page.getByText('Próximamente')).toBeVisible();
  await expect(page.getByText('Calendario todavía no está listo')).toBeVisible();
  // La navegación sigue ahí: se vuelve a un módulo terminado.
  await nav(page).getByRole('link', { name: 'Clientes' }).click();
  await expect(page).toHaveURL(/\/clientes$/);
});

test('la navegación cambia de pantalla sin recargar y marca el módulo activo', async ({ page }) => {
  await page.goto('/clientes');
  await page.evaluate(() => Object.assign(window, { __sameDocument: true }));
  await nav(page).getByRole('link', { name: 'Inventario', exact: true }).click();
  await expect(page).toHaveURL(/\/inventario$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Inventario', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(await page.evaluate(() => '__sameDocument' in window)).toBe(true);
});

test('R1: de 800 a 700 px cambia de barra lateral a barra inferior sin recargar', async ({ page }) => {
  test.skip(isMobile(page), 'Se prueba desde escritorio.');
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/clientes');
  await expect(page.locator('html')).toHaveAttribute('data-platform', 'desktop');
  await expect(nav(page).getByRole('button', { name: 'Nuevo cliente' })).toBeVisible();
  await page.evaluate(() => Object.assign(window, { __sameDocument: true }));
  await page.setViewportSize({ width: 700, height: 900 });
  await expect(page.locator('html')).toHaveAttribute('data-platform', 'mobile');
  await expect(nav(page).getByRole('button', { name: 'Más' })).toBeVisible();
  await expect(nav(page).getByRole('button', { name: 'Nuevo cliente' })).toHaveCount(0);
  expect(await page.evaluate(() => '__sameDocument' in window)).toBe(true);
});

test('CA-3: con el sistema en oscuro, la app se ve oscura desde el primer pintado', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  // Sin esperar a que cargue React: lo que el navegador pinta con el HTML y el CSS.
  await page.goto('/clientes', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.body !== null);
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme', /.*/);
  await expect(html).toHaveAttribute('data-platform', isMobile(page) ? 'mobile' : 'desktop');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light dark');
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe(isMobile(page) ? 'rgb(17, 17, 16)' : 'rgb(24, 24, 23)');
});

test('CA-4: sin red aparece la Franja y «Nuevo cliente» queda deshabilitado', async ({ page, context }) => {
  await page.goto('/clientes');
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  await context.setOffline(true);
  await expect(
    page.getByRole('status').filter({ hasText: 'Sin conexión: puedes consultar, pero no registrar' }),
  ).toBeVisible();
  if (!isMobile(page)) {
    const create = nav(page).getByRole('button', { name: 'Nuevo cliente' });
    await expect(create).toBeDisabled();
    await expect(create).toHaveAccessibleDescription('Necesita conexión');
  }
  await context.setOffline(false);
  await expect(page.getByText('Sin conexión: puedes consultar, pero no registrar')).toHaveCount(0);
});

test('HU-BASE-06: la app abre sin conexión (service worker) con la sesión guardada', async ({
  page,
  context,
}) => {
  await page.goto('/clientes');
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  // El service worker toma la página y precachea el esqueleto.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Sin conexión' })).toBeVisible();
  await context.setOffline(false);
});

test.describe('sin sesión', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('las rutas de la app llevan a Iniciar sesión (/entrar)', async ({ page }) => {
    await page.goto('/dinero');
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(nav(page)).toHaveCount(0);
  });
});
