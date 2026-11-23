import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Popover, type PopoverProps } from './Popover';

function Stateful(args: PopoverProps) {
  const [open, setOpen] = useState(args.open);
  return <Popover {...args} open={open} onOpenChange={setOpen} />;
}

const meta = {
  title: 'Moléculas/Panel flotante',
  component: Popover,
  render: (args) => <Stateful {...args} />,
  args: {
    open: false,
    onOpenChange: () => {},
    title: 'Emoji del cliente',
    trigger: <button type="button">Abrir</button>,
    children: <p>Contenido del panel</p>,
  },
  parameters: {
    design: {
      ficha: 'Propuestas · 3 y 4 (se pide subirlo a la biblioteca)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Opciones cortas junto al botón que las abre, en escritorio: emoji del cliente, resumen de Dinero.',
      ],
      whenNotToUse: ['En móvil (hoja de la Ventana de detalle).', 'Para una lista de acciones (Menú).'],
      usedIn: ['Nuevo cliente', 'Ficha de cliente', 'Dinero'],
    },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explorar: Story = {};

/** Se abre con su botón, muestra su título y se cierra con Esc. */
export const AbrirYCerrar: Story = {
  name: 'Abrir y cerrar',
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>('figure.sb-frame')!;
    await userEvent.click(within(frame).getByRole('button', { name: 'Abrir' }));
    const panel = await within(document.body).findByRole('dialog', { name: 'Emoji del cliente' });
    expect(panel.textContent).toContain('Contenido del panel');
    await userEvent.keyboard('{Escape}');
    expect(within(document.body).queryByRole('dialog', { name: 'Emoji del cliente' })).toBeNull();
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
