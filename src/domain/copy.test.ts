import { describe, expect, it } from 'vitest';
import {
  countsAsCustomerReturn,
  apply,
  canTransition,
  COPY_ACTIONS,
  COPY_TRANSITIONS,
  copyStateOf,
  priceDelta,
  priceDiffers,
  type Copy,
  type CopyAction,
  type CopyActionType,
  type CopyState,
} from './copy';
import { localDate } from './time';

const SOLD_AT = new Date('2026-11-08T15:00:00Z');
const DELETED_AT = new Date('2026-11-08T16:00:00Z');

const aCopy = (overrides: Partial<Copy> = {}): Copy => ({
  id: 'copy-1',
  titleId: 'title-1',
  number: 12,
  status: 'in_stock',
  customerId: null,
  agreedPrice: null,
  publicPriceSnapshot: 50_000,
  colportorPriceSnapshot: 25_000,
  receivedAt: localDate('2026-10-01'),
  soldAt: null,
  deletedAt: null,
  ...overrides,
});

const soldCopy = (agreedPrice: number, overrides: Partial<Copy> = {}) =>
  aCopy({ status: 'sold', customerId: 'customer-1', agreedPrice, soldAt: SOLD_AT, ...overrides });

const STATES: CopyState[] = ['in_stock', 'sold', 'flagged', 'lost', 'returned_to_leader', 'deleted'];

/** Un ejemplar en el estado pedido. */
const copyIn = (state: CopyState): Copy =>
  state === 'deleted'
    ? aCopy({ deletedAt: DELETED_AT })
    : state === 'sold'
      ? soldCopy(50_000)
      : aCopy({ status: state });

const actionOf = (type: CopyActionType): CopyAction =>
  type === 'sell'
    ? { type, customerId: 'customer-1', agreedPrice: 45_000, soldAt: SOLD_AT }
    : type === 'delete' || type === 'resolve_removed'
      ? { type, at: DELETED_AT }
      : ({ type } as CopyAction);

/** Tabla esperada (DOMAIN-MODEL "Máquinas de estados", ADR-0043). */
const EXPECTED: Record<CopyActionType, [from: CopyState, to: CopyState | 'previous']> = {
  sell: ['in_stock', 'sold'],
  return: ['sold', 'in_stock'],
  flag: ['in_stock', 'flagged'],
  resolve_found: ['flagged', 'in_stock'],
  resolve_lost: ['flagged', 'lost'],
  resolve_removed: ['flagged', 'deleted'],
  undo_found: ['in_stock', 'flagged'],
  undo_lost: ['lost', 'flagged'],
  delete: ['in_stock', 'deleted'],
  undo_delete: ['deleted', 'previous'],
  return_to_leader: ['in_stock', 'returned_to_leader'],
  undo_return_to_leader: ['returned_to_leader', 'in_stock'],
};

describe('copy: máquina de estados (HU-INV-01 R3)', () => {
  it('la tabla única tiene exactamente las transiciones del modelo de dominio', () => {
    expect(
      Object.fromEntries(COPY_ACTIONS.map((a) => [a, [COPY_TRANSITIONS[a].from, COPY_TRANSITIONS[a].to]])),
    ).toEqual(EXPECTED);
  });

  describe.each(COPY_ACTIONS)('%s', (action) => {
    const [validFrom] = EXPECTED[action];

    it.each(STATES)(`desde %s`, (state) => {
      const allowed = state === validFrom;
      expect(canTransition(state, action)).toBe(allowed);
      const result = apply(copyIn(state), actionOf(action));
      if (allowed) {
        expect(result.ok).toBe(true);
      } else {
        expect(result).toEqual({
          ok: false,
          error: { code: 'INVALID_TRANSITION', retryable: false, details: { from: state, action } },
        });
      }
    });
  });

  it('CA-7: vender un ejemplar perdido da INVALID_TRANSITION', () => {
    const result = apply(aCopy({ status: 'lost' }), actionOf('sell'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_TRANSITION');
  });

  it('BR-COPY-06: vender pone cliente, precio acordado y fecha de venta', () => {
    const result = apply(aCopy(), actionOf('sell'));
    expect(result.ok && result.value).toEqual(
      soldCopy(45_000, { customerId: 'customer-1', soldAt: SOLD_AT }),
    );
  });

  it('BR-COPY-08 / BR-COPY-09: devolver quita cliente, precio y fecha de venta, y conserva received_at', () => {
    const result = apply(soldCopy(45_000), { type: 'return' });
    expect(result.ok && result.value).toEqual(aCopy());
  });

  it('un vendido no se marca con novedad directamente: primero se devuelve', () => {
    expect(canTransition('sold', 'flag')).toBe(false);
  });

  it('BR-COPY-17: eliminar es lógico y conserva el estado; deshacer lo devuelve al estado anterior', () => {
    const deleted = apply(aCopy(), actionOf('delete'));
    expect(deleted.ok && deleted.value).toEqual(aCopy({ deletedAt: DELETED_AT }));
    const restored = deleted.ok ? apply(deleted.value, { type: 'undo_delete' }) : deleted;
    expect(restored.ok && restored.value).toEqual(aCopy());

    const removedIssue = apply(aCopy({ status: 'flagged' }), actionOf('resolve_removed'));
    expect(removedIssue.ok && copyStateOf(removedIssue.value)).toBe('deleted');
    const back = removedIssue.ok ? apply(removedIssue.value, { type: 'undo_delete' }) : removedIssue;
    expect(back.ok && back.value.status).toBe('flagged');
  });

  it('R5: un ejemplar eliminado solo admite deshacer la eliminación', () => {
    for (const action of COPY_ACTIONS) {
      expect(canTransition('deleted', action)).toBe(action === 'undo_delete');
    }
  });

  it('el sell sin precio acordado válido se rechaza (COP entero ≥ 0)', () => {
    const result = apply(aCopy(), { type: 'sell', customerId: 'c', agreedPrice: 12.5, soldAt: SOLD_AT });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'agreedPrice' } },
    });
  });
});

describe('copy: precio distinto y diferencia (BR-PRC-01/02)', () => {
  it('CA-6: público 50.000 y acordado 45.000 → difiere, diferencia −5.000 (descuento)', () => {
    expect(priceDiffers(soldCopy(45_000))).toBe(true);
    expect(priceDelta(soldCopy(45_000))).toBe(-5000);
  });

  it('CA-6: acordado 55.000 → diferencia +5.000 (aumento)', () => {
    expect(priceDelta(soldCopy(55_000))).toBe(5000);
  });

  it('CA-6: acordado igual al público → no difiere y no hay diferencia', () => {
    expect(priceDiffers(soldCopy(50_000))).toBe(false);
    expect(priceDelta(soldCopy(50_000))).toBeNull();
  });

  it('un minibook sin precio público nunca tiene precio distinto', () => {
    const minibook = soldCopy(1500, { publicPriceSnapshot: null });
    expect(priceDiffers(minibook)).toBe(false);
    expect(priceDelta(minibook)).toBeNull();
  });

  it('BR-PRC-01: un minibook con precio público tampoco cuenta; un ejemplar sin vender no difiere', () => {
    expect(priceDiffers({ ...soldCopy(2000, { publicPriceSnapshot: 3000 }), category: 'minibook' })).toBe(
      false,
    );
    expect(priceDiffers(aCopy())).toBe(false);
    expect(priceDelta(aCopy({ status: 'sold', agreedPrice: null }))).toBeNull();
  });
});

describe('countsAsCustomerReturn (HU-CLI-10 R5)', () => {
  it('solo un returned con customer_returned cuenta como devolución', () => {
    expect(countsAsCustomerReturn({ type: 'returned', data: { reason: 'customer_returned' } })).toBe(true);
    expect(countsAsCustomerReturn({ type: 'returned', data: { reason: 'wrong_registration' } })).toBe(false);
    expect(countsAsCustomerReturn({ type: 'returned', data: {} })).toBe(false);
    expect(countsAsCustomerReturn({ type: 'sold', data: { reason: 'customer_returned' } })).toBe(false);
  });
});
