import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { DateChangeReason } from '@/domain/manual-schedule';
import { localDate, type LocalDate } from '@/domain/time';
import { PaymentDateDialog } from './PaymentDateDialog';

type DemoProps = {
  mode: 'create' | 'saved';
  current: LocalDate | null;
  initialReason?: DateChangeReason;
  onSave?: (date: LocalDate, reason: DateChangeReason, note?: string) => void;
};

function Demo({ mode, current, initialReason, onSave = () => {} }: DemoProps) {
  const [open, setOpen] = useState(true);
  return (
    <PaymentDateDialog
      open={open}
      onOpenChange={setOpen}
      label={mode === 'saved' ? 'Abono 3 de 6' : 'Abono 2 de 4'}
      current={current}
      today={localDate('2026-11-24')}
      otherDates={[localDate('2026-12-15'), localDate('2026-12-29')]}
      mode={mode}
      initialReason={initialReason}
      onSave={onSave}
    />
  );
}

const meta = {
  title: 'Pantallas/Clientes/Abonos/Fecha del abono',
  component: Demo,
  args: { mode: 'create', current: localDate('2026-12-01'), onSave: fn() },
  parameters: {
    frameSize: 'screen',
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    design: {
      ficha: 'Propuestas · Abonos a mano, sin plan automático (24/11/2026) · FechaAbono',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Al tocar la fecha de un abono por cobrar, al crear el cliente o en la ficha.',
        'En la ficha pregunta «¿Por qué cambia?»: «Me equivoqué» corrige; «El cliente pidió aplazar» lo anota en el historial.',
      ],
      whenNotToUse: ['Nunca para impedir una fecha: los avisos no bloquean (ronda 38).'],
      usedIn: ['Nuevo cliente', 'Ficha de cliente', 'Detalle de un abono («Aplazar»)'],
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
/** Cada marco abre su ventana; se prueba en la última (la que queda encima). */
const lastDialog = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[role="alertdialog"]')].at(-1)!;
const button = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
  );

export const Explorar: Story = {};

/** Al crear, hacia adelante: «Pasa del 01/12 al 10/12 (9 días después)» y «Listo» guarda solo ese abono. */
export const CrearHaciaAdelante: Story = {
  name: 'Crear · hacia adelante',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) expect(frame.textContent).toContain('Fecha del abono 2 de 4');
    const dialog = lastDialog(canvasElement);
    expect(dialog.querySelector('[role="radiogroup"]')).toBeNull();
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2026-12-10"]')!);
    expect(dialog.textContent).toContain('Pasa del 01/12 al 10/12 (9 días después)');
    await userEvent.click(button(dialog, 'Listo')!);
    expect(args.onSave).toHaveBeenCalledWith('2026-12-10', 'correct', undefined);
  },
};

/** Hacia atrás saltando otro abono: «Es antes de la fecha que tenía» y «Ojo: hay un abono programado después». */
export const HaciaAtras: Story = {
  name: 'Hacia atrás',
  globals: { platform: 'desktop' },
  args: { current: localDate('2026-12-29') },
  play: async ({ canvasElement }) => {
    const dialog = lastDialog(canvasElement);
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2026-12-08"]')!);
    expect(dialog.textContent).toContain('Es antes de la fecha que tenía (29/12)');
    expect(dialog.textContent).toContain('Ojo: hay un abono programado después, el 15/12');
  },
};

/** Una fecha pasada solo avisa en rojo; se puede guardar igual. */
export const FechaPasada: Story = {
  name: 'Fecha pasada',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const dialog = lastDialog(canvasElement);
    await userEvent.click(button(dialog, 'Mes anterior')!);
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2026-11-10"]')!);
    expect(dialog.textContent).toContain('Esta fecha ya pasó');
    await userEvent.click(button(dialog, 'Listo')!);
    expect(args.onSave).toHaveBeenCalledWith('2026-11-10', 'correct', undefined);
  },
};

/** Ficha · el cliente pidió aplazar: «Lo estás aplazando 9 días», nota opcional y «Aplazar». */
export const FichaAplazar: Story = {
  name: 'Ficha · aplazar',
  globals: { platform: 'mobile' },
  args: { mode: 'saved', initialReason: 'reschedule' },
  play: async ({ canvasElement, args }) => {
    const dialog = lastDialog(canvasElement);
    expect(dialog.textContent).toContain('¿Por qué cambia?');
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2026-12-10"]')!);
    expect(dialog.textContent).toContain('Lo estás aplazando 9 días');
    await userEvent.type(dialog.querySelector('input')!, 'Le pagan el 10');
    await userEvent.click(button(dialog, 'Aplazar')!);
    expect(args.onSave).toHaveBeenCalledWith('2026-12-10', 'reschedule', 'Le pagan el 10');
  },
};

/** Ficha · me equivoqué: sin nota y «Corregir fecha»; a más de 2 meses solo avisa. */
export const FichaCorregir: Story = {
  name: 'Ficha · me equivoqué',
  globals: { platform: 'mobile' },
  args: { mode: 'saved' },
  play: async ({ canvasElement, args }) => {
    const dialog = lastDialog(canvasElement);
    expect(dialog.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toContain(
      'Me equivoqué',
    );
    expect(dialog.querySelector('input')).toBeNull();
    for (let i = 0; i < 3; i++) await userEvent.click(button(dialog, 'Mes siguiente')!);
    await waitFor(() => expect(dialog.textContent).toContain('marzo de 2027'));
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2027-03-01"]')!);
    expect(dialog.textContent).toContain('Es más de 2 meses desde hoy');
    await userEvent.click(button(dialog, 'Corregir fecha')!);
    expect(args.onSave).toHaveBeenCalledWith('2027-03-01', 'correct', undefined);
  },
};

/** Un abono nuevo sin fecha: abre en hoy, sin «fecha que tenía». */
export const AbonoNuevo: Story = {
  name: 'Abono nuevo, sin fecha',
  args: { current: null },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
