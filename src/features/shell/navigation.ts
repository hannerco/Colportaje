import type { NavId } from '@/ui/organisms/AppNav';

/** Rutas de la app (GLOSSARY «Procesos y pantallas» y las de cada HU de pantalla). */
export const ROUTES = {
  home: '/',
  signIn: '/entrar',
  /** Ronda 37: página que muestra el service worker si se abre sin conexión una página que no está guardada. */
  offline: '/sin-conexion',
  /** Pública, sin sesión: la política de privacidad que pide Google. */
  privacy: '/privacidad',
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
  /** La lista con el ejemplar abierto en la Ventana de detalle (escritorio, #29). */
  copyInList: (id: string) => `/inventario/ejemplares?ejemplar=${encodeURIComponent(id)}`,
  money: '/dinero',
  payment: (id: string) => `/dinero/abonos/${encodeURIComponent(id)}`,
  /** Dinero con el abono abierto en la Ventana de detalle (escritorio, #29). */
  paymentInList: (id: string) => `/dinero?abono=${encodeURIComponent(id)}`,
  deposits: '/dinero/abibonos',
  /** Nuevo Abibono precargado (HU-PAN-DIN-04): hasta entonces es el armazón de la ruta de un Abibono. */
  newDeposit: '/dinero/abibonos/nuevo',
  deposit: (id: string) => `/dinero/abibonos/${encodeURIComponent(id)}`,
  /** Ronda 37: recibo del Abibono entregado (ver, compartir, imprimir o guardar PDF). */
  depositReceipt: (id: string) => `/dinero/abibonos/${encodeURIComponent(id)}/recibo`,
  /** La lista de Abibonos con uno abierto en la Ventana de detalle (escritorio, #29). */
  depositInList: (id: string) => `/dinero/abibonos?abibono=${encodeURIComponent(id)}`,
  /** Admin · Usuarios (ronda 34, #43). */
  adminUsers: '/admin/usuarios',
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
 * Todos los módulos, en el orden de la navegación. Se repite aquí (y una prueba lo compara con el de `AppNav`) porque
 * este archivo también lo leen componentes de servidor y `AppNav` es del cliente: ahí solo llegan los componentes.
 */
const ALL_NAV_IDS: readonly NavId[] = [
  'today',
  'customers',
  'inventory',
  'minibooks',
  'calendar',
  'money',
  'stocktake',
  'settings',
  'admin',
];

/**
 * I-37 (revisada el 2026-11-20, decisión del dueño): la navegación muestra **todos** los módulos que tendrá la app,
 * estén listos o no. Los que aún no están terminados abren «Próximamente» (`COMING_SOON`). Admin solo lo ve quien tiene
 * el rol (BR-USR-04): `appNavItems`.
 */
export const APP_NAV_ITEMS: NavId[] = ALL_NAV_IDS.filter((id) => id !== 'admin');

/** Los módulos de la navegación según el perfil: Admin solo si el usuario es administrador (BR-USR-04). */
export const appNavItems = (isAdmin: boolean): NavId[] => (isAdmin ? [...ALL_NAV_IDS] : APP_NAV_ITEMS);

/**
 * Los módulos que todavía no están terminados: su ruta muestra «Próximamente». Ajustes tiene su versión mínima y Admin,
 * por ahora, solo el Catálogo (HU-PAN-ADM-01).
 */
export const COMING_SOON: readonly NavId[] = ['today', 'minibooks', 'calendar', 'stocktake'];

/** El módulo activo según la ruta (`/inventario/...` → Inventario, `/dinero/...` → Dinero…); lo demás, Clientes. */
export const navIdForPath = (pathname: string): NavId => {
  const inModule = (root: string) => pathname === root || pathname.startsWith(`${root}/`);
  for (const id of ALL_NAV_IDS) if (id !== 'customers' && inModule(NAV_HREFS[id])) return id;
  return 'customers';
};
