import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import { localDate, type LocalDate } from '@/domain/time';
import { DatePickerCalendar } from './DatePickerCalendar';

function Demo({ onChange = () => {} }: { onChange?: (date: LocalDate) => void }) {
  const [value, setValue] = useState<LocalDate>(localDate('2026-12-01'));
  return (
    <DatePickerCalendar
      label="Abono 2 de 4"
      value={value}
      onChange={(date) => {
        onChange(date);
        setValue(date);
      }}
      today={localDate('2026-11-17')}
      marked={[localDate('2026-12-15'), localDate('2026-12-29')]}
    />
  );
}

const meta = {
  title: 'Pantallas/Clientes/Piezas/Calendario',
  component: Demo,
  args: { onChange: fn() },
  parameters: {
    a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } },
    design: {
      ficha: 'Clientes · 6 · Cambiar fecha de abono (calendario)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Para elegir la fecha de un abono (corregir al crear o dar más plazo).'],
      whenNotToUse: ['Para escribir una fecha conocida: el Campo fecha basta.'],
      usedIn: ['Crear cliente', 'Ficha de cliente'],
    },
    docs: {
      description: {
        component:
          'Pieza del módulo Abonos (la biblioteca no tiene calendario): mes de domingo a sábado (BR-GEN-07), hoy con un anillo, el día elegido en acento y un punto en los días con otro abono. Flechas: ±1 día / ±1 semana; Inicio / Fin; RePág / AvPág: ±1 mes.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

export const Explorar: Story = {};

/** CA-4: la semana empieza el domingo y se navega con las flechas del teclado. */
export const Teclado: Story = {
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    const headers = [...frame.querySelectorAll('[role="columnheader"]')].map((h) => h.textContent);
    expect(headers).toEqual(['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']);
    expect(frame.querySelector('[role="row"] + [role="row"] button')?.getAttribute('data-date')).toBe(
      '2026-11-29',
    );
    const selected = frame.querySelector<HTMLButtonElement>('[data-date="2026-12-01"]')!;
    selected.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-12-05');
    await userEvent.keyboard('{Enter}');
    expect(args.onChange).toHaveBeenLastCalledWith('2026-12-05');
    await userEvent.keyboard('{PageDown}');
    expect(frame.textContent).toContain('enero de 2027');
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
