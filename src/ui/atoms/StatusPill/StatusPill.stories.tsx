import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { PILL_STATUS, StatusPill, type PillStatus } from './StatusPill';

const STATUSES = Object.keys(PILL_STATUS) as PillStatus[];

const meta = {
  title: 'Átomos/Pastilla de estado',
  component: StatusPill,
  args: { status: 'scheduled' },
  argTypes: {
    status: { control: 'select', options: STATUSES },
    shape: { control: 'inline-radio', options: ['pill', 'text'] },
  },
  parameters: {
    design: {
      ficha: 'Lib-Pastilla',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'En la última columna de tablas y en el encabezado de un detalle.',
        'En forma «texto» en filas móviles.',
        '«Bloqueado» (candado) cuando el registro ya no se puede editar.',
      ],
      whenNotToUse: [
        'Como botón o filtro (Chip).',
        'Para números o fechas (Etiqueta).',
        'Con estados inventados.',
      ],
      usedIn: [
        'Fila de lista',
        'Encabezado de un detalle',
        'Lista de abonos',
        'Lista de Abibonos',
        'Ejemplares',
      ],
    },
    docs: {
      description: {
        component:
          'Muestra en qué estado está un abono, un Abibono, un cliente o un ejemplar. Siempre combina ícono, color y palabra, para que se entienda aunque no se distinga el color.',
      },
    },
  },
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const pillOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-status]')!;
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
/** Color de un token resuelto en el marco (se pinta en una muestra para comparar en el mismo formato). */
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

export const PorCobrar: Story = {
  name: 'Por cobrar',
  args: { status: 'scheduled' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(pillOf(frame).getBoundingClientRect().height).toBe(isMobile(frame) ? 30 : 28);
  },
};

/** CA-1: «Vencido» con `alert` en `--color-bad`, borde `bad-border` y fondo `bad-bg`. */
export const Vencido: Story = {
  args: { status: 'overdue' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const pill = pillOf(frame);
      const style = getComputedStyle(pill);
      const svg = pill.querySelector('svg')!;
      expect(pill.textContent).toBe('Vencido');
      expect(svg.classList.contains('lucide-triangle-alert')).toBe(true);
      expect(getComputedStyle(svg).color).toBe(tokenColor(frame, '--color-bad'));
      expect(style.borderTopColor).toBe(tokenColor(frame, '--color-bad-border'));
      expect(style.backgroundColor).toBe(tokenColor(frame, '--color-bad-bg'));
      expect(svg.getAttribute('stroke-width')).toBe('2');
      expect(svg.getBoundingClientRect().width).toBe(15);
    }
  },
};

export const Cobrado: Story = { args: { status: 'collected' } };

export const Entregado: Story = { args: { status: 'delivered' } };

/** CA-2: «Entregado» con candado. */
export const EntregadoBloqueado: Story = {
  name: 'Entregado · bloqueado',
  args: { status: 'delivered', locked: true },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(pillOf(frame).textContent).toBe('Entregado');
      expect(pillOf(frame).querySelector('svg')!.classList.contains('lucide-lock')).toBe(true);
    }
  },
};

/** CA-3: el borrador tiene borde punteado. */
export const Borrador: Story = {
  args: { status: 'draft' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(getComputedStyle(pillOf(frame)).borderTopStyle).toBe('dashed');
  },
};

export const Cancelado: Story = { args: { status: 'canceled' } };
export const Pagando: Story = { args: { status: 'current' } };
export const Saldado: Story = { args: { status: 'settled' } };
export const EnFisico: Story = { name: 'En físico', args: { status: 'in_stock' } };
export const Vendido: Story = { args: { status: 'sold' } };
export const ConNovedad: Story = { name: 'Con novedad', args: { status: 'flagged' } };

// ─── Móvil ───

export const VencidoMovil: Story = { name: 'Vencido · móvil', args: { status: 'overdue' } };
export const CobradoMovil: Story = { name: 'Cobrado · móvil', args: { status: 'collected' } };
export const EntregadoMovil: Story = { name: 'Entregado · móvil', args: { status: 'delivered' } };

/** CA-4: «Debe» sin borde ni fondo, en tamaño leyenda, con el ícono rojo. */
export const FormaTextoCliente: Story = {
  name: 'Forma texto · cliente',
  args: { status: 'overdue', shape: 'text', label: 'Debe' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const pill = pillOf(frame);
      const style = getComputedStyle(pill);
      expect(pill.textContent).toBe('Debe');
      expect(style.borderTopStyle).toBe('none');
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(style.fontSize).toBe('13px');
      expect(style.color).toBe(tokenColor(frame, '--color-text-3'));
      expect(getComputedStyle(pill.querySelector('svg')!).color).toBe(tokenColor(frame, '--color-bad'));
      expect(pill.querySelector('svg')!.getBoundingClientRect().width).toBe(14);
    }
  },
};

export const FormaTextoAbono: Story = {
  name: 'Forma texto · abono',
  args: { status: 'scheduled', shape: 'text' },
};

export const FormaTextoEjemplar: Story = {
  name: 'Forma texto · ejemplar',
  args: { status: 'sold', shape: 'text' },
};

/** CA-5: los 11 estados (y la forma texto) en claro y oscuro × escritorio y móvil, sin violaciones de contraste. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {STATUSES.map((status) => (
          <StatusPill key={status} status={status} />
        ))}
        <StatusPill status="delivered" locked />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        {STATUSES.map((status) => (
          <StatusPill key={status} status={status} shape="text" />
        ))}
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const pills = [...frame.querySelectorAll<HTMLElement>('[data-shape="pill"]')];
      expect(new Set(pills.map((p) => p.dataset.status))).toEqual(new Set(STATUSES));
      expect(STATUSES).toHaveLength(11);
    }
  },
};
