import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');

let eslint: ESLint;

// La primera carga de los plugins de Next es lenta; se hace una sola vez aquí.
beforeAll(async () => {
  eslint = new ESLint({ cwd: ROOT });
  await eslint.lintText('export {};', { filePath: resolve(ROOT, 'src/domain/warmup.ts') });
}, 180_000);

/** Errores de la regla de límites al lintar `code` como si estuviera en `file`. */
const boundaryErrors = async (file: string, code: string): Promise<string[]> => {
  const [result] = await eslint.lintText(code, { filePath: resolve(ROOT, file) });
  return (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.message);
};

const use = (specifier: string) => `import * as m from '${specifier}';\nexport const x = m;\n`;

describe('arquitectura: límites entre capas (HU-BASE-01 R2, ARCHITECTURE §2)', () => {
  it('CA-4: un archivo de src/domain que importa @supabase/supabase-js hace fallar el lint', async () => {
    const errors = await boundaryErrors('src/domain/bad.ts', use('@supabase/supabase-js'));
    expect(errors).not.toEqual([]);
    expect(errors[0]).toMatch(/Límite entre capas/);
  });

  it.each([
    ['src/domain/bad.ts', 'react'],
    ['src/domain/bad.ts', 'zod'],
    ['src/domain/bad.ts', '@/lib/ids'],
    ['src/domain/bad.ts', '../adapters/supabase/client'],
    ['src/repositories/bad.ts', '@/adapters/supabase/client'],
    ['src/repositories/bad.ts', '@supabase/supabase-js'],
    ['src/features/customers/bad.ts', '@/adapters/supabase/customers'],
    ['src/features/customers/bad.ts', '../../adapters/supabase/customers'],
    ['src/features/customers/bad.ts', '@supabase/supabase-js'],
    ['src/features/customers/bad.ts', '@/app/layout'],
    ['src/adapters/supabase/bad.ts', '@/features/customers'],
    ['src/adapters/supabase/bad.ts', '@/ui/button'],
    ['src/ui/bad.tsx', '@/features/customers'],
    ['src/ui/bad.tsx', '@/repositories'],
    ['src/ui/bad.tsx', '@/domain/customer'],
    ['src/lib/bad.ts', '@/features/shared/repositories-provider'],
    ['src/app/bad.tsx', '@supabase/supabase-js'],
  ])('%s no puede importar %s', async (file, specifier) => {
    expect(await boundaryErrors(file, use(specifier))).not.toEqual([]);
  });

  it.each([
    ['src/domain/ok.ts', './time'],
    ['src/domain/sub/ok.ts', '../money'],
    ['src/domain/ok.ts', '@/domain/money'],
    ['src/repositories/ok.ts', '@/domain/money'],
    ['src/adapters/supabase/ok.ts', '@/repositories'],
    ['src/adapters/supabase/ok.ts', '@supabase/supabase-js'],
    ['src/features/customers/ok.ts', '@/repositories'],
    ['src/features/customers/ok.ts', '@/ui/button'],
    ['src/features/customers/ok.ts', '../shared/repositories-provider'],
    ['src/ui/ok.tsx', '@/domain/money'],
    ['src/ui/ok.tsx', '@/domain/time'],
    ['src/lib/ok.ts', '@/domain/time'],
    ['src/app/ok.tsx', '@/adapters/supabase/client'],
  ])('%s sí puede importar %s', async (file, specifier) => {
    expect(await boundaryErrors(file, use(specifier))).toEqual([]);
  });
});
