import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Organismos/Estado vacío y de carga',
  component: EmptyState,
  args: {
    kind: 'empty',
    title: 'Todavía no tienes clientes',
    text: 'Cuando crees un cliente, aparece aquí con lo que te debe.',
    action: { label: 'Nuevo cliente', icon: 'new-customer', onClick: fn() },
  },
  argTypes: {
    kind: { control: 'inline-radio', options: ['empty', 'no-results', 'offline', 'error', 'loading'] },
    rows: { control: { type: 'number', min: 1 } },
  },
  parameters: {
    design: {
      ficha: 'Lib-EstadoVacio',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Dentro de cualquier lista o isla, en lugar de las filas.'],
      whenNotToUse: ['Para errores de un campo (van en el Campo).'],
      usedIn: ['Clientes', 'Inventario', 'Dinero'],
    },
    docs: {
      description: {
        component:
          'Lo que se ve cuando una lista no tiene nada que mostrar: vacía, sin resultados, sin conexión o con error; y el esqueleto mientras carga. Dice qué pasa y qué hacer. En `empty` la acción es principal (crea algo); en los demás, secundaria (corrige). Sin conexión, una acción que escribe va deshabilitada con «Necesita conexión» (BR-GEN-08).',
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
const stateOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[role="status"], [role="alert"]')!;

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-3: en vacío, «Nuevo cliente» es el botón principal; ícono en un círculo gris. */
export const Vacio: Story = {
  name: 'Vacío',
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const state = stateOf(frame);
      expect(state.getAttribute('role')).toBe('status');
      expect(state.querySelector('button')!.dataset.variant).toBe('primary');
      const circle = state.querySelector('svg')!.parentElement!;
      expect(getComputedStyle(circle).backgroundColor).toBe(tokenColor(frame, '--color-tone'));
      expect(getComputedStyle(circle).color).toBe(tokenColor(frame, '--color-text-2'));
      await userEvent.click(state.querySelector('button')!);
    }
    expect(args.action!.onClick).toHaveBeenCalled();
  },
};

/** CA-3: en sin resultados, «Quitar filtros» es secundario. */
export const SinResultados: Story = {
  name: 'Sin resultados',
  args: {
    kind: 'no-results',
    title: 'No hay clientes para «Marta»',
    text: 'Revisa cómo lo escribiste o quita los filtros.',
    action: { label: 'Quitar filtros', onClick: fn() },
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const state = stateOf(frame);
      expect(state.querySelector('button')!.dataset.variant).toBe('secondary');
      expect(state.querySelector<SVGElement>('svg')!.dataset.icon).toBe('search');
    }
  },
};

/** R3 y R4: «puedes consultar lo guardado, pero no registrar»; la acción que escribe va deshabilitada. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: {
    kind: 'offline',
    title: 'Sin conexión',
    text: 'Puedes consultar lo guardado, pero no registrar.',
    action: { label: 'Nuevo cliente', icon: 'new-customer', onClick: fn(), disabled: true },
  },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const state = stateOf(frame);
      expect(state.querySelector<SVGElement>('svg')!.dataset.icon).toBe('offline');
      const button = state.querySelector('button')!;
      expect(button.getAttribute('aria-disabled')).toBe('true');
      const note = state.querySelector(`#${CSS.escape(button.getAttribute('aria-describedby')!)}`)!;
      expect(note.textContent).toBe('Necesita conexión');
      await userEvent.click(button);
    }
    expect(args.action!.onClick).not.toHaveBeenCalled();
  },
};

/** CA-1: `role="alert"`, ícono `alert` en rojo y «Reintentar» secundario. */
export const ErrorStory: Story = {
  name: 'Error',
  args: {
    kind: 'error',
    title: 'No se pudo cargar',
    text: 'Revisa tu conexión e inténtalo otra vez.',
    action: { label: 'Reintentar', onClick: fn() },
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const state = stateOf(frame);
      expect(state.getAttribute('role')).toBe('alert');
      const icon = state.querySelector<SVGElement>('svg')!;
      expect(icon.dataset.icon).toBe('alert');
      expect(getComputedStyle(icon).color).toBe(tokenColor(frame, '--color-bad'));
      const button = state.querySelector('button')!;
      expect(button.textContent).toBe('Reintentar');
      expect(button.dataset.variant).toBe('secondary');
    }
  },
};

/** CA-2 y R2: 4 filas de esqueleto del alto de la Fila de lista, `aria-busy` y un solo «Cargando…». */
export const Cargando: Story = {
  args: { kind: 'loading', rows: 4 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const state = stateOf(frame);
      expect(state.getAttribute('aria-busy')).toBe('true');
      const rows = [...state.querySelectorAll<HTMLElement>('[data-row]')];
      expect(rows).toHaveLength(4);
      for (const row of rows) {
        expect(row.getAttribute('aria-hidden')).toBe('true');
        expect(row.getBoundingClientRect().height).toBe(isMobile(frame) ? 72 : 64);
      }
      expect(state.textContent).toBe('Cargando…');
      const bar = rows[0]!.querySelector('span > span')!;
      expect(getComputedStyle(bar).backgroundColor).toBe(tokenColor(frame, '--color-skeleton'));
    }
  },
};

// ─── Móvil ───

export const VacioMovil: Story = { name: 'Vacío · móvil' };

export const SinResultadosMovil: Story = {
  name: 'Sin resultados · móvil',
  args: {
    kind: 'no-results',
    title: 'No hay clientes para «Marta»',
    text: 'Revisa cómo lo escribiste o quita los filtros.',
    action: { label: 'Quitar filtros', onClick: fn() },
  },
};

export const CargandoMovil: Story = { name: 'Cargando · móvil', args: { kind: 'loading', rows: 4 } };

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <EmptyState
        kind="empty"
        title="Todavía no tienes clientes"
        text="Cuando crees un cliente, aparece aquí con lo que te debe."
        action={{ label: 'Nuevo cliente', icon: 'new-customer', onClick: () => {} }}
      />
      <EmptyState
        kind="error"
        title="No se pudo cargar"
        text="Revisa tu conexión e inténtalo otra vez."
        action={{ label: 'Reintentar', onClick: () => {} }}
      />
      <EmptyState kind="loading" rows={2} />
    </div>
  ),
};
