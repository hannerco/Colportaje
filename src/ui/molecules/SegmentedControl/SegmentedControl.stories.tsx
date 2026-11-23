import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { SegmentedControl, type SegmentedControlProps } from './SegmentedControl';

const METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
];
const FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
];

/** Controlado: en el Storybook guarda la elegida para poder cambiarla. */
function Stateful(args: SegmentedControlProps) {
  const [value, setValue] = useState(args.value);
  return (
    <SegmentedControl
      {...args}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        args.onValueChange(next);
      }}
    />
  );
}

const meta = {
  title: 'Moléculas/Botones segmentados',
  component: SegmentedControl,
  render: (args) => <Stateful {...args} />,
  args: { label: 'Medio de pago', options: METHODS, value: 'transfer', onValueChange: fn() },
  parameters: {
    design: {
      ficha: 'CrearV5 · Medio de pago y Frecuencia (pantalla; se pide subirlo a la biblioteca)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Elegir una opción entre 2 o 3, todas a la vista: medio de pago, frecuencia, tema.'],
      whenNotToUse: [
        'Para cambiar de vista o de parte de un módulo (Pestañas).',
        'Con más de 3 opciones (Menú).',
      ],
      usedIn: ['Nuevo cliente', 'Programar abono', 'Ajustes'],
    },
    docs: {
      description: {
        component:
          'Grupo de opciones únicas con el aspecto del segmento: opciones del mismo ancho y el fondo de la elegida que se desliza al cambiar (#37). Con las flechas se pasa de una a otra, como un grupo de radios.',
      },
    },
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

export const Explorar: Story = {};

/** Dos opciones: la elegida se marca y avisa; el fondo se desliza a la nueva. */
export const MedioDePago: Story = {
  name: 'Medio de pago',
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const group = frame.querySelector<HTMLElement>('[role="radiogroup"]')!;
      const cash = frame.querySelector<HTMLElement>('[role="radio"][value="cash"]')!;
      await userEvent.click(cash);
      await waitFor(() => expect(cash.getAttribute('aria-checked')).toBe('true'));
      await waitFor(() => expect(group.style.getPropertyValue('--indicator-x')).toBe(`${cash.offsetLeft}px`));
    }
    expect(args.onValueChange).toHaveBeenCalledWith('cash');
  },
};

/** Tres opciones del mismo ancho. */
export const Frecuencia: Story = {
  args: { label: 'Frecuencia', options: FREQUENCIES, value: 'biweekly' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const widths = [...frame.querySelectorAll<HTMLElement>('[role="radio"]')].map((r) =>
        Math.round(r.getBoundingClientRect().width),
      );
      expect(new Set(widths).size).toBe(1);
    }
  },
};

export const Deshabilitado: Story = { args: { disabled: true } };

export const Matriz: Story = { parameters: { frames: 'matrix' } };
