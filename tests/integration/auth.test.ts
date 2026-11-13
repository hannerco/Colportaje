import { afterAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import { createSupabaseProfileRepository } from '@/adapters/supabase/profile-repository';
import { signIn, type SignInDeps } from '@/features/auth/use-cases/sign-in';
import { createUser } from '../../scripts/lib/create-user';
import { pool } from '../rls/helpers/db';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';
import { fakeConnectivity } from '../support/fake-connectivity';

const admin = adminClient();
const createdIds: string[] = [];

afterAll(async () => {
  for (const id of createdIds) await admin.auth.admin.deleteUser(id);
  await pool.end();
});

/** Usuario ficticio creado con la misma lógica que `pnpm user:create`. */
async function scriptUser(input: { fullName: string; isAdmin?: boolean; password?: string }) {
  const email = uniqueEmail('hu-base-03');
  const password = input.password ?? 'clave-local-de-prueba-123';
  const created = await createUser(admin, {
    email,
    fullName: input.fullName,
    password,
    isAdmin: input.isAdmin,
  });
  createdIds.push(created.userId);
  return { email, password, userId: created.userId };
}

/** Repositorios reales sobre un cliente nuevo (como un dispositivo nuevo). */
function deviceRepositories(): SignInDeps {
  const client = anonClient();
  return {
    auth: createSupabaseAuthRepository(() => client),
    profiles: createSupabaseProfileRepository(() => client),
    connectivity: fakeConnectivity(true),
  };
}

describe('sesión contra Supabase local (HU-BASE-03)', () => {
  it('CA-1: un usuario creado con el script entra y su perfil es Hanner Conde, 12 h, no admin', async () => {
    const user = await scriptUser({ fullName: 'Hanner Conde' });
    const repos = deviceRepositories();
    expect(await signIn(repos, { email: user.email, password: user.password })).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await repos.auth.getCurrentUserId()).toBe(user.userId);
    expect(await repos.profiles.getCurrentProfile()).toEqual({
      ok: true,
      value: { id: user.userId, fullName: 'Hanner Conde', timeFormat: '12h', isAdmin: false, isActive: true },
    });
  });

  it('el script con --admin deja isAdmin = true', async () => {
    const user = await scriptUser({ fullName: 'Admin de prueba', isAdmin: true });
    const repos = deviceRepositories();
    await signIn(repos, { email: user.email, password: user.password });
    const profile = await repos.profiles.getCurrentProfile();
    expect(profile.ok && profile.value.isAdmin).toBe(true);
  });

  it('el script sin contraseña genera una segura y con ella se puede entrar', async () => {
    const email = uniqueEmail('hu-base-03-gen');
    const created = await createUser(admin, { email, fullName: 'Clave generada' });
    createdIds.push(created.userId);
    expect(created.generatedPassword).toMatch(/^[\w-]{24}$/);
    const repos = deviceRepositories();
    expect((await signIn(repos, { email, password: created.generatedPassword! })).ok).toBe(true);
  });

  it('CA-2: con una contraseña equivocada recibe INVALID_CREDENTIALS', async () => {
    const user = await scriptUser({ fullName: 'Usuario Dos' });
    const repos = deviceRepositories();
    const result = await signIn(repos, { email: user.email, password: 'equivocada' });
    expect(result).toEqual({ ok: false, error: { code: 'INVALID_CREDENTIALS', retryable: false } });
    expect(await repos.auth.getCurrentUserId()).toBeNull();
  });

  it('CA-3: un usuario con is_active = false recibe USER_INACTIVE y queda sin sesión', async () => {
    const user = await scriptUser({ fullName: 'Usuario Inactivo' });
    // Desactivar desde la app es del panel de admin (fuera de alcance): se marca directo en Postgres.
    await pool.query(`update public.profile set is_active = false where id = $1`, [user.userId]);
    const repos = deviceRepositories();
    const changes: string[] = [];
    repos.auth.onAuthChange((c) =>
      changes.push(c.type === 'signed_out' ? `signed_out:${c.requested}` : c.type),
    );
    const result = await signIn(repos, { email: user.email, password: user.password });
    expect(result).toEqual({ ok: false, error: { code: 'USER_INACTIVE', retryable: false } });
    expect(await repos.auth.getCurrentUserId()).toBeNull();
    // El cierre lo pidió la app: no debe verse como sesión vencida.
    expect(changes.at(-1)).toBe('signed_out:true');
  });

  it('CA-4: registrarse por la API pública de Auth falla', async () => {
    const { data, error } = await anonClient().auth.signUp({
      email: uniqueEmail('intruso'),
      password: 'clave-del-intruso-123',
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});
