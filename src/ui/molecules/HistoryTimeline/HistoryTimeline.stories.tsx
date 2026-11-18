import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { formatCOP } from '@/domain/money';
import { localDate } from '@/domain/time';
import { HistoryTimeline, type HistoryItem } from './HistoryTimeline';

const copyItems: HistoryItem[] = [
  { id: 'c3', text: 'Apareció', note: 'Estaba en la caja de la casa', date: localDate('2026-11-12') },
  { id: 'c2', text: 'Con novedad', date: localDate('2026-11-05') },
  { id: 'c1', text: 'Recibido', date: localDate('2026-10-15') },
];

const paymentItems: HistoryItem[] = [
  { id: 'p3', text: `Cobrado en efectivo · ${formatCOP(65000)}`, date: localDate('2026-11-10') },
  {
    id: 'p2',
    text: 'Fecha acordada cambiada',
    note: 'Del 05/11/2026 al 10/11/2026',
    date: localDate('2026-11-03'),
  },
  { id: 'p1', text: 'Abono creado', date: localDate('2026-10-20') },
];

const customerItems: HistoryItem[] = [
  { id: 'u3', text: 'Libro vendido · Las bellas historias de la Biblia', date: localDate('2026-11-02') },
  { id: 'u2', text: 'Teléfono cambiado', date: localDate('2026-10-28') },
  { id: 'u1', text: 'Cliente creado', date: localDate('2026-10-20') },
];

const longItems: HistoryItem[] = [
  { id: 'l8', text: 'Cobrado por transferencia · $30.000', date: localDate('2026-11-15') },
  { id: 'l7', text: 'Fecha acordada cambiada', date: localDate('2026-11-08') },
  { id: 'l6', text: 'Cobrado en efectivo · $25.000', date: localDate('2026-11-01') },
  { id: 'l5', text: 'Libro vendido · El conflicto de los siglos', date: localDate('2026-10-25') },
  { id: 'l4', text: 'Dirección cambiada', note: 'Calle 45 # 70-12', date: localDate('2026-10-20') },
  { id: 'l3', text: 'Cobrado en efectivo · $40.000', date: localDate('2026-10-12') },
  { id: 'l2', text: 'Libro vendido · Las bellas historias de la Biblia', date: localDate('2026-10-02') },
  { id: 'l1', text: 'Cliente creado', date: localDate('2026-10-01') },
];

const meta = {
  title: 'Moléculas/Historial',
  component: HistoryTimeline,
  args: { items: copyItems, undo: { label: 'Deshacer', onUndo: fn() } },
  argTypes: { maxVisible: { control: { type: 'number', min: 1 } } },
  parameters: {
    design: {
      ficha: 'Lib-Historial',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En la última isla del detalle de ejemplar, abono o cliente.'],
      whenNotToUse: ['Como lista de actividad global (eso es Hoy).'],
      usedIn: ['Detalle de un ejemplar', 'Detalle de un abono', 'Detalle de un cliente'],
    },
    docs: {
      description: {
        component:
          'Línea de tiempo de lo que le pasó a un registro, del más reciente al más antiguo. Si el modelo de vista lo permite, la primera entrada lleva «Deshacer». Con más de 5 entradas aparece «Ver todo», que despliega el resto en el lugar. La confirmación al deshacer «Devuelto al líder» la pide la pantalla (BR-COPY-16).',
      },
    },
  },
} satisfies Meta<typeof HistoryTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
const entries = (frame: HTMLElement) => [...frame.querySelectorAll<HTMLElement>('ol > li')];

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-1 y R1: solo la primera entrada tiene «Deshacer», con nombre «Deshacer: Apareció»; puntos y línea. */
export const Ejemplar: Story = {
  play: async ({ canvasElement, args }) => {
    const onUndo = args.undo!.onUndo as ReturnType<typeof fn>;
    onUndo.mockClear();
    for (const frame of frames(canvasElement)) {
      const list = entries(frame);
      expect(list).toHaveLength(3);
      const buttons = frame.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      expect(list[0]!.contains(buttons[0]!)).toBe(true);
      expect(buttons[0]!.textContent).toBe('Deshacer: Apareció');
      expect(list[0]!.textContent).toContain('Estaba en la caja de la casa');
      expect(list[0]!.textContent).toContain('12/11/2026');
      const dot = (li: HTMLElement) => li.querySelector('[aria-hidden="true"] > span')!;
      expect(getComputedStyle(dot(list[0]!)).backgroundColor).toBe(tokenColor(frame, '--color-accent-text'));
      expect(getComputedStyle(dot(list[1]!)).backgroundColor).toBe(
        tokenColor(frame, '--color-neutral-border'),
      );
      const rail = (li: HTMLElement) =>
        getComputedStyle(li.querySelector('[aria-hidden="true"]')!, '::after');
      expect(rail(list[0]!).backgroundColor).toBe(tokenColor(frame, '--color-line'));
      expect(rail(list[2]!).content).toBe('none');
      await userEvent.click(buttons[0]!);
    }
    expect(onUndo).toHaveBeenCalledTimes(frames(canvasElement).length);
  },
};

export const Abono: Story = {
  args: { items: paymentItems },
};

// ─── Móvil ───

export const EjemplarMovil: Story = { name: 'Ejemplar · móvil' };

/** CA-3: sin `undo` no hay ningún botón de deshacer. */
export const ClienteSinDeshacer: Story = {
  name: 'Cliente · sin deshacer · móvil',
  args: { items: customerItems, undo: undefined },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.querySelectorAll('button')).toHaveLength(0);
      expect(entries(frame)).toHaveLength(3);
    }
  },
};

/** CA-2: con 8 entradas se ven 5 y «Ver todo»; al pulsarlo se ven las 8 y el foco pasa a la sexta. */
export const Largo: Story = {
  args: { items: longItems, undo: undefined },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(entries(frame)).toHaveLength(5);
      const showAll = [...frame.querySelectorAll('button')].find((b) => b.textContent === 'Ver todo')!;
      await userEvent.click(showAll);
      const list = entries(frame);
      expect(list).toHaveLength(8);
      expect(document.activeElement).toBe(list[5]);
      expect(frame.querySelectorAll('button')).toHaveLength(0);
    }
  },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <HistoryTimeline items={copyItems} undo={{ label: 'Deshacer', onUndo: () => {} }} />
      <HistoryTimeline items={paymentItems} />
      <HistoryTimeline items={longItems} />
    </div>
  ),
};
