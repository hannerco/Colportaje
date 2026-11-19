import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import { ICON_NAMES } from '../../icons';
import { Chip, type ChipProps } from './Chip';

const meta = {
  title: 'Átomos/Chip',
  component: Chip,
  args: { children: 'Estado', onClick: fn(), onRemove: fn() },
  argTypes: {
    kind: { control: 'inline-radio', options: ['filter', 'book', 'count'] },
    icon: { control: 'select', options: [undefined, ...ICON_NAMES] },
    maxWidth: { control: { type: 'range', min: 80, max: 400, step: 10 } },
  },
  parameters: {
    design: {
      ficha: 'Lib-Chip',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Filtros activos sobre una lista (Estado: Vencido ✕).',
        'Libros de un cliente en la fila móvil, con «+N» si hay más.',
        'Opciones rápidas en un menú de filtros.',
      ],
      whenNotToUse: ['Para estados (Pastilla).', 'Para cambiar de vista de una lista (Pestañas).'],
      usedIn: ['Barra de vista', 'Fila de lista', 'Menú de filtros'],
    },
    docs: {
      description: {
        component:
          'Pieza pequeña y redondeada para filtrar una lista o mostrar los libros de un cliente. A diferencia de la Pastilla, el chip de filtro se puede pulsar y quitar.',
      },
    },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const chipOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-kind]')!;
const tokenColor = (frame: HTMLElement, token: string, property: 'color' | 'backgroundColor' = 'color') => {
  const probe = document.createElement('span');
  probe.style[property] = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
};

export const Explorar: Story = {};

// ─── Escritorio ───

export const Filtro: Story = { args: { icon: 'filter' } };

export const ConConteo: Story = { name: 'Con conteo', args: { children: 'Vencidos', count: 4 } };

/** CA-1: la ✕ llama a `onRemove` una vez y no a `onClick`; tiene su propio nombre. */
export const SeleccionadoYQuitable: Story = {
  name: 'Seleccionado y quitable',
  args: { children: 'Vencido', selected: true, removable: true },
  play: async ({ canvasElement, args }) => {
    const remove = frames(canvasElement)[0]!.querySelector<HTMLButtonElement>(
      'button[aria-label="Quitar filtro Vencido"]',
    )!;
    await userEvent.click(remove);
    expect(args.onRemove).toHaveBeenCalledTimes(1);
    expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Libro: Story = { args: { kind: 'book', children: 'Un corazón tranquilo' } };

/** CA-2: el título largo se corta con «…» y queda completo en `title`. */
export const LibroLargo: Story = {
  name: 'Libro largo',
  args: { kind: 'book', children: 'Las bellas historias de la Biblia', maxWidth: 180 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const chip = chipOf(frame);
      const text = chip.querySelector<HTMLElement>('span:last-child')!;
      expect(chip.getBoundingClientRect().width).toBeLessThanOrEqual(180);
      expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
      expect(getComputedStyle(text).textOverflow).toBe('ellipsis');
      expect(chip.getAttribute('title')).toBe('Las bellas historias de la Biblia');
      expect(chip.querySelector('svg')!.classList.contains('lucide-book-open')).toBe(true);
    }
  },
};

/** CA-4: el conteo es texto: Tab no lo enfoca. */
export const Conteo: Story = {
  args: { kind: 'count', children: '+2' },
  play: async ({ canvasElement }) => {
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();
    for (const frame of frames(canvasElement)) {
      expect(chipOf(frame).contains(document.activeElement)).toBe(false);
      expect(chipOf(frame).querySelector('svg')).toBeNull();
    }
  },
};

// ─── Móvil ───

export const FiltroMovil: Story = { name: 'Filtro · móvil', args: { icon: 'filter' } };

export const SeleccionadoYQuitableMovil: Story = {
  name: 'Seleccionado y quitable · móvil',
  args: { children: 'Vencido', selected: true, removable: true },
};

export const LibroMovil: Story = {
  name: 'Libro · móvil',
  args: { kind: 'book', children: 'Las bellas historias de la Biblia', maxWidth: 170 },
};

export const ConteoMovil: Story = { name: 'Conteo · móvil', args: { kind: 'count', children: '+1' } };

/** Un filtro que se aplica al pulsarlo (para CA-3). */
function ToggleFilter(args: ChipProps) {
  const [selected, setSelected] = useState(false);
  return <Chip {...args} selected={selected} onClick={() => setSelected((s) => !s)} />;
}

/** CA-3: al aplicarlo, `aria-pressed` pasa de `false` a `true` y los colores cambian a acento. */
export const AlAplicarlo: Story = {
  name: 'Al aplicarlo',
  args: { children: 'Vencido', count: 4 },
  render: (args) => <ToggleFilter {...args} />,
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const button = frame.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(getComputedStyle(chipOf(frame)).backgroundColor).toBe(
      tokenColor(frame, '--color-control-bg', 'backgroundColor'),
    );
    await userEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(getComputedStyle(chipOf(frame)).backgroundColor).toBe(
      tokenColor(frame, '--color-accent-bg', 'backgroundColor'),
    );
    expect(getComputedStyle(chipOf(frame)).color).toBe(tokenColor(frame, '--color-accent-text'));
  },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
      <Chip {...args} icon="filter">
        Estado
      </Chip>
      <Chip {...args} count={4}>
        Vencidos
      </Chip>
      <Chip {...args} selected removable>
        Vencido
      </Chip>
      <Chip {...args} selected removable count={4}>
        Vencidos
      </Chip>
      <Chip {...args} kind="book">
        Un corazón tranquilo
      </Chip>
      <Chip {...args} kind="book" maxWidth={180}>
        Las bellas historias de la Biblia
      </Chip>
      <Chip {...args} kind="count">
        +2
      </Chip>
    </div>
  ),
};
