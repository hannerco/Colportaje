import { describe, expect, it } from 'vitest';
import { DEFAULT_PAYMENTS_LIST_PARAMS } from '@/domain/payments-list';
import { paymentsListParamsFromUrl, paymentsListParamsToUrl } from './payments-list-url';

const read = (text: string) => paymentsListParamsFromUrl(new URLSearchParams(text));

describe('lista de abonos ↔ URL (HU-PAN-DIN-01)', () => {
  it('sin nada en la URL es la vista por defecto, y la vista por defecto no escribe nada', () => {
    expect(read('')).toEqual(DEFAULT_PAYMENTS_LIST_PARAMS);
    expect(paymentsListParamsToUrl(DEFAULT_PAYMENTS_LIST_PARAMS).toString()).toBe('');
  });

  it('pestaña, filtros, orden y búsqueda hacen el viaje de ida y vuelta', () => {
    const params = {
      view: 'to_collect' as const,
      method: 'transfer' as const,
      overdueOnly: true,
      search: 'ana',
      sort: { key: 'customer' as const, dir: 'asc' as const },
    };
    const url = paymentsListParamsToUrl(params);
    expect(url.toString()).toBe('vista=por-cobrar&metodo=transferencia&vencidos=1&orden=cliente-asc&q=ana');
    expect(paymentsListParamsFromUrl(url)).toEqual(params);
  });

  it('el orden por defecto de cada pestaña no se escribe (Por cobrar: la más antigua primero)', () => {
    const toCollect = read('vista=por-cobrar');
    expect(toCollect.sort).toEqual({ key: 'agreed_date', dir: 'asc' });
    expect(paymentsListParamsToUrl(toCollect).toString()).toBe('vista=por-cobrar');
  });

  it('un valor desconocido se ignora, y un sentido desconocido usa el de la pestaña', () => {
    expect(read('vista=otra&metodo=cheque&orden=raro-sideways&q=%20')).toEqual(DEFAULT_PAYMENTS_LIST_PARAMS);
    expect(read('orden=cliente-sideways').sort).toEqual({ key: 'customer', dir: 'desc' });
  });
});
