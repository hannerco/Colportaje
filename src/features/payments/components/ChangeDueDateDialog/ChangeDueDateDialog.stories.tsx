import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { localDate, type LocalDate } from '@/domain/time';
import { ChangeDueDateDialog } from './ChangeDueDateDialog';

type DemoProps = {
  mode: 'correct' | 'reschedule';
  current: LocalDate;
  onSave?: (date: LocalDate, confirmed: boolean) => void;
};

function Demo({ mode, current, onSave = () => {} }: DemoProps) {
  const [open, setOpen] = useState(true);
  return (
    <ChangeDueDateDialog
      open={open}
      onOpenChange={setOpen}
      mode={mode}
      index={2}
      total={4}
      current={current}
      today={localDate('2026-11-17')}
      otherDates={[localDate('2026-11-17'), localDate('2026-12-15'), localDate('2026-12-29')]}
      onSave={(date, confirmed) => onSave(date, confirmed)}
    />
  );
}

const meta = {
  title: 'Pantallas/Clientes/Abonos',
  component: Demo,
  args: { mode: 'correct', current: localDate('2026-12-01'), onSave: fn() },
  parameters: {
    frameSize: 'screen',
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    design: {
      ficha: 'Clientes · 6 · Cambiar fecha de abono',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Al tocar la fecha de un abono: corregir (cliente en creación) o dar más plazo (cliente guardado).',
      ],
      whenNotToUse: ['Para mover varios abonos: no existe «Correr también los siguientes» (I-08).'],
      usedIn: ['Crear cliente', 'Ficha de cliente'],
    },
    docs: {
      description: {
        component:
          'Cambiar la fecha de un abono (HU-PAN-CLI-05): el calendario dentro del Diálogo (centrado en escritorio, hoja en móvil), «Cancelar» y «Guardar fecha». Al crear, corrige sin historial y acepta fechas pasadas («Esta fecha ya pasó»). Con el cliente guardado es una prórroga: solo fechas posteriores a la actual y, a más de 2 meses desde hoy, confirmación (BR-PAY-06). El lienzo lo dibuja como menú flotante en escritorio; sin el interruptor «Correr también los siguientes» (I-08).',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
/** Cada marco abre su diálogo modal; se prueba en el último (el que queda encima). */
const lastDialog = (root: HTMLElement) => {
  const all = [...root.querySelectorAll<HTMLElement>('[role="alertdialog"]')];
  return all.at(-1)!;
};
const button = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
  );

export const Explorar: Story = {};

/** CA-1: al crear, elegir el 05/12/2026 y guardar corrige solo ese abono (sin historial). */
export const CalendarioAbierto: Story = {
  name: 'Calendario abierto',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) expect(frame.textContent).toContain('Abono 2 de 4');
    const dialog = lastDialog(canvasElement);
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2026-12-05"]')!);
    expect(dialog.textContent).toContain('Nueva fecha: 05/12/2026');
    await userEvent.click(button(dialog, 'Guardar fecha')!);
    expect(args.onSave).toHaveBeenCalledWith('2026-12-05', false);
  },
};

/** CA-3: una fecha anterior a hoy avisa «Esta fecha ya pasó» y se puede guardar. */
export const FechaPasada: Story = {
  name: 'Fecha pasada',
  globals: { platform: 'desktop' },
  args: { current: localDate('2026-11-20') },
  play: async ({ canvasElement, args }) => {
    const dialog = lastDialog(canvasElement);
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2026-11-10"]')!);
    expect(dialog.textContent).toContain('Esta fecha ya pasó');
    await userEvent.click(button(dialog, 'Guardar fecha')!);
    expect(args.onSave).toHaveBeenCalledWith('2026-11-10', false);
  },
};

/** CA-2: con el cliente guardado, del 30/11/2026 al 15/02/2027 pide confirmar (más de 2 meses) y luego guarda. */
export const ProrrogaDeMasDeDosMeses: Story = {
  name: 'Prórroga de más de 2 meses',
  globals: { platform: 'desktop' },
  args: { mode: 'reschedule', current: localDate('2026-11-30') },
  play: async ({ canvasElement, args }) => {
    let dialog = lastDialog(canvasElement);
    // Prórroga: solo después de la fecha actual.
    expect(
      dialog.querySelector<HTMLButtonElement>('[data-date="2026-11-29"]')!.getAttribute('aria-disabled'),
    ).toBe('true');
    for (let i = 0; i < 3; i++) await userEvent.click(button(dialog, 'Mes siguiente')!);
    await waitFor(() => expect(dialog.textContent).toContain('febrero de 2027'));
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2027-02-15"]')!);
    await userEvent.click(button(dialog, 'Guardar fecha')!);
    await waitFor(() => expect(lastDialog(canvasElement).textContent).toContain('¿Dar tanto plazo?'));
    dialog = lastDialog(canvasElement);
    expect(dialog.textContent).toContain('El 15/02/2027 es más de 2 meses desde hoy.');
    expect(args.onSave).not.toHaveBeenCalled();
    await userEvent.click(button(dialog, 'Sí, dar el plazo')!);
    expect(args.onSave).toHaveBeenCalledWith('2027-02-15', true);
  },
};

export const Movil: Story = { name: 'Móvil', globals: { platform: 'mobile' } };
