import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Choice } from '../../atoms/Choice';
import { ViewBar, type ViewBarProps } from './ViewBar';

const statusPanel = (
  <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
    <Choice label="Vencido" checked onCheckedChange={() => {}} />
    <Choice label="Pagando" checked onCheckedChange={() => {}} />
    <Choice label="Saldado" checked={false} onCheckedChange={() => {}} />
  </div>
);

const base: ViewBarProps = {
  views: {
    'aria-label': 'Vistas de clientes',
    items: [
      { id: 'all', label: 'Todos', count: 48 },
      { id: 'debtors', label: 'Deudores', count: 21 },
      { id: 'settled', label: 'Saldados', count: 25 },
      { id: 'archived', label: 'Archivados', count: 2 },
    ],
    value: 'all',
  },
  search: { placeholder: 'Buscar cliente' },
  filters: {
    label: 'Estado',
    panel: statusPanel,
    activeChips: [],
    onRemove: fn(),
    onClear: fn(),
  },
  sort: {
    options: [
      { id: 'recent', label: 'Más recientes' },
      { id: 'name', label: 'Nombre (A–Z)' },
      { id: 'balance', label: 'Saldo pendiente' },
      { id: 'next_due', label: 'Próximo abono' },
    ],
    value: 'recent',
    direction: 'desc',
    onChange: fn(),
  },
};

const active: ViewBarProps = {
  ...base,
  filters: {
    ...base.filters!,
    activeChips: [
      { id: 'overdue', label: 'Vencido' },
      { id: 'current', label: 'Pagando' },
    ],
  },
  sort: { ...base.sort!, value: 'balance', direction: 'desc' },
};

const meta = {
  title: 'Organismos/Barra de vista',
  component: ViewBar,
  args: base,
  parameters: {
    // Los marcos repiten la barra (misma región, mismo buscador) en la página; en la app hay una sola.
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Lib-Plantilla-Lista',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Encima de la lista de toda pantalla raíz (Clientes, Inventario, Dinero).'],
      whenNotToUse: ['Dentro de una isla o de un detalle.'],
      usedIn: ['Plantilla de lista', 'Clientes', 'Inventario', 'Dinero'],
    },
    docs: {
      description: {
        component:
          'Un único componente (ADR-0029) con las vistas, el buscador, los filtros, el orden y los chips de filtros activos. Escritorio: buscador de 300, botón de filtros con su menú (las opciones las pone la pantalla), chip de orden en acento con el sentido segmentado y «Limpiar». Móvil: el botón de filtros va dentro del buscador y abre la hoja «Filtrar / Ordenar»; los chips van en una fila y, si no caben, se resumen en «Filtros (N)».',
      },
    },
  },
} satisfies Meta<typeof ViewBar>;

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
const regionOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[role="region"]')!;
const openSheet = async (frame: HTMLElement) => {
  await userEvent.click(regionOf(frame).querySelector('[aria-label^="Filtros"]')!);
  await waitFor(() => expect(frame.querySelector('[role="dialog"]')).not.toBeNull());
  return frame.querySelector<HTMLElement>('[role="dialog"]')!;
};

export const Explorar: Story = {};

/** R7: región «Vista de la lista»; en escritorio, buscador de 300, botón «Estado» y chip de orden; sin chips. */
export const SinFiltros: Story = {
  name: 'Sin filtros',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const region = regionOf(frame);
      expect(region.getAttribute('aria-label')).toBe('Vista de la lista');
      expect(region.querySelector('[data-kind="filter"]')).toBeNull();
      if (isMobile(frame)) {
        expect(region.querySelector('[aria-label="Filtros"]')).not.toBeNull();
        continue;
      }
      expect(region.querySelector<HTMLElement>('[role="search"]')!.getBoundingClientRect().width).toBe(300);
      expect([...region.querySelectorAll('button')].some((b) => b.textContent === 'Estado')).toBe(true);
    }
  },
};

/** CA-3 y CA-4: chips de los filtros activos; chip de orden en acento con el sentido marcado. */
export const ConFiltrosYOrden: Story = {
  name: 'Con filtros y orden activos',
  args: active,
  play: async ({ canvasElement, args }) => {
    const onRemove = args.filters!.onRemove as ReturnType<typeof fn>;
    const onChange = args.sort!.onChange as ReturnType<typeof fn>;
    for (const frame of frames(canvasElement)) {
      onRemove.mockClear();
      onChange.mockClear();
      const region = regionOf(frame);
      // CA-3: dos chips; al quitar uno se llama `onRemove(id)`.
      await userEvent.click(region.querySelector('[aria-label="Quitar filtro Pagando"]:not([inert] *)')!);
      expect(onRemove).toHaveBeenCalledWith('current');
      if (isMobile(frame)) {
        expect(region.querySelector('[aria-label="Filtros, 2 activos"]')).not.toBeNull();
        continue;
      }
      // CA-4: el chip de orden en acento dice «Saldo pendiente»; «Descendente» marcado; elegir el otro sentido.
      const chip = [...region.querySelectorAll<HTMLElement>('button')].find((b) =>
        b.textContent!.endsWith('Saldo pendiente'),
      )!;
      expect(getComputedStyle(chip).color).toBe(tokenColor(frame, '--color-accent-text'));
      const desc = region.querySelector<HTMLElement>('[role="radio"][title="Descendente"]')!;
      expect(desc.getAttribute('aria-checked')).toBe('true');
      await userEvent.click(region.querySelector('[role="radio"][title="Ascendente"]')!);
      expect(onChange).toHaveBeenCalledWith({ value: 'balance', direction: 'asc' });
      expect([...region.querySelectorAll('button')].some((b) => b.textContent === 'Limpiar')).toBe(true);
    }
  },
};

/** R6: en móvil, si los chips no caben en una fila se resumen en «Filtros (N)». */
export const ChipsResumidos: Story = {
  name: 'Chips resumidos · móvil',
  args: {
    ...active,
    filters: {
      ...active.filters!,
      activeChips: [
        { id: 'overdue', label: 'Vencido' },
        { id: 'current', label: 'Pagando' },
        { id: 'book', label: 'Las bellas historias de la Biblia' },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      await waitFor(() =>
        expect(
          [...regionOf(frame).querySelectorAll('button')].some((b) => b.textContent === 'Filtros (3)'),
        ).toBe(true),
      );
    }
  },
};

/** R6: el botón de filtros del buscador abre la hoja en «Filtrar», con las opciones de la pantalla. */
export const HojaFiltrar: Story = {
  name: 'Hoja Filtrar · móvil',
  args: active,
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      const sheet = await openSheet(frame);
      expect(sheet.querySelector('h2')!.textContent).toBe('Filtrar y ordenar');
      expect(sheet.querySelector('[role="tab"][aria-selected="true"]')!.textContent).toBe('Filtrar');
      expect(sheet.textContent).toContain('Vencido');
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).toBeNull());
    }
  },
};

/** R6: la pestaña «Ordenar» de la hoja tiene las opciones y el sentido. */
export const HojaOrdenar: Story = {
  name: 'Hoja Ordenar · móvil',
  args: active,
  play: async ({ canvasElement, args }) => {
    const onChange = args.sort!.onChange as ReturnType<typeof fn>;
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      onChange.mockClear();
      const sheet = await openSheet(frame);
      await userEvent.click(
        [...sheet.querySelectorAll('[role="tab"]')].find((t) => t.textContent === 'Ordenar')!,
      );
      await waitFor(() => expect(sheet.querySelector('fieldset')).not.toBeNull());
      expect(sheet.querySelector('legend')!.textContent).toBe('Ordenar por');
      await userEvent.click(
        [...sheet.querySelectorAll('label')].find((l) => l.textContent === 'Nombre (A–Z)')!,
      );
      expect(onChange).toHaveBeenCalledWith({ value: 'name', direction: 'desc' });
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).toBeNull());
    }
  },
};

/** Claro y oscuro × escritorio y móvil. */
export const Matriz: Story = { parameters: { frames: 'matrix' }, args: active };
