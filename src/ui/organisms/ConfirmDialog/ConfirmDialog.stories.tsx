import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Button } from '../../atoms/Button';
import { Field } from '../../atoms/Field';
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

/** Una pantalla de ejemplo: el botón abre el diálogo (o se muestra abierto para verlo). */
function Demo({ startOpen = false, ...args }: ConfirmDialogProps & { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div style={{ minHeight: 360 }}>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Abrir
      </Button>
      <ConfirmDialog
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

function NoteDemo(args: ConfirmDialogProps) {
  const [note, setNote] = useState('');
  return (
    <Demo {...args} startOpen>
      <Field
        kind="textarea"
        label="Nota"
        placeholder="Qué pasó con el ejemplar"
        value={note}
        onChange={setNote}
      />
    </Demo>
  );
}

/**
 * Las stories que empiezan abiertas pintan un diálogo modal en cada marco a la vez: cada uno oculta (`aria-hidden`) lo
 * demás, incluidos los otros diálogos. En la app hay uno solo; aquí esa regla no aplica.
 */
const severalOpenDialogs = { a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } } };

const meta = {
  title: 'Organismos/Diálogo',
  component: ConfirmDialog,
  render: (args) => <Demo {...args} />,
  args: {
    open: false,
    onOpenChange: fn(),
    tone: 'confirm',
    title: '¿Descartar el cliente?',
    message: 'Se pierde lo que escribiste de este cliente.',
    confirmLabel: 'Descartar',
    cancelLabel: 'Seguir editando',
    onConfirm: fn(),
  },
  argTypes: { tone: { control: 'inline-radio', options: ['confirm', 'danger'] }, open: { control: false } },
  parameters: {
    design: {
      ficha: 'Lib-Dialogo',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Para descartar cambios.', 'Para acciones destructivas sin Deshacer (eliminar).'],
      whenNotToUse: [
        'Para confirmar algo que se puede deshacer (Aviso).',
        'Para formularios largos (Ventana de detalle o una pantalla).',
      ],
      usedIn: ['Nuevo cliente (Descartar)', 'Detalle de un ejemplar (Eliminar)'],
    },
    docs: {
      description: {
        component:
          'Pide una decisión antes de seguir. Ventana centrada de 440 en escritorio; hoja inferior con los botones a todo el ancho en móvil. El foco inicial va a la salida segura; Esc cierra y el foco vuelve a quien lo abrió. Si `onConfirm` devuelve una promesa, el botón queda cargando y no se cierra hasta que termine bien. Los textos los pone la pantalla: nada de «Aceptar» / «Cancelar» genéricos.',
      },
    },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const dialogOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[role="alertdialog"]');
const buttonsOf = (dialog: HTMLElement) => [...dialog.querySelectorAll<HTMLButtonElement>('button')];
const openWithKeyboard = async (frame: HTMLElement) => {
  const opener = frame.querySelector<HTMLButtonElement>('button')!;
  opener.focus();
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(dialogOf(frame)).not.toBeNull());
  return opener;
};

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-2 y R1: ventana de 440 con `aria-modal` y título enlazado; Esc cierra y el foco vuelve al botón. */
export const Confirmacion: Story = {
  name: 'Confirmación',
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const opener = await openWithKeyboard(frame);
      const dialog = dialogOf(frame)!;
      expect(dialog.getAttribute('aria-labelledby')).toBe(dialog.querySelector('h2')!.id);
      expect(dialog.querySelector('h2')!.textContent).toBe('¿Descartar el cliente?');
      if (!isMobile(frame)) {
        expect(dialog.getBoundingClientRect().width).toBe(440);
        expect(getComputedStyle(dialog).borderRadius).toBe('20px');
        expect(buttonsOf(dialog).map((b) => b.textContent)).toEqual(['Seguir editando', 'Descartar']);
        const [cancel, confirm] = buttonsOf(dialog);
        expect(cancel!.getBoundingClientRect().top).toBe(confirm!.getBoundingClientRect().top);
      }
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(dialogOf(frame)).toBeNull());
      expect(document.activeElement).toBe(opener);
    }
    expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** CA-1: en peligro, el foco inicial está en «Cancelar»; «Eliminar» va en rojo y confirma y cierra. */
export const Peligro: Story = {
  args: {
    tone: 'danger',
    title: '¿Eliminar el ejemplar #6?',
    message: 'Sale del inventario y de las cuentas. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
  },
  play: async ({ canvasElement, args }) => {
    const onConfirm = args.onConfirm as ReturnType<typeof fn>;
    onConfirm.mockClear();
    for (const frame of frames(canvasElement)) {
      const opener = await openWithKeyboard(frame);
      const dialog = dialogOf(frame)!;
      await waitFor(() => expect(document.activeElement!.textContent).toBe('Cancelar'));
      const remove = buttonsOf(dialog).find((b) => b.textContent === 'Eliminar')!;
      expect(remove.dataset.variant).toBe('danger');
      await userEvent.click(remove);
      await waitFor(() => expect(dialogOf(frame)).toBeNull());
      expect(document.activeElement).toBe(opener);
    }
    expect(onConfirm).toHaveBeenCalledTimes(frames(canvasElement).length);
  },
};

// ─── Móvil ───

/** CA-4 y R2: hoja inferior; botones a todo el ancho, con el principal arriba. */
export const ConfirmacionHoja: Story = {
  name: 'Confirmación (hoja) · móvil',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      await openWithKeyboard(frame);
      const dialog = dialogOf(frame)!;
      expect(getComputedStyle(dialog).borderTopLeftRadius).toBe('28px');
      expect(getComputedStyle(dialog).padding).toBe('10px 20px 28px');
      const [first, second] = buttonsOf(dialog);
      expect(first!.textContent).toBe('Descartar');
      expect(second!.textContent).toBe('Seguir editando');
      expect(first!.getBoundingClientRect().bottom).toBeLessThanOrEqual(second!.getBoundingClientRect().top);
      const row = first!.parentElement!.getBoundingClientRect();
      for (const button of [first!, second!]) expect(button.getBoundingClientRect().width).toBe(row.width);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(dialogOf(frame)).toBeNull());
    }
  },
};

/** Con contenido entre el mensaje y los botones (un Campo de nota obligatoria, BR-COPY-16). */
export const ConNotaObligatoria: Story = {
  name: 'Con nota obligatoria',
  args: {
    title: '¿Deshacer «Devuelto al líder»?',
    message: 'El ejemplar vuelve a tu inventario. Cuenta qué pasó.',
    confirmLabel: 'Deshacer',
    cancelLabel: 'Cancelar',
  },
  parameters: severalOpenDialogs,
  render: (args) => <NoteDemo {...args} />,
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const dialog = dialogOf(frame)!;
      expect(dialog.querySelector('textarea')).not.toBeNull();
    }
  },
};

/** CA-3 y R3: con `onConfirm` de 1 s, el botón muestra el giro y Esc no cierra hasta que termine. */
export const Confirmando: Story = {
  name: 'Confirmando…',
  args: {
    onConfirm: fn(() => new Promise<void>((resolve) => setTimeout(resolve, 1000))),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      await openWithKeyboard(frame);
      const dialog = dialogOf(frame)!;
      const confirm = buttonsOf(dialog).find((b) => b.textContent === 'Descartar')!;
      await userEvent.click(confirm);
      await waitFor(() => expect(confirm.querySelector('[data-spinner]')).not.toBeNull());
      expect(confirm.getAttribute('aria-busy')).toBe('true');
      await userEvent.keyboard('{Escape}');
      expect(dialogOf(frame)).not.toBeNull();
      await waitFor(() => expect(dialogOf(frame)).toBeNull(), { timeout: 3000 });
    }
  },
};

/** Si `onConfirm` falla, el diálogo queda abierto y el botón vuelve a estar disponible. */
export const ConfirmacionFallida: Story = {
  name: 'Confirmación fallida',
  args: { onConfirm: fn(() => Promise.reject(new Error('offline'))) },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      await openWithKeyboard(frame);
      const confirm = buttonsOf(dialogOf(frame)!).find((b) => b.textContent === 'Descartar')!;
      await userEvent.click(confirm);
      await waitFor(() => expect(confirm.getAttribute('aria-busy')).toBeNull());
      expect(dialogOf(frame)).not.toBeNull();
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(dialogOf(frame)).toBeNull());
    }
  },
};

/** Claro y oscuro × escritorio y móvil, con el diálogo de peligro abierto. */
export const Matriz: Story = {
  parameters: { frames: 'matrix', ...severalOpenDialogs },
  args: {
    tone: 'danger',
    title: '¿Eliminar el ejemplar #6?',
    message: 'Sale del inventario y de las cuentas. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
  },
  render: (args) => <Demo {...args} startOpen />,
};
