import { describe, expect, it } from 'vitest';
import { APP_NAV_ITEMS, NAV_HREFS, navIdForPath, ROUTES } from './navigation';

describe('navegación de la app (HU-PAN-BASE-01)', () => {
  it('R4 / I-37: solo Clientes, Inventario y Dinero', () => {
    expect(APP_NAV_ITEMS).toEqual(['customers', 'inventory', 'money']);
    expect(APP_NAV_ITEMS.map((id) => NAV_HREFS[id])).toEqual(['/clientes', '/inventario', '/dinero']);
  });

  it('el módulo activo sale de la ruta', () => {
    expect(navIdForPath('/clientes')).toBe('customers');
    expect(navIdForPath('/clientes/nuevo')).toBe('customers');
    expect(navIdForPath('/inventario')).toBe('inventory');
    expect(navIdForPath('/inventario/ejemplares/abc')).toBe('inventory');
    expect(navIdForPath('/dinero/abibonos')).toBe('money');
    // Un prefijo que no es el módulo no lo activa.
    expect(navIdForPath('/dinerox')).toBe('customers');
  });

  it('las rutas con id lo escapan', () => {
    expect(ROUTES.customer('a b')).toBe('/clientes/a%20b');
    expect(ROUTES.deposit('d1')).toBe('/dinero/abibonos/d1');
  });
});
