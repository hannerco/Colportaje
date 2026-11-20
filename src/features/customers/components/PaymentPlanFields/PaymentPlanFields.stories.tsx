import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';
import { localDate } from '@/domain/time';
import { planPreview } from '../../new-customer-form';
import { PaymentPlanFields, type PaymentPlanValue } from './PaymentPlanFields';

const today = localDate('2026-11-17');

function Demo({ debt, initial }: { debt: number; initial: PaymentPlanValue }) {
  const [value, setValue] = useState(initial);
  return (
    <PaymentPlanFields
      value={value}
      onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
      preview={planPreview({ debt, downPayment: null, ...value, today })}
    />
  );
}

const meta = {
  title: 'Pantallas/Clientes/Piezas/Plan de abonos',
  component: Demo,
  args: {
    debt: 140000,
    initial: { frequency: 'biweekly', amount: 35000, firstDueDate: localDate('2026-11-30') },
  },
  parameters: {
    // Los marcos repiten la región «Así quedan los abonos» en la misma página.
    a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } },
    design: {
      ficha: 'Clientes · 3 · Crear cliente (bloque Abonos)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En la ficha viva de Nuevo cliente, para repartir el saldo en abonos.'],
      whenNotToUse: ['Para un solo abono (Programar abono, HU-PAN-CLI-05).'],
      usedIn: ['Crear cliente'],
    },
    docs: {
      description: {
        component:
          'Pieza del módulo Clientes (la biblioteca no tiene plan de abonos): frecuencia, valor de cada abono, primer abono y «Así quedan los abonos», recalculada con la misma regla que el servidor (HU-ABO-03). Una fecha pasada avisa «Esta fecha ya pasó» y se permite.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

export const Explorar: Story = {};

/** El diseño: $140.000 en 4 abonos de $35.000 quincenales. */
export const ConAbonos: Story = {
  name: 'Con abonos',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.querySelectorAll('li')).toHaveLength(4);
      expect(frame.textContent).toContain('4 abonos cubren el saldo de $140.000');
    }
  },
};

export const SinValor: Story = {
  name: 'Sin valor',
  args: { initial: { frequency: 'biweekly', amount: null, firstDueDate: null } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(frame.textContent).toContain(
        'Las fechas aparecen cuando pones el valor de cada abono y el primero.',
      );
  },
};

/** Valor que no es múltiplo de $1.000: el campo lo marca y no hay lista. */
export const ValorInvalido: Story = {
  name: 'Valor inválido',
  args: { initial: { frequency: 'biweekly', amount: 35500, firstDueDate: localDate('2026-11-30') } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) expect(frame.textContent).toContain('múltiplo de $1.000');
  },
};

export const FechaPasada: Story = {
  name: 'Fecha pasada',
  args: { initial: { frequency: 'monthly', amount: 70000, firstDueDate: localDate('2026-11-01') } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) expect(frame.textContent).toContain('Esta fecha ya pasó');
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
