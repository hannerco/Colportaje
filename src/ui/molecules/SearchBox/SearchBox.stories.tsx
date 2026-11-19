import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import { SearchBox, type SearchBoxProps } from './SearchBox';

/** Controlado: en el Storybook guarda el texto para poder escribir y borrar. */
function Stateful(args: SearchBoxProps) {
  const [value, setValue] = useState(args.value ?? '');
  return (
    <SearchBox
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
  title: 'Moléculas/Buscador',
  component: SearchBox,
  render: (args) => <Stateful {...args} />,
  args: { placeholder: 'Buscar cliente', onValueChange: fn(), onOpenFilters: fn() },
  argTypes: {
    filters: { control: 'inline-radio', options: ['auto', 'show', 'hide'] },
    width: { control: 'object' },
  },
  parameters: {
    // Los marcos dibujan el buscador varias veces en la misma página (claro/oscuro × escritorio/móvil): cada copia
    // es un `role="search"` igual. En la app hay un solo buscador por pantalla, así que esa regla no aplica aquí.
    a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } },
    design: {
      ficha: 'Lib-Buscador',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Arriba de cualquier lista de más de 10 elementos.'],
      whenNotToUse: ['Para capturar datos de un formulario (Campo).'],
      usedIn: ['Clientes', 'Inventario', 'Dinero'],
    },
    docs: {
      description: {
        component:
          'Busca dentro de una lista mientras se escribe. En escritorio es una píldora de 40 junto a los filtros; en móvil, una caja de 52 con el botón de filtros adentro. La ✕ borra y deja el foco en la caja; Esc borra el texto o, si está vacío, quita el foco.',
      },
    },
  },
} satisfies Meta<typeof SearchBox>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const searchOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[role="search"]')!;
const inputOf = (frame: HTMLElement) => frame.querySelector<HTMLInputElement>('input[type="search"]')!;
const box = (el: Element) => {
  const { width, height } = el.getBoundingClientRect();
  return { width: Math.round(width), height: Math.round(height) };
};

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-2 y CA-3: Esc en la caja vacía quita el foco; el botón de filtros solo aparece en móvil. */
export const Vacio: Story = {
  name: 'Vacío',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const search = searchOf(frame);
      const input = inputOf(frame);
      expect(input.getAttribute('aria-label')).toBe('Buscar cliente');
      expect(box(search).height).toBe(isMobile(frame) ? 52 : 40);
      expect(getComputedStyle(search).borderRadius).toBe(isMobile(frame) ? '18px' : '999px');
      expect(box(search.querySelector('svg')!).width).toBe(isMobile(frame) ? 22 : 18);
      expect(search.querySelector('[aria-label^="Filtros"]') !== null).toBe(isMobile(frame));
      if (!isMobile(frame)) expect(box(search).width).toBe(300);
      await userEvent.click(input);
      expect(document.activeElement).toBe(input);
      await userEvent.keyboard('{Escape}');
      expect(document.activeElement).not.toBe(input);
    }
  },
};

/** CA-1: con «Mar», la ✕ llama `onValueChange('')` y deja el foco en la caja; Esc también borra. */
export const ConTextoYEnfocado: Story = {
  name: 'Con texto y enfocado',
  args: { value: 'Mar' },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const input = inputOf(frame);
      await userEvent.click(frame.querySelector('[aria-label="Borrar búsqueda"]')!);
      expect(args.onValueChange).toHaveBeenLastCalledWith('');
      expect(input.value).toBe('');
      expect(document.activeElement).toBe(input);
      expect(frame.querySelector('[aria-label="Borrar búsqueda"]')).toBeNull();
      await userEvent.type(input, 'Mar');
      await userEvent.keyboard('{Escape}');
      expect(input.value).toBe('');
      expect(document.activeElement).toBe(input);
      await userEvent.type(input, 'Mar');
      expect(args.onValueChange).toHaveBeenLastCalledWith('Mar');
    }
  },
};

export const BarraLateralConAtajo: Story = {
  name: 'Barra lateral con atajo',
  args: { placeholder: 'Buscar', shortcut: true, width: 220 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const kbd = frame.querySelector('kbd');
      expect(kbd?.textContent ?? null).toBe(isMobile(frame) ? null : '⌘K');
    }
  },
};

// ─── Móvil ───

/** CA-3 y CA-4: «Filtros, 2 activos»; los resultados se anuncian con `aria-live` sin mover el foco. */
export const VacioConFiltros: Story = {
  name: 'Vacío con filtros · móvil',
  args: { activeFilterCount: 2, resultsAnnouncement: '12 clientes' },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const live = frame.querySelector('[aria-live="polite"]')!;
      expect(live.textContent).toBe('12 clientes');
      expect(document.activeElement).not.toBe(inputOf(frame));
      const filters = frame.querySelector<HTMLElement>('[aria-label^="Filtros"]');
      if (!isMobile(frame)) {
        expect(filters).toBeNull();
        continue;
      }
      expect(filters!.getAttribute('aria-label')).toBe('Filtros, 2 activos');
      expect(filters!.textContent).toBe('2');
      await userEvent.click(filters!);
    }
    expect(args.onOpenFilters).toHaveBeenCalledTimes(
      frames(canvasElement).filter((frame) => isMobile(frame)).length,
    );
  },
};

export const ConTexto: Story = {
  name: 'Con texto · móvil',
  args: { value: 'Marí', resultsAnnouncement: '3 clientes' },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <SearchBox placeholder="Buscar cliente" />
      <SearchBox placeholder="Buscar cliente" value="Marí" />
      <SearchBox placeholder="Buscar" shortcut width={220} />
      <SearchBox placeholder="Buscar cliente" filters="show" activeFilterCount={2} />
    </div>
  ),
};
