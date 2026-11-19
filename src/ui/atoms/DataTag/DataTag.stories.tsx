import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { localDate } from '@/domain/time';
import { DataTag } from './DataTag';

const meta = {
  title: 'Átomos/Etiqueta',
  component: DataTag,
  args: { kind: 'fraction', value: { index: 2, total: 4 } },
  argTypes: {
    kind: { control: false },
    value: { control: 'object' },
  },
  parameters: {
    design: {
      ficha: 'Lib-Etiqueta',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Cuota de un abono (fracción).',
        'Número de ejemplar.',
        'Fecha acordada en el encabezado del abono.',
      ],
      whenNotToUse: ['Para estados (Pastilla) ni filtros (Chip).', 'Para textos largos.'],
      usedIn: ['Fila de lista', 'Detalle de un abono', 'Detalle de un ejemplar'],
    },
    docs: {
      description: {
        component:
          'Dato corto de solo lectura sobre fondo gris: cuota «2/4», ejemplar «#6», fecha acordada. No es estado ni se puede pulsar. El componente formatea el valor (fechas dd/mm/aaaa).',
      },
    },
  },
} satisfies Meta<typeof DataTag>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const tagOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-kind]')!;
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
/** Lo que se ve (sin lo oculto para la vista) y lo que oye el lector de pantalla (sin lo oculto para él). */
const visibleText = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLElement>('span:not([class*="visuallyHidden"])')]
    .filter((s) => !s.querySelector('span'))
    .map((s) => s.textContent)
    .join(' ');
const spokenText = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLElement>('span:not([aria-hidden="true"])')]
    .filter((s) => !s.querySelector('span'))
    .map((s) => s.textContent)
    .join(' ');

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-1: se lee «2/4» en peso 600 y su nombre accesible es «Cuota 2 de 4». */
export const Fraccion: Story = {
  name: 'Fracción',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const tag = tagOf(frame);
      expect(visibleText(tag)).toBe('2/4');
      expect(spokenText(tag)).toBe('Cuota 2 de 4');
      expect(getComputedStyle(tag).fontWeight).toBe('600');
      expect(tag.getBoundingClientRect().height).toBe(24);
    }
  },
};

/** CA-3: «#6» en `text-3`. */
export const Numero: Story = {
  name: 'Número',
  args: { kind: 'number', value: 6 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(tagOf(frame).textContent).toBe('#6');
      expect(getComputedStyle(tagOf(frame)).color).toBe(tokenColor(frame, '--color-text-3'));
    }
  },
};

/** CA-2: ícono de calendario, «Fecha acordada» y «05/11/2026»; alto 28 en escritorio y 30 en móvil. */
export const Fecha: Story = {
  args: { kind: 'date', value: localDate('2026-11-05'), prefix: 'Fecha acordada' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const tag = tagOf(frame);
      const mobile = frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
      expect(tag.querySelector('svg')!.classList.contains('lucide-calendar')).toBe(true);
      expect(tag.textContent).toBe('Fecha acordada05/11/2026');
      expect(tag.getBoundingClientRect().height).toBe(mobile ? 30 : 28);
    }
  },
};

export const Texto: Story = { args: { kind: 'text', value: 'Efectivo' } };

// ─── Móvil ───

export const FraccionMovil: Story = { name: 'Fracción · móvil', args: { value: { index: 3, total: 4 } } };

export const FechaMovil: Story = {
  name: 'Fecha · móvil',
  args: { kind: 'date', value: localDate('2026-11-05'), prefix: 'Fecha acordada' },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
      <DataTag value={{ index: 2, total: 4 }} />
      <DataTag kind="number" value={6} />
      <DataTag kind="date" value={localDate('2026-11-05')} prefix="Fecha acordada" />
      <DataTag kind="date" value={localDate('2026-11-05')} />
      <DataTag kind="text" value="Efectivo" />
    </div>
  ),
};
