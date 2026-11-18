import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { MetricCard } from './MetricCard';

const meta = {
  title: 'Moléculas/Tarjeta de métrica',
  component: MetricCard,
  args: { label: 'Entregado', amount: 1420000, percent: 52, tone: 'delivered', shape: 'card' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['delivered', 'collected', 'pending', 'total'] },
    shape: { control: 'inline-radio', options: ['card', 'legend', 'featured'] },
    percent: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    width: { control: 'object' },
  },
  parameters: {
    design: {
      ficha: 'Lib-TarjetaMetrica',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'En el resumen de Dinero: Entregado, Por entregar y Por cobrar.',
        'Totales de Inventario o de Hacer inventario.',
      ],
      whenNotToUse: ['Para un dato de un registro (Fila de dato).'],
      usedIn: ['Resumen de dinero', 'Dinero'],
    },
    docs: {
      description: {
        component:
          'Un totalizador: color del grupo (el mismo del Medidor), etiqueta, monto y porcentaje. Tarjeta en escritorio, leyenda debajo del medidor en móvil y destacada para Dinero total. Montos y porcentajes llegan ya calculados y redondeados (I-11); el orden lo pone quien la usa: Entregado, Por entregar, Por cobrar.',
      },
    },
  },
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const isDark = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.theme === 'dark';
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
const cardOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-shape]')!;
const part = (card: HTMLElement, i: number) => card.children[i] as HTMLElement;
const swatchOf = (card: HTMLElement) => card.querySelector<HTMLElement>('[data-part="swatch"]')!;

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-3: en oscuro, el cuadro de «entregado» es #A9C8EA; en claro, #092E53. Tarjeta de 240. */
export const TarjetaEntregado: Story = {
  name: 'Tarjeta · entregado',
  parameters: { frames: 'matrix' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const card = cardOf(frame);
      expect(getComputedStyle(swatchOf(card)).backgroundColor).toBe(
        isDark(frame) ? 'rgb(169, 200, 234)' : 'rgb(9, 46, 83)',
      );
      expect(card.getBoundingClientRect().width).toBe(240);
      expect(part(card, 1).textContent).toBe('$1.420.000');
      expect(getComputedStyle(part(card, 1)).fontVariantNumeric).toBe('tabular-nums');
    }
  },
};

/** CA-1: cuadro `data-collected`, «$385.000» y «14 %» con su barra al 14 %. */
export const TarjetaPorEntregar: Story = {
  name: 'Tarjeta · por entregar',
  args: { label: 'Por entregar', amount: 385000, percent: 14, tone: 'collected' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const card = cardOf(frame);
      expect(getComputedStyle(swatchOf(card)).backgroundColor).toBe(
        tokenColor(frame, '--color-data-collected'),
      );
      expect(part(card, 1).textContent).toBe('$385.000');
      expect(card.textContent).toContain('14 %');
      const bar = card.querySelector<HTMLElement>('[data-part="bar"]')!;
      const fill = bar.firstElementChild!;
      expect(fill.getBoundingClientRect().width / bar.getBoundingClientRect().width).toBeCloseTo(0.14, 2);
      expect(getComputedStyle(fill).backgroundColor).toBe(tokenColor(frame, '--color-data-collected'));
    }
  },
};

export const TarjetaPorCobrar: Story = {
  name: 'Tarjeta · por cobrar',
  args: { label: 'Por cobrar', amount: 935000, percent: 34, tone: 'pending' },
};

/** R2: en escritorio, cuadro, etiqueta y monto en fila (texto principal, peso 600). */
export const Leyenda: Story = {
  args: { shape: 'legend' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) continue;
      const card = cardOf(frame);
      const label = part(card, 0).getBoundingClientRect();
      const amount = part(card, 1).getBoundingClientRect();
      expect(amount.left).toBeGreaterThan(label.right);
      expect(Math.abs(amount.top + amount.height / 2 - (label.top + label.height / 2))).toBeLessThan(2);
      expect(getComputedStyle(part(card, 1)).fontWeight).toBe('600');
      expect(card.querySelector('[data-part="bar"]')).toBeNull();
    }
  },
};

/** R3: Dinero total ocupa el ancho y usa el color del texto. */
export const Destacada: Story = {
  args: { label: 'Dinero total', amount: 2740000, percent: 100, tone: 'total', shape: 'featured' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const card = cardOf(frame);
      const parent = card.parentElement!;
      const style = getComputedStyle(parent);
      const room = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      expect(card.getBoundingClientRect().width).toBe(room);
      expect(getComputedStyle(swatchOf(card)).backgroundColor).toBe(tokenColor(frame, '--color-text'));
      expect(card.textContent).toContain('100 %');
    }
  },
};

// ─── Móvil ───

/** CA-2: en móvil, la leyenda va centrada: la etiqueta arriba y el monto debajo. */
export const LeyendaEntregado: Story = {
  name: 'Leyenda · entregado · móvil',
  args: { shape: 'legend' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      const card = cardOf(frame);
      const head = part(card, 0).getBoundingClientRect();
      const amount = part(card, 1).getBoundingClientRect();
      const box = card.getBoundingClientRect();
      expect(head.bottom).toBeLessThanOrEqual(amount.top);
      const center = box.left + box.width / 2;
      expect(Math.abs(head.left + head.width / 2 - center)).toBeLessThan(1);
      expect(Math.abs(amount.left + amount.width / 2 - center)).toBeLessThan(1);
      expect(getComputedStyle(card.querySelector('span > span:last-child')!).color).toBe(
        tokenColor(frame, '--color-text-2'),
      );
    }
  },
};

export const LeyendaCobrado: Story = {
  name: 'Leyenda · cobrado · móvil',
  args: { shape: 'legend', label: 'Por entregar', amount: 385000, percent: 14, tone: 'collected' },
};

export const LeyendaPorCobrar: Story = {
  name: 'Leyenda · por cobrar · móvil',
  args: { shape: 'legend', label: 'Por cobrar', amount: 935000, percent: 34, tone: 'pending' },
};

export const DestacadaMovil: Story = {
  name: 'Destacada · móvil',
  args: { label: 'Dinero total', amount: 2740000, percent: 100, tone: 'total', shape: 'featured' },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil, en el orden de R4. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <MetricCard label="Dinero total" amount={2740000} percent={100} tone="total" shape="featured" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <MetricCard label="Entregado" amount={1420000} percent={52} tone="delivered" />
        <MetricCard label="Por entregar" amount={385000} percent={14} tone="collected" />
        <MetricCard label="Por cobrar" amount={935000} percent={34} tone="pending" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-5)' }}>
        <MetricCard label="Entregado" amount={1420000} percent={52} tone="delivered" shape="legend" />
        <MetricCard label="Por entregar" amount={385000} percent={14} tone="collected" shape="legend" />
        <MetricCard label="Por cobrar" amount={935000} percent={34} tone="pending" shape="legend" />
      </div>
    </div>
  ),
};
