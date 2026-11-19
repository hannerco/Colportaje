import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Gauge } from './Gauge';

const meta = {
  title: 'Moléculas/Medidor',
  component: Gauge,
  args: { delivered: 52, collected: 14, pending: 34, size: 'normal' },
  argTypes: {
    size: { control: 'inline-radio', options: ['normal', 'large'] },
    delivered: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    collected: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    pending: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  parameters: {
    design: {
      ficha: 'Lib-Medidor',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En el resumen de Dinero (escritorio y hoja móvil).'],
      whenNotToUse: ['Para más de tres partes.', 'Para el avance de una tarea (barra).'],
      usedIn: ['Resumen de dinero'],
    },
    docs: {
      description: {
        component:
          'Semicírculo que reparte el dinero total en Entregado, Cobrado sin entregar y Por cobrar, con el porcentaje entregado en el centro. Si los tres no suman 100 se normalizan; un tramo de 0 no se dibuja. La geometría sale de la función pura `gaugeSegments(values, size)`. Va siempre con las tarjetas de métrica que dan los montos.',
      },
    },
  },
} satisfies Meta<typeof Gauge>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const strokeOf = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
const gaugeOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[role="img"]')!;
const keysOf = (frame: HTMLElement) =>
  [...frame.querySelectorAll<SVGPathElement>('path[data-key]')].map((path) => path.dataset.key);
const figureOf = (frame: HTMLElement) => gaugeOf(frame).querySelector('span > span')!.textContent;

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-1: el centro dice «52 %» y la descripción es «52 % entregado; 14 % cobrado sin entregar; 34 % por cobrar». */
export const Normal: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const gauge = gaugeOf(frame);
      expect(gauge.getAttribute('aria-label')).toBe(
        '52 % entregado; 14 % cobrado sin entregar; 34 % por cobrar',
      );
      expect(figureOf(frame)).toBe('52 %');
      expect(gauge.textContent).toContain('entregado');
      const svg = gauge.querySelector('svg')!;
      expect(svg.getBoundingClientRect().width).toBe(240);
      expect(svg.getBoundingClientRect().height).toBe(120);
      expect(keysOf(frame)).toEqual(['delivered', 'collected', 'pending']);
      for (const [key, token] of [
        ['delivered', '--color-data-delivered'],
        ['collected', '--color-data-collected'],
        ['pending', '--color-data-pending'],
      ] as const) {
        const path = frame.querySelector<SVGPathElement>(`path[data-key="${key}"]`)!;
        expect(getComputedStyle(path).stroke).toBe(strokeOf(frame, token));
        expect(path.getAttribute('stroke-width')).toBe('24');
      }
    }
  },
};

export const CasiTodoEntregado: Story = {
  name: 'Casi todo entregado',
  args: { delivered: 86, collected: 6, pending: 8 },
};

export const Grande: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(gaugeOf(frame).querySelector('svg')!.getBoundingClientRect().width).toBe(320);
      expect(frame.querySelector('path[data-key]')!.getAttribute('stroke-width')).toBe('30');
    }
  },
};

/** CA-2: con 0/0/100 solo se dibuja por cobrar, de punta a punta, y el centro dice «0 %». */
export const TodoPorCobrar: Story = {
  name: 'Todo por cobrar',
  args: { delivered: 0, collected: 0, pending: 100 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(keysOf(frame)).toEqual(['pending']);
      expect(figureOf(frame)).toBe('0 %');
    }
  },
};

// ─── Móvil ───

export const NormalMovil: Story = { name: 'Normal · móvil' };

export const InicioDeMes: Story = {
  name: 'Inicio de mes · móvil',
  args: { delivered: 10, collected: 20, pending: 70 },
};

/** CA-4: con 0/0/0 no hay tramos (solo el fondo del arco) y el centro dice «0 %». */
export const TodoEnCero: Story = {
  name: 'Todo en cero',
  args: { delivered: 0, collected: 0, pending: 0 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(keysOf(frame)).toEqual([]);
      expect(frame.querySelector('path[data-part="track"]')).not.toBeNull();
      expect(figureOf(frame)).toBe('0 %');
      expect(gaugeOf(frame).getAttribute('aria-label')).toBe(
        '0 % entregado; 0 % cobrado sin entregar; 0 % por cobrar',
      );
    }
  },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', alignItems: 'flex-end' }}>
      <Gauge delivered={52} collected={14} pending={34} />
      <Gauge delivered={86} collected={6} pending={8} />
      <Gauge delivered={10} collected={20} pending={70} size="large" />
      <Gauge delivered={0} collected={0} pending={0} />
    </div>
  ),
};
