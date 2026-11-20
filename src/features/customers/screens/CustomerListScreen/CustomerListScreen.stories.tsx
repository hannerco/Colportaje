import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import {
  DEFAULT_CUSTOMER_LIST_PARAMS,
  type CustomerListParams,
  type CustomerListView,
} from '@/domain/customer-list';
import { localDate } from '@/domain/time';
import { aCustomerListRow, aCustomerListView, aProspectRow } from '@/test-support/fixtures';
import { Banner } from '@/ui/molecules/Banner';
import { DetailWindow } from '@/ui/organisms/DetailWindow';
import { usePlatform } from '@/ui/platform';
import { APP_NAV_ITEMS, NAV_HREFS } from '../../../shell/navigation';
import { CustomerListScreen, type CustomerListScreenProps } from './CustomerListScreen';

const NAMES = [
  ['María Camila Henao', '🌷'],
  ['Ana Lucía Betancur', null],
  ['Luz Marina Restrepo', '🌻'],
  ['Jorge Iván Ospina', null],
  ['Beatriz Elena Salazar', '📚'],
  ['Marco Tulio Arango', null],
  ['Gloria Patricia Vélez', '🕊️'],
  ['Hernán Darío Cardona', null],
] as const;
const BOOKS = ['Las bellas historias de la Biblia', 'El conflicto de los siglos', 'Psiconutrición'];
const STANDINGS = ['overdue', 'current', 'settled'] as const;

/** Clientes ficticios de la lista del diseño: 48 en total, 21 deudores, 9 saldados y 3 archivados (CA-1). */
const ROWS = NAMES.map(([name, emoji], i) => {
  const standing = STANDINGS[i % 3]!;
  return aCustomerListRow({
    id: `c${i + 1}`,
    name,
    avatarEmoji: emoji,
    phone: `31${i} 555 12${i}${i}`,
    books: { title: BOOKS[i % BOOKS.length]!, extraCount: i % 4 === 0 ? 2 : 0 },
    balance: standing === 'settled' ? 0 : 60000 + i * 20000,
    lastPaymentAt: localDate(`2026-11-${String(10 - i).padStart(2, '0')}`),
    standing,
  });
});
const VIEW = aCustomerListView({
  rows: ROWS,
  counts: { all: 48, debtors: 21, settled: 9, archived: 3 },
  statusCounts: { current: 12, overdue: 9, settled: 9 },
});

/** Imita al back: los conteos no cambian con la búsqueda ni con los filtros (I-12); las filas sí. */
const fakeView = (params: CustomerListParams): CustomerListView => {
  const query = params.search?.trim().toLowerCase();
  const rows = ROWS.filter(
    (row) =>
      (params.statusFilter.length === 0 || params.statusFilter.includes(row.standing!)) &&
      (!query || row.name.toLowerCase().includes(query)),
  );
  const sorted =
    params.sort.key === 'balance'
      ? [...rows].sort((a, b) => (params.sort.dir === 'desc' ? b.balance - a.balance : a.balance - b.balance))
      : rows;
  return {
    ...VIEW,
    rows: sorted,
    isDefaultView: params.statusFilter.length === 0 && params.sort.key === 'recent',
    emptySearch:
      query && sorted.length === 0
        ? {
            query: params.search!,
            canSearchArchived: params.tab !== 'archived',
            createName: params.search!.trim(),
          }
        : null,
  };
};

type DemoProps = Omit<CustomerListScreenProps, 'nav' | 'params' | 'customerHref'> & {
  initialParams?: CustomerListParams;
  /** La vista sale de `fakeView` (interactiva) salvo que se dé una fija. */
  interactive?: boolean;
};

/** La pantalla con su vista en un estado (como el contenedor con la URL) y la ficha que se abre en escritorio. */
function Demo({
  initialParams = DEFAULT_CUSTOMER_LIST_PARAMS,
  interactive = true,
  view,
  ...props
}: DemoProps) {
  const platform = usePlatform();
  const [params, setParams] = useState(initialParams);
  const [selected, setSelected] = useState<string>();
  const data = interactive ? fakeView(params) : view;
  const open = data?.rows.find((row) => row.id === selected);
  return (
    <div style={{ '--template-height': platform === 'mobile' ? '844px' : '900px' } as CSSProperties}>
      <CustomerListScreen
        {...props}
        nav={{
          active: 'customers',
          items: APP_NAV_ITEMS,
          hrefs: NAV_HREFS,
          account: { name: 'Juan Pablo Ríos' },
        }}
        params={params}
        onParamsChange={(next) => {
          props.onParamsChange(next);
          setParams(next);
        }}
        view={data}
        selectedId={selected}
        customerHref={(id) => `#cliente-${id}`}
        onOpenCustomer={(id) => {
          props.onOpenCustomer(id);
          if (platform === 'desktop') setSelected(id);
        }}
        detail={
          open ? (
            <DetailWindow
              mode="side"
              title={open.name}
              breadcrumb={{ label: 'Clientes', href: '#clientes' }}
              onClose={() => setSelected(undefined)}
            >
              {null}
            </DetailWindow>
          ) : undefined
        }
      />
    </div>
  );
}

const meta = {
  title: 'Pantallas/Clientes/Lista',
  component: Demo,
  args: {
    isOnline: true,
    onParamsChange: fn(),
    onOpenCustomer: fn(),
    onNewCustomer: fn(),
    onRetry: fn(),
  },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          // Los marcos repiten la pantalla entera (navegación, región, buscador) en la misma página.
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Clientes · 1 · Lista',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['La pantalla raíz de Clientes (/clientes).'],
      whenNotToUse: ['Para elegir un cliente dentro de otra pantalla.'],
      usedIn: ['Clientes'],
    },
    docs: {
      description: {
        component:
          'Lista de clientes (HU-PAN-CLI-01) sobre la Plantilla de lista: pestañas Todos, Deudores, Saldados y Archivados con sus conteos (no cambian con la búsqueda), buscador, filtro «Estado» con «Incluir prospectos», orden con su sentido y «Limpiar». En escritorio el nombre abre la ficha en la Ventana de detalle; en móvil la fila entera abre la ficha y «Nuevo cliente» es el botón flotante. La vista vive en la URL.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const tabs = (frame: HTMLElement) =>
  [...frame.querySelectorAll('[role="tab"]')].map((tab) =>
    tab.textContent?.replace(/,/g, '').replace(/\s+/g, ' ').trim(),
  );
/** Los enlaces de las filas de la lista (no los de la navegación). */
const rowLinks = (frame: HTMLElement) => [
  ...frame.querySelectorAll<HTMLAnchorElement>('[aria-label="Clientes"] a'),
];
const searchBox = (frame: HTMLElement) =>
  frame.querySelector<HTMLInputElement>('input[type="search"], input')!;
/** Un botón por su nombre: el texto visible o, si es solo ícono (el flotante), su `aria-label`. */
const button = (root: Element, name: string | RegExp) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => {
    const label = b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '';
    return typeof name === 'string' ? label === name : name.test(label);
  });

export const Explorar: Story = {};

/** CA-1: los conteos de las pestañas no cambian al buscar «Mar» (I-12). */
export const ConDatos: Story = {
  name: 'Con datos',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const counts = ['Todos 48', 'Deudores 21', 'Saldados 9', 'Archivados 3'];
      expect(tabs(frame)).toEqual(counts);
      await userEvent.type(searchBox(frame), 'Mar');
      await waitFor(() => expect(rowLinks(frame).length).toBeLessThan(ROWS.length));
      expect(tabs(frame)).toEqual(counts);
    }
  },
};

/** Desktop: el menú «Estado» con Pagando, Vencido y Saldado (con sus conteos) e «Incluir prospectos». */
export const FiltroAbierto: Story = {
  name: 'Filtro abierto',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      await userEvent.click(button(frame, 'Estado')!);
      await waitFor(() => expect(frame.textContent).toContain('Incluir prospectos'));
      for (const option of ['Pagando (12)', 'Vencido (9)', 'Saldado (9)'])
        expect(frame.textContent).toContain(option);
    }
  },
};

/** Desktop: las opciones de orden (Más recientes, Última modificación, Nombre, Saldo pendiente, Próximo abono). */
export const OrdenAbierto: Story = {
  name: 'Orden abierto',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      await userEvent.click(button(frame, /Más recientes/)!);
      await waitFor(() => expect(frame.querySelectorAll('[role="menuitemradio"]').length).toBe(5));
      expect(
        [...frame.querySelectorAll('[role="menuitemradio"]')].map((item) => item.textContent?.trim()),
      ).toEqual(['Más recientes', 'Última modificación', 'Nombre', 'Saldo pendiente', 'Próximo abono']);
    }
  },
};

/** CA-2: Vencido y Saldado con «Saldo pendiente» descendente: chips, lista ordenada y «Limpiar» vuelve a lo de antes. */
export const FiltrosActivos: Story = {
  name: 'Filtros activos',
  globals: { platform: 'desktop' },
  args: {
    initialParams: {
      ...DEFAULT_CUSTOMER_LIST_PARAMS,
      statusFilter: ['overdue', 'settled'],
      sort: { key: 'balance', dir: 'desc' },
    },
  },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const chips = () =>
        [...frame.querySelectorAll('[data-kind="filter"]')].map((c) => c.textContent?.trim());
      expect(chips()).toEqual(['Vencido', 'Saldado', 'Saldo pendiente']);
      const amounts = [...frame.querySelectorAll('[role="row"]')]
        .slice(1)
        .map((row) => Number(row.textContent!.match(/\$([\d.]+)/)?.[1]?.replace(/\./g, '') ?? 0));
      expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
      await userEvent.click(button(frame, 'Limpiar')!);
      await waitFor(() => expect(chips()).toEqual([]));
      expect(button(frame, 'Limpiar')).toBeUndefined();
    }
    expect(args.onParamsChange).toHaveBeenLastCalledWith(DEFAULT_CUSTOMER_LIST_PARAMS);
  },
};

/** R2: sin conexión se consulta la lista; «Nuevo cliente» se ve deshabilitado con «Necesita conexión». */
export const SinConexionConDatos: Story = {
  name: 'Sin conexión con datos',
  args: { isOnline: false, banner: <Banner tone="offline" /> },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Sin conexión: puedes consultar, pero no registrar');
      expect(rowLinks(frame).length).toBe(ROWS.length);
      const create = button(frame, 'Nuevo cliente')!;
      expect(create.getAttribute('aria-disabled')).toBe('true');
      await userEvent.click(create, { pointerEventsCheck: 0 });
    }
    expect(args.onNewCustomer).not.toHaveBeenCalled();
  },
};

/** CA-5 (HU-CLI-05): «Nadie coincide con «Marta»», dónde se buscó, «Crear «Marta»» y «Buscar en Archivados». */
export const SinResultados: Story = {
  name: 'Sin resultados',
  args: { initialParams: { ...DEFAULT_CUSTOMER_LIST_PARAMS, search: 'Marta' } },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Nadie coincide con «Marta»');
      expect(frame.textContent).toContain('Busqué por nombre, teléfono, información, dirección y libros.');
      expect(button(frame, 'Buscar en Archivados')).toBeDefined();
      await userEvent.click(button(frame, 'Crear «Marta»')!);
    }
    expect(args.onNewCustomer).toHaveBeenLastCalledWith('Marta');
  },
};

export const Cargando: Story = {
  args: { interactive: false, view: undefined, loading: true },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(frame.querySelector('[aria-busy="true"]')).not.toBeNull();
  },
};

/** Sin ningún cliente: «Todavía no tienes clientes» con «Nuevo cliente». */
export const Vacio: Story = {
  name: 'Vacío',
  args: {
    interactive: false,
    view: aCustomerListView({
      rows: [],
      counts: { all: 0, debtors: 0, settled: 0, archived: 0 },
      statusCounts: { current: 0, overdue: 0, settled: 0 },
    }),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Todavía no tienes clientes');
      expect(button(frame.querySelector('[role="status"]')!, 'Nuevo cliente')).toBeDefined();
    }
  },
};

/** CA-3: en móvil, emoji o persona, nombre, primer libro + «+N», «Debe» sobre el saldo y el botón flotante. */
export const Movil: Story = {
  name: 'Móvil',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const first = rowLinks(frame)[0]!;
      expect(first.textContent).toContain('🌷');
      expect(first.textContent).toContain('María Camila Henao');
      expect(first.textContent).toContain('Las bellas historias de la Biblia');
      expect(first.textContent).toContain('+2');
      expect(first.textContent).toContain('Debe');
      expect(first.textContent).toContain('$60.000');
      expect(button(frame, 'Nuevo cliente')!.dataset.variant).toBe('fab');
      await userEvent.click(first);
    }
    expect(args.onOpenCustomer).toHaveBeenLastCalledWith('c1');
  },
};

/** CA-4: en escritorio, pulsar un nombre abre la ficha en la Ventana de detalle y marca la fila. */
export const AbrirFicha: Story = {
  name: 'Abrir ficha',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const link = [...frame.querySelectorAll<HTMLAnchorElement>('[role="row"] a')].find(
        (a) => a.textContent === 'Jorge Iván Ospina',
      )!;
      await userEvent.click(link);
      await waitFor(() =>
        expect(frame.querySelector('[role="dialog"]')?.textContent).toContain('Jorge Iván Ospina'),
      );
      expect(link.closest('[role="row"]')!.getAttribute('aria-current')).toBe('true');
    }
  },
};

/** Archivados: cada fila dice «(cliente archivado)». Un prospecto en Todos, con «Incluir prospectos». */
export const ArchivadosYProspectos: Story = {
  name: 'Archivados y prospectos',
  args: {
    interactive: false,
    initialParams: { ...DEFAULT_CUSTOMER_LIST_PARAMS, tab: 'archived' },
    view: aCustomerListView({
      rows: [
        aCustomerListRow({
          id: 'a1',
          name: 'Rubén Darío Vélez',
          archived: true,
          balance: 0,
          standing: 'settled',
        }),
        aProspectRow(),
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Rubén Darío Vélez (cliente archivado)');
      expect(frame.textContent).toContain('Prospecto');
    }
  },
};

/** Las combinaciones en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = { parameters: { frames: 'matrix' } };
