import { describe, expect, it } from 'vitest';
import { ALL_NAV_IDS } from '@/ui/organisms/AppNav';
import { APP_NAV_ITEMS, appNavItems, COMING_SOON, NAV_HREFS, navIdForPath, ROUTES } from './navigation';

describe('navegación de la app (HU-PAN-BASE-01)', () => {
  it('I-37 (revisada): la navegación muestra todos los módulos; Admin solo para administradores', () => {
    expect(APP_NAV_ITEMS).toEqual([
      'today',
      'customers',
      'inventory',
      'minibooks',
      'calendar',
      'money',
      'stocktake',
      'settings',
    ]);
    expect(appNavItems(false)).not.toContain('admin');
    expect(appNavItems(true)).toContain('admin');
    expect(appNavItems(true).map((id) => NAV_HREFS[id])).toEqual([
      '/hoy',
      '/clientes',
      '/inventario',
      '/minibooks',
      '/calendario',
      '/dinero',
      '/hacer-inventario',
      '/ajustes',
      '/admin',
    ]);
  });

  it('el orden de los módulos es el de AppNav', () => {
    expect(appNavItems(true)).toEqual(ALL_NAV_IDS);
  });

  it('los módulos sin terminar abren «Próximamente»; los terminados no', () => {
    expect(COMING_SOON).toEqual(['today', 'minibooks', 'calendar', 'stocktake', 'admin']);
    for (const id of ['customers', 'inventory', 'money', 'settings'] as const)
      expect(COMING_SOON).not.toContain(id);
  });

  it('el módulo activo sale de la ruta', () => {
    expect(navIdForPath('/clientes')).toBe('customers');
    expect(navIdForPath('/clientes/nuevo')).toBe('customers');
    expect(navIdForPath('/inventario')).toBe('inventory');
    expect(navIdForPath('/inventario/ejemplares/abc')).toBe('inventory');
    expect(navIdForPath('/dinero/abibonos')).toBe('money');
    expect(navIdForPath('/hoy')).toBe('today');
    expect(navIdForPath('/calendario')).toBe('calendar');
    expect(navIdForPath('/hacer-inventario')).toBe('stocktake');
    expect(navIdForPath('/ajustes')).toBe('settings');
    expect(navIdForPath('/admin')).toBe('admin');
    // Un prefijo que no es el módulo no lo activa.
    expect(navIdForPath('/dinerox')).toBe('customers');
  });

  it('las rutas con id lo escapan', () => {
    expect(ROUTES.customer('a b')).toBe('/clientes/a%20b');
    expect(ROUTES.deposit('d1')).toBe('/dinero/abibonos/d1');
  });
});
