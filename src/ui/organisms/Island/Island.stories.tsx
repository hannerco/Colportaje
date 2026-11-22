import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { formatCOP } from '@/domain/money';
import { formatDate, localDate } from '@/domain/time';
import { Field } from '../../atoms/Field';
import { DataList, DataRow } from '../../molecules/DataRow';
import { HistoryTimeline } from '../../molecules/HistoryTimeline';
import { Island } from './Island';

const dataRows = (
  <DataList>
    <DataRow
      kind="editable"
      label="Precio acordado"
      value={formatCOP(93000)}
      previous={formatCOP(98000)}
      divider={false}
      onEdit={() => {}}
    />
    <DataRow kind="amount" label="Diferencia" value={formatCOP(-5000)} />
    <DataRow
      kind="editable"
      label="Vendido el"
      value={formatDate(localDate('2026-11-02'))}
      icon="calendar"
      onEdit={() => {}}
    />
  </DataList>
);

const history = (
  <HistoryTimeline
    items={[
      { id: 'h3', text: 'Apareció', note: 'Estaba en la caja de la casa', date: localDate('2026-11-12') },
      { id: 'h2', text: 'Con novedad', date: localDate('2026-11-05') },
      { id: 'h1', text: 'Recibido', date: localDate('2026-10-15') },
    ]}
    undo={{ label: 'Deshacer', onUndo: () => {} }}
  />
);

const notes = (
  <p style={{ margin: 0 }}>Prefiere que la visiten después de las 5 p. m.; el portón es el azul.</p>
);

const meta = {
  title: 'Organismos/Isla',
  component: Island,
  args: { title: 'Precio y fechas', children: dataRows },
  argTypes: { children: { control: false } },
  parameters: {
    // Los marcos repiten cada isla (misma sección con el mismo nombre) en la misma página; en la app no se repiten.
    a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } },
    design: {
      ficha: 'Lib-Isla',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En el detalle de ejemplar, abono, cliente y Abibono.', 'En bloques de Ajustes.'],
      whenNotToUse: ['Para listas largas a pantalla completa.', 'Islas dentro de islas.'],
      usedIn: [
        'Detalle de un ejemplar',
        'Detalle de un abono',
        'Detalle de un cliente',
        'Detalle de un Abibono',
      ],
    },
    docs: {
      description: {
        component:
          'Tarjeta que agrupa los datos de un detalle; recibe cualquier contenido. Con título es una `<section>` que el lector anuncia con ese nombre; sin título no hay encabezado. La acción del título es un botón enlace compacto.',
      },
    },
  },
} satisfies Meta<typeof Island>;

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
const islandOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('section')!;

export const Explorar: Story = {};

// ─── Escritorio ───

/** R1: fondo `card`, radio 18/16 y relleno 18 24 10 / 14 16 8. */
export const Datos: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const island = islandOf(frame);
      const style = getComputedStyle(island);
      expect(style.backgroundColor).toBe(tokenColor(frame, '--color-card'));
      expect(style.borderRadius).toBe(isMobile(frame) ? '16px' : '18px');
      expect(style.padding).toBe(isMobile(frame) ? '14px 16px 8px' : '18px 24px 10px');
      expect(island.querySelectorAll('dl > div')).toHaveLength(3);
      expect(island.querySelector('h2')!.textContent).toBe('Precio y fechas');
    }
  },
};

/** CA-1: la sección se anuncia «Historial» (su nombre es el título). */
export const Historial: Story = {
  args: { title: 'Historial', children: history },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const island = islandOf(frame);
      const heading = island.querySelector('h2')!;
      expect(island.getAttribute('aria-labelledby')).toBe(heading.id);
      expect(heading.textContent).toBe('Historial');
      expect(island.querySelector('ol')).not.toBeNull();
    }
  },
};

/** CA-3 y R2: «Agregar» es un botón enlace compacto que llama su `onClick`; el ícono va en `text-2`. */
export const ContenidoLibre: Story = {
  name: 'Contenido libre',
  args: { title: 'Notas', icon: 'note', action: { label: 'Agregar', onClick: fn() }, children: notes },
  play: async ({ canvasElement, args }) => {
    const onClick = args.action!.onClick as ReturnType<typeof fn>;
    onClick.mockClear();
    for (const frame of frames(canvasElement)) {
      const island = islandOf(frame);
      expect(getComputedStyle(island.querySelector('h2 svg')!).color).toBe(
        tokenColor(frame, '--color-text-2'),
      );
      const button = island.querySelector<HTMLButtonElement>('button')!;
      expect(button.textContent).toBe('Agregar');
      expect(button.dataset.variant).toBe('link');
      await userEvent.click(button);
    }
    expect(onClick).toHaveBeenCalledTimes(frames(canvasElement).length);
  },
};

/** CA-2: sin título no hay encabezado ni hueco: el contenido empieza justo después del relleno. */
export const SinTitulo: Story = {
  name: 'Sin título',
  args: { title: undefined, children: notes },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const island = islandOf(frame);
      expect(island.querySelector('h2')).toBeNull();
      expect(island.hasAttribute('aria-labelledby')).toBe(false);
      const top = island.getBoundingClientRect().top + 1 + parseFloat(getComputedStyle(island).paddingTop);
      expect(Math.round(island.querySelector('p')!.getBoundingClientRect().top)).toBe(Math.round(top));
    }
  },
};

/**
 * #26 (corrección del dueño, 2026-11-22): los campos de una isla no quedan pegados; entre un bloque y el siguiente hay
 * siempre 14 de espacio (lienzo CrearV5).
 */
export const Campos: Story = {
  args: {
    title: 'Información del cliente',
    icon: 'person',
    children: (
      <>
        <Field kind="phone" label="Teléfono" value="320 696 7052" onChange={() => {}} />
        <Field label="Dirección" placeholder="Calle, número y barrio" value="" onChange={() => {}} />
        <Field kind="textarea" label="Información" value="Monte de Sion, interesante" onChange={() => {}} />
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const blocks = [...islandOf(frame).querySelector(':scope > div:last-child')!.children];
      expect(blocks.length).toBe(3);
      for (let i = 1; i < blocks.length; i++) {
        const gap = blocks[i]!.getBoundingClientRect().top - blocks[i - 1]!.getBoundingClientRect().bottom;
        expect(Math.round(gap)).toBe(14);
      }
    }
  },
};

// ─── Móvil ───

export const DatosMovil: Story = { name: 'Datos · móvil' };

export const HistorialMovil: Story = {
  name: 'Historial · móvil',
  args: { title: 'Historial', children: history },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil, apiladas como en un detalle. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <Island title="Precio y fechas">{dataRows}</Island>
      <Island title="Notas" icon="note" action={{ label: 'Agregar', onClick: () => {} }}>
        {notes}
      </Island>
      <Island title="Historial">{history}</Island>
    </div>
  ),
};
