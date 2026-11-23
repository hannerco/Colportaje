import { describe, expect, it, vi } from 'vitest';
import type { AppUser } from '@/domain/app-user';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { UserAdminRepository } from '@/repositories';
import { authorizeEmail, listUsers, removePendingEmail, setUserActive } from './manage-users';

const online = { isOnline: () => true, subscribe: () => () => {} };
const offline = { isOnline: () => false, subscribe: () => () => {} };

const user = (fullName: string, status: AppUser['status']): AppUser => ({
  userId: status === 'pending' ? null : fullName,
  email: `${fullName.toLowerCase()}@gmail.com`,
  fullName,
  isAdmin: false,
  status,
});

const repo = (overrides: Partial<UserAdminRepository> = {}): UserAdminRepository => ({
  list: vi.fn(async () => ok([])),
  authorize: vi.fn(async () => ok(undefined)),
  removePending: vi.fn(async () => ok(undefined)),
  setActive: vi.fn(async () => ok(undefined)),
  ...overrides,
});

describe('Admin · Usuarios (#43, BR-USR-07)', () => {
  it('lista Pendientes primero, luego activos y desactivados, por nombre', async () => {
    const users = repo({
      list: async () =>
        ok([user('Zoe', 'active'), user('Ana', 'inactive'), user('Luz', 'pending'), user('Beto', 'active')]),
    });
    const result = await listUsers({ users });
    expect(result.ok && result.value.map((u) => u.fullName)).toEqual(['Luz', 'Beto', 'Zoe', 'Ana']);
  });

  it('autoriza el correo en minúsculas y sin espacios', async () => {
    const users = repo();
    const result = await authorizeEmail(
      { users, connectivity: online },
      { email: '  MariaCamila@Gmail.com ', fullName: ' María Camila ', isAdmin: false },
    );
    expect(result.ok).toBe(true);
    expect(users.authorize).toHaveBeenCalledWith({
      email: 'mariacamila@gmail.com',
      fullName: 'María Camila',
      isAdmin: false,
    });
  });

  it('sin nombre o con un correo inválido no autoriza', async () => {
    const users = repo();
    const noName = await authorizeEmail(
      { users, connectivity: online },
      { email: 'a@b.co', fullName: ' ', isAdmin: false },
    );
    expect(noName).toEqual(err(appError('VALIDATION', { field: 'fullName' })));
    const badEmail = await authorizeEmail(
      { users, connectivity: online },
      { email: 'maria', fullName: 'María', isAdmin: false },
    );
    expect(badEmail).toEqual(err(appError('VALIDATION', { field: 'email' })));
    expect(users.authorize).not.toHaveBeenCalled();
  });

  it('sin conexión no escribe nada', async () => {
    const users = repo();
    expect((await removePendingEmail({ users, connectivity: offline }, 'a@b.co')).ok).toBe(false);
    expect((await setUserActive({ users, connectivity: offline }, { userId: 'u', active: false })).ok).toBe(
      false,
    );
    expect(users.removePending).not.toHaveBeenCalled();
    expect(users.setActive).not.toHaveBeenCalled();
  });
});
