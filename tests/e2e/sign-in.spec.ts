// HU-PAN-BASE-02 · Iniciar sesión: la pantalla de /entrar con un usuario propio de la prueba (sin la sesión guardada).
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/adapters/supabase/database.types';
import { createUser, generatePassword } from '../../scripts/lib/create-user';
import { localSupabase } from './support/local-supabase';

test.use({ storageState: { cookies: [], origins: [] } });

test('entrar con correo y contraseña lleva a Clientes; una contraseña equivocada lo explica', async ({
  page,
}) => {
  const { url, serviceRoleKey } = localSupabase();
  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `entrar-${randomUUID()}@example.test`;
  const password = generatePassword();
  await createUser(admin, { email, fullName: 'Entrar E2E', password });

  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  const submit = page.getByRole('button', { name: 'Entrar' });
  await expect(submit).toHaveAttribute('aria-disabled', 'true');

  // Contraseña equivocada: se queda en /entrar y lo dice en el campo.
  await page.getByRole('textbox', { name: 'Correo' }).fill(email);
  await page.getByLabel('Contraseña').fill('no-es-la-clave');
  await submit.click();
  await expect(page.getByText('El correo o la contraseña no coinciden.')).toBeVisible();
  await expect(page).toHaveURL(/\/entrar$/);

  // La contraseña se puede mostrar para revisarla.
  await page.getByRole('button', { name: 'Mostrar' }).click();
  await expect(page.getByLabel('Contraseña')).toHaveAttribute('type', 'text');

  // Con la clave correcta entra a Clientes.
  await page.getByLabel('Contraseña').fill(password);
  await submit.click();
  await expect(page).toHaveURL(/\/clientes/);
});
