import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { proposedAmount, sortByDueDate } from '@/domain/manual-schedule';
import { localDate } from '@/domain/time';
import { PaymentSchedule, type PaymentScheduleProps, type ScheduleListRow } from './PaymentSchedule';

const d = localDate;
const today = d('2026-11-24');

const sched = (
  id: string,
  dueDate: string | null,
  amount: number,
  extra?: Partial<ScheduleListRow>,
): ScheduleListRow =>
  ({ type: 'scheduled', id, dueDate: dueDate ? d(dueDate) : null, amount, ...extra }) as ScheduleListRow;

// Lienzo «Propuestas · 10 · Abonos a mano · Crear cliente»: saldo $140.000 ($180.000 − cuota inicial $40.000).
const CREATE_BASE = [
  sched('a1', '2026-12-08', 35_000),
  sched('a2', '2026-12-22', 35_000),
  sched('a3', '2027-01-05', 35_000),
  sched('a4', '2027-01-19', 35_000),
];
const CREATE = {
  vacio: [],
  todo: CREATE_BASE,
  falta: CREATE_BASE.slice(0, 3),
  'de-mas': [...CREATE_BASE.slice(0, 3), sched('a4', '2027-02-05', 70_000)],
  vencido: [sched('a1', '2026-11-10', 35_000), ...CREATE_BASE.slice(1)],
  cero: [...CREATE_BASE, sched('a5', null, 0)],
} satisfies Record<string, ScheduleListRow[]>;

// Lienzo «11 · Ficha del cliente»: dos abonos pagados y cuatro por cobrar de $80.000.
const PAID: ScheduleListRow[] = [
  { type: 'paid', id: 'g1', date: d('2026-10-03'), amount: 80_000, status: 'delivered', method: 'transfer' },
  { type: 'paid', id: 'g2', date: d('2026-10-17'), amount: 60_000, status: 'collected', method: 'cash' },
];
const SAVED_BASE = [
  sched('p1', '2026-11-28', 80_000),
  sched('p2', '2026-12-12', 80_000, { rescheduledFrom: d('2026-12-05') }),
  sched('p3', '2026-12-26', 80_000),
  sched('p4', '2027-01-09', 80_000),
];

type DemoProps = Omit<PaymentScheduleProps, 'rows' | 'onChangeDate' | 'onChangeAmount' | 'onRemove'> & {
  rows: ScheduleListRow[];
  onChangeDate?: PaymentScheduleProps['onChangeDate'];
  onChangeAmount?: PaymentScheduleProps['onChangeAmount'];
  onRemove?: PaymentScheduleProps['onRemove'];
};

/** La lista con estado, como el contenedor: cambiar, agregar y quitar de verdad. */
function Demo({ rows: initial, onChangeDate, onChangeAmount, onRemove, ...props }: DemoProps) {
  const [rows, setRows] = useState(initial);
  const [focusId, setFocusId] = useState<string | null>(null);
  const update = (id: string, patch: Partial<ScheduleListRow>) =>
    setRows((current) => {
      const next = current.map((row) => (row.id === id ? ({ ...row, ...patch } as ScheduleListRow) : row));
      const paid = next.filter((row) => row.type === 'paid');
      const scheduled = next.filter((row) => row.type === 'scheduled');
      return [...paid, ...sortByDueDate(scheduled)];
    });
  const scheduledTotal = rows.filter((r) => r.type === 'scheduled').reduce((sum, r) => sum + r.amount, 0);
  return (
    <PaymentSchedule
      {...props}
      rows={rows}
      focusId={focusId}
      onAdd={
        props.mode === 'create'
          ? () => {
              const id = `n${rows.length + 1}`;
              setRows((current) => [
                ...current,
                sched(id, null, proposedAmount(props.pending, scheduledTotal)),
              ]);
              setFocusId(id);
            }
          : undefined
      }
      onChangeDate={(id, date, reason, note) => {
        onChangeDate?.(id, date, reason, note);
        update(id, { dueDate: date } as Partial<ScheduleListRow>);
      }}
      onChangeAmount={(id, amount) => {
        onChangeAmount?.(id, amount);
        update(id, { amount });
      }}
      onRemove={(id) => {
        onRemove?.(id);
        setRows((current) => current.filter((row) => row.id !== id));
      }}
    />
  );
}

const meta = {
  title: 'Pantallas/Clientes/Abonos/Abonos a mano',
  component: Demo,
  args: {
    mode: 'create',
    rows: CREATE.todo,
    pending: 140_000,
    today,
    onChangeDate: fn(),
    onChangeAmount: fn(),
    onRemove: fn(),
    onCollect: fn(),
    onReview: fn(),
  },
  parameters: {
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    design: {
      ficha: 'Propuestas · Abonos a mano, sin plan automático (24/11/2026) · AbonosIsla',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'La isla «Abonos» de Nuevo cliente y de la ficha: cada abono con la fecha y el valor que el colportor quiera.',
        'El totalizador solo responde «¿programé de más o de menos?».',
      ],
      whenNotToUse: ['Nunca para obligar: lo que antes era exigencia ahora es aviso (ronda 38).'],
      usedIn: ['Nuevo cliente', 'Ficha de cliente'],
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const lastDialog = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[role="alertdialog"]')].at(-1)!;
const byLabel = (root: Element, start: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
    (b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '').startsWith(start),
  );

export const Explorar: Story = {};

export const CrearVacio: Story = { name: 'Crear · lista vacía', args: { rows: CREATE.vacio } };

/** Todo programado: el totalizador en verde. */
export const CrearTodo: Story = {
  name: 'Crear · todo programado',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Abono 4 de 4');
      expect(frame.textContent).toContain('Todo programado');
    }
  },
};

export const CrearFalta: Story = {
  name: 'Crear · falta programar',
  args: { rows: CREATE.falta },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Falta programar');
      expect(frame.textContent).toContain('$35.000');
    }
  },
};

export const CrearDeMas: Story = {
  name: 'Crear · programado de más',
  args: { rows: CREATE['de-mas'] },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Programaste de más');
      expect(frame.textContent).toContain('Es más de 2 meses desde hoy');
    }
  },
};

export const CrearVencido: Story = {
  name: 'Crear · un abono vencido',
  args: { rows: CREATE.vencido },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) expect(frame.textContent).toContain('Esta fecha ya pasó');
  },
};

export const CrearCero: Story = {
  name: 'Crear · un abono en $0',
  args: { rows: CREATE.cero, focusId: 'a5' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Pon el valor. Si queda en $0, este abono no se guarda.');
      expect(frame.textContent).toContain('Elegir fecha');
    }
  },
};

/** «+ Agregar abono» propone lo que falta ($35.000) y deja el abono sin fecha. */
export const AgregarAbono: Story = {
  name: 'Agregar abono',
  globals: { platform: 'mobile' },
  args: { rows: CREATE.falta },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(byLabel(frame, 'Agregar abono')!);
    await waitFor(() => expect(frame.textContent).toContain('Abono 4 de 4'));
    expect(frame.textContent).toContain('Todo programado');
    expect(frame.textContent).toContain('Elige la fecha. Sin fecha, este abono no se guarda.');
  },
};

/** La basura pide confirmar antes de eliminar. */
export const EliminarAbono: Story = {
  name: 'Eliminar un abono',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(byLabel(frame, 'Eliminar el abono 4 de 4')!);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('¿Eliminar el abono 4 de 4?');
    expect(dialog.textContent).toContain('Era de $35.000 para el 19/01/2027.');
    await userEvent.click(byLabel(dialog, 'Eliminar')!);
    expect(args.onRemove).toHaveBeenCalledWith('a4');
    await waitFor(() => expect(frame.textContent).toContain('Falta programar'));
  },
};

/** Tocar el valor abre el teclado; cambiar uno no toca los demás. */
export const CambiarValor: Story = {
  name: 'Cambiar el valor',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(byLabel(frame, 'Cambiar el valor del abono 2 de 4')!);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    const input = dialog.querySelector('input')!;
    await userEvent.clear(input);
    await userEvent.type(input, '70000');
    await userEvent.click(byLabel(dialog, 'Guardar valor')!);
    expect(args.onChangeAmount).toHaveBeenCalledWith('a2', 70_000);
    await waitFor(() => expect(frame.textContent).toContain('Programaste de más'));
    expect(frame.textContent?.match(/\$35\.000/g)?.length).toBeGreaterThanOrEqual(3);
  },
};

export const FichaTodo: Story = {
  name: 'Ficha · todo programado',
  args: { mode: 'saved', rows: [...PAID, ...SAVED_BASE], pending: 320_000 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Abono 6 de 6');
      expect(frame.textContent).toContain('Entregado');
      expect(frame.textContent).toContain('Aplazado · antes 05/12');
      expect(frame.textContent).toContain('Todo programado');
    }
  },
};

export const FichaVacia: Story = {
  name: 'Ficha · sin abonos por cobrar',
  args: { mode: 'saved', rows: PAID, pending: 320_000 },
};

export const FichaFalta: Story = {
  name: 'Ficha · falta programar',
  args: { mode: 'saved', rows: [...PAID, ...SAVED_BASE.slice(0, 3)], pending: 320_000 },
};

/** Programado de más: «Revisar» (opcional). */
export const FichaDeMas: Story = {
  name: 'Ficha · programado de más',
  args: { mode: 'saved', rows: [...PAID, ...SAVED_BASE], pending: 225_000 },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    expect(frame.textContent).toContain('Programaste de más');
    await userEvent.click(byLabel(frame, 'Revisar')!);
    expect(args.onReview).toHaveBeenCalled();
  },
};

export const FichaVencido: Story = {
  name: 'Ficha · un abono vencido',
  args: {
    mode: 'saved',
    rows: [...PAID, sched('p1', '2026-11-21', 80_000), ...SAVED_BASE.slice(1)],
    pending: 320_000,
  },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) expect(frame.textContent).toContain('Vencido hace 3 días');
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(byLabel(frame, 'Cobrar')!);
    expect(args.onCollect).toHaveBeenCalledWith('p1');
  },
};

/** En la ficha, la fecha de un abono guardado pregunta «¿Por qué cambia?». */
export const FichaCambiarFecha: Story = {
  name: 'Ficha · cambiar la fecha',
  globals: { platform: 'mobile' },
  args: { mode: 'saved', rows: [...PAID, ...SAVED_BASE], pending: 320_000 },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(byLabel(frame, 'Cambiar la fecha del abono 3 de 6')!);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('¿Por qué cambia?');
    expect(dialog.textContent).toContain('Fecha del abono 3 de 6');
  },
};

export const FichaCero: Story = {
  name: 'Ficha · un abono nuevo en $0',
  args: {
    mode: 'saved',
    rows: [...PAID, ...SAVED_BASE, sched('n1', null, 0, { draft: true })],
    pending: 320_000,
    focusId: 'n1',
  },
};

export const SinConexion: Story = {
  name: 'Ficha · sin conexión',
  args: { mode: 'saved', rows: [...PAID, ...SAVED_BASE], pending: 320_000, disabled: true },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
