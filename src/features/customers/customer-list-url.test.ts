import { describe, expect, it } from 'vitest';
import { DEFAULT_CUSTOMER_LIST_PARAMS, type CustomerListParams } from '@/domain/customer-list';
import { customerListParamsFromUrl, customerListParamsToUrl } from './customer-list-url';

const from = (text: string) => customerListParamsFromUrl(new URLSearchParams(text));

describe('vista de la lista de clientes en la URL (HU-PAN-CLI-01 R3)', () => {
  it('sin nada en la URL, la vista por defecto; y la vista por defecto no escribe nada', () => {
    expect(from('')).toEqual(DEFAULT_CUSTOMER_LIST_PARAMS);
    expect(customerListParamsToUrl(DEFAULT_CUSTOMER_LIST_PARAMS).toString()).toBe('');
  });

  it('el ejemplo de la HU: ?tab=debtors&status=overdue&sort=balance-desc&q=mar', () => {
    const params = from('tab=debtors&status=overdue&sort=balance-desc&q=mar');
    expect(params).toEqual({
      tab: 'debtors',
      includeProspects: false,
      statusFilter: ['overdue'],
      sort: { key: 'balance', dir: 'desc' },
      search: 'mar',
    });
    expect(customerListParamsToUrl(params).toString()).toBe(
      'tab=debtors&status=overdue&sort=balance-desc&q=mar',
    );
  });

  it('ida y vuelta con todo: prospectos, varios estados, próximo abono y Buscar en Archivados', () => {
    const params: CustomerListParams = {
      tab: 'all',
      includeProspects: true,
      statusFilter: ['overdue', 'settled'],
      sort: { key: 'next_due', dir: 'desc' },
      search: 'Hernán',
      includeArchivedInSearch: true,
    };
    const url = customerListParamsToUrl(params);
    expect(url.get('sort')).toBe('next-due-desc');
    expect(from(url.toString())).toEqual(params);
  });

  it('ignora valores desconocidos y usa el sentido por defecto si falta', () => {
    expect(from('tab=nope&status=overdue,raro&sort=balance')).toMatchObject({
      tab: 'all',
      statusFilter: ['overdue'],
      sort: { key: 'recent', dir: 'desc' },
    });
    expect(from('sort=name-x').sort).toEqual({ key: 'name', dir: 'asc' });
    expect(from('sort=zzz-asc').sort).toEqual({ key: 'recent', dir: 'desc' });
  });

  it('«Buscar en Archivados» solo vale con búsqueda', () => {
    expect(
      customerListParamsToUrl({ ...DEFAULT_CUSTOMER_LIST_PARAMS, includeArchivedInSearch: true }).toString(),
    ).toBe('');
    expect(from('q=%20%20')).toEqual(DEFAULT_CUSTOMER_LIST_PARAMS);
  });
});
