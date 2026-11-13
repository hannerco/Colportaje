import { describe, expect, it } from 'vitest';
import type { CopyEvent, CopyStatus } from './copy';
import {
  buildCopyDetail,
  buildHistory,
  copyCapabilities,
  validateReceivedDate,
  type DetailCopy,
} from './copy-detail';
import { localDate } from './time';

const MARIA = { id: 'c-maria', name: 'María Camila Henao', avatarEmoji: '🌻' };

const event = (
  id: string,
  type: CopyEvent['type'],
  at: string,
  data: CopyEvent['data'] = {},
  note: string | null = null,
): CopyEvent => ({
  id,
  type,
  at: new Date(at),
  note,
  data,
});

/** CA-1: Psiconutrición #6, recibido 20/10, vendido 02/11 por 98.000 y luego acordado en 93.000. */
const PSICO_6: DetailCopy = {
  id: 'psico-6',
  titleId: 't-psico',
  number: 6,
  status: 'sold',
  customerId: MARIA.id,
  agreedPrice: 93_000,
  publicPriceSnapshot: 98_000,
  receivedAt: localDate('2026-10-20'),
  soldAt: new Date('2026-11-02T15:00:00Z'),
  deletedAt: null,
};

const PSICO_EVENTS = [
  event('e3', 'price_changed', '2026-11-02T15:05:00Z', { oldPrice: 98_000, newPrice: 93_000 }),
  event('e2', 'sold', '2026-11-02T15:00:00Z', { customerId: MARIA.id, agreedPrice: 98_000 }),
  event('e1', 'received', '2026-10-20T15:00:00Z', { newDate: localDate('2026-10-20') }),
];

describe('copy-detail: detalle (HU-INV-05)', () => {
  it('CA-1: Psiconutrición #6 → María Camila Henao, 93.000, −5.000, vendido 02/11, recibido 20/10 e historial en orden', () => {
    const detail = buildCopyDetail({
      copy: PSICO_6,
      title: { name: 'Psiconutrición', imageUrl: null, category: 'cultural' },
      customers: [MARIA],
      openIssue: null,
      events: PSICO_EVENTS,
    });
    expect(detail).toMatchObject({
      copyId: 'psico-6',
      titleName: 'Psiconutrición',
      number: 6,
      status: 'sold',
      customer: MARIA,
      agreedPrice: 93_000,
      publicPriceSnapshot: 98_000,
      priceDelta: -5_000,
      soldAt: new Date('2026-11-02T15:00:00Z'),
      receivedAt: '2026-10-20',
      openIssue: null,
    });
    expect(detail.history.map((h) => [h.type, h.at.toISOString().slice(0, 10)])).toEqual([
      ['price_changed', '2026-11-02'],
      ['sold', '2026-11-02'],
      ['received', '2026-10-20'],
    ]);
    expect(detail.history[0]?.data).toEqual({ oldPrice: 98_000, newPrice: 93_000 });
    expect(detail.history[1]?.data).toEqual({
      customerId: MARIA.id,
      agreedPrice: 98_000,
      customerName: 'María Camila Henao',
    });
    expect(detail.history.every((h) => h.undo === 'none')).toBe(true);
  });

  it('en físico: sin cliente ni precio acordado, con su novedad abierta si la tiene', () => {
    const detail = buildCopyDetail({
      copy: { ...PSICO_6, status: 'flagged', customerId: null, agreedPrice: null, soldAt: null },
      title: { name: 'Psiconutrición', imageUrl: 'https://img/x.webp', category: 'cultural' },
      customers: [MARIA],
      openIssue: { note: 'El líder dice 4', createdAt: new Date('2026-11-03T15:00:00Z') },
      events: [],
    });
    expect(detail).toMatchObject({
      customer: null,
      agreedPrice: null,
      priceDelta: null,
      imageUrl: 'https://img/x.webp',
      openIssue: { note: 'El líder dice 4' },
    });
  });

  it('un cliente que no llegó no rompe el detalle ni el historial', () => {
    const detail = buildCopyDetail({
      copy: PSICO_6,
      title: { name: 'Psiconutrición', imageUrl: null, category: 'cultural' },
      customers: [],
      openIssue: null,
      events: PSICO_EVENTS,
    });
    expect(detail.customer).toBeNull();
    expect(detail.history[1]?.data).toEqual({ customerId: MARIA.id, agreedPrice: 98_000 });
  });
});

describe('copy-detail: qué se puede deshacer (undo)', () => {
  it('CA-3: "El camino a Cristo #2" devuelto al líder con nota → ese evento lleva undo = returned_to_leader', () => {
    const events = [
      event('r', 'returned_to_leader', '2026-11-03T15:00:00Z', {}, 'Fin de campaña'),
      event('a', 'received', '2026-10-01T15:00:00Z'),
    ];
    const history = buildHistory(events, 'returned_to_leader', []);
    expect(history.map((h) => [h.eventId, h.undo, h.note])).toEqual([
      ['r', 'returned_to_leader', 'Fin de campaña'],
      ['a', 'none', null],
    ]);
  });

  it('un "Devuelto al líder" ya deshecho no se puede deshacer otra vez', () => {
    const events = [
      event('u', 'undo_returned_to_leader', '2026-11-04T15:00:00Z'),
      event('r', 'returned_to_leader', '2026-11-03T15:00:00Z'),
    ];
    expect(buildHistory(events, 'in_stock', []).every((h) => h.undo === 'none')).toBe(true);
  });

  it.each([
    ['found', 'in_stock'],
    ['lost', 'lost'],
  ] as const)('una resolución "%s" vigente se puede deshacer', (resolution, status) => {
    const events = [
      event('fecha', 'received_date_changed', '2026-11-05T15:00:00Z'), // no cambia el estado: no tapa la resolución
      event('res', 'resolved', '2026-11-04T15:00:00Z', { resolution }),
      event('flag', 'flagged', '2026-11-03T15:00:00Z', {}, 'Faltó uno'),
    ];
    expect(buildHistory(events, status, []).map((h) => h.undo)).toEqual(['none', 'resolution', 'none']);
  });

  it.each([
    ['found', 'si después se vendió', 'sold'],
    ['lost', 'si ya se deshizo', 'flagged'],
    ['removed', 'si fue "Eliminar"', 'in_stock'],
  ] as const)('una resolución "%s" no se deshace %s', (resolution, why, status) => {
    const events = [event('res', 'resolved', '2026-11-04T15:00:00Z', { resolution })];
    expect(buildHistory(events, status as CopyStatus, [])[0]?.undo, why).toBe('none');
  });

  it('solo el cambio de estado más reciente: una resolución antigua tapada por una venta no se deshace', () => {
    const events = [
      event('ret', 'returned', '2026-11-06T15:00:00Z'),
      event('sold', 'sold', '2026-11-05T15:00:00Z'),
      event('res', 'resolved', '2026-11-04T15:00:00Z', { resolution: 'found' }),
    ];
    expect(buildHistory(events, 'in_stock', []).every((h) => h.undo === 'none')).toBe(true);
  });

  it('sin eventos no hay nada que deshacer', () => {
    expect(buildHistory([], 'in_stock', [])).toEqual([]);
  });
});

describe('copy-detail: acciones permitidas (R3)', () => {
  const base = { deletedAt: null, agreedPrice: null, publicPriceSnapshot: 98_000 };

  it('CA-4: en físico → marcar novedad y eliminar sí; precio acordado no', () => {
    expect(copyCapabilities({ ...base, status: 'in_stock' }, 'cultural')).toEqual({
      editAgreedPrice: false,
      restorePublicPrice: false,
      editReceivedAt: true,
      flag: true,
      delete: true,
      returnFromCustomer: false,
    });
  });

  it('vendido: precio acordado y devolver; restaurar el público solo si el precio es distinto', () => {
    expect(copyCapabilities({ ...base, status: 'sold', agreedPrice: 93_000 }, 'cultural')).toEqual({
      editAgreedPrice: true,
      restorePublicPrice: true,
      editReceivedAt: true,
      flag: false,
      delete: false,
      returnFromCustomer: true,
    });
    expect(
      copyCapabilities({ ...base, status: 'sold', agreedPrice: 98_000 }, 'cultural').restorePublicPrice,
    ).toBe(false);
  });

  it('un minibook vendido no edita precio ni se devuelve de un cliente', () => {
    expect(copyCapabilities({ ...base, status: 'sold', agreedPrice: 1_500 }, 'minibook')).toMatchObject({
      editAgreedPrice: false,
      restorePublicPrice: false,
      returnFromCustomer: false,
    });
  });

  it('con novedad: eliminar sí, marcar novedad no', () => {
    expect(copyCapabilities({ ...base, status: 'flagged' }, 'cultural')).toMatchObject({
      flag: false,
      delete: true,
    });
  });

  it.each(['lost', 'returned_to_leader'] as const)('%s: ni marcar ni eliminar', (status) => {
    expect(copyCapabilities({ ...base, status }, 'cultural')).toMatchObject({
      flag: false,
      delete: false,
      editReceivedAt: true,
    });
  });

  it('borrado: nada, ni la fecha de recibido', () => {
    expect(copyCapabilities({ ...base, status: 'in_stock', deletedAt: new Date() }, 'cultural')).toEqual({
      editAgreedPrice: false,
      restorePublicPrice: false,
      editReceivedAt: false,
      flag: false,
      delete: false,
      returnFromCustomer: false,
    });
  });
});

describe('copy-detail: fecha de recibido (R1, BR-COPY-04)', () => {
  const today = localDate('2026-11-08');
  const soldAt = new Date('2026-11-02T15:00:00Z');

  it('CA-2: vendido el 02/11 → el 03/11 da DATE_AFTER_SALE; el 28/10 se acepta', () => {
    expect(validateReceivedDate(localDate('2026-11-03'), today, soldAt)).toEqual({
      ok: false,
      error: { code: 'DATE_AFTER_SALE', retryable: false },
    });
    expect(validateReceivedDate(localDate('2026-10-28'), today, soldAt)).toEqual({
      ok: true,
      value: '2026-10-28',
    });
    expect(validateReceivedDate(localDate('2026-11-02'), today, soldAt).ok).toBe(true);
  });

  it('no puede ser futura; sin venta solo aplica hoy', () => {
    expect(validateReceivedDate(localDate('2026-11-09'), today, null)).toEqual({
      ok: false,
      error: { code: 'DATE_IN_FUTURE', retryable: false },
    });
    expect(validateReceivedDate(today, today, null).ok).toBe(true);
  });

  it('la venta se compara en Bogotá: vendido el 02/11 a las 10:30 p. m. acepta el 02/11', () => {
    expect(validateReceivedDate(localDate('2026-11-02'), today, new Date('2026-11-03T03:30:00Z')).ok).toBe(
      true,
    );
    expect(validateReceivedDate(localDate('2026-11-03'), today, new Date('2026-11-03T03:30:00Z')).ok).toBe(
      false,
    );
  });
});
