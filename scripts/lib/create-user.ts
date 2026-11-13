// Lógica del script de alta de usuarios (HU-BASE-03). Usa un cliente con la service_role:
// SOLO se ejecuta en la máquina del dueño o en pruebas locales, nunca en el navegador (R5).
import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/adapters/supabase/database.types';

export type CreateUserInput = {
  email: string;
  fullName: string;
  password?: string;
  isAdmin?: boolean;
};

export type CreatedUser = {
  userId: string;
  /** Solo si se generó: se muestra una vez y no se guarda. */
  generatedPassword?: string;
};

export const generatePassword = (): string => randomBytes(18).toString('base64url');

/**
 * Crea el usuario en Auth con su nombre en los metadatos. El trigger `handle_new_user` crea el perfil
 * y el rol colportor; si se pide, se agrega el rol admin.
 */
export async function createUser(
  admin: SupabaseClient<Database>,
  input: CreateUserInput,
): Promise<CreatedUser> {
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error('El nombre es obligatorio.');
  const generatedPassword = input.password ? undefined : generatePassword();
  const password = input.password ?? generatedPassword!;

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`No se pudo crear el usuario: ${error.message}`);
  const userId = data.user.id;

  if (input.isAdmin) {
    const { error: roleError } = await admin.from('user_role').insert({ user_id: userId, role: 'admin' });
    if (roleError) {
      await admin.auth.admin.deleteUser(userId);
      throw new Error(`No se pudo asignar el rol admin (se deshizo el alta): ${roleError.message}`);
    }
  }

  return generatedPassword ? { userId, generatedPassword } : { userId };
}
