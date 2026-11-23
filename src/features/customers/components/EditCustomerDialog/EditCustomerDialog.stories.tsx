import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@/ui/atoms/Button';
import { EditCustomerDialog, type EditCustomerDialogProps } from './EditCustomerDialog';

function Demo(args: EditCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Editar</Button>
      <EditCustomerDialog {...args} open={open} onOpenChange={setOpen} />
    </>
  );
}

const meta = {
  title: 'Pantallas/Clientes/Piezas/Editar datos',
  component: EditCustomerDialog,
  render: (args) => <Demo {...args} />,
  args: {
    open: false,
    onOpenChange: () => {},
    initial: { name: 'Yolanda Ríos', phone: '3206967052', address: 'Calle 1 # 2-3', info: '' },
    onSave: fn(async () => {}),
  },
  parameters: {
    // Con el diálogo abierto, el botón que lo abrió queda detrás (aria-hidden), como en los demás diálogos.
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    design: {
      ficha: 'Sin diseño (#69): diálogo con los campos de Nuevo cliente',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Cambiar nombre, teléfono, dirección o información de un cliente guardado.'],
      whenNotToUse: [
        'Para crear un cliente (Nuevo cliente).',
        'Para la ubicación, el emoji o las fotos (en la ficha).',
      ],
      usedIn: ['Ficha de cliente'],
    },
  },
} satisfies Meta<typeof EditCustomerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const open = async (canvasElement: HTMLElement) => {
  const frame = canvasElement.querySelector<HTMLElement>('figure.sb-frame')!;
  await userEvent.click(within(frame).getByRole('button', { name: 'Editar' }));
  return within(document.body).findByRole('alertdialog', { name: 'Editar datos' });
};

export const Explorar: Story = {};

/** #69: guarda solo lo que cambió; un campo vaciado queda sin dato. */
export const GuardarLoQueCambio: Story = {
  name: 'Guardar lo que cambió',
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await userEvent.clear(dialog.getByLabelText('Teléfono'));
    await userEvent.type(dialog.getByLabelText('Información'), 'Le cobro el 30');
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(args.onSave).toHaveBeenCalledWith({ phone: null, info: 'Le cobro el 30' }));
  },
};

/** El nombre no puede quedar vacío. */
export const NombreObligatorio: Story = {
  name: 'Nombre obligatorio',
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await userEvent.clear(dialog.getByLabelText('Nombre'));
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(dialog.getByText('Escribe el nombre del cliente.')).toBeInTheDocument());
    expect(args.onSave).not.toHaveBeenCalled();
  },
};
