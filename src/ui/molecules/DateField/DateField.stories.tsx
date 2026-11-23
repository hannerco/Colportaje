import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { localDate, type LocalDate } from '@/domain/time';
import { DateField, type DateFieldProps } from './DateField';

function Stateful(args: DateFieldProps) {
  const [value, setValue] = useState<LocalDate | null>(args.value);
  return (
    <DateField
      {...args}
      value={value}
      onChange={(next) => {
        args.onChange?.(next);
        setValue(next);
      }}
    />
  );
}

const meta = {
  title: 'Moléculas/Campo de fecha',
  component: DateField,
  render: (args) => <Stateful {...args} />,
  args: {
    label: 'Fecha',
    placeholder: 'dd/mm/aaaa',
    value: localDate('2026-11-20'),
    today: localDate('2026-11-22'),
    onChange: fn(),
  },
  parameters: {
    design: {
      ficha: 'Lib-Campo (fecha) + Calendario',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Toda fecha que se escribe en un formulario: el ícono abre el calendario (#62).'],
      whenNotToUse: ['Cambiar la fecha de algo ya guardado con un solo toque (Diálogo con calendario).'],
      usedIn: ['Nuevo cliente', 'Programar abono', 'Cobrar', 'Agregar libro', 'Factura', 'Abibono'],
    },
  },
} satisfies Meta<typeof DateField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explorar: Story = {};

/** #62: el ícono abre el calendario; elegir un día lo escribe en el campo y lo cierra. */
export const ElegirEnElCalendario: Story = {
  name: 'Elegir en el calendario',
  play: async ({ canvasElement, args }) => {
    const frame = within(canvasElement.querySelector<HTMLElement>('figure.sb-frame')!);
    await userEvent.click(frame.getByRole('button', { name: 'Abrir calendario, Fecha' }));
    const panel = await within(document.body).findByRole('dialog', { name: 'Fecha' });
    await userEvent.click(within(panel).getByRole('button', { name: /^15 de noviembre de 2026/ }));
    expect(args.onChange).toHaveBeenCalledWith('2026-11-15');
    await waitFor(() => expect(within(document.body).queryByRole('dialog', { name: 'Fecha' })).toBeNull());
    expect(frame.getByLabelText('Fecha')).toHaveValue('15/11/2026');
  },
};

/** Cobros, cuota inicial y fecha de venta: los días después de hoy no se pueden elegir. */
export const SinFechasFuturas: Story = {
  name: 'Sin fechas futuras',
  args: { noFuture: true },
  play: async ({ canvasElement, args }) => {
    const frame = within(canvasElement.querySelector<HTMLElement>('figure.sb-frame')!);
    await userEvent.click(frame.getByRole('button', { name: 'Abrir calendario, Fecha' }));
    const panel = await within(document.body).findByRole('dialog', { name: 'Fecha' });
    const tomorrow = within(panel).getByRole('button', { name: /^23 de noviembre de 2026/ });
    expect(tomorrow).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(tomorrow);
    expect(args.onChange).not.toHaveBeenCalled();
    expect(within(panel).getByRole('button', { name: /^22 de noviembre de 2026/ })).not.toHaveAttribute(
      'aria-disabled',
    );
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
