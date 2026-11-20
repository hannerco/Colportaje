import { describe, expect, it } from 'vitest';
import { DEFAULT_CUSTOMER_LIST_PARAMS as DEFAULTS } from '@/domain/customer-list';
import { aCustomerListView } from '@/test-support/fixtures';
import { customerListScreenState as stateOf } from './customer-list-screen-state';

const base = { params: DEFAULTS, loading: false, error: false, isOnline: true };
const emptyView = aCustomerListView({ rows: [] });

describe('estados de la lista de clientes (HU-PAN-CLI-01)', () => {
  it('sin datos: cargando, error o sin conexión', () => {
    expect(stateOf({ ...base, view: undefined, loading: true })).toEqual({ kind: 'loading' });
    expect(stateOf({ ...base, view: undefined, error: true })).toEqual({ kind: 'error' });
    expect(stateOf({ ...base, view: undefined, error: true, isOnline: false })).toEqual({
      kind: 'offline-empty',
    });
  });

  it('con filas, lista (también sin conexión: se consulta lo guardado, R2)', () => {
    expect(stateOf({ ...base, view: aCustomerListView(), isOnline: false })).toEqual({ kind: 'ready' });
  });

  it('CA-5: la búsqueda sin coincidencias trae sus dos salidas', () => {
    const view = aCustomerListView({
      rows: [],
      emptySearch: { query: 'Marta', canSearchArchived: true, createName: 'Marta' },
    });
    expect(stateOf({ ...base, params: { ...DEFAULTS, search: 'Marta' }, view })).toEqual({
      kind: 'no-results',
      query: 'Marta',
      canSearchArchived: true,
      createName: 'Marta',
    });
  });

  it('vacío: sin clientes en Todos, pestaña vacía, o filtros sin coincidencias', () => {
    expect(stateOf({ ...base, view: emptyView })).toEqual({ kind: 'empty' });
    expect(stateOf({ ...base, params: { ...DEFAULTS, tab: 'archived' }, view: emptyView })).toEqual({
      kind: 'empty-tab',
    });
    expect(stateOf({ ...base, params: { ...DEFAULTS, statusFilter: ['overdue'] }, view: emptyView })).toEqual(
      {
        kind: 'filtered',
      },
    );
  });
});
