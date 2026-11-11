import { describe, expect, it } from 'vitest';
import { systemClock } from './clock';
import { assertPublicEnv } from './env';
import { newId } from './ids';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('ids', () => {
  it('BR-GEN-04: newId genera UUID v4 distintos', () => {
    const a = newId();
    const b = newId();
    expect(a).toMatch(UUID_V4);
    expect(b).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });
});

describe('clock', () => {
  it('systemClock devuelve el instante actual', () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe('env', () => {
  const valid = {
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'clave-de-prueba',
  };

  it('acepta las variables públicas completas', () => {
    expect(assertPublicEnv(valid)).toEqual(valid);
  });

  it('falla al arrancar si faltan, nombrando cada variable', () => {
    expect(() => assertPublicEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.*\.env\.example/,
    );
  });

  it('rechaza valores vacíos (como en .env.example) y URLs inválidas', () => {
    expect(() => assertPublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: '  ' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
    expect(() => assertPublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'no-es-url' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});
