// Carga idempotente del catálogo (HU-BASE-04, BR-TIT-06). Usa la service_role:
// SOLO en la máquina del dueño o en pruebas locales.
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '../../src/adapters/supabase/database.types';
import { validateTitleRecord, type TitleRecord } from '../../src/domain/title';

/** Formato de cada registro de scripts/data/catalog.json (ver catalog.example.json). */
const recordShape = z.object({
  id: z.string(),
  name: z.string(),
  author: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  imagePath: z.string().nullable().default(null),
  publicPrice: z.number().nullable(),
  colportorPrice: z.number(),
  category: z.enum(['cultural', 'religious', 'minibook']),
  isActive: z.boolean().default(true),
});

const describeRecord = (raw: unknown, index: number): string => {
  const candidate = raw as { id?: unknown; name?: unknown } | null;
  const name = typeof candidate?.name === 'string' ? ` "${candidate.name}"` : '';
  const id = typeof candidate?.id === 'string' ? ` (${candidate.id})` : '';
  return `registro #${index + 1}${name}${id}`;
};

/**
 * Valida TODO el archivo antes de escribir: si un registro falla, lanza nombrándolo
 * y no se carga nada (CA-2).
 */
export function parseCatalog(data: unknown): TitleRecord[] {
  if (!Array.isArray(data)) throw new Error('El catálogo debe ser una lista (arreglo JSON) de títulos.');
  const records = data.map((raw, index) => {
    const shape = recordShape.safeParse(raw);
    if (!shape.success) {
      const fields = [...new Set(shape.error.issues.map((i) => i.path.join('.')))].join(', ');
      throw new Error(
        `Catálogo inválido, ${describeRecord(raw, index)}: revisa ${fields}. No se cargó nada.`,
      );
    }
    const valid = validateTitleRecord(shape.data);
    if (!valid.ok) {
      const field = String(valid.error.details?.field ?? '');
      throw new Error(
        `Catálogo inválido, ${describeRecord(raw, index)}: ${field} no cumple BR-TIT-04. No se cargó nada.`,
      );
    }
    return valid.value;
  });
  const ids = new Set<string>();
  records.forEach((record, index) => {
    if (ids.has(record.id)) {
      throw new Error(`Catálogo inválido, ${describeRecord(record, index)}: id repetido. No se cargó nada.`);
    }
    ids.add(record.id);
  });
  return records;
}

/**
 * Upsert por id en una sola petición (todo o nada). Recargar el mismo archivo deja lo mismo (R4).
 * Los títulos que no vienen en el archivo no se tocan; para retirar uno se marca `isActive: false` (BR-TIT-03).
 * Autor, descripción y portada vacíos en el archivo **no borran** lo que ya tenga el título: así recargar la lista de
 * precios no deshace lo que el admin completó en Admin · Catálogo (HU-PAN-ADM-01).
 */
export async function loadCatalog(
  admin: SupabaseClient<Database>,
  records: readonly TitleRecord[],
): Promise<number> {
  if (records.length === 0) return 0;
  const { data: current, error: readError } = await admin
    .from('title')
    .select('id, author, description, image_path')
    .in(
      'id',
      records.map((r) => r.id),
    );
  if (readError) throw new Error(`No se pudo leer el catálogo actual: ${readError.message}`);
  const existing = new Map(current.map((row) => [row.id, row]));
  const { error } = await admin.from('title').upsert(
    records.map((r) => {
      const before = existing.get(r.id);
      return {
        id: r.id,
        name: r.name,
        author: r.author ?? before?.author ?? null,
        description: r.description ?? before?.description ?? null,
        image_path: r.imagePath ?? before?.image_path ?? null,
        public_price: r.publicPrice,
        colportor_price: r.colportorPrice,
        category: r.category,
        is_active: r.isActive,
      };
    }),
    { onConflict: 'id' },
  );
  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  return records.length;
}
