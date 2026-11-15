import { describe, expect, it } from 'vitest';
import {
  buildCustomerListView,
  DEFAULT_CUSTOMER_LIST_PARAMS,
  type CustomerListAccountData,
  type CustomerListCustomer,
  type CustomerListParams,
} from './customer-list';
import {
  buildSearchIndex,
  cleanSearchText,
  searchCustomers,
  SEARCH_FUZZY_THRESHOLD,
  type SearchableCustomer,
} from './customer-search';
import { localDate } from './time';

const TODAY = localDate('2026-11-08');

type Spec = Partial<Omit<SearchableCustomer, 'id'>> & { name: string; titles?: string[] };

/** Conjunto de clientes de prueba (como en la calle): con libros, prospectos y un archivado. */
const SPECS: Record<string, Spec> = {
  mariaGomez: {
    name: 'María Gómez',
    phone: '301 557 9032',
    info: 'Vende arepas',
    address: 'Cra 45 # 10-20, Belén',
    titles: ['Un corazón tranquilo'],
  },
  mariaHenao: { name: 'María Camila Henao', titles: ['Las bellas historias de la Biblia'] },
  marcos: { name: 'Marcos Gil', titles: ['Esperanza para hoy'] },
  carlos: { name: 'Carlos Andrés Gómez', info: 'Hermano de Natalia' }, // prospecto
  natalia: {
    name: 'Natalia Cárdenas',
    info: 'Trabaja en la panadería',
    address: 'Envigado',
    titles: ['El Deseado de todas las gentes'],
  },
  ruben: { name: 'Rubén Darío Vélez', archived: true, titles: ['Esperanza para hoy'] },
  ana: { name: 'Ana Lucía Restrepo', address: 'Sabaneta', phone: '+57 (604) 444-1234', titles: ['Salud'] },
};

const searchable = Object.entries(SPECS).map(([id, s]): SearchableCustomer => ({
  id,
  name: s.name,
  phone: s.phone ?? null,
  info: s.info ?? null,
  address: s.address ?? null,
  archived: s.archived ?? false,
}));
const titles = new Map(Object.entries(SPECS).map(([id, s]) => [id, s.titles ?? []]));
const index = buildSearchIndex(searchable, titles);
const ids = (query: string, includeArchived = false) =>
  searchCustomers(index, query, { includeArchived }).map((h) => h.id);

describe('searchCustomers (HU-CLI-05)', () => {
  it('CA-1 / R2: "maria gomes" encuentra a María Gómez (tildes, mayúsculas y un error)', () => {
    expect(ids('maria gomes')[0]).toBe('mariaGomez');
    expect(ids('MARÍA GÓMEZ')[0]).toBe('mariaGomez');
  });

  it('CA-2 / R1: el teléfono se busca por dígitos, también con espacios o símbolos', () => {
    expect(ids('5579032')).toEqual(['mariaGomez']);
    expect(ids('557 9032')).toEqual(['mariaGomez']);
    expect(ids('4441234')).toEqual(['ana']);
    expect(searchCustomers(index, '5579032')[0]!.score).toBe(0);
  });

  it('CA-3 / R1 / R3: encuentra por un título vendido; tras devolverlo, ya no', () => {
    expect(ids('corazon tranquilo')).toEqual(['mariaGomez']);
    const returned = buildSearchIndex(searchable, new Map([...titles, ['mariaGomez', []]]));
    expect(searchCustomers(returned, 'corazon tranquilo')).toEqual([]);
  });

  it('R1: busca en información y dirección; cada palabra puede caer en un campo distinto', () => {
    expect(ids('panaderia')).toEqual(['natalia']);
    expect(ids('sabaneta')).toEqual(['ana']);
    expect(ids('vende arepa')).toEqual(['mariaGomez']);
    expect(ids('maria corazon')).toEqual(['mariaGomez']);
    expect(ids('natalia envigado')).toEqual(['natalia']);
  });

  it('R2: umbral — tolera errores de una o dos letras y no trae ruido', () => {
    expect(SEARCH_FUZZY_THRESHOLD).toBe(0.3);
    expect(ids('cardenaz')).toEqual(['natalia']);
    expect(ids('restepo')).toEqual(['ana']);
    expect(ids('carlos')).toEqual(['carlos']); // no trae a "Marcos"
    expect(ids('marcos')).toEqual(['marcos']); // no trae a "Carlos"
    expect(ids('xyzw')).toEqual([]);
    // Con un umbral más alto aparece el ruido que el valor elegido evita.
    expect(searchCustomers(index, 'carlos', { threshold: 0.35 }).map((h) => h.id)).toContain('marcos');
  });

  it('R3: no encuentra por número de ejemplar, categoría ni emoji (no están en el índice)', () => {
    expect(ids('religioso')).toEqual([]);
    expect(ids('#12')).toEqual([]);
    expect(ids('🙂')).toEqual([]);
  });

  it('CA-5 / R4: los archivados solo salen con includeArchived', () => {
    expect(ids('ruben')).toEqual([]);
    expect(ids('ruben', true)).toEqual(['ruben']);
    expect(ids('esperanza', true)).toEqual(['marcos', 'ruben']);
  });

  it('una sola letra se permite; una búsqueda vacía o de operadores no devuelve nada', () => {
    expect(ids('a').length).toBeGreaterThan(0);
    expect(ids('   ')).toEqual([]);
    expect(ids("!^='")).toEqual([]);
  });

  it('un cliente sin títulos en el mapa se busca igual por sus datos', () => {
    const solo = buildSearchIndex([{ ...searchable[0]!, id: 'x' }], new Map());
    expect(searchCustomers(solo, 'maria').map((h) => h.id)).toEqual(['x']);
    expect(searchCustomers(solo, 'corazon')).toEqual([]);
  });

  it('R5: el texto sin espacios sobrantes', () => {
    expect(cleanSearchText('  Hernán   Valencia ')).toBe('Hernán Valencia');
  });
});

// ─── Integración con la lista (HU-CLI-04) ──────────────────────────────────────────────────────────
const customers: CustomerListCustomer[] = searchable.map((c) => ({
  ...c,
  avatarEmoji: null,
  createdAt: new Date('2026-10-01T15:00:00Z'),
  updatedAt: new Date('2026-10-01T15:00:00Z'),
}));
const accounts: CustomerListAccountData[] = Object.entries(SPECS).map(([id, s]) => ({
  customerId: id,
  soldCopies: (s.titles ?? []).map((titleName, i) => ({
    copyId: `${id}-${i}`,
    titleName,
    agreedPrice: 100_000,
    soldAt: new Date('2026-10-02T15:00:00Z'),
  })),
  payments: [],
}));
const list = (params: Partial<CustomerListParams>) =>
  buildCustomerListView(customers, accounts, { ...DEFAULT_CUSTOMER_LIST_PARAMS, ...params }, TODAY);

describe('búsqueda en useCustomerList (HU-CLI-05)', () => {
  it('CA-6 / I-13: en Todos aparece el prospecto que coincide aunque el interruptor esté apagado', () => {
    const v = list({ search: 'carlos' });
    expect(v.rows.map((r) => [r.name, r.isProspect])).toEqual([['Carlos Andrés Gómez', true]]);
    expect(v.emptySearch).toBeNull();
  });

  it('las filas salen por relevancia y los conteos de pestañas no cambian', () => {
    // "natalia": el nombre de Natalia pesa más que la información de Carlos ("Hermano de Natalia").
    const v = list({ search: 'natalia' });
    expect(v.rows.map((r) => r.id)).toEqual(['natalia', 'carlos']);
    expect(v.counts).toEqual(list({}).counts);
  });

  it('CA-4: sin resultados → emptySearch con sus dos salidas', () => {
    expect(list({ search: '  Hernán  Valencia ' })).toMatchObject({
      rows: [],
      emptySearch: { query: 'Hernán Valencia', canSearchArchived: true, createName: 'Hernán Valencia' },
    });
    // Con archivados ya incluidos (o en Archivados) no hay a dónde ampliar.
    expect(list({ search: 'Hernán Valencia', includeArchivedInSearch: true }).emptySearch).toMatchObject({
      canSearchArchived: false,
    });
    expect(list({ tab: 'archived', search: 'Hernán Valencia' }).emptySearch).toMatchObject({
      canSearchArchived: false,
    });
  });

  it('CA-5: el archivado sale con "Buscar en Archivados", marcado como archivado', () => {
    expect(list({ search: 'ruben' }).rows).toEqual([]);
    expect(list({ search: 'ruben', includeArchivedInSearch: true }).rows).toMatchObject([
      { name: 'Rubén Darío Vélez', archived: true },
    ]);
    expect(list({ tab: 'archived', search: 'ruben' }).rows).toMatchObject([{ archived: true }]);
    expect(list({ tab: 'archived', search: 'marcos' }).rows).toEqual([]);
  });

  it('la búsqueda actúa dentro de la pestaña y con el filtro de estado', () => {
    // Todos deben 100.000 → Pagando; nadie está Saldado.
    expect(
      list({ tab: 'debtors', search: 'maria' })
        .rows.map((r) => r.id)
        .sort(),
    ).toEqual(['mariaGomez', 'mariaHenao']);
    expect(list({ tab: 'settled', search: 'maria' }).rows).toEqual([]);
    expect(list({ tab: 'debtors', search: 'carlos' }).rows).toEqual([]); // prospecto: sin estado
    expect(list({ search: 'carlos', statusFilter: ['current'] }).rows).toEqual([]);
    expect(
      list({ tab: 'debtors', search: 'esperanza', includeArchivedInSearch: true }).rows.map((r) => r.id),
    ).toEqual(['marcos', 'ruben']);
  });

  it('con igual relevancia y nombre, desempata por id', () => {
    const twins = ['b', 'a'].map((id) => ({ ...customers[2]!, id }));
    const v = buildCustomerListView(twins, [], { ...DEFAULT_CUSTOMER_LIST_PARAMS, search: 'marcos' }, TODAY);
    expect(v.rows.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('con igual relevancia desempata por nombre', () => {
    expect(list({ search: 'esperanza', includeArchivedInSearch: true }).rows.map((r) => r.name)).toEqual([
      'Marcos Gil',
      'Rubén Darío Vélez',
    ]);
  });
});
