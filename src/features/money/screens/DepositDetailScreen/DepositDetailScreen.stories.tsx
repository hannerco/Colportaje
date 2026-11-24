import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { DepositPayment, DepositView } from '@/domain/deposit-draft';
import { localDate } from '@/domain/time';
import { DepositDetailScreen, type DepositDetailScreenProps } from './DepositDetailScreen';

const payment = (
  id: string,
  customerName: string,
  paidAt: string,
  paidAmount: number,
  method: 'cash' | 'transfer',
): DepositPayment => ({
  paymentId: id,
  customerName,
  paidAt: localDate(paidAt),
  paidAmount,
  method,
});

const RECEIPT = [
  { photoId: 'r1', thumbUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' },
];

/** El Abibono (3) del 25/10: $380.000 esperados y entregados ($260.000 en efectivo y $120.000 por transferencia). */
const DEPOSIT: DepositView = {
  id: 'd1',
  title: null,
  displayTitle: 'Abibono (3)',
  depositNumber: 3,
  depositDate: localDate('2026-10-25'),
  status: 'confirmed',
  cash: 260000,
  transfer: 120000,
  note: 'Entregado en la oficina del líder.',
  payments: [
    payment('p1', 'María Camila Henao', '2026-10-18', 120000, 'transfer'),
    payment('p2', 'Sandra Milena Zapata', '2026-10-20', 90000, 'cash'),
    payment('p3', 'Jhon Fredy Ospina', '2026-10-16', 60000, 'cash'),
    payment('p4', 'Óscar Iván Mejía', '2026-10-12', 80000, 'cash'),
    payment('p5', 'Gloria Inés Patiño', '2026-10-22', 30000, 'cash'),
  ],
  receipts: RECEIPT,
  summary: { total: 380000, expected: 380000, difference: 0 },
  calculated: { cash: 260000, transfer: 120000 },
  blockers: [],
  can: { edit: false, confirm: false, reopen: true, delete: false },
  history: [{ type: 'confirmed', reason: null, at: new Date('2026-10-25T15:00:00Z') }],
};

/** Con diferencia −$10.000: efectivo $250.000 frente a $260.000 esperados (CA-3). */
const WITH_DIFFERENCE: DepositView = {
  ...DEPOSIT,
  cash: 250000,
  note: 'Me faltaron $10.000; los entrego el sábado.',
  summary: { total: 370000, expected: 380000, difference: -10000 },
  history: [
    { type: 'confirmed', reason: null, at: new Date('2026-10-25T15:00:00Z') },
    {
      type: 'reopened',
      reason: 'Incluí por error el abono de Óscar Iván Mejía',
      at: new Date('2026-10-26T15:00:00Z'),
    },
    { type: 'confirmed', reason: null, at: new Date('2026-10-26T16:00:00Z') },
  ],
};

const meta = {
  title: 'Pantallas/Dinero/Abibono entregado',
  component: DepositDetailScreen,
  args: {
    deposit: DEPOSIT,
    isOnline: true,
    window: { mode: 'page', breadcrumb: { label: 'Dinero', href: '#dinero' }, onClose: () => {} },
    paymentHref: (id: string) => `#abono-${id}`,
    onAddReceipt: fn(async () => true),
    onSaveNote: fn(async () => {}),
    onReopen: fn(async () => {}),
  },
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
      ficha: 'Dinero · 3 · Abibonos (Abibono entregado y reabrir)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        '/dinero/abibonos/[id] de un Abibono entregado: verlo como quedó, editar su nota o reabrirlo.',
      ],
      whenNotToUse: ['Para un borrador o un Abibono nuevo (HU-PAN-DIN-04).'],
      usedIn: ['Dinero'],
    },
    docs: {
      description: {
        component:
          'Abibono entregado y reabrir (HU-PAN-DIN-05): el Abibono tal como quedó, de solo lectura (título, fecha, montos y abonos bloqueados) salvo la nota y los recibos nuevos. La nota no puede quedar vacía si hay diferencia. #71: sigue el diseño aceptado; «Reabrir», en la barra de abajo, pide un motivo obligatorio y devuelve el Abibono a borrador con su número y sus abonos a Cobrado.',
      },
    },
  },
} satisfies Meta<DepositDetailScreenProps>;

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
/** #71: «Reabrir» va en la barra de abajo (diseño aceptado). */
const openReopen = async (frame: HTMLElement, root: HTMLElement) => {
  await userEvent.click(button(frame, 'Reabrir')!);
  return waitFor(() => lastDialog(root));
};

export const Explorar: Story = {};

/**
 * CA-1: solo la nota se edita y no hay botón de quitar recibos. #71 (diseño aceptado): cabecera con el total y el
 * desglose por medio, Abonos con candado, Lo que entregas, Recibo, Cuadre y «Reabrir» en la barra de abajo.
 */
export const Entregado: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Abibono (3)');
      expect(frame.textContent).toContain('Entregado');
      expect(frame.textContent).toContain('$380.000');
      expect(frame.textContent).toContain('María Camila Henao');
      // Solo la nota es un campo editable; los recibos no se quitan.
      expect(frame.querySelectorAll('textarea')).toHaveLength(1);
      expect(frame.querySelectorAll('input:not([type="file"])')).toHaveLength(0);
      expect(button(frame, /^Quitar foto/)).toBeUndefined();
      expect(button(frame, 'Reabrir')).toBeDefined();
      expect(frame.textContent).toContain('5 abonos');
      for (const title of ['Lo que entregas', 'Recibo', 'Cuadre'])
        expect(frame.querySelector(`section[aria-label="${title}"]`)).not.toBeNull();
    }
  },
};

/** Con diferencia y nota: se ve el faltante y el historial con la reapertura y su motivo. */
export const ConDiferenciaYNota: Story = {
  name: 'Con diferencia y nota',
  args: { deposit: WITH_DIFFERENCE },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    expect(frame.textContent).toContain('−$10.000 · faltante');
    expect(frame.textContent).toContain('obligatoria');
    expect(frame.querySelector('textarea')!.value).toContain('Me faltaron $10.000');
    expect(frame.textContent).toContain('Reabierto');
    expect(frame.textContent).toContain('Incluí por error el abono de Óscar Iván Mejía');
  },
};

/** CA-3: con diferencia −$10.000, borrar la nota no deja guardar; con otra nota sí. */
export const BorrarLaNotaConDiferencia: Story = {
  name: 'Borrar la nota con diferencia',
  args: { deposit: WITH_DIFFERENCE },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    const note = frame.querySelector('textarea')!;
    await userEvent.clear(note);
    await waitFor(() => expect(frame.textContent).toContain('Escribe una nota que explique la diferencia.'));
    expect(button(frame, 'Guardar nota')).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button(frame, 'Guardar nota')!);
    expect(args.onSaveNote).not.toHaveBeenCalled();
    await userEvent.type(note, 'Quedaron $10.000 pendientes');
    await waitFor(() => expect(button(frame, 'Guardar nota')).not.toHaveAttribute('aria-disabled', 'true'));
    await userEvent.click(button(frame, 'Guardar nota')!);
    await waitFor(() => expect(args.onSaveNote).toHaveBeenCalledWith('Quedaron $10.000 pendientes'));
  },
};

/** Sin diferencia, la nota se puede borrar del todo (queda sin nota). */
export const NotaOpcionalSinDiferencia: Story = {
  name: 'Nota opcional sin diferencia',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    expect(button(frame, 'Guardar nota')).toBeUndefined();
    await userEvent.clear(frame.querySelector('textarea')!);
    await userEvent.click(await waitFor(() => button(frame, 'Guardar nota')!));
    await waitFor(() => expect(args.onSaveNote).toHaveBeenCalledWith(null));
  },
};

/** CA-2: «Reabrir» pide un motivo; sin motivo no se confirma, con motivo se reabre. */
export const Reabrir: Story = {
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    const dialog = await openReopen(frame, canvasElement);
    expect(dialog.textContent).toContain('Reabrir Abibono (3)');
    expect(dialog.querySelector('textarea')).not.toBeNull();
    await userEvent.click(button(dialog, 'Reabrir')!);
    await waitFor(() => expect(dialog.textContent).toContain('Escribe el motivo.'));
    expect(args.onReopen).not.toHaveBeenCalled();
    await userEvent.type(dialog.querySelector('textarea')!, '  Incluí un abono por error ');
    await userEvent.click(button(dialog, 'Reabrir')!);
    await waitFor(() => expect(args.onReopen).toHaveBeenCalledWith('Incluí un abono por error'));
  },
};

/** El diálogo de reabrir abierto, con el motivo escrito (Dinero-d-reabrir). */
export const ReabrirConMotivo: Story = {
  name: 'Reabrir (diálogo con motivo)',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const dialog = await openReopen(frame, canvasElement);
    await userEvent.type(dialog.querySelector('textarea')!, 'Incluí por error el abono de Óscar Iván Mejía');
    expect(dialog.querySelector('textarea')!.value).toContain('Óscar Iván Mejía');
  },
};

/** Si reabrir falla, el diálogo sigue abierto. */
export const ReabrirFallido: Story = {
  name: 'Reabrir fallido',
  args: { onReopen: fn(() => Promise.reject(new Error('OFFLINE'))) },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    const dialog = await openReopen(frame, canvasElement);
    await userEvent.type(dialog.querySelector('textarea')!, 'Un motivo');
    await userEvent.click(button(dialog, 'Reabrir')!);
    await waitFor(() => expect(args.onReopen).toHaveBeenCalled());
    await waitFor(() => expect(lastDialog(canvasElement)).toBeDefined());
  },
};

export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    expect(button(frame, 'Reabrir')).toHaveAttribute('aria-disabled', 'true');
  },
};

/** Un recibo nuevo se puede añadir (BR-DEP-12). */
export const AnadirRecibo: Story = {
  name: 'Añadir otro recibo',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    const file = new File(['x'], 'recibo.png', { type: 'image/png' });
    await userEvent.upload(frame.querySelector<HTMLInputElement>('[data-testid="photo-input"]')!, file);
    await waitFor(() => expect(args.onAddReceipt).toHaveBeenCalled());
  },
};

export const Cargando: Story = {
  args: { deposit: undefined, loading: true },
  globals: { platform: 'desktop' },
};

export const NoExiste: Story = {
  name: 'No existe',
  args: { deposit: undefined, notFound: true },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    expect(frames(canvasElement)[0]!.textContent).toContain('Este Abibono ya no existe');
  },
};

export const ConError: Story = {
  name: 'Con error',
  args: { deposit: undefined, error: true, onRetry: fn() },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(button(frames(canvasElement)[0]!, 'Reintentar')!);
    expect(args.onRetry).toHaveBeenCalled();
  },
};
