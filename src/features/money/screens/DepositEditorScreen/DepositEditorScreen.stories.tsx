import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { DepositPayment } from '@/domain/deposit-draft';
import { localDate } from '@/domain/time';
import { DepositEditorScreen, type DepositEditorScreenProps } from './DepositEditorScreen';

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

/** $385.000 cobrados: $280.000 en efectivo y $105.000 por transferencia (CA-1). */
const PAYMENTS: DepositPayment[] = [
  payment('p1', 'Yolanda Ríos', '2026-11-04', 150000, 'cash'),
  payment('p2', 'Jhon Fredy Ospina', '2026-11-03', 130000, 'cash'),
  payment('p3', 'María Camila Henao', '2026-11-02', 105000, 'transfer'),
];

const INITIAL: NonNullable<DepositEditorScreenProps['initial']> = {
  title: null,
  displayTitle: 'Abibono (4)',
  depositDate: localDate('2026-11-05'),
  selectedIds: ['p1', 'p2', 'p3'],
  cash: 280000,
  transfer: 105000,
  note: null,
};

const RECEIPT = [
  { photoId: 'r1', thumbUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' },
];

type DemoProps = Partial<DepositEditorScreenProps>;

/** La pantalla con sus recibos locales, como el contenedor. */
function Demo(props: DemoProps) {
  const [receipts, setReceipts] = useState(props.receipts ?? []);
  return (
    <DepositEditorScreen
      mode="new"
      payments={PAYMENTS}
      initial={INITIAL}
      isOnline
      window={{ mode: 'page', breadcrumb: { label: 'Dinero', href: '#dinero' }, onClose: () => {} }}
      onAddReceipt={async () => {
        setReceipts((current) => [...current, { ...RECEIPT[0]!, photoId: `r${current.length + 1}` }]);
        return true;
      }}
      onRemoveReceipt={(id) => setReceipts((current) => current.filter((r) => r.photoId !== id))}
      onSaveDraft={async () => {}}
      onConfirm={async () => {}}
      onDelete={async () => {}}
      {...props}
      receipts={receipts}
    />
  );
}

const meta = {
  title: 'Pantallas/Dinero/Nuevo Abibono',
  component: Demo,
  args: { onSaveDraft: fn(async () => {}), onConfirm: fn(async () => {}), onDelete: fn(async () => {}) },
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
      ficha: 'Dinero · 4 · Nuevo Abibono',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['/dinero/abibonos/nuevo y al abrir un borrador: entregar al líder lo cobrado.'],
      whenNotToUse: ['Para ver un Abibono ya entregado (HU-PAN-DIN-05).'],
      usedIn: ['Dinero'],
    },
    docs: {
      description: {
        component:
          'Nuevo Abibono y borradores (HU-PAN-DIN-04): la entrega al líder llega precargada con lo cobrado por método; se marcan o desmarcan abonos (los montos se recalculan), se ajustan los montos con «Calculado · Restaurar», se sube el recibo y se explica una diferencia (la nota es obligatoria si no es $0). «Marcar como entregado» se habilita con recibo y, si hay diferencia, nota. Un borrador se guarda, se abre y se borra con confirmación de peligro.',
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
const moneyInput = (root: Element, label: string) =>
  [...root.querySelectorAll<HTMLInputElement>('input')].find((i) =>
    i.labels?.[0]?.textContent?.includes(label),
  )!;

export const Explorar: Story = {};

/** CA-1 y CA-3: $385.000 cobrados → $280.000 en efectivo y $105.000 por transferencia, diferencia $0; sin recibo no se confirma. */
export const PrecargadoSinRecibo: Story = {
  name: 'Precargado sin recibo',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(moneyInput(frame, 'Efectivo').value).toContain('280.000');
      expect(moneyInput(frame, 'Transferencia').value).toContain('105.000');
      expect(frame.textContent).toContain('$385.000');
      expect(frame.textContent).toContain('Diferencia$0');
      expect(button(frame, 'Marcar como entregado')).toHaveAttribute('aria-disabled', 'true');
      expect(frame.textContent).toContain('Falta el recibo');
    }
  },
};

/** CA-2: efectivo $270.000 → diferencia −$10.000 (faltante) y no se confirma hasta escribir una nota. */
export const ConDiferencia: Story = {
  name: 'Con diferencia (nota obligatoria)',
  args: { receipts: RECEIPT },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const cash = moneyInput(frame, 'Efectivo');
    await userEvent.clear(cash);
    await userEvent.type(cash, '270000');
    await waitFor(() => expect(frame.textContent).toContain('−$10.000 · faltante'));
    expect(frame.textContent).toContain('Calculado $280.000');
    expect(frame.textContent).toContain('obligatoria');
    expect(button(frame, 'Marcar como entregado')).toHaveAttribute('aria-disabled', 'true');
    expect(frame.textContent).toContain('Escribe una nota');
    await userEvent.type(frame.querySelector('textarea')!, 'Me faltaron $10.000');
    await waitFor(() =>
      expect(button(frame, 'Marcar como entregado')).not.toHaveAttribute('aria-disabled', 'true'),
    );
    await userEvent.click(button(frame, 'Restaurar')!);
    await waitFor(() => expect(frame.textContent).toContain('Diferencia$0'));
  },
};

export const ListoParaConfirmar: Story = {
  name: 'Listo para confirmar',
  args: { receipts: RECEIPT },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    const confirm = button(frame, 'Marcar como entregado')!;
    expect(confirm).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(args.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ cash: 280000, transfer: 105000, paymentIds: ['p1', 'p2', 'p3'] }),
      ),
    );
  },
};

export const DesmarcarUnAbono: Story = {
  name: 'Desmarcar un abono',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const box = [...frame.querySelectorAll<HTMLElement>('[role="checkbox"]')].find((b) =>
      b.closest('label')?.textContent?.includes('Yolanda Ríos'),
    )!;
    await userEvent.click(box);
    // Sin los $150.000 de Yolanda: efectivo $130.000 y el total baja con el esperado (diferencia $0).
    await waitFor(() => expect(moneyInput(frame, 'Efectivo').value).toContain('130.000'));
    expect(frame.textContent).toContain('Diferencia$0');
  },
};

export const GuardarBorrador: Story = {
  name: 'Guardar borrador',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Guardar borrador')!);
    await waitFor(() => expect(args.onSaveDraft).toHaveBeenCalled());
  },
};

export const ErrorAlSubirElRecibo: Story = {
  name: 'Error al subir el recibo',
  args: { onAddReceipt: async () => false },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const file = new File(['x'], 'recibo.png', { type: 'image/png' });
    await userEvent.upload(frame.querySelector<HTMLInputElement>('[data-testid="photo-input"]')!, file);
    await waitFor(() => expect(frame.textContent).toContain('No se pudo subir la foto'));
    expect(button(frame, 'Reintentar')).toBeDefined();
  },
};

export const BorradorAbierto: Story = {
  name: 'Borrador abierto',
  args: {
    mode: 'draft',
    canDelete: true,
    receipts: RECEIPT,
    initial: { ...INITIAL, title: 'Campaña de noviembre', displayTitle: 'Campaña de noviembre' },
  },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    expect(frame.querySelector<HTMLInputElement>('input')!.value).toBe('Campaña de noviembre');
    expect(button(frame, 'Más acciones')).toBeDefined();
    // El recibo se ve como toda foto de la app: se toca, se abre en grande y desde ahí se quita.
    await userEvent.click(frame.querySelector<HTMLElement>('[aria-label="Ver foto 1"]')!);
    const remove = await waitFor(() => {
      const viewer = frame.querySelector<HTMLElement>('[role="dialog"]');
      expect(viewer).not.toBeNull();
      const found = [...viewer!.querySelectorAll<HTMLElement>('button')].find(
        (b) => b.textContent?.trim() === 'Quitar foto',
      );
      expect(found).toBeDefined();
      return found!;
    });
    await userEvent.click(remove);
    await waitFor(() => expect(frame.querySelector('[aria-label="Ver foto 1"]')).toBeNull());
  },
};

/** CA-4: «Borrar» pide confirmar con el diálogo de peligro; confirmar borra. */
export const BorrarBorrador: Story = {
  name: 'Borrar borrador',
  args: { mode: 'draft', canDelete: true, receipts: RECEIPT },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Más acciones')!);
    const item = await waitFor(() => {
      const found = [...canvasElement.ownerDocument.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
        (i) => i.textContent?.includes('Borrar'),
      );
      expect(found).toBeDefined();
      return found!;
    });
    await userEvent.click(item);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('¿Borrar el borrador?');
    await userEvent.click(button(dialog, 'Borrar')!);
    await waitFor(() => expect(args.onDelete).toHaveBeenCalled());
  },
};

export const Confirmando: Story = {
  args: { receipts: RECEIPT, onConfirm: fn(() => new Promise<void>(() => {})) },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Marcar como entregado')!);
    await waitFor(() => expect(frame.querySelector('[aria-busy="true"]')).not.toBeNull());
  },
};

export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false, receipts: RECEIPT },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    expect(button(frame, 'Marcar como entregado')).toHaveAttribute('aria-disabled', 'true');
    expect(button(frame, 'Guardar borrador')).toHaveAttribute('aria-disabled', 'true');
  },
};

export const SinAbonos: Story = {
  name: 'Sin abonos por entregar',
  args: { payments: [], initial: { ...INITIAL, selectedIds: [], cash: 0, transfer: 0 } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) expect(frame.textContent).toContain('No hay abonos cobrados');
  },
};

export const Cargando: Story = { args: { initial: undefined, loading: true } };
export const ConError: Story = { name: 'Con error', args: { initial: undefined, error: true } };

export const Matriz: Story = { parameters: { frames: 'matrix' } };
