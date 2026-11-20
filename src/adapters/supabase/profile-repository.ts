import { z } from 'zod';
import { toProfile } from '@/domain/auth';
import { appError, COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { ProfileRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapPostgrestError } from './errors';

const profileRowSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  time_format: z.enum(['12h', '24h']),
  is_active: z.boolean(),
});

const roleRowSchema = z.object({ role: z.string() });

export function createSupabaseProfileRepository(getClient: GetSupabaseClient): ProfileRepository {
  return {
    async getCurrentProfile() {
      const client = getClient();
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return err(appError(COMMON_ERROR_CODES.SESSION_EXPIRED));

      const [profileResult, rolesResult] = await Promise.all([
        client.from('profile').select('id, full_name, time_format, is_active').eq('id', userId).maybeSingle(),
        client.from('user_role').select('role').eq('user_id', userId),
      ]);
      if (profileResult.error) return err(mapPostgrestError(profileResult.error));
      if (rolesResult.error) return err(mapPostgrestError(rolesResult.error));
      if (!profileResult.data) return err(appError(COMMON_ERROR_CODES.NOT_FOUND));

      const row = profileRowSchema.parse(profileResult.data);
      const roles = z.array(roleRowSchema).parse(rolesResult.data);
      return ok(
        toProfile({
          id: row.id,
          fullName: row.full_name,
          timeFormat: row.time_format,
          isActive: row.is_active,
          roles: roles.map((r) => r.role),
        }),
      );
    },

    async updateTimeFormat(format) {
      const { error } = await getClient().rpc('update_my_time_format', { p_time_format: format });
      return error ? err(mapPostgrestError(error)) : ok(undefined);
    },
  };
}
