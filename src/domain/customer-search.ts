// Búsqueda de clientes (HU-CLI-05, BR-CUS-07, ADR-0014, OQ-21): local y difusa con Fuse.js (utilidad pura,
// sin red), sobre los clientes ya cargados; funciona sin conexión.
import Fuse, { type FuseIndex, type IFuseOptions } from 'fuse.js';
import { businessConfig } from './config/business-config';
import { compareIds, normalizeForSearch } from './text';

/** Lo buscable de un cliente. No entran número de ejemplar, categoría, fotos ni emoji (R3). */
export type SearchableCustomer = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly info: string | null;
  readonly address: string | null;
  readonly archived: boolean;
};

type Doc = {
  readonly id: string;
  readonly archived: boolean;
  readonly name: string;
  readonly info: string;
  readonly address: string;
  readonly books: readonly string[];
  /** Todo junto: deja que cada palabra coincida en un campo distinto ("maria corazon"). */
  readonly all: string;
  readonly phoneDigits: string;
};

export type CustomerSearchIndex = {
  readonly docs: readonly Doc[];
  readonly index: FuseIndex<Doc>;
};

export type SearchHit = { readonly id: string; readonly score: number };

export const SEARCH_FUZZY_THRESHOLD = businessConfig.search.fuzzyThreshold;

const KEYS = [
  { name: 'name', weight: 3 },
  { name: 'info', weight: 1 },
  { name: 'address', weight: 1 },
  { name: 'books', weight: 1 },
  { name: 'all', weight: 0.5 },
];

const fuseOptions = (threshold: number): IFuseOptions<Doc> => ({
  keys: KEYS,
  threshold,
  ignoreLocation: true, // la coincidencia puede estar en cualquier parte del texto
  ignoreFieldNorm: true, // un nombre largo no pierde frente a uno corto
  includeScore: true,
  useExtendedSearch: true, // cada palabra es un término difuso y todas deben coincidir
});

const digitsOf = (text: string | null): string => (text ?? '').replace(/\D/g, '');

/** Sin los caracteres que el modo extendido de Fuse interpreta como operadores. */
const toQuery = (text: string): string => normalizeForSearch(text.replace(/[!^=$'"|]/g, ' '));

/**
 * Índice de búsqueda. `soldTitlesByCustomer` = títulos de los ejemplares que cada cliente **tiene hoy**
 * (vendidos); un libro devuelto ya no está ahí y no se encuentra (R1, R3).
 */
export const buildSearchIndex = (
  customers: readonly SearchableCustomer[],
  soldTitlesByCustomer: ReadonlyMap<string, readonly string[]>,
): CustomerSearchIndex => {
  const docs = customers.map((c): Doc => {
    const books = (soldTitlesByCustomer.get(c.id) ?? []).map(normalizeForSearch);
    const name = normalizeForSearch(c.name);
    const info = normalizeForSearch(c.info ?? '');
    const address = normalizeForSearch(c.address ?? '');
    return {
      id: c.id,
      archived: c.archived,
      name,
      info,
      address,
      books,
      all: [name, info, address, ...books].filter(Boolean).join(' '),
      phoneDigits: digitsOf(c.phone),
    };
  });
  return { docs, index: Fuse.createIndex(KEYS, docs) };
};

/**
 * Resultados por relevancia (`score`: 0 = perfecto), con desempate determinista por id. El teléfono se
 * compara solo por dígitos y por contenido exacto ("5579032" encuentra "301 557 9032", R1). Sin
 * `includeArchived` no devuelve archivados; con él, los agrega (R4). Una búsqueda vacía no devuelve nada.
 */
export const searchCustomers = (
  index: CustomerSearchIndex,
  query: string,
  {
    includeArchived = false,
    threshold = SEARCH_FUZZY_THRESHOLD,
  }: { includeArchived?: boolean; threshold?: number } = {},
): SearchHit[] => {
  const text = toQuery(query);
  if (!text) return [];
  const best = new Map<string, number>();
  const fuse = new Fuse(index.docs, fuseOptions(threshold), index.index);
  // Fuse devuelve cada cliente una sola vez y, con includeScore, siempre con su score.
  for (const hit of fuse.search(text)) best.set(hit.item.id, hit.score!);

  // Teléfono: si lo escrito son dígitos (con espacios, guiones, paréntesis o +), contenido exacto.
  const digits = /^[\d\s()+-]+$/.test(query.trim()) ? digitsOf(query) : '';
  if (digits) for (const doc of index.docs) if (doc.phoneDigits.includes(digits)) best.set(doc.id, 0); // 0 = la mejor relevancia

  const archived = new Set(index.docs.filter((d) => d.archived).map((d) => d.id));
  return [...best]
    .filter(([id]) => includeArchived || !archived.has(id))
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => a.score - b.score || compareIds(a.id, b.id));
};

/** R5: el texto buscado sin espacios sobrantes (para "Crear «texto»"). */
export const cleanSearchText = (text: string): string => text.replace(/\s+/g, ' ').trim();
