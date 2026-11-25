import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { localDate } from '@/domain/time';
import { CorrectCollectionDialog, type CollectionValues } from './CorrectCollectionDialog';

function Demo({ onSave }: { onSave: (patch: Partial<CollectionValues>) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <CorrectCollectionDialog
      open={open}
      onOpenChange={setOpen}
      customerName="Yolanda Ríos Castaño"
      installment="2/4"
      agreedAmount={30000}
      current={{ paidAmount: 30000, paidAt: localDate('2026-11-05'), method: 'cash' }}
      today={localDate('2026-11-25')}
      toDeliver={385000}
      onSave={onSave}
    />
  );
}

const meta = {
  title: 'Pantallas/Dinero/Abono/Corregir cobro',
  component: Demo,
  args: { onSave: fn() },
  parameters: {
    frameSize: 'screen',
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    design: {
      ficha: 'Propuestas · 12 · Abono cobrado: corregir o eliminar el cobro (25/11/2026) · CorregirCobro',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Un abono cobrado que aún no se entrega al líder: corregir valor, fecha o medio de pago.'],
      whenNotToUse: ['Entregado al líder: está bloqueado (BR-PAY-10).'],
      usedIn: ['Detalle de un abono («⋯» de la franja)'],
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const lastDialog = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[role="alertdialog"]')].at(-1)!;
const button = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === name);

export const Explorar: Story = {};

/** Al abrir: los datos del cobro y «Guardar corrección» apagado. */
export const AlAbrir: Story = {
  name: 'Al abrir',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('Yolanda Ríos Castaño 2/4 · acordado $30.000');
    expect(dialog.textContent).toContain('Cambia el valor, la fecha o el medio de pago.');
    await userEvent.click(button(dialog, 'Guardar corrección')!, { pointerEventsCheck: 0 });
    expect(args.onSave).not.toHaveBeenCalled();
  },
};

/** Con cambios: «Antes: …», «Por entregar $385.000 → $390.000» y guarda solo lo que cambió. */
export const ConCambios: Story = {
  name: 'Con cambios',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement, args }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    const amount = dialog.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!;
    await userEvent.clear(amount);
    await userEvent.type(amount, '35000');
    await userEvent.click(dialog.querySelector<HTMLElement>('[role="radio"][value="transfer"]')!);
    expect(dialog.textContent).toContain('Antes: $30.000');
    expect(dialog.textContent).toContain('Antes: Efectivo');
    expect(dialog.textContent).toContain('$385.000 →');
    expect(dialog.textContent).toContain('$390.000');
    await userEvent.click(button(dialog, 'Guardar corrección')!);
    expect(args.onSave).toHaveBeenCalledWith({ paidAmount: 35000, method: 'transfer' });
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
