// Prepara la sesión de las E2E (HU-PAN-BASE-01). Iniciar sesión espera su diseño (HU-PAN-BASE-02, OQ-44), así que
// se crea un usuario ficticio en Supabase local, se entra con su clave como lo haría la app y se guardan las
// cookies de sesión (las mismas que pone el cliente del navegador, SECURITY.md) para que cada prueba abra con sesión.
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/adapters/supabase/database.types';
import { createUser, generatePassword } from '../../../scripts/lib/create-user';
import { localSupabase } from './local-supabase';

export const STORAGE_STATE = 'tests/e2e/.auth/state.json';
export const E2E_USER_NAME = 'Prueba E2E';
/** «Salud y bienestar en familia» ($75.000) del seed. */
export const E2E_TITLE_ID = '00000000-0000-4000-8000-000000000101';
export const E2E_CUSTOMERS = [
  { name: 'María Gómez', phone: '301 557 9032' },
  { name: 'Hernán Pérez', phone: '312 000 1111' },
  { name: 'Rubén Darío Vélez', phone: '300 111 2233' },
];

export default async function globalSetup() {
  const { url, anonKey, serviceRoleKey } = localSupabase();
  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `e2e-${Date.now()}@example.test`;
  const password = generatePassword();
  await createUser(admin, { email, fullName: E2E_USER_NAME, password });

  const cookies: { name: string; value: string }[] = [];
  const client = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (set) => {
        for (const { name, value } of set) {
          const index = cookies.findIndex((cookie) => cookie.name === name);
          if (index >= 0) cookies.splice(index, 1);
          if (value) cookies.push({ name, value });
        }
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo entrar con el usuario de prueba: ${error.message}`);

  // Clientes ficticios del usuario de prueba (flujo 8, búsqueda difusa), creados con su sesión como lo haría la app
  // (la service_role no tiene permisos sobre las tablas). Sin libros: son prospectos, que la búsqueda en Todos siempre
  // muestra (I-13).
  const { error: seedError } = await client
    .from('customer')
    .insert(E2E_CUSTOMERS.map((customer) => ({ id: randomUUID(), ...customer })));
  if (seedError) throw new Error(`No se pudieron crear los clientes de prueba: ${seedError.message}`);

  // Ejemplares en físico (HU-PAN-CLI-04): 3 de «Salud y bienestar en familia» ($75.000, título del seed), recibidos
  // hace 10 días, con la misma función que usa Agregar al inventario.
  const received = new Date(Date.now() - 10 * 86_400_000).toLocaleDateString('en-CA', {
    timeZone: 'America/Bogota',
  });
  const { error: copiesError } = await client.rpc('add_copies', {
    p_batch_id: randomUUID(),
    p_received_at: received,
    p_lines: [{ titleId: E2E_TITLE_ID, copyIds: [randomUUID(), randomUUID(), randomUUID()] }],
  });
  if (copiesError) throw new Error(`No se pudieron crear los ejemplares de prueba: ${copiesError.message}`);

  const state = {
    cookies: cookies.map(({ name, value }) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    })),
    origins: [],
  };
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(STORAGE_STATE, JSON.stringify(state));
}
