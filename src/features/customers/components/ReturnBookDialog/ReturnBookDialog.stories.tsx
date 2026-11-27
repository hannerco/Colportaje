import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '@/ui/atoms/Button';
import { ReturnBookDialog, type ReturnBookDialogProps } from './ReturnBookDialog';

function Demo(args: ReturnBookDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Quitar</Button>
      <ReturnBookDialog {...args} open={open} onOpenChange={setOpen} />
    </>
  );
}

const meta = {
  title: 'Pantallas/Clientes/Piezas/Quitar libro',
  component: ReturnBookDialog,
  render: (args) => <Demo {...args} />,
  args: {
    open: false,
    onOpenChange: () => {},
    bookName: 'El camino a Cristo #2',
    customerName: 'María Camila Henao',
    onConfirm: fn(async () => undefined),
  },
  parameters: {
    // Con el diálogo abierto, el botón que lo abrió queda detrás (aria-hidden), como en los demás diálogos.
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    design: {
      ficha: 'Sin diseño propio (FC-06): el Diálogo y la Selección de la biblioteca',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Al quitar un libro de un cliente ya guardado: desde su ficha o desde el detalle del ejemplar.',
      ],
      whenNotToUse: [
        'Mientras se crea el cliente: ahí quitar un libro es un error de captura y no pregunta nada.',
      ],
      usedIn: ['Ficha de cliente', 'Detalle del ejemplar'],
    },
    docs: {
      description: {
        component:
          'Quitar un libro de un cliente guardado (BR-COPY-09): pregunta el motivo, con «El cliente lo devolvió» marcado. El libro vuelve a En físico; los abonos y los Abibonos no cambian.',
      },
    },
  },
} satisfies Meta<typeof ReturnBookDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const open = async (canvasElement: HTMLElement) => {
  const frame = canvasElement.querySelector<HTMLElement>('figure.sb-frame')!;
  await userEvent.click(within(frame).getByRole('button', { name: 'Quitar' }));
  return within(document.body).findByRole('alertdialog', {
    name: '¿Quitar El camino a Cristo #2 de María Camila Henao?',
  });
};

export const Explorar: Story = {};

/** Por defecto, «El cliente lo devolvió»: un toque y listo. */
export const ElClienteLoDevolvio: Story = {
  name: 'El cliente lo devolvió',
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await expect(dialog.getByRole('radio', { name: 'El cliente lo devolvió' })).toBeChecked();
    await userEvent.click(dialog.getByRole('button', { name: 'Quitar libro' }));
    await expect(args.onConfirm).toHaveBeenCalledWith('customer_returned');
  },
};

/** «Me equivoqué»: no cuenta como devolución en las estadísticas. */
export const MeEquivoque: Story = {
  name: 'Me equivoqué',
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await userEvent.click(dialog.getByRole('radio', { name: /Me equivoqué/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Quitar libro' }));
    await expect(args.onConfirm).toHaveBeenCalledWith('wrong_registration');
  },
};
