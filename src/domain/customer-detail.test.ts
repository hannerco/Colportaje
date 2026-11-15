import { describe, expect, it } from 'vitest';
import { buildCustomerDetail, contactLinks, type CustomerDetailInput } from './customer-detail';
import { localDate } from './time';

const TODAY = localDate('2026-11-05');
let seq = 0;

type PaymentInput = CustomerDetailInput['payments'][number];
const payment = (over: Partial<PaymentInput>): PaymentInput => {
  seq += 1;
  return {
    id: `p-${String(seq).padStart(2, '0')}`,
    customerId: 'c1',
    kind: 'scheduled',
    status: 'scheduled',
    originalDueDate: null,
    dueDate: null,
    paidAt: null,
    agreedAmount: null,
    paidAmount: null,
    method: null,
    canceledAt: null,
    cancelReason: null,
    createdAt: new Date(Date.UTC(2026, 9, 3, 15, 0, seq)),
    deposit: null,
    rescheduleCount: 0,
    ...over,
  };
};
const scheduled = (due: string, amount = 60_000, over: Partial<PaymentInput> = {}) =>
  payment({ dueDate: localDate(due), originalDueDate: localDate(due), agreedAmount: amount, ...over });

const customer = (over: Partial<CustomerDetailInput['customer']> = {}): CustomerDetailInput['customer'] => ({
  id: 'c1',
  name: 'María Camila Henao',
  avatarEmoji: '🌻',
  phone: '301 557 9032',
  info: 'Vende arepas',
  address: 'Cl. 48 #79-25, Laureles, Medellín',
  mapsUrl: null,
  latitude: null,
  longitude: null,
  accuracyMeters: null,
  archived: false,
  createdAt: new Date('2026-10-03T14:00:00Z'),
  ...over,
});

const book = (
  copyId: string,
  titleName: string,
  agreedPrice: number,
  soldAt: string,
  publicPrice = agreedPrice,
) => ({
  copyId,
  titleName,
  category: 'religious' as const,
  number: 1,
  agreedPrice,
  publicPriceSnapshot: publicPrice,
  soldAt: new Date(soldAt),
});

/** CA-1: 3 libros por 460.000, cuota inicial de 80.000 (transferencia, 03/10), abonos 17/10, 31/10 y 14/11, un cancelado. */
const henao = (): CustomerDetailInput => ({
  customer: customer(),
  soldCopies: [
    book('k3', 'Las bellas historias de la Biblia', 200_000, '2026-10-03T15:02:00Z'),
    book('k1', 'El Deseado de todas las gentes', 140_000, '2026-10-03T15:00:00Z'),
    book('k2', 'Esperanza para hoy', 120_000, '2026-10-03T15:01:00Z', 130_000),
  ],
  payments: [
    scheduled('2026-11-14'),
    payment({
      kind: 'down_payment',
      status: 'collected',
      dueDate: localDate('2026-10-03'),
      originalDueDate: localDate('2026-10-03'),
      paidAt: localDate('2026-10-03'),
      paidAmount: 80_000,
      method: 'transfer',
    }),
    scheduled('2026-10-17'),
    scheduled('2026-10-31'),
    scheduled('2026-11-30', 40_000, {
      status: 'canceled',
      canceledAt: new Date('2026-10-20T15:00:00Z'),
      cancelReason: 'manual',
    }),
  ],
});

describe('buildCustomerDetail (HU-CLI-12)', () => {
  it('CA-1: cuenta, abonos activos por fecha con vencido, Cobrar en los por cobrar y un cancelado aparte', () => {
    const d = buildCustomerDetail(henao(), TODAY);
    expect(d.account).toMatchObject({
      balance: 380_000,
      paidTotal: 80_000,
      debt: 460_000,
      standing: 'overdue',
    });
    expect(d.payments.map((p) => [p.kind, p.dueDate ?? p.paidAt, p.isOverdue, p.can.collect])).toEqual([
      ['down_payment', '2026-10-03', false, false],
      ['scheduled', '2026-10-17', true, true],
      ['scheduled', '2026-10-31', true, true],
      ['scheduled', '2026-11-14', false, true],
    ]);
    expect(d.payments[1]!.overdueDays).toBe(19);
    expect(d.canceledPayments).toHaveLength(1);
    expect(d.canceledPayments[0]).toMatchObject({
      status: 'canceled',
      cancelReason: 'manual',
      can: {
        collect: false,
        edit: false,
        delete: false,
        reschedule: false,
        correctDate: false,
        cancel: false,
      },
    });
  });

  it('libros por fecha de venta con su diferencia; fechas de venta y "Cliente desde"', () => {
    const d = buildCustomerDetail(henao(), TODAY);
    expect(d.books.map((b) => [b.copyId, b.priceDelta])).toEqual([
      ['k1', null],
      ['k2', -10_000],
      ['k3', null],
    ]);
    expect(d.firstSaleAt).toEqual(new Date('2026-10-03T15:00:00Z'));
    expect(d.lastSaleAt).toEqual(new Date('2026-10-03T15:02:00Z'));
    expect(d.customerSince).toBe('2026-10-03');
  });

  it('CA-2 / R1: llamar y WhatsApp con indicativo; sin teléfono no hay botones', () => {
    expect(buildCustomerDetail(henao(), TODAY).contact).toEqual({
      phone: '301 557 9032',
      telLink: 'tel:3015579032',
      whatsappLink: 'https://wa.me/573015579032',
    });
    expect(contactLinks('+57 300 123 4567')).toMatchObject({
      telLink: 'tel:573001234567',
      whatsappLink: 'https://wa.me/573001234567',
    });
    expect(contactLinks(null)).toBeNull();
    expect(contactLinks('  ')).toBeNull();
    expect(contactLinks('sin número')).toBeNull();
  });

  it('CA-3 / R4: prorrogado del 17/10 al 31/10 → fecha original tachada y una prórroga', () => {
    const input = henao();
    const d = buildCustomerDetail(
      {
        ...input,
        payments: [
          scheduled('2026-10-31', 60_000, { originalDueDate: localDate('2026-10-17'), rescheduleCount: 1 }),
        ],
      },
      TODAY,
    );
    expect(d.payments[0]).toMatchObject({
      dueDate: '2026-10-31',
      originalDueDate: '2026-10-17',
      rescheduleCount: 1,
    });
    // Sin prórroga, la fecha original no viene.
    expect(buildCustomerDetail(henao(), TODAY).payments[1]!.originalDueDate).toBeNull();
  });

  it('CA-4 / R3: en un Abibono confirmado no se edita ni se borra', () => {
    const d = buildCustomerDetail(
      {
        ...henao(),
        payments: [
          payment({
            kind: 'extra',
            status: 'delivered',
            paidAt: localDate('2026-10-10'),
            paidAmount: 50_000,
            method: 'cash',
            deposit: { id: 'd1', status: 'confirmed' },
          }),
          payment({
            kind: 'extra',
            status: 'collected',
            paidAt: localDate('2026-10-11'),
            paidAmount: 10_000,
            method: 'cash',
            deposit: { id: 'd2', status: 'draft' },
          }),
        ],
      },
      TODAY,
    );
    expect(d.payments[0]).toMatchObject({
      deposit: { id: 'd1', status: 'confirmed' },
      can: { collect: false, edit: false, delete: false, reschedule: false, cancel: false },
    });
    // En un borrador todavía se corrige (BR-PAY-10 solo bloquea lo entregado).
    expect(d.payments[1]!.can).toMatchObject({ edit: true, delete: true, collect: false });
  });

  it('CA-5: sin libros y con una cuota cobrada → aviso "Aún no tiene libro"; sobrante → franja', () => {
    const noBook = buildCustomerDetail(
      {
        customer: customer(),
        soldCopies: [],
        payments: [
          payment({
            kind: 'extra',
            status: 'collected',
            paidAt: localDate('2026-10-10'),
            paidAmount: 20_000,
            method: 'cash',
          }),
        ],
      },
      TODAY,
    );
    expect(noBook.notices).toEqual({ noBook: true, excess: null });
    const excess = buildCustomerDetail(
      {
        customer: customer(),
        soldCopies: [book('k1', 'Salud', 50_000, '2026-10-03T15:00:00Z')],
        payments: [scheduled('2026-11-20', 80_000)],
      },
      TODAY,
    );
    expect(excess.notices).toEqual({ noBook: false, excess: { amount: 30_000 } });
  });

  it('R2: un cliente archivado no tiene Cobrar ni acciones de por cobrar; sus cobrados sí se corrigen', () => {
    const input = henao();
    const d = buildCustomerDetail({ ...input, customer: customer({ archived: true }) }, TODAY);
    expect(d.archived).toBe(true);
    expect(
      d.payments.filter((p) => p.status === 'scheduled').every((p) => !p.can.collect && !p.can.reschedule),
    ).toBe(true);
    expect(d.payments[0]!.can).toMatchObject({ edit: true, delete: true });
  });

  it('ubicación con "aproximada" y enlace de Maps; sin coordenadas, el enlace usa la dirección', () => {
    const withLocation = buildCustomerDetail(
      { ...henao(), customer: customer({ latitude: 6.2518, longitude: -75.5915, accuracyMeters: 80 }) },
      TODAY,
    );
    expect(withLocation.location).toEqual({
      latitude: 6.2518,
      longitude: -75.5915,
      accuracyMeters: 80,
      isApproximate: true,
    });
    expect(withLocation.mapsLink).toBe('https://www.google.com/maps/search/?api=1&query=6.2518,-75.5915');
    const without = buildCustomerDetail(henao(), TODAY);
    expect(without.location).toBeNull();
    expect(without.mapsLink).toContain('query=Cl.%2048');
  });

  it('a igual fecha, el creado antes primero y luego por id; sin fecha va primero', () => {
    const same = new Date('2026-10-03T15:00:00Z');
    const a = scheduled('2026-11-20', 1, { id: 'b', createdAt: same });
    const b = scheduled('2026-11-20', 1, { id: 'a', createdAt: same });
    const c = scheduled('2026-11-20', 1, { id: 'c', createdAt: new Date('2026-10-01T15:00:00Z') });
    const odd: PaymentInput = { ...scheduled('2026-11-20'), id: 'z', dueDate: null } as PaymentInput;
    const d = buildCustomerDetail({ ...henao(), payments: [a, b, c, odd] }, TODAY);
    expect(d.payments.map((p) => p.paymentId)).toEqual(['z', 'c', 'a', 'b']);
    const twins = [book('y', 'A', 1, '2026-10-03T15:00:00Z'), book('x', 'B', 1, '2026-10-03T15:00:00Z')];
    expect(buildCustomerDetail({ ...henao(), soldCopies: twins }, TODAY).books.map((x) => x.copyId)).toEqual([
      'x',
      'y',
    ]);
  });
});
