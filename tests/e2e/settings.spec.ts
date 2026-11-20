// Ajustes (versión mínima, 2026-11-20): formato de hora y cerrar sesión, con un usuario propio de la prueba.
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/adapters/supabase/database.types';
import { createUser, generatePassword } from '../../scripts/lib/create-user';
import { localSupabase } from './support/local-supabase';

// Cerrar sesión invalida la sesión: no se usa la compartida de las demás pruebas.
test.use({ storageState: { cookies: [], origins: [] } });

test('Ajustes guarda el formato de hora y «Cerrar sesión» lleva a Iniciar sesión', async ({ page }) => {
  const { url, serviceRoleKey } = localSupabase();
  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `ajustes-${randomUUID()}@example.test`;
  const password = generatePassword();
  await createUser(admin, { email, fullName: 'Ajustes E2E', password });

  await page.goto('/entrar');
  await page.getByRole('textbox', { name: 'Correo' }).fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/clientes/);

  await page.goto('/ajustes');
  await expect(page.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeVisible();
  await expect(page.getByRole('main').getByText('Ajustes E2E')).toBeVisible();
  await expect(page.getByRole('radio', { name: /12 horas/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('radio', { name: /24 horas/ }).click();
  await expect(page.getByText('Formato de hora guardado')).toBeVisible();
  await expect(page.getByRole('radio', { name: /24 horas/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  // Sin sesión, las rutas de la app vuelven a Iniciar sesión.
  await page.goto('/clientes');
  await expect(page).toHaveURL(/\/entrar$/);
});
