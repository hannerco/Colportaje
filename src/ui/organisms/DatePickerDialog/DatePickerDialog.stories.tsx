import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { localDate } from '@/domain/time';
import { Button } from '../../atoms/Button';
import { DatePickerDialog, type DatePickerDialogProps } from './DatePickerDialog';

/** Un botón que abre la ventana (o la muestra abierta para verla). */
function Demo({ startOpen = false, ...args }: DatePickerDialogProps & { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div style={{ minHeight: 520 }}>
      <Button variant="secondary" icon="calendar" onClick={() => setOpen(true)}>
        Elegir
      </Button>
      <DatePickerDialog
        {...args}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          args.onOpenChange(next);
        }}
      />
    </div>
  );
}

/** Varias ventanas abiertas a la vez (una por marco) se ocultan entre sí; en la app hay una sola. */
const severalOpenDialogs = { a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } } };

const meta = {
  title: 'Organismos/Elegir fecha',
  component: DatePickerDialog,
  render: (args) => <Demo {...args} />,
  args: {
    open: false,
    onOpenChange: fn(),
    title: 'Fecha de venta',
    value: localDate('2026-11-20'),
    today: localDate('2026-11-24'),
    onConfirm: fn(),
  },
  parameters: {
    design: {
      ficha: 'Lib-Dialogo + Calendario',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Toda fecha que se elige en la app: el Campo de fecha la abre, y también cambiar la fecha de venta, la de recibido o la de un abono.',
        'Siempre la misma: hoja inferior en el celular y ventana centrada en escritorio.',
      ],
      whenNotToUse: ['Nunca un calendario suelto ni en un panel flotante: siempre esta ventana.'],
      usedIn: [
        'Campo de fecha (Nuevo cliente, Cobrar, Agregar libro, Factura, Abibono)',
        'Fecha de venta',
        'Fecha de recibido',
        'Agregar al inventario («Otra fecha…»)',
        'Cambiar fecha de un abono',
      ],
    },
  },
} satisfies Meta<typeof DatePickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explorar: Story = {};

/** Se toca un día (arriba se lee) y «Elegir fecha» lo entrega; la ventana se cierra. */
export const ElegirUnDia: Story = {
  name: 'Elegir un día',
  play: async ({ canvasElement, args }) => {
    const frame = within(canvasElement.querySelector<HTMLElement>('figure.sb-frame')!);
    await userEvent.click(frame.getByRole('button', { name: 'Elegir' }));
    const dialog = await within(document.body).findByRole('alertdialog', { name: 'Fecha de venta' });
    expect(within(dialog).getByText('Fecha elegida: 20/11/2026')).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: /^18 de noviembre de 2026/ }));
    expect(within(dialog).getByText('Fecha elegida: 18/11/2026')).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Elegir fecha' }));
    expect(args.onConfirm).toHaveBeenCalledWith('2026-11-18');
    await waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());
  },
};

/** «Cancelar» no entrega nada y, al volver a abrir, arranca en la fecha que trae. */
export const CancelarYVolver: Story = {
  name: 'Cancelar y volver a abrir',
  parameters: severalOpenDialogs,
  play: async ({ canvasElement, args }) => {
    const frame = within(canvasElement.querySelector<HTMLElement>('figure.sb-frame')!);
    await userEvent.click(frame.getByRole('button', { name: 'Elegir' }));
    let dialog = await within(document.body).findByRole('alertdialog', { name: 'Fecha de venta' });
    await userEvent.click(within(dialog).getByRole('button', { name: /^18 de noviembre de 2026/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());
    expect(args.onConfirm).not.toHaveBeenCalled();
    await userEvent.click(frame.getByRole('button', { name: 'Elegir' }));
    dialog = await within(document.body).findByRole('alertdialog', { name: 'Fecha de venta' });
    expect(within(dialog).getByText('Fecha elegida: 20/11/2026')).toBeVisible();
  },
};

/** Sin días futuros (fecha de venta, cobros): mañana no se puede elegir. */
export const SinFechasFuturas: Story = {
  name: 'Sin fechas futuras',
  parameters: severalOpenDialogs,
  args: { isDisabled: (date) => date > localDate('2026-11-24') },
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement.querySelector<HTMLElement>('figure.sb-frame')!);
    await userEvent.click(frame.getByRole('button', { name: 'Elegir' }));
    const dialog = await within(document.body).findByRole('alertdialog', { name: 'Fecha de venta' });
    expect(within(dialog).getByRole('button', { name: /^25 de noviembre de 2026/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  },
};

/** Con contexto, aviso de fecha pasada y otros abonos marcados con un punto (cambiar la fecha de un abono). */
export const ConAvisoYPuntos: Story = {
  name: 'Con aviso y otros abonos',
  args: {
    title: 'Abono 2 de 4',
    subtitle: 'Felipe Rojas · $35.000',
    value: localDate('2026-11-20'),
    marked: [localDate('2026-11-15'), localDate('2026-12-15')],
    warnPast: true,
    confirmLabel: 'Guardar fecha',
  },
  render: (args) => <Demo {...args} startOpen />,
  parameters: severalOpenDialogs,
  play: async () => {
    const [dialog] = await within(document.body).findAllByRole('alertdialog', { name: 'Abono 2 de 4' });
    expect(within(dialog!).getByText('Esta fecha ya pasó')).toBeVisible();
  },
};

export const Matriz: Story = {
  render: (args) => <Demo {...args} startOpen />,
  parameters: { frames: 'matrix', ...severalOpenDialogs },
};
