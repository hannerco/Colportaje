import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { createUser } from '../../scripts/lib/create-user';
import { loadCatalog, parseCatalog } from '../../scripts/lib/load-catalog';
import { pool } from '../rls/helpers/db';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const admin = adminClient();
const loadedIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  // Los títulos no se borran por la API (BR-TIT-03): se limpian directo en Postgres.
  if (loadedIds.length > 0) await pool.query('delete from public.title where id = any($1)', [loadedIds]);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  await pool.end();
});

const catalogFile = (ids: string[]) =>
  ids.map((id, i) => ({
    id,
    name: `Título de prueba ${i + 1}`,
    author: null,
    description: null,
    publicPrice: i === 2 ? null : 50_000 + i * 1000,
    colportorPrice: i === 2 ? 1500 : 25_000,
    category: i === 2 ? 'minibook' : 'cultural',
  }));

const countByIds = async (ids: string[]) =>
  (await pool.query<{ n: number }>('select count(*)::int as n from public.title where id = any($1)', [ids]))
    .rows[0]?.n;

describe('script de carga del catálogo (HU-BASE-04)', () => {
  it('CA-1 / R4: correr el script dos veces con 3 títulos deja exactamente 3', async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    loadedIds.push(...ids);
    const file = catalogFile(ids);
    expect(await loadCatalog(admin, parseCatalog(file))).toBe(3);
    expect(await loadCatalog(admin, parseCatalog(file))).toBe(3);
    expect(await countByIds(ids)).toBe(3);
  });

  it('volver a cargar con otro precio actualiza el título en vez de duplicarlo', async () => {
    const [id] = [randomUUID()];
    loadedIds.push(id!);
    const [first] = catalogFile([id!]);
    await loadCatalog(admin, parseCatalog([first]));
    await loadCatalog(admin, parseCatalog([{ ...first, publicPrice: 99_000 }]));
    const { rows } = await pool.query('select public_price from public.title where id = $1', [id]);
    expect(rows).toEqual([{ public_price: 99_000 }]);
  });

  it('CA-2: un cultural sin precio público hace fallar el script nombrando el registro, sin cargar nada', async () => {
    const ids = [randomUUID(), randomUUID()];
    const file = [
      catalogFile([ids[0]!])[0],
      {
        id: ids[1],
        name: 'Cultural sin precio',
        publicPrice: null,
        colportorPrice: 30_000,
        category: 'cultural',
      },
    ];
    expect(() => parseCatalog(file)).toThrow(
      /registro #2 "Cultural sin precio".*publicPrice.*No se cargó nada/,
    );
    expect(await countByIds(ids)).toBe(0);
  });

  it('rechaza un archivo que no es una lista, con campos faltantes o con ids repetidos', () => {
    expect(() => parseCatalog({})).toThrow(/lista/);
    expect(() => parseCatalog([{ id: randomUUID(), name: 'Sin precios', category: 'cultural' }])).toThrow(
      /registro #1 "Sin precios".*publicPrice, colportorPrice/,
    );
    const id = randomUUID();
    expect(() => parseCatalog(catalogFile([id, id]))).toThrow(/registro #2.*id repetido/);
  });
});

describe('TitleRepository contra Supabase local (HU-BASE-04)', () => {
  async function signedInRepository() {
    const email = uniqueEmail('hu-base-04');
    const created = await createUser(admin, {
      email,
      fullName: 'Lectora del catálogo',
      password: 'clave-local-123',
    });
    userIds.push(created.userId);
    const client = anonClient();
    await createSupabaseAuthRepository(() => client).signIn({ email, password: 'clave-local-123' });
    return createSupabaseTitleRepository(() => client);
  }

  const INACTIVE = '00000000-0000-4000-8000-000000000108';
  const ACTIVE = '00000000-0000-4000-8000-000000000101';

  it('CA-5: listActive no trae el título desactivado; getMany sí', async () => {
    const titles = await signedInRepository();
    const active = await titles.listActive();
    expect(active.ok).toBe(true);
    if (!active.ok) return;
    const activeIds = active.value.map((t) => t.id);
    expect(activeIds).toContain(ACTIVE);
    expect(activeIds).not.toContain(INACTIVE);
    expect(active.value.every((t) => t.isActive)).toBe(true);

    const many = await titles.getMany([INACTIVE, ACTIVE, ACTIVE]);
    expect(many.ok && many.value.map((t) => [t.id, t.isActive])).toEqual([
      // Ambos culturales: orden por nombre ("Edición anterior…" antes que "Salud…").
      [INACTIVE, false],
      [ACTIVE, true],
    ]);
  });

  it('listActive viene ordenado por categoría (cultural, religioso, minibook) y mapea los precios', async () => {
    const titles = await signedInRepository();
    const result = await titles.listActive();
    if (!result.ok) throw new Error('listActive falló');
    const categories = result.value.map((t) => t.category);
    expect(categories.indexOf('religious')).toBeGreaterThan(categories.lastIndexOf('cultural'));
    expect(categories.indexOf('minibook')).toBeGreaterThan(categories.lastIndexOf('religious'));
    expect(result.value.find((t) => t.id === '00000000-0000-4000-8000-000000000301')).toMatchObject({
      publicPrice: null,
      colportorPrice: 1500,
      imageUrl: null,
    });
  });

  it('imageUrl es la URL pública de la portada en title-images', async () => {
    const id = randomUUID();
    loadedIds.push(id);
    await loadCatalog(admin, parseCatalog([{ ...catalogFile([id])[0], imagePath: 'portadas/libro.webp' }]));
    const titles = await signedInRepository();
    const result = await titles.getMany([id]);
    expect(result.ok && result.value[0]?.imageUrl).toMatch(
      /\/storage\/v1\/object\/public\/title-images\/portadas\/libro\.webp$/,
    );
  });

  it('getMany sin ids no consulta y devuelve []', async () => {
    const titles = createSupabaseTitleRepository(() => {
      throw new Error('no debería crear el cliente');
    });
    expect(await titles.getMany([])).toEqual({ ok: true, value: [] });
  });
});
