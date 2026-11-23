import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { localDate } from '@/domain/time';
import { aPaymentRow } from '@/test-support/fixtures';
import {
  PaymentDetailScreen,
  type PaymentDetailForm,
  type PaymentDetailScreenProps,
} from './PaymentDetailScreen';

const TODAY = localDate('2026-11-17');
const CUSTOMER = { id: 'c1', name: 'Yolanda Ríos', avatarEmoji: '🌷', archived: false };

/** Los 4 abonos de la clienta: el abierto es el 2 de 4, de $65.000, vencido hace 3 días (CA-1). */
const SIBLINGS = [
  aPaymentRow({
    paymentId: 'p1',
    status: 'delivered',
    agreedAmount: 65000,
    dueDate: localDate('2026-10-14'),
    originalDueDate: localDate('2026-10-14'),
    paidAmount: 65000,
    paidAt: localDate('2026-10-14'),
    method: 'cash',
    deposit: { id: 'd1', status: 'confirmed' },
    can: { collect: false, edit: false, delete: false, reschedule: false, correctDate: false, cancel: false },
  }),
  aPaymentRow({
    paymentId: 'p2',
    agreedAmount: 65000,
    dueDate: localDate('2026-11-14'),
    originalDueDate: localDate('2026-11-14'),
    isOverdue: true,
    overdueDays: 3,
  }),
  aPaymentRow({
    paymentId: 'p3',
    agreedAmount: 65000,
    dueDate: localDate('2026-11-27'),
    originalDueDate: localDate('2026-11-27'),
  }),
  aPaymentRow({
    paymentId: 'p4',
    agreedAmount: 65000,
    dueDate: localDate('2026-12-14'),
    originalDueDate: localDate('2026-12-14'),
  }),
];

const row = (id: string) => SIBLINGS.find((p) => p.paymentId === id)!;

type DemoProps = Partial<PaymentDetailScreenProps> & { initialForm?: PaymentDetailForm | null };

/** La pantalla con su formulario local, como el contenedor. */
function Demo({ initialForm = null, ...props }: DemoProps) {
  const [form, setForm] = useState<PaymentDetailForm | null>(initialForm);
  return (
    <PaymentDetailScreen
      payment={row('p2')}
      customer={CUSTOMER}
      payments={SIBLINGS}
      isOnline
      window={{ mode: 'page', breadcrumb: { label: 'Dinero', href: '#dinero' }, onClose: () => {} }}
      today={TODAY}
      customerHref={(id) => `#cliente-${id}`}
      paymentHref={(id) => `#abono-${id}`}
      depositHref={(id) => `#abibono-${id}`}
      onCollect={async () => {}}
      onReschedule={async () => {}}
      {...props}
      form={form}
      onFormChange={setForm}
    />
  );
}

const meta = {
  title: 'Pantallas/Dinero/Abono',
  component: Demo,
  args: { onCollect: fn(async () => {}), onReschedule: fn(async () => {}), onRetry: fn() },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Dinero · 6 · Detalle de un abono',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Al abrir un abono desde Dinero, la ficha del cliente o deslizando (/dinero/abonos/[id]).'],
      whenNotToUse: ['Para crear un Abibono (HU-PAN-DIN-04).'],
      usedIn: ['Dinero', 'Clientes'],
    },
    docs: {
      description: {
        component:
          'Detalle de un abono (HU-PAN-DIN-02) sobre la Plantilla de detalle: la franja con su situación, la isla de identidad con «Cobrar», con la franja de estado, la cuota, la fecha acordada, el valor grande y «Cobrar» y «Dar más plazo» a la vista (#72), los demás abonos del cliente y el historial completo. Cobrar pide valor real (sugerido = acordado), fecha y método, y avisa del cobro parcial antes de confirmar. Un abono entregado está bloqueado: candado, sin acciones y con enlace a su Abibono.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const button = (root: Element, name: string | RegExp) =>
  [...root.querySelectorAll<HTMLElement>('button, a')].find((b) => {
    const label = b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '';
    return typeof name === 'string' ? label === name : name.test(label);
  });
const lastDialog = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[role="alertdialog"]')].at(-1)!;

export const Explorar: Story = {};

/** CA-1: $65.000 vencido hace 3 días → la franja «Vencido hace 3 días» y «Cobrar» en la isla de identidad. */
export const PorCobrarVencido: Story = {
  name: 'Por cobrar vencido',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Vencido hace 3 días');
      expect(frame.textContent).toContain('2/4');
      expect(frame.textContent).toContain('$65.000');
      expect(button(frame, 'Cobrar')).toBeDefined();
    }
  },
};

export const PorCobrarAlDia: Story = {
  name: 'Por cobrar al día',
  args: { payment: row('p3') },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Faltan 10 días');
      expect(frame.querySelector('[data-tone="overdue"]')).toBeNull();
    }
  },
};

export const Cobrado: Story = {
  args: {
    payment: aPaymentRow({
      paymentId: 'p2',
      status: 'collected',
      agreedAmount: 65000,
      dueDate: localDate('2026-11-14'),
      originalDueDate: localDate('2026-11-14'),
      paidAmount: 60000,
      paidAt: localDate('2026-11-17'),
      method: 'transfer',
      can: { collect: false, edit: true, delete: true, reschedule: false, correctDate: false, cancel: false },
    }),
    history: [
      {
        id: 'collected',
        kind: 'collected',
        date: localDate('2026-11-17'),
        amount: 60000,
        method: 'transfer',
      },
      {
        id: 'scheduled',
        kind: 'scheduled',
        date: localDate('2026-10-03'),
        amount: 65000,
        dueDate: localDate('2026-11-14'),
      },
    ],
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('17/11/2026 · 3 días tarde');
      // #72: valor cobrado con el acordado tachado y el método en lugar de las acciones.
      expect(frame.textContent).toContain('Valor cobrado');
      expect(frame.querySelector('s')?.textContent).toBe('$65.000');
      expect(frame.textContent).toContain('Programado: $65.000 para el 14/11/2026');
      expect(frame.textContent).toContain('Cobrado');
      expect(frame.textContent).toContain('Cobrado: $60.000 en transferencia');
      expect(button(frame, 'Cobrar')).toBeUndefined();
    }
  },
};

/** CA-4: un abono entregado no tiene «Cobrar» ni «Dar más plazo», la Pastilla lleva candado y se ve su Abibono. */
export const Entregado: Story = {
  args: { payment: row('p1') },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    expect(frame.textContent).toContain('Entregado');
    expect(button(frame, 'Cobrar')).toBeUndefined();
    expect(button(frame, 'Dar más plazo')).toBeUndefined();
    expect(frame.querySelector('a[href="#abibono-d1"]')).not.toBeNull();
    expect(frame.querySelector('[data-status="delivered"] svg')).not.toBeNull();
  },
};

/** El formulario de Cobrar: el valor sugerido es el acordado y el método, Transferencia. */
export const CobrarAbierto: Story = {
  name: 'Cobrar abierto',
  args: { initialForm: 'collect' },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('Cobrar · Yolanda Ríos');
    expect(dialog.querySelector<HTMLInputElement>('input[inputmode="numeric"]')?.value).toContain('65.000');
    expect(dialog.querySelector('[role="radio"][value="transfer"]')?.getAttribute('aria-checked')).toBe(
      'true',
    );
    await userEvent.click(button(dialog, 'Cobrar')!);
    await waitFor(() =>
      expect(args.onCollect).toHaveBeenCalledWith({
        paidAmount: 65000,
        paidAt: TODAY,
        method: 'transfer',
      }),
    );
  },
};

/** CA-2: cobrar $40.000 de $65.000 avisa del cobro parcial con la diferencia de $25.000 antes de confirmar. */
export const CobroParcial: Story = {
  name: 'Cobro parcial',
  args: { initialForm: 'collect' },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    const amount = dialog.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!;
    await userEvent.clear(amount);
    await userEvent.type(amount, '40000');
    await waitFor(() => expect(dialog.textContent).toContain('faltan $25.000'));
  },
};

export const DarMasPlazoAbierto: Story = {
  name: 'Dar más plazo abierto',
  args: { initialForm: 'extend' },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('Dar más plazo');
    expect(dialog.querySelector('textarea')).not.toBeNull();
  },
};

/**
 * #72 (diseño aceptado «Detalle de un abono»): la franja de estado arriba de la isla, la cuota «2/4» junto al nombre
 * (enlace a la ficha), el chip «Fecha acordada», el valor acordado grande y «Cobrar» y «Dar más plazo» a la vista; el
 * abono abierto resaltado en «Abonos de …» y el Historial con la prórroga y su nota.
 */
export const DisenoAceptado: Story = {
  name: 'Diseño aceptado',
  globals: { platform: 'desktop' },
  args: {
    history: [
      {
        id: 'rescheduled-0',
        kind: 'rescheduled',
        date: localDate('2026-10-24'),
        from: localDate('2026-10-26'),
        to: localDate('2026-11-02'),
        note: 'Pidió esperar a la quincena',
      },
      {
        id: 'scheduled',
        kind: 'scheduled',
        date: localDate('2026-10-03'),
        amount: 30000,
        dueDate: localDate('2026-10-26'),
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const strip = frame.querySelector<HTMLElement>('[role="status"][data-tone]')!;
    expect(strip.dataset.tone).toBe('bad');
    expect(strip.textContent).toContain('Vencido hace');
    expect(frame.querySelector('h1 a, h2 a')).not.toBeNull();
    expect(frame.textContent).toContain('Fecha acordada');
    expect(frame.textContent).toContain('Valor acordado');
    expect(frame.querySelector('[aria-current="true"]')).not.toBeNull();
    expect(frame.textContent).toContain('Más plazo: 26/10/2026 → 02/11/2026');
    expect(frame.textContent).toContain('Pidió esperar a la quincena');
    await userEvent.click(button(frame, 'Dar más plazo')!);
    await waitFor(() =>
      expect(
        canvasElement.ownerDocument.querySelector('[role="dialog"], [role="alertdialog"]'),
      ).not.toBeNull(),
    );
  },
};

/** #72: en el celular el estado de cada abono nunca queda encima de su valor. */
export const MovilSinEncimar: Story = {
  name: 'Móvil sin encimar',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    const overlap = (a: DOMRect, b: DOMRect) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const rows = [...canvasElement.querySelectorAll<HTMLElement>('a[class*="sibling"]')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const pill = row.querySelector<HTMLElement>('[data-status]')!;
      const amount = row.querySelector<HTMLElement>('[class*="siblingAmount"]')!;
      expect(overlap(pill.getBoundingClientRect(), amount.getBoundingClientRect())).toBe(false);
    }
  },
};

export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    expect(button(frames(canvasElement)[0]!, 'Cobrar')).toHaveAttribute('aria-disabled', 'true');
  },
};

export const Cargando: Story = { args: { payment: undefined, customer: undefined, loading: true } };
export const ConError: Story = {
  name: 'Con error',
  args: { payment: undefined, customer: undefined, error: true },
};
export const NoExiste: Story = {
  name: 'No existe',
  args: { payment: undefined, customer: undefined, notFound: true },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
