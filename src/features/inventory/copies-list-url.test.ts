import { describe, expect, it } from 'vitest';
import { DEFAULT_COPIES_LIST_PARAMS } from '@/domain/copies-list';
import { copiesListParamsFromUrl, copiesListParamsToUrl } from './copies-list-url';

const read = (text: string) => copiesListParamsFromUrl(new URLSearchParams(text));

describe('lista de ejemplares ↔ URL (HU-PAN-INV-02)', () => {
  it('sin nada en la URL es la vista por defecto, y la vista por defecto no escribe nada', () => {
    expect(read('')).toEqual(DEFAULT_COPIES_LIST_PARAMS);
    expect(copiesListParamsToUrl(DEFAULT_COPIES_LIST_PARAMS).toString()).toBe('');
  });

  it('pestaña, orden y búsqueda hacen el viaje de ida y vuelta', () => {
    const params = {
      ...DEFAULT_COPIES_LIST_PARAMS,
      view: 'price_changed' as const,
      sort: { key: 'price_delta' as const, dir: 'asc' as const },
      search: '#12',
    };
    const url = copiesListParamsToUrl(params);
    expect(url.toString()).toBe('vista=con-diferencia&orden=diferencia-asc&q=%2312');
    expect(copiesListParamsFromUrl(url)).toEqual(params);
  });

  it('un valor desconocido se ignora', () => {
    expect(read('vista=otra&orden=raro-sideways&q=%20')).toEqual(DEFAULT_COPIES_LIST_PARAMS);
  });
});
