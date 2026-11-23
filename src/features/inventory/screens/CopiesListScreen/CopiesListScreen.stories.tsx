import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { CopyStatus } from '@/domain/copy';
import {
  DEFAULT_COPIES_LIST_PARAMS,
  buildCopiesListView,
  type CopiesListCopy,
  type CopiesListParams,
  type CopiesListView,
} from '@/domain/copies-list';
import { localDate } from '@/domain/time';
import { Banner } from '@/ui/molecules/Banner';
import { usePlatform } from '@/ui/platform';
import { APP_NAV_ITEMS, NAV_HREFS } from '../../../shell/navigation';
import { CopiesListScreen, type CopiesListScreenProps } from './CopiesListScreen';

const TITLES = [
  { id: 't-psico', name: 'Psiconutrición', category: 'cultural' as const },
  { id: 't-bebidas', name: 'Bebidas saludables', category: 'cultural' as const },
  { id: 't-casaria', name: 'Me casaría de nuevo contigo', category: 'cultural' as const },
  { id: 't-corazon', name: 'Un corazón tranquilo', category: 'cultural' as const },
  { id: 't-esperanza', name: 'La gran esperanza', category: 'religious' as const },
  { id: 't-camino', name: 'El camino a Cristo', category: 'religious' as const },
];
const CUSTOMERS = [
  { id: 'c1', name: 'María Camila Henao', avatarEmoji: null },
  { id: 'c2', name: 'Jhon Fredy Ospina', avatarEmoji: null },
  { id: 'c3', name: 'Luz Marina Restrepo', avatarEmoji: null },
  { id: 'c4', name: 'Diana Patricia Cardona', avatarEmoji: null },
];

type Spec = [
  id: string,
  title: string,
  number: number,
  status: CopyStatus,
  received: string,
  sold?: { customer: string; price: number; on: string },
];
const PUBLIC_PRICE: Record<string, number> = {
  't-psico': 98000,
  't-bebidas': 75000,
  't-casaria': 88000,
  't-corazon': 85000,
  't-esperanza': 45000,
  't-camino': 30000,
};

/** Los ejemplares del lienzo: vendidos con descuento (#6, #8) o aumento (#3), en físico, con novedad y devueltos. */
const SPECS: Spec[] = [
  ['e6', 't-psico', 6, 'sold', '2026-10-20', { customer: 'c1', price: 93000, on: '2026-11-02' }],
  ['e9', 't-bebidas', 9, 'in_stock', '2026-10-30'],
  ['e3', 't-casaria', 3, 'sold', '2026-10-21', { customer: 'c2', price: 95000, on: '2026-11-01' }],
  ['e12', 't-corazon', 12, 'sold', '2026-10-19', { customer: 'c3', price: 85000, on: '2026-10-28' }],
  ['e11', 't-esperanza', 11, 'flagged', '2026-10-26'],
  ['e13', 't-corazon', 13, 'in_stock', '2026-11-03'],
  ['e2', 't-camino', 2, 'returned_to_leader', '2026-10-12'],
  ['e8', 't-bebidas', 8, 'sold', '2026-10-22', { customer: 'c4', price: 70000, on: '2026-10-27' }],
  ['e120', 't-bebidas', 120, 'in_stock', '2026-11-03'],
  ['e1', 't-bebidas', 1, 'lost', '2026-10-15'],
];

const COPIES: CopiesListCopy[] = SPECS.map(([id, titleId, number, status, received, sold]) => ({
  id,
  titleId,
  number,
  status,
  customerId: sold?.customer ?? null,
  agreedPrice: sold?.price ?? null,
  publicPriceSnapshot: PUBLIC_PRICE[titleId]!,
  receivedAt: localDate(received),
  soldAt: sold ? new Date(`${sold.on}T17:00:00.000Z`) : null,
  deletedAt: null,
}));

const viewOf = (params: CopiesListParams): CopiesListView =>
  buildCopiesListView(COPIES, TITLES, CUSTOMERS, params);

type DemoProps = Omit<CopiesListScreenProps, 'nav' | 'params' | 'copyHref' | 'view'> & {
  initialParams?: CopiesListParams;
  /** La vista sale del dominio (interactiva) salvo que se dé una fija (estados sin datos). */
  fixedView?: CopiesListView;
};

/** La pantalla con su vista en un estado, como el contenedor con la URL; los datos salen del dominio real. */
function Demo({ initialParams = DEFAULT_COPIES_LIST_PARAMS, fixedView, ...props }: DemoProps) {
  const platform = usePlatform();
  const [params, setParams] = useState(initialParams);
  return (
    <div style={{ '--template-height': platform === 'mobile' ? '844px' : '900px' } as CSSProperties}>
      <CopiesListScreen
        {...props}
        nav={{
          active: 'inventory',
          items: APP_NAV_ITEMS,
          hrefs: NAV_HREFS,
          account: { name: 'Juan Pablo Ríos' },
        }}
        params={params}
        onParamsChange={(next) => {
          props.onParamsChange(next);
          setParams(next);
        }}
        view={props.loading || props.error ? undefined : (fixedView ?? viewOf(params))}
        copyHref={(id) => `#ejemplar-${id}`}
      />
    </div>
  );
}

const meta = {
  title: 'Pantallas/Inventario/Ejemplares',
  component: Demo,
  args: { isOnline: true, onParamsChange: fn(), onOpenInStock: fn(), onRetry: fn(), inStockCount: 23 },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Inventario · 2 · Ejemplares',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        '/inventario/ejemplares: ver cada ejemplar con su estado, a quién se vendió y a qué precio.',
      ],
      whenNotToUse: ['Para ver cuántos hay por título (Libros en físico, HU-PAN-INV-01).'],
      usedIn: ['Inventario'],
    },
    docs: {
      description: {
        component:
          'Lista de ejemplares (HU-PAN-INV-02) sobre la Plantilla de lista: pestañas Todos, En físico, Vendidos y Con descuentos y aumentos (los conteos no cambian con la búsqueda), buscador por título, cliente o número («12» o «#12»), orden por Recibido, Vendido, Título, Precio acordado y Diferencia, y la lista con el precio acordado (o el público si no se vendió) y la diferencia. La fecha de cada fila sigue al orden. Abrir una fila lleva al Ejemplar (HU-PAN-INV-03). El filtro «Estado» que el lienzo dibuja sin abrir queda fuera (FI-08).',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) => frame.querySelector('ul[aria-label]') !== null;
const rowsOf = (frame: HTMLElement) =>
  [...frame.querySelectorAll<HTMLElement>('[role="row"], li')].filter(
    (r) => /#\d+|\d{2}\/\d{2}\/\d{4}/.test(r.textContent ?? '') && r.getAttribute('role') !== 'columnheader',
  );
const search = (frame: HTMLElement) => frame.querySelector<HTMLInputElement>('input[type="search"]')!;

export const Explorar: Story = {};

export const Todos: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Con descuentos y aumentos');
      expect(frame.textContent).toContain('Devuelto al líder');
      expect(frame.textContent).toContain('Perdido');
    }
  },
};

export const Vendidos: Story = {
  args: { initialParams: { ...DEFAULT_COPIES_LIST_PARAMS, view: 'sold' } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('María Camila Henao');
      expect(frame.textContent).not.toContain('Devuelto al líder');
    }
  },
};

/** CA-2: cada fila muestra el precio acordado y la diferencia con el público (descuento −, aumento +). */
export const ConDescuentosYAumentos: Story = {
  name: 'Con descuentos y aumentos',
  args: { initialParams: { ...DEFAULT_COPIES_LIST_PARAMS, view: 'price_changed' } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('$93.000');
      expect(frame.textContent).toContain('−$5.000');
      expect(frame.textContent).toContain('$95.000');
      expect(frame.textContent).toContain('+$7.000');
      // Sin diferencia (Un corazón tranquilo #12, a precio público) no entra a esta vista.
      expect(frame.textContent).not.toContain('Luz Marina Restrepo');
    }
  },
};

/** CA-1: buscar «12» trae solo el #12 (no el 1 ni el 120). */
export const BuscarPorNumero: Story = {
  name: 'Buscar por número',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      await userEvent.type(search(frame), '12');
      await waitFor(() => expect(frame.textContent).toContain('Luz Marina Restrepo'));
      expect(frame.textContent).not.toContain('Bebidas saludables');
      expect(frame.textContent).not.toContain('Psiconutrición');
      await userEvent.clear(search(frame));
    }
  },
};

/** CA-3: por diferencia, los ejemplares sin diferencia van al final. */
export const OrdenarPorDiferencia: Story = {
  name: 'Ordenar por diferencia',
  args: { initialParams: { ...DEFAULT_COPIES_LIST_PARAMS, sort: { key: 'price_delta', dir: 'desc' } } },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const rows = rowsOf(frame).filter((r) => r.getAttribute('role') === 'row');
    expect(rows[0]!.textContent).toContain('+$7.000');
    expect(rows[1]!.textContent).toContain('−$5.000');
    expect(rows.at(-1)!.textContent).not.toMatch(/[+−]\$/);
  },
};

/** R3: ordenar por Vendido cambia la fecha de cada fila a la de venta. */
export const OrdenadoPorVenta: Story = {
  name: 'Ordenado por venta',
  args: { initialParams: { ...DEFAULT_COPIES_LIST_PARAMS, sort: { key: 'sold', dir: 'desc' } } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) expect(frame.textContent).toContain('Vendido 02/11/2026');
      else expect(frame.textContent).toContain('Vendido el');
    }
  },
};

export const SinResultados: Story = {
  name: 'Sin resultados',
  args: { initialParams: { ...DEFAULT_COPIES_LIST_PARAMS, search: 'zzz' } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(frame.textContent).toContain('Ningún ejemplar coincide con «zzz»');
  },
};

export const Cargando: Story = { args: { loading: true } };

export const Vacio: Story = {
  name: 'Vacío',
  args: { fixedView: { counts: { all: 0, inStock: 0, sold: 0, priceChanged: 0 }, rows: [] } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(frame.textContent).toContain('Todavía no tienes ejemplares');
  },
};

export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false, error: true, banner: <Banner tone="offline" /> },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) expect(frame.textContent).toContain('Sin conexión');
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };

/**
 * #29 (corrección del dueño, 2026-11-22): en escritorio, un clic en un ejemplar no navega a su página: lo abre en la
 * Ventana de detalle de la lista, con la forma recordada (como Clientes).
 */
export const AbrirEnLaVentana: Story = {
  name: 'Abrir en la Ventana',
  globals: { platform: 'desktop' },
  args: { onOpenCopy: fn() },
  play: async ({ canvasElement, args }) => {
    const onOpen = args.onOpenCopy as ReturnType<typeof fn>;
    for (const frame of frames(canvasElement)) {
      onOpen.mockClear();
      await userEvent.click(frame.querySelector<HTMLAnchorElement>('a[href^="#ejemplar-"]')!);
      expect(onOpen).toHaveBeenCalledTimes(1);
    }
  },
};

/** #27: misma distancia encabezado → pestañas que en Libros en físico (56 + 12), así no hay salto al cambiar. */
export const SinSaltoAlCambiarDeSeccion: Story = {
  name: 'Sin salto al cambiar de sección',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of [...canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame')]) {
      const header = frame.querySelector('header[data-kind="root"]')!.getBoundingClientRect();
      const tabs = frame.querySelector('[role="tablist"]')!.getBoundingClientRect();
      expect(Math.round(header.height)).toBe(56);
      expect(Math.round(tabs.top - header.top)).toBe(68);
    }
  },
};
