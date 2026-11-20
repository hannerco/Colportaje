// HU-PAN-CLI-01 · Lista de clientes, de punta a punta en móvil y escritorio (TESTING.md, flujo 8: búsqueda difusa).
import { expect, test, type Page } from '@playwright/test';

const list = (page: Page) =>
  page.getByRole(page.viewportSize()!.width < 768 ? 'list' : 'table', { name: 'Clientes' });
/** ¿La caché guardada en IndexedDB (idb-keyval) ya contiene `text`? */
const savedCacheHas = (text: string) =>
  new Promise<boolean>((resolve) => {
    const open = indexedDB.open('keyval-store');
    open.onerror = () => resolve(false);
    open.onsuccess = () => {
      try {
        const read = open.result.transaction('keyval').objectStore('keyval').get('colportor-query-cache');
        read.onsuccess = () => resolve(typeof read.result === 'string' && read.result.includes(text));
        read.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    };
  });
const search = (page: Page) => page.getByRole('searchbox', { name: 'Buscar cliente' });

test('flujo 8: la búsqueda tolera errores y tildes, busca por teléfono y ofrece crear si nadie coincide', async ({
  page,
}) => {
  await page.goto('/clientes');
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();

  // CA-1 de HU-CLI-05: «maria gomes» encuentra a «María Gómez» (un prospecto, visible en la búsqueda, I-13).
  await search(page).fill('maria gomes');
  await expect(list(page).getByText('María Gómez')).toBeVisible();
  await expect(list(page).getByText('Hernán Pérez')).toHaveCount(0);
  // R3: la búsqueda queda en la URL.
  await expect(page).toHaveURL(/[?&]q=maria(\+|%20)gomes/);

  // CA-2 de HU-CLI-05: por los dígitos del teléfono.
  await search(page).fill('5579032');
  await expect(list(page).getByText('María Gómez')).toBeVisible();

  // CA-5: sin coincidencias, «Nadie coincide con «…»» y «Crear «…»» abre Nuevo cliente con ese nombre.
  await search(page).fill('Zacarías Quintero');
  await expect(page.getByText('Nadie coincide con «Zacarías Quintero»')).toBeVisible();
  await page.getByRole('button', { name: 'Crear «Zacarías Quintero»' }).click();
  await expect(page).toHaveURL(/\/clientes\/nuevo\?nombre=Zacar%C3%ADas(\+|%20)Quintero$/);
  // La ficha viva lo crea con ese nombre (HU-PAN-CLI-03); se descarta para no dejarlo en la base de las pruebas.
  await expect(page.getByLabel('Nombre del cliente')).toHaveValue('Zacarías Quintero');
  await expect(page.getByRole('button', { name: 'Guardar cliente' })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await page.getByRole('button', { name: 'Descartar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar' }).click();
  await expect(page).toHaveURL(/\/clientes$/);
});

test('R3: la vista vuelve igual con «atrás»', async ({ page }) => {
  await page.goto('/clientes?tab=archived&sort=name-asc');
  await expect(page.getByRole('tab', { name: /Archivados/ })).toHaveAttribute('aria-selected', 'true');
  await page.goto('/inventario');
  await page.goBack();
  await expect(page).toHaveURL(/\/clientes\?tab=archived&sort=name-asc$/);
  await expect(page.getByRole('tab', { name: /Archivados/ })).toHaveAttribute('aria-selected', 'true');
});

test('HU-BASE-06 / R2: sin conexión la lista se consulta y «Nuevo cliente» queda deshabilitado', async ({
  page,
  context,
}) => {
  await page.goto('/clientes?q=maria');
  await expect(list(page).getByText('María Gómez')).toBeVisible();
  // El service worker toma la página (precachea el esqueleto) y la caché de datos queda guardada.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await expect(list(page).getByText('María Gómez')).toBeVisible();
  // La caché de lecturas se guarda en IndexedDB con hasta 1 s de retraso: se espera a que tenga los clientes.
  await expect.poll(() => page.evaluate(savedCacheHas, 'María Gómez'), { timeout: 10_000 }).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'Sin conexión' }).first()).toBeVisible();
  await expect(list(page).getByText('María Gómez')).toBeVisible();
  await search(page).fill('5579032');
  await expect(list(page).getByText('María Gómez')).toBeVisible();
  const create = page.getByRole('button', { name: 'Nuevo cliente' }).last();
  await expect(create).toHaveAttribute('aria-disabled', 'true');
  await context.setOffline(false);
});
