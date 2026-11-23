import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { formatCOP } from '@/domain/money';
import { localDate } from '@/domain/time';
import { Choice } from '../../atoms/Choice';
import { Banner } from '../../molecules/Banner';
import { DataList, DataRow } from '../../molecules/DataRow';
import { ListRow, ListTable } from '../../molecules/ListRow';
import type { NavId } from '../../organisms/AppNav';
import { DetailWindow } from '../../organisms/DetailWindow';
import { Island } from '../../organisms/Island';
import { usePlatform } from '../../platform';
import { ListTemplate, type ListState, type ListTemplateProps } from './ListTemplate';

const hrefs: Record<NavId, string> = {
  today: '#hoy',
  customers: '#clientes',
  inventory: '#inventario',
  minibooks: '#minibooks',
  calendar: '#calendario',
  money: '#dinero',
  stocktake: '#hacer-inventario',
  settings: '#ajustes',
  admin: '#admin',
};

const NAMES = [
  'María Camila Henao',
  'Ana Lucía Betancur',
  'Luz Marina Restrepo',
  'Beatriz Elena Salazar',
  'Jorge Iván Ospina',
];
const BOOKS = ['Las bellas historias de la Biblia', 'El conflicto de los siglos', 'Psiconutrición'];
const STATUSES = ['overdue', 'current', 'settled'] as const;

/** Clientes de ejemplo (sin datos reales). */
const customers = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${i + 1}`,
    title: `${NAMES[i % NAMES.length]}${i >= NAMES.length ? ` ${i + 1}` : ''}`,
    book: BOOKS[i % BOOKS.length]!,
    amount: STATUSES[i % 3] === 'settled' ? 0 : 30000 + (i % 7) * 15000,
    status: STATUSES[i % 3]!,
  }));

type DemoProps = {
  rows?: number;
  state?: ListState;
  offline?: boolean;
  openRow?: string;
  onClear?: () => void;
};

/** La pantalla de Clientes de ejemplo armada con la plantilla. */
function Demo({ rows = 12, state = 'ready', offline = false, openRow, onClear = () => {} }: DemoProps) {
  const platform = usePlatform();
  const [open, setOpen] = useState<string | undefined>(openRow);
  const [view, setView] = useState('all');
  const data = customers(rows);
  const selected = data.find((c) => c.id === open);
  const props: ListTemplateProps = {
    nav: {
      active: 'customers',
      items: ['customers', 'inventory', 'money'],
      hrefs,
      account: { name: 'Juan Pablo Ríos' },
      onNewCustomer: () => {},
      fab: { icon: 'new-customer', label: 'Nuevo cliente', onClick: () => {} },
    },
    header: {
      title: 'Clientes',
      count: rows,
      primaryAction: { label: 'Nuevo cliente', icon: 'new-customer', onClick: () => {} },
    },
    viewBar: {
      views: {
        'aria-label': 'Vistas de clientes',
        items: [
          { id: 'all', label: 'Todos', count: rows },
          { id: 'debtors', label: 'Deudores', count: Math.round(rows * 0.6) },
          { id: 'settled', label: 'Saldados', count: Math.round(rows * 0.4) },
        ],
        value: view,
        onValueChange: setView,
      },
      search: { placeholder: 'Buscar cliente', value: state === 'no-results' ? 'Marta' : '' },
      filters: {
        label: 'Estado',
        panel: <Choice label="Vencido" checked onCheckedChange={() => {}} />,
        activeChips: state === 'no-results' ? [{ id: 'overdue', label: 'Vencido' }] : [],
        onRemove: () => {},
        onClear,
      },
      sort: {
        options: [
          { id: 'recent', label: 'Más recientes' },
          { id: 'balance', label: 'Saldo pendiente' },
        ],
        value: 'recent',
        direction: 'desc',
        onChange: () => {},
      },
    },
    banner: offline ? <Banner /> : undefined,
    state,
    emptyState:
      state === 'empty'
        ? {
            title: 'Todavía no tienes clientes',
            text: 'Cuando crees un cliente, aparece aquí con lo que te debe.',
            action: { label: 'Nuevo cliente', icon: 'new-customer', onClick: () => {} },
          }
        : state === 'no-results'
          ? { title: 'No hay clientes para «Marta»', text: 'Revisa cómo lo escribiste o quita los filtros.' }
          : state === 'offline-empty'
            ? { title: 'Sin conexión', text: 'Puedes consultar lo guardado, pero no registrar.' }
            : state === 'error'
              ? { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' }
              : undefined,
    detail: selected ? (
      <DetailWindow
        mode="side"
        title={selected.title}
        breadcrumb={{ label: 'Clientes', href: '#clientes' }}
        onClose={() => setOpen(undefined)}
      >
        <Island title="Saldo">
          <DataList>
            <DataRow label="Saldo pendiente" value={formatCOP(selected.amount)} divider={false} />
          </DataList>
        </Island>
      </DetailWindow>
    ) : undefined,
    children: (
      <ListTable kind="customer" aria-label="Clientes">
        <ListRow variant="header" kind="customer" groupLabel="Todos" groupCount={rows} />
        {data.map((c) => (
          <ListRow
            key={c.id}
            kind="customer"
            title={c.title}
            books={{ first: c.book, more: 0 }}
            phone="300 000 0000"
            amount={c.amount}
            date={localDate('2026-11-02')}
            status={c.status}
            selected={c.id === open}
            onOpen={() => setOpen(c.id)}
          />
        ))}
      </ListTable>
    ),
  };
  return (
    <div style={{ '--template-height': platform === 'mobile' ? '844px' : '900px' } as CSSProperties}>
      <ListTemplate {...props} />
    </div>
  );
}

const meta = {
  title: 'Plantillas/Lista',
  component: Demo,
  args: { rows: 12, state: 'ready', offline: false },
  argTypes: {
    state: {
      control: 'inline-radio',
      options: ['ready', 'loading', 'empty', 'no-results', 'offline-empty', 'error'],
    },
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
      ficha: 'Lib-Plantilla-Lista',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En toda pantalla raíz con una lista (Clientes, Inventario, Dinero).'],
      whenNotToUse: ['En detalles ni en pantallas de crear.'],
      usedIn: ['Clientes', 'Inventario', 'Dinero'],
    },
    docs: {
      description: {
        component:
          'El esqueleto de toda pantalla raíz con una lista, solo con componentes de la biblioteca: navegación, encabezado, barra de vista y lista (el Aviso vive en la raíz de la app). En escritorio el encabezado y la barra de vista quedan fijos y la lista se desplaza por dentro; en móvil se desplaza la página y la barra inferior flota encima. Los estados vacío, sin resultados, sin conexión, error y cargando se pintan con el Estado vacío en lugar de la lista.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const mainOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('main')!;

/** R1 y CA-1: orden fijo; con 100 filas, al desplazar la lista el encabezado y la barra de vista quedan fijos. */
export const Escritorio: Story = {
  args: { rows: 100 },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const main = mainOf(frame);
      const header = main.querySelector('header')!;
      const region = main.querySelector('[role="region"]')!;
      expect(header.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      const list = main.querySelector<HTMLElement>('[role="table"]')!.parentElement!;
      expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
      const before = {
        header: header.getBoundingClientRect().top,
        region: region.getBoundingClientRect().top,
      };
      list.scrollTop = 1200;
      list.dispatchEvent(new Event('scroll'));
      expect(list.scrollTop).toBeGreaterThan(0);
      expect(header.getBoundingClientRect().top).toBe(before.header);
      expect(region.getBoundingClientRect().top).toBe(before.region);
      // R2: un solo botón principal en escritorio.
      expect(main.querySelectorAll('[data-variant="primary"]')).toHaveLength(1);
    }
  },
};

/** R2 y R6: en móvil, sin botón principal en el encabezado; botón flotante y barra inferior. */
export const Movil: Story = {
  name: 'Móvil',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(mainOf(frame).querySelector('[data-variant="primary"]')).toBeNull();
      expect(frame.querySelector('[data-variant="fab"]')).not.toBeNull();
      expect(frame.querySelector('ul[aria-label="Clientes"]')).not.toBeNull();
    }
  },
};

/** CA-5: con una fila abierta en escritorio se ve la ventana de detalle y la fila tiene `aria-current`. */
export const ConFilaAbierta: Story = {
  name: 'Con fila abierta',
  args: { openRow: 'c2' },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.querySelector('[role="dialog"]')!.textContent).toContain('Ana Lucía Betancur');
      const row = frame.querySelector<HTMLElement>('[role="row"][aria-current="true"]')!;
      expect(row.textContent).toContain('Ana Lucía Betancur');
    }
  },
};

/** R4: cargando, el esqueleto en lugar de la lista. */
export const Cargando: Story = {
  args: { state: 'loading' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(mainOf(frame).querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(mainOf(frame).querySelector('[aria-label="Clientes"]')).toBeNull();
    }
  },
};

export const Vacia: Story = { name: 'Vacía', args: { state: 'empty', rows: 0 } };

/** CA-2: «Sin resultados» con «Quitar filtros», que llama `filters.onClear`. */
export const SinResultados: Story = {
  name: 'Sin resultados',
  args: { state: 'no-results', onClear: fn() },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const state = mainOf(frame).querySelector<HTMLElement>('[role="status"]:not([aria-busy])')!;
      expect(state.textContent).toContain('No hay clientes para «Marta»');
      const clear = [...state.querySelectorAll('button')].find((b) => b.textContent === 'Quitar filtros')!;
      expect(clear.dataset.variant).toBe('secondary');
      await userEvent.click(clear);
    }
    await waitFor(() => expect(args.onClear).toHaveBeenCalledTimes(frames(canvasElement).length));
  },
};

/** R4: sin conexión con datos guardados: se ve la lista y, arriba, la franja. */
export const SinConexionConDatos: Story = {
  name: 'Sin conexión con datos',
  args: { offline: true },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const main = mainOf(frame);
      const banner = main.querySelector<HTMLElement>('[data-tone="offline"]')!;
      const list = main.querySelector<HTMLElement>('[aria-label="Clientes"]')!;
      expect(banner.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  },
};

export const SinConexionSinDatos: Story = {
  name: 'Sin conexión sin datos',
  args: { offline: true, state: 'offline-empty', rows: 0 },
};

/** Al cambiar de pestaña con el teclado, el foco va al primer elemento de la lista. */
export const TecladoEnPestanas: Story = {
  name: 'Teclado en las pestañas',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const tab = frame.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')!;
      tab.focus();
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() =>
        expect(mainOf(frame).querySelector('[role="table"]')!.contains(document.activeElement)).toBe(true),
      );
    }
  },
};

/** Claro y oscuro × escritorio y móvil. */
export const Matriz: Story = { parameters: { frames: 'matrix' } };

/**
 * #28 (corrección del dueño, 2026-11-22): en escritorio el contenido va en una tarjeta junto a la barra lateral, con
 * radio 20 y 12 de margen arriba, a la derecha y abajo (ficha Lib-Plantilla-Lista).
 */
export const TarjetaDeContenido: Story = {
  name: 'Tarjeta de contenido',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of [...canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame')]) {
      const main = getComputedStyle(frame.querySelector('main')!);
      expect(main.borderTopLeftRadius).toBe('20px');
      expect([main.marginTop, main.marginRight, main.marginBottom, main.marginLeft]).toEqual([
        '12px',
        '12px',
        '12px',
        '0px',
      ]);
      expect(main.borderTopWidth).toBe('1px');
    }
  },
};
