import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { PayMethod } from '@/domain/payment';
import { PaymentMethodDialog } from './PaymentMethodDialog';

function Demo({ onSave }: { onSave: (method: PayMethod) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <PaymentMethodDialog
      open={open}
      onOpenChange={setOpen}
      current="cash"
      customerName="Yolanda Ríos"
      amount="$65.000"
      onSave={onSave}
    />
  );
}

const meta = {
  title: 'Pantallas/Dinero/Abono/Medio de pago',
  component: Demo,
  args: { onSave: fn() },
  parameters: {
    frameSize: 'screen',
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    design: {
      ficha: 'Sin diseño propio: el Diálogo de la biblioteca con las opciones de «Cobrar» (ronda 38)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Un abono cobrado que aún no se entrega al líder: corregir Efectivo ↔ Transferencia.'],
      whenNotToUse: ['Un abono entregado al líder: está bloqueado (BR-PAY-10).'],
      usedIn: ['Detalle de un abono'],
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const lastDialog = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[role="alertdialog"]')].at(-1)!;

export const Explorar: Story = {};

/** De Efectivo a Transferencia y «Guardar». */
export const CambiarATransferencia: Story = {
  name: 'Cambiar a transferencia',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement, args }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('¿Cómo te pagó Yolanda Ríos los $65.000?');
    await userEvent.click(dialog.querySelector<HTMLElement>('[role="radio"][value="transfer"]')!);
    const save = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent === 'Guardar',
    )!;
    await userEvent.click(save);
    expect(args.onSave).toHaveBeenCalledWith('transfer');
  },
};
