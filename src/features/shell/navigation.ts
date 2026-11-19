import type { NavId } from '@/ui/organisms/AppNav';

/** Rutas de la app (GLOSSARY «Procesos y pantallas» y las de cada HU de pantalla). */
export const ROUTES = {
  home: '/',
  signIn: '/entrar',
  customers: '/clientes',
  newCustomer: '/clientes/nuevo',
  /** «Crear «texto»» de la búsqueda sin resultados: Nuevo cliente con ese nombre (BR-CUS-14, HU-CLI-05). */
  newCustomerNamed: (name: string) => `/clientes/nuevo?nombre=${encodeURIComponent(name)}`,
  customer: (id: string) => `/clientes/${encodeURIComponent(id)}`,
  /** La lista con la ficha abierta en la Ventana de detalle (escritorio). */
  customerInList: (id: string) => `/clientes?cliente=${encodeURIComponent(id)}`,
  inventory: '/inventario',
  addToInventory: '/inventario/agregar',
  returnToLeader: '/inventario/devolver',
  copies: '/inventario/ejemplares',
  copy: (id: string) => `/inventario/ejemplares/${encodeURIComponent(id)}`,
  money: '/dinero',
  payment: (id: string) => `/dinero/abonos/${encodeURIComponent(id)}`,
  deposits: '/dinero/abibonos',
  /** Nuevo Abibono precargado (HU-PAN-DIN-04): hasta entonces es el armazón de la ruta de un Abibono. */
  newDeposit: '/dinero/abibonos/nuevo',
  deposit: (id: string) => `/dinero/abibonos/${encodeURIComponent(id)}`,
} as const;

/** Destino de cada módulo de la navegación. Los que no tienen pantalla no se muestran (`APP_NAV_ITEMS`). */
export const NAV_HREFS: Record<NavId, string> = {
  today: '/hoy',
  customers: ROUTES.customers,
  inventory: ROUTES.inventory,
  minibooks: '/minibooks',
  calendar: '/calendario',
  money: ROUTES.money,
  stocktake: '/hacer-inventario',
  settings: '/ajustes',
  admin: '/admin',
};

/**
 * R4 / I-37: solo los módulos con pantalla (Clientes, Inventario y Dinero). Hoy, Minibooks, Calendario, Hacer
 * inventario, Ajustes y Admin se agregan cuando tengan diseño.
 */
export const APP_NAV_ITEMS: NavId[] = ['customers', 'inventory', 'money'];

/** El módulo activo según la ruta: `/inventario/...` → Inventario, `/dinero/...` → Dinero; lo demás, Clientes. */
export const navIdForPath = (pathname: string): NavId => {
  const inModule = (root: string) => pathname === root || pathname.startsWith(`${root}/`);
  if (inModule(ROUTES.inventory)) return 'inventory';
  if (inModule(ROUTES.money)) return 'money';
  return 'customers';
};
