import { z } from 'zod';
import type { AppUser } from '@/domain/app-user';
import { appError, COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { UserAdminRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapPostgrestError, mapRpcError } from './errors';

const rowSchema = z.object({
  user_id: z.uuid().nullable(),
  email: z.string(),
  full_name: z.string(),
  is_admin: z.boolean(),
  status: z.enum(['pending', 'active', 'inactive']),
});

/** Admin · Usuarios con la tabla `authorized_email` y las funciones `admin_users` / `admin_set_user_active`. */
export function createSupabaseUserAdminRepository(getClient: GetSupabaseClient): UserAdminRepository {
  return {
    async list() {
      const { data, error } = await getClient().rpc('admin_users');
      if (error) return err(mapPostgrestError(error));
      const rows = z.array(rowSchema).parse(data ?? []);
      return ok(
        rows.map((row): AppUser => ({
          userId: row.user_id,
          email: row.email,
          fullName: row.full_name,
          isAdmin: row.is_admin,
          status: row.status,
        })),
      );
    },

    async authorize({ email, fullName, isAdmin }) {
      const { error } = await getClient()
        .from('authorized_email')
        .insert({ email, full_name: fullName, is_admin: isAdmin });
      if (!error) return ok(undefined);
      // 23505: el correo ya estaba autorizado; 42501: la RLS lo negó (no es admin).
      if (error.code === '23505') return err(appError(COMMON_ERROR_CODES.CONFLICT));
      if (error.code === '42501') return err(appError(COMMON_ERROR_CODES.FORBIDDEN));
      return err(mapPostgrestError(error));
    },

    async removePending(email) {
      const { data, error } = await getClient()
        .from('authorized_email')
        .delete()
        .eq('email', email)
        .select('email');
      if (error) return err(mapPostgrestError(error));
      return data && data.length > 0 ? ok(undefined) : err(appError(COMMON_ERROR_CODES.NOT_FOUND));
    },

    async setActive(userId, active) {
      const { error } = await getClient().rpc('admin_set_user_active', {
        p_user_id: userId,
        p_active: active,
      });
      return error
        ? err(
            mapRpcError(error, ['FORBIDDEN', 'VALIDATION', 'NOT_FOUND'], (code) =>
              code === 'VALIDATION' ? { field: 'userId', reason: 'self' } : undefined,
            ),
          )
        : ok(undefined);
    },
  };
}
