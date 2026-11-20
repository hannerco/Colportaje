// HU-PAN-CLI-06 · Dirección y ubicación, de punta a punta en móvil y escritorio, con el GPS simulado por Playwright.
// La app compilada no tiene proveedor de teselas (SG-09): el mapa se ve liso, pero el pin, las coordenadas, guardar y
// «Abrir en Maps» funcionan igual.
import { expect, test } from '@playwright/test';

const MAPS_LINK = 'https://www.google.com/maps/search/?api=1&query=6.2518,-75.5915';

test('elegir en el mapa guarda la ubicación con su precisión y «Abrir en Maps» lleva las coordenadas', async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 6.2518, longitude: -75.5915, accuracy: 12 });
  const name = `Ubicación ${testInfo.project.name} ${Date.now()}`;

  await page.goto('/clientes/nuevo');
  await page.getByLabel('Nombre del cliente').fill(name);
  await page.getByLabel('Dirección').fill('Cl. 48 #79-25, Laureles, Medellín');
  await page.getByRole('button', { name: 'Elegir en mapa' }).click();

  const picker = page.getByRole('dialog', { name: 'Elegir ubicación' });
  await expect(picker).toContainText('±12 m · 6,2518, −75,5915');

  // CA-4: sin conexión, «Confirmar» está deshabilitado.
  await context.setOffline(true);
  await expect(picker).toContainText('Sin conexión. Guardar necesita conexión.');
  await expect(picker.getByRole('button', { name: 'Confirmar' })).toHaveAttribute('aria-disabled', 'true');
  await context.setOffline(false);
  await expect(picker.getByRole('button', { name: 'Confirmar' })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await picker.getByRole('button', { name: 'Confirmar' }).click();
  await expect(picker).toBeHidden();

  // CA-3: con ubicación, «Abrir en Maps» usa las coordenadas (antes que la dirección en texto, BR-CUS-08).
  await expect(page.getByRole('link', { name: 'Abrir en Maps' })).toHaveAttribute('href', MAPS_LINK);

  await page.getByRole('button', { name: 'Guardar cliente' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Guardar cliente' }).click();
  await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+$/);

  // La ficha guardada la trae de la base: mapa (al tocar), «Abrir en Maps», «Cambiar» y «Quitar».
  await expect(page.getByRole('link', { name: 'Abrir en Maps' })).toHaveAttribute('href', MAPS_LINK);
  await page.getByRole('button', { name: 'Ver mapa' }).click();
  await expect(page.getByRole('img', { name: 'Mapa de la ubicación del cliente' })).toBeVisible();
  await page.getByRole('button', { name: 'Quitar' }).click();
  await expect(page.getByText('Ubicación quitada')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Elegir en mapa' })).toBeVisible();
  // Sin coordenadas, Maps busca la dirección en texto.
  await expect(page.getByRole('link', { name: 'Abrir en Maps' })).toHaveAttribute('href', /query=Cl\.%2048/);
});

test('sin permiso de ubicación el selector abre igual y pide ubicar el pin a mano (CA-2)', async ({
  page,
}, testInfo) => {
  await page.goto('/clientes/nuevo');
  await page.getByLabel('Nombre del cliente').fill(`Sin permiso ${testInfo.project.name} ${Date.now()}`);
  await page.getByRole('button', { name: 'Elegir en mapa' }).click();

  const picker = page.getByRole('dialog', { name: 'Elegir ubicación' });
  await expect(picker).toContainText('Sin permiso de ubicación. Ubica el pin a mano.');
  await expect(picker.getByRole('button', { name: 'Centrar en tu ubicación actual' })).toHaveCount(0);

  // Se deja sin guardar: descartar el cliente de la prueba.
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await page.getByRole('button', { name: 'Descartar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar' }).click();
  await expect(page).toHaveURL(/\/clientes$/);
});
