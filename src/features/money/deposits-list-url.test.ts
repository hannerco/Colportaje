import { describe, expect, it } from 'vitest';
import { DEFAULT_DEPOSITS_LIST_PARAMS } from '@/domain/deposits-list';
import { depositsListParamsFromUrl, depositsListParamsToUrl } from './deposits-list-url';

const read = (text: string) => depositsListParamsFromUrl(new URLSearchParams(text));

describe('lista de Abibonos ↔ URL (HU-PAN-DIN-03)', () => {
  it('sin nada en la URL es la vista por defecto, y la vista por defecto no escribe nada', () => {
    expect(read('')).toEqual(DEFAULT_DEPOSITS_LIST_PARAMS);
    expect(depositsListParamsToUrl(DEFAULT_DEPOSITS_LIST_PARAMS).toString()).toBe('');
  });

  it('orden y búsqueda hacen el viaje de ida y vuelta', () => {
    const params = { search: 'oct', sort: { key: 'total' as const, dir: 'asc' as const } };
    const url = depositsListParamsToUrl(params);
    expect(url.toString()).toBe('orden=total-asc&q=oct');
    expect(depositsListParamsFromUrl(url)).toEqual(params);
  });

  it('un valor desconocido se ignora, y un sentido desconocido usa el de la vista por defecto', () => {
    expect(read('orden=raro-asc&q=%20')).toEqual(DEFAULT_DEPOSITS_LIST_PARAMS);
    expect(read('orden=nombre-sideways').sort).toEqual({ key: 'name', dir: 'desc' });
  });
});
