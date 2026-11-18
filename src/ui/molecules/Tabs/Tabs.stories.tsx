import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Tabs, type TabItem, type TabsProps } from './Tabs';

const VIEWS: TabItem[] = [
  { id: 'all', label: 'Todos', count: 48 },
  { id: 'debtors', label: 'Deudores', count: 21 },
  { id: 'settled', label: 'Saldados', count: 9 },
  { id: 'archived', label: 'Archivados', count: 3 },
];
const PARTS: TabItem[] = [
  { id: 'payments', label: 'Abonos de clientes', count: 66 },
  { id: 'deposits', label: 'Abibonos', count: 6 },
];
const WINDOW_MODES: TabItem[] = [
  { id: 'side', label: 'Lateral', icon: 'window-side' },
  { id: 'center', label: 'Centrada', icon: 'window-center' },
  { id: 'page', label: 'Página', icon: 'window-page' },
];

/** Controladas: en el Storybook guardan la activa para poder cambiarla. */
function Stateful(args: TabsProps) {
  const [value, setValue] = useState(args.value ?? args.items[0]?.id);
  return (
    <Tabs
      {...args}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        args.onValueChange?.(next);
      }}
    />
  );
}

const meta = {
  title: 'Moléculas/Pestañas',
  component: Tabs,
  render: (args) => <Stateful {...args} />,
  args: { items: VIEWS, variant: 'pills', 'aria-label': 'Vistas de clientes', onValueChange: fn() },
  argTypes: {
    variant: { control: 'inline-radio', options: ['pills', 'segmented'] },
    value: { control: 'text' },
    width: { control: 'object' },
  },
  parameters: {
    design: {
      ficha: 'Lib-Pestanas',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Óvalos: vistas de una misma lista (Todos, Deudores, Saldados).',
        'Segmento: dos o tres partes hermanas de un módulo (a todo el ancho en móvil).',
        'El modo de la Ventana (lateral, centrada, página).',
      ],
      whenNotToUse: ['Para filtros combinables (Chips).', 'Para navegar entre módulos (Navegación).'],
      usedIn: ['Clientes', 'Dinero', 'Ventana de detalle'],
    },
    docs: {
      description: {
        component:
          'Cambian la vista de una misma lista (óvalos) o las partes de un módulo (segmento). Cada opción puede llevar su conteo, que forma parte del nombre accesible; mientras carga no se muestra número. El contenido de cada pestaña lo pinta quien las usa.',
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const tabs = (frame: HTMLElement) => [...frame.querySelectorAll<HTMLElement>('[role="tab"]')];
/** Ancho disponible para las pestañas: el contenido del contenedor de la raíz, sin su relleno. */
const room = (list: HTMLElement) => {
  const container = list.parentElement!.parentElement!;
  const style = getComputedStyle(container);
  return container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
};
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-2: con el foco en «Todos», flecha derecha pasa foco y selección a «Deudores». */
export const Ovalos: Story = {
  name: 'Óvalos',
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const [all, debtors] = tabs(frame);
      expect(frame.querySelector('[role="tablist"]')!.getAttribute('aria-label')).toBe('Vistas de clientes');
      expect(all!.getBoundingClientRect().height).toBe(isMobile(frame) ? 40 : 36);
      expect(getComputedStyle(all!).fontSize).toBe(isMobile(frame) ? '17px' : '16px');
      all!.focus();
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(debtors!.getAttribute('aria-selected')).toBe('true'));
      expect(document.activeElement).toBe(debtors);
      expect(args.onValueChange).toHaveBeenLastCalledWith('debtors');
      await userEvent.keyboard('{ArrowLeft}');
      await waitFor(() => expect(all!.getAttribute('aria-selected')).toBe('true'));
      all!.blur();
    }
  },
};

/** CA-1: «Deudores» activa: `aria-selected`, peso 600, color acento y nombre «Deudores, 21». */
export const OvalosOtraActiva: Story = {
  name: 'Óvalos · otra activa',
  args: { value: 'debtors' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const [all, debtors] = tabs(frame);
      expect(debtors!.getAttribute('aria-selected')).toBe('true');
      expect(getComputedStyle(debtors!).fontWeight).toBe('600');
      expect(getComputedStyle(debtors!).color).toBe(tokenColor(frame, '--color-accent-text'));
      expect(debtors!.textContent).toBe('Deudores, 21');
      expect(getComputedStyle(debtors!.querySelector('span:nth-child(2)')!).clip).toBe(
        'rect(0px, 0px, 0px, 0px)',
      );
      expect(debtors!.hasAttribute('aria-controls')).toBe(false);
      expect(all!.getAttribute('aria-selected')).toBe('false');
      expect(getComputedStyle(all!).fontWeight).toBe('500');
      expect(getComputedStyle(all!).color).toBe(tokenColor(frame, '--color-text-2'));
    }
  },
};

/** R3: el segmento ocupa el ancho y sus opciones se lo reparten por igual. */
export const Segmento: Story = {
  args: { items: PARTS, variant: 'segmented', 'aria-label': 'Partes de Dinero' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const [payments, deposits] = tabs(frame);
      expect(payments!.getBoundingClientRect().width).toBeCloseTo(deposits!.getBoundingClientRect().width, 0);
    }
  },
};

/** CA-4: sin `count` no se ve número. */
export const SegmentoModoDeVentana: Story = {
  name: 'Segmento · modo de ventana',
  args: { items: WINDOW_MODES, variant: 'segmented', 'aria-label': 'Modo de la ventana', width: 360 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      for (const tab of tabs(frame)) {
        expect(tab.textContent).not.toMatch(/\d/);
        expect(tab.querySelectorAll('span')).toHaveLength(1);
        expect(tab.querySelector('svg')!.dataset.icon).toMatch(/^window-/);
      }
      const list = frame.querySelector<HTMLElement>('[role="tablist"]')!;
      // 360, o todo el ancho disponible si no cabe (móvil).
      expect(list.getBoundingClientRect().width).toBe(Math.min(360, room(list)));
    }
  },
};

// ─── Móvil ───

/** R1: en móvil los óvalos van sin carril y se desplazan en horizontal. */
export const OvalosConDesplazamiento: Story = {
  name: 'Óvalos (con desplazamiento) · móvil',
  args: {
    items: [...VIEWS, { id: 'prospects', label: 'Prospectos' }],
    value: 'archived',
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const list = frame.querySelector<HTMLElement>('[role="tablist"]')!;
      const style = getComputedStyle(list);
      if (isMobile(frame)) {
        expect(style.overflowX).toBe('auto');
        expect(style.backgroundColor).toBe(tokenColor(frame, '--color-page-mobile'));
        expect(style.columnGap).toBe('4px');
      } else {
        expect(style.backgroundColor).toBe(tokenColor(frame, '--color-tab-track'));
        expect(style.columnGap).toBe('2px');
      }
    }
  },
};

/** CA-3: un segmento de 2 opciones en móvil: cada opción ocupa la mitad del ancho. */
export const SegmentoAnchoCompleto: Story = {
  name: 'Segmento · ancho completo · móvil',
  args: { items: PARTS, variant: 'segmented', 'aria-label': 'Partes de Dinero' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const list = frame.querySelector<HTMLElement>('[role="tablist"]')!;
      const inner = list.clientWidth - 2 * 4 - 2;
      for (const tab of tabs(frame)) expect(tab.getBoundingClientRect().width).toBeCloseTo(inner / 2, 0);
      // Ocupa todo el ancho disponible (100 %), no el de su contenido.
      expect(list.getBoundingClientRect().width).toBe(room(list));
    }
  },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil; una opción sin conteo (cargando). */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <Tabs items={VIEWS} aria-label="Vistas de clientes" />
      <Tabs
        items={VIEWS.map(({ id, label }) => ({ id, label }))}
        value="debtors"
        aria-label="Vistas cargando"
      />
      <Tabs items={PARTS} variant="segmented" aria-label="Partes de Dinero" />
      <Tabs
        items={WINDOW_MODES}
        variant="segmented"
        width={360}
        value="center"
        aria-label="Modo de la ventana"
      />
    </div>
  ),
};
