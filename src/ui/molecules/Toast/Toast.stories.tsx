import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Toast, ToastProvider, useToast, type ToastOptions } from './Toast';

const onAction = fn();

const meta = {
  title: 'Moléculas/Aviso',
  component: Toast,
  args: {
    message: 'Abono cobrado',
    action: { label: 'Deshacer', onAction },
    tone: 'success',
    onDismiss: fn(),
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['info', 'success', 'error'] },
    width: { control: 'object' },
    durationMs: { control: 'number' },
  },
  parameters: {
    design: {
      ficha: 'Lib-Aviso',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Después de cobrar, entregar, archivar o eliminar, con «Deshacer».',
        'Para errores de red recuperables, con «Reintentar».',
      ],
      whenNotToUse: [
        'Para decisiones que requieren respuesta (Diálogo).',
        'Para estados permanentes (Franja).',
      ],
      usedIn: ['Dinero', 'Inventario', 'Clientes'],
    },
    docs: {
      description: {
        component:
          'Mensaje breve que confirma lo que acaba de pasar y deja deshacerlo. Se muestra con `useToast().show({ message, action })`; `ToastProvider` va en la raíz de la app con `durationMs = undo.toastSeconds × 1000` (hoy 6 s, I-34). Un aviso a la vez: uno nuevo reemplaza al anterior. El tiempo se pausa con el foco o el puntero encima.',
      },
    },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
const toastsOf = (frame: HTMLElement) => [...frame.querySelectorAll<HTMLElement>('[data-tone]')];
const clearSpy = (spy: unknown) => (spy as ReturnType<typeof fn>).mockClear();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Una pantalla de ejemplo con su `ToastProvider`. El `transform` hace que el aviso (`position: fixed`) se coloque
 * dentro del marco y no en la ventana del Storybook.
 */
function Screen({ durationMs, toasts }: { durationMs: number; toasts: ToastOptions[] }) {
  return (
    <div style={{ transform: 'translateZ(0)', minHeight: 180 }}>
      <ToastProvider durationMs={durationMs}>
        <Trigger toasts={toasts} />
      </ToastProvider>
    </div>
  );
}

function Trigger({ toasts }: { toasts: ToastOptions[] }) {
  const { show } = useToast();
  return (
    <button type="button" onClick={() => toasts.forEach(show)}>
      Mostrar aviso
    </button>
  );
}

export const Explorar: Story = {};

// ─── Escritorio ───

/** R1 y CA-2: fondo invertido, ícono ✓ en `toast-ok`; «Deshacer» corre una sola vez y cierra el aviso. */
export const Exito: Story = {
  name: 'Éxito',
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const toast = toastsOf(frame)[0]!;
      const { height, width } = toast.getBoundingClientRect();
      expect(height).toBe(isMobile(frame) ? 52 : 48);
      expect(getComputedStyle(toast).borderRadius).toBe(isMobile(frame) ? '14px' : '12px');
      if (!isMobile(frame)) expect(width).toBe(380);
      expect(getComputedStyle(toast).backgroundColor).toBe(tokenColor(frame, '--color-toast'));
      expect(getComputedStyle(toast).color).toBe(tokenColor(frame, '--color-on-toast'));
      expect(getComputedStyle(toast.querySelector('svg')!).color).toBe(tokenColor(frame, '--color-toast-ok'));
      expect(toast.getAttribute('role')).toBe('status');
      expect(toast.getAttribute('aria-live')).toBe('polite');
      const button = toast.querySelector('button')!;
      expect(getComputedStyle(button).color).toBe(tokenColor(frame, '--color-toast-link'));
      onAction.mockClear();
      clearSpy(args.onDismiss);
      await userEvent.click(button);
      await userEvent.click(button);
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(args.onDismiss).toHaveBeenCalledTimes(1);
    }
  },
};

export const Informacion: Story = {
  name: 'Información',
  args: { message: 'Cliente archivado', tone: 'info', action: undefined },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const toast = toastsOf(frame)[0]!;
      expect(toast.querySelector('svg')).toBeNull();
      expect(toast.querySelector('button')).toBeNull();
    }
  },
};

export const ErrorStory: Story = {
  name: 'Error',
  args: { message: 'No se pudo guardar', tone: 'error', action: { label: 'Reintentar', onAction } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const toast = toastsOf(frame)[0]!;
      expect(getComputedStyle(toast.querySelector('svg')!).color).toBe(
        tokenColor(frame, '--color-toast-bad'),
      );
      expect(toast.querySelector('button')!.textContent).toBe('Reintentar');
    }
  },
};

// ─── Móvil ───

export const ExitoMovil: Story = { name: 'Éxito · móvil' };

export const ErrorMovil: Story = {
  name: 'Error · móvil',
  args: { message: 'No se pudo guardar', tone: 'error', action: { label: 'Reintentar', onAction } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      const toast = toastsOf(frame)[0]!;
      const parent = toast.parentElement!;
      const style = getComputedStyle(parent);
      const room = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      expect(toast.getBoundingClientRect().width).toBe(room);
    }
  },
};

// ─── Comportamiento con useToast() ───

/** CA-3: dos avisos seguidos; solo queda el segundo. */
export const Reemplazo: Story = {
  render: () => (
    <Screen
      durationMs={60000}
      toasts={[
        { message: 'Abono cobrado', action: { label: 'Deshacer', onAction } },
        { message: 'Cliente archivado', tone: 'info' },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      await userEvent.click(frame.querySelector('button')!);
      const toasts = toastsOf(frame);
      expect(toasts).toHaveLength(1);
      expect(toasts[0]!.textContent).toBe('Cliente archivado');
      // El contenedor es la región que anuncia; el aviso no repite el rol.
      expect(toasts[0]!.parentElement!.getAttribute('role')).toBe('status');
      expect(toasts[0]!.getAttribute('role')).toBeNull();
    }
  },
};

/** CA-1: sin interacción, el aviso se va solo al terminar su tiempo y la acción no se llamó (aquí, 0,4 s). */
export const SeCierraSolo: Story = {
  name: 'Se cierra solo',
  render: () => (
    <Screen
      durationMs={400}
      toasts={[{ message: 'Abono cobrado', action: { label: 'Deshacer', onAction } }]}
    />
  ),
  play: async ({ canvasElement }) => {
    onAction.mockClear();
    for (const frame of frames(canvasElement)) {
      await userEvent.click(frame.querySelector('button')!);
      expect(toastsOf(frame)).toHaveLength(1);
      await waitFor(() => expect(toastsOf(frame)).toHaveLength(0), { timeout: 2000 });
    }
    expect(onAction).not.toHaveBeenCalled();
  },
};

/** CA-2 y R4: con useToast(), «Deshacer» corre una vez y cierra; en escritorio queda abajo a la izquierda. */
export const DeshacerCierra: Story = {
  name: 'Deshacer cierra',
  render: () => (
    <Screen
      durationMs={60000}
      toasts={[{ message: 'Abono cobrado', action: { label: 'Deshacer', onAction } }]}
    />
  ),
  play: async ({ canvasElement }) => {
    onAction.mockClear();
    for (const frame of frames(canvasElement)) {
      await userEvent.click(frame.querySelector('button')!);
      const toast = toastsOf(frame)[0]!;
      const area = toast.closest<HTMLElement>('[style]')!.getBoundingClientRect();
      const box = toast.getBoundingClientRect();
      expect(box.bottom).toBeGreaterThan(area.bottom - 40);
      expect(box.left - area.left).toBe(isMobile(frame) ? 16 : 24);
      await userEvent.click(toast.querySelector('button')!);
      expect(toastsOf(frame)).toHaveLength(0);
    }
    expect(onAction).toHaveBeenCalledTimes(frames(canvasElement).length);
  },
};

/** CA-4: con el puntero o el foco encima, el tiempo se detiene; al salir, sigue y el aviso se va. */
export const PausaConPuntero: Story = {
  name: 'Pausa con el puntero',
  render: () => (
    <Screen
      durationMs={500}
      toasts={[{ message: 'Abono cobrado', action: { label: 'Deshacer', onAction } }]}
    />
  ),
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      await userEvent.click(frame.querySelector('button')!);
      const toast = toastsOf(frame)[0]!;
      await userEvent.hover(toast);
      await wait(800);
      expect(toast.isConnected).toBe(true);
      await userEvent.unhover(toast);
      await waitFor(() => expect(toastsOf(frame)).toHaveLength(0), { timeout: 2000 });

      await userEvent.click(frame.querySelector('button')!);
      const focused = toastsOf(frame)[0]!;
      focused.querySelector('button')!.focus();
      await wait(800);
      expect(focused.isConnected).toBe(true);
      focused.querySelector('button')!.blur();
      await waitFor(() => expect(toastsOf(frame)).toHaveLength(0), { timeout: 2000 });
    }
  },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <Toast message="Abono cobrado" action={{ label: 'Deshacer', onAction }} />
      <Toast message="Cliente archivado" tone="info" />
      <Toast message="No se pudo guardar" tone="error" action={{ label: 'Reintentar', onAction }} />
    </div>
  ),
};
