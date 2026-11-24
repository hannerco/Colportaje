import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { localDate } from '@/domain/time';
import { planPreview } from '../../new-customer-form';
import { PaymentPlanFields, type PaymentPlanValue } from './PaymentPlanFields';

const today = localDate('2026-11-17');

function Demo({ debt, initial }: { debt: number; initial: PaymentPlanValue }) {
  const [value, setValue] = useState(initial);
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const input = { debt, downPayment: null, ...value, today };
  return (
    <PaymentPlanFields
      value={value}
      onChange={(patch) => {
        setValue((v) => ({ ...v, ...patch }));
        setAmounts({});
      }}
      preview={planPreview({ ...input, amountOverrides: amounts })}
      onChangeAmount={(i, amount) => setAmounts((current) => ({ ...current, [i]: amount }))}
      validateAmount={(i, amount) =>
        planPreview({ ...input, amountOverrides: { ...amounts, [i]: amount } }).amountsExceed
          ? 'Con ese valor los abonos pasan del saldo.'
          : undefined
      }
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

/**
 * #90: el valor de un abono se toca y se cambia; los demás se ajustan para seguir cubriendo el saldo ($140.000 en
 * 4 de $35.000: el segundo pasa a $70.000 y quedan 3).
 */
export const CambiarValor: Story = {
  name: 'Cambiar el valor de un abono',
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(within(frame).getAllByRole('button', { name: /Cambiar valor/ })[1]!);
    const dialog = await within(document.body).findByRole('alertdialog');
    const input = within(dialog).getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '70000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar valor' }));
    await waitFor(() => expect(frame.querySelectorAll('li')).toHaveLength(3));
    expect([...frame.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      expect.stringContaining('35.000'),
      expect.stringContaining('70.000'),
      expect.stringContaining('35.000'),
    ]);
    expect(frame.textContent).toContain('Valor cambiado');
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
