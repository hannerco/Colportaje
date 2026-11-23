import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1),
});

/** Variables públicas (protegidas por RLS). La `service_role` nunca pasa por aquí. */
export type PublicEnv = z.infer<typeof publicEnvSchema>;

/** Valida las variables y lanza con un mensaje que nombra las que faltan o están mal. */
export const assertPublicEnv = (source: Readonly<Record<string, string | undefined>>): PublicEnv => {
  const result = publicEnvSchema.safeParse(source);
  if (result.success) return result.data;
  const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].join(', ');
  throw new Error(
    `Faltan o son inválidas las variables de entorno: ${names}. Copia .env.example a .env.local y complétalas.`,
  );
};

let cached: PublicEnv | undefined;

/** Variables públicas validadas. Se leen con su nombre literal para que Next las incluya en el bundle. */
export const getPublicEnv = (): PublicEnv => {
  cached ??= assertPublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return cached;
};

/**
 * Entrar con Google (ronda 34, #41). Se enciende con `NEXT_PUBLIC_GOOGLE_SIGN_IN=on` en Vercel cuando el dueño ya
 * configuró Google en Supabase (DEPLOYMENT §5.6); mientras tanto la pantalla sigue con correo y contraseña, para no
 * dejar a nadie afuera.
 */
export const googleSignInEnabled = (): boolean => process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'on';
