import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Choice, ChoiceGroup, type ChoiceProps } from './Choice';

/** Casilla e interruptor controlados: en el Storybook guardan su estado para poder pulsarlos. */
function Stateful(args: ChoiceProps) {
  const [checked, setChecked] = useState(args.kind === 'radio' ? false : (args.checked ?? false));
  if (args.kind === 'radio') return <Choice {...args} />;
  return (
    <Choice
      {...args}
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next);
        args.onCheckedChange?.(next);
      }}
    />
  );
}

/** Un radio vive dentro de su grupo: cada story lo dibuja con las dos opciones del ejemplo. */
function Methods({ value }: { value: string }) {
  const [current, setCurrent] = useState(value);
  return (
    <ChoiceGroup legend="Método" value={current} onValueChange={setCurrent}>
      <Choice kind="radio" value="cash" label="Efectivo" description="$280.000 en caja" />
      <Choice kind="radio" value="transfer" label="Transferencia" />
    </ChoiceGroup>
  );
}

const meta = {
  title: 'Átomos/Selección',
  component: Choice,
  render: (args) => <Stateful {...args} />,
  args: { kind: 'checkbox', label: 'Recordarme mañana', onCheckedChange: fn() },
  argTypes: {
    kind: { control: 'inline-radio', options: ['checkbox', 'radio', 'switch'] },
    checked: { control: 'boolean' },
  },
  parameters: {
    design: {
      ficha: 'Lib-Seleccion',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Casilla: marcar varios elementos o aceptar algo.',
        'Radio: método de pago, una sola opción visible.',
        'Interruptor: preferencias con efecto inmediato.',
      ],
      whenNotToUse: [
        'Interruptor para algo que requiere Guardar después.',
        'Radio con más de 5 opciones (Campo selección).',
      ],
      usedIn: ['Formularios', 'Ajustes', 'Entrega de dinero'],
    },
    docs: {
      description: {
        component:
          'Casilla (varias opciones), radio (una entre varias, dentro de `ChoiceGroup`) e interruptor (efecto inmediato). Toda la fila es tocable; el texto va en positivo («Recordarme», no «No recordarme»).',
      },
    },
  },
} satisfies Meta<typeof Choice>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const box = (el: Element) => {
  const { width, height } = el.getBoundingClientRect();
  return { width: Math.round(width), height: Math.round(height) };
};
const roleIn = (frame: HTMLElement, role: string) => frame.querySelector<HTMLElement>(`[role="${role}"]`)!;
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
/** El `onCheckedChange` de la story (los radios no lo tienen: los maneja el grupo). */
const onChangeOf = (args: ChoiceProps) =>
  (args as unknown as { onCheckedChange: ReturnType<typeof fn> }).onCheckedChange;
const rowOf = (el: HTMLElement) => el.closest<HTMLElement>('label')!;

export const Explorar: Story = { args: { description: 'Aclaración debajo, en gris' } };

// ─── Escritorio ───

/** CA-1: al tocar el texto queda marcada y `onCheckedChange(true)` se llama una vez. */
export const Casilla: Story = {
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const checkbox = roleIn(frame, 'checkbox');
      const side = isMobile(frame) ? 22 : 18;
      expect(box(checkbox)).toEqual({ width: side, height: side });
      expect(checkbox.getAttribute('aria-checked')).toBe('false');
      expect(getComputedStyle(checkbox).borderRadius).toBe(isMobile(frame) ? '6px' : '5px');
      expect(rowOf(checkbox).getBoundingClientRect().height).toBeGreaterThanOrEqual(
        isMobile(frame) ? 44 : 32,
      );
      onChangeOf(args).mockClear();
      await userEvent.click(frame.querySelector('label span')!);
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
      expect(onChangeOf(args)).toHaveBeenCalledTimes(1);
      expect(onChangeOf(args)).toHaveBeenCalledWith(true);
      expect(checkbox.querySelector('svg')!.dataset.icon).toBe('check');
    }
  },
};

export const CasillaMarcada: Story = {
  name: 'Casilla marcada',
  args: { checked: true },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const checkbox = roleIn(frame, 'checkbox');
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
      expect(getComputedStyle(checkbox).backgroundColor).toBe(tokenColor(frame, '--color-accent'));
      expect(getComputedStyle(checkbox).borderColor).toBe(tokenColor(frame, '--color-accent'));
    }
  },
};

export const Radio: Story = {
  args: { kind: 'radio', value: 'transfer', label: 'Transferencia' },
  render: () => <Methods value="cash" />,
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const [, transfer] = frame.querySelectorAll<HTMLElement>('[role="radio"]');
      const side = isMobile(frame) ? 22 : 18;
      expect(box(transfer!)).toEqual({ width: side, height: side });
      expect(getComputedStyle(transfer!).borderRadius).toBe('999px');
      expect(transfer!.getAttribute('aria-checked')).toBe('false');
    }
  },
};

export const RadioMarcado: Story = {
  name: 'Radio marcado',
  args: { kind: 'radio', value: 'cash', label: 'Efectivo' },
  render: () => <Methods value="cash" />,
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const [cash] = frame.querySelectorAll<HTMLElement>('[role="radio"]');
      expect(cash!.getAttribute('aria-checked')).toBe('true');
      expect(box(cash!.querySelector('span')!)).toEqual(
        isMobile(frame) ? { width: 10, height: 10 } : { width: 8, height: 8 },
      );
    }
  },
};

export const Interruptor: Story = {
  args: { kind: 'switch', label: 'Avisarme de los cobros' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const sw = roleIn(frame, 'switch');
      expect(box(sw)).toEqual(isMobile(frame) ? { width: 44, height: 26 } : { width: 36, height: 22 });
      expect(sw.getAttribute('aria-checked')).toBe('false');
      await userEvent.click(sw);
      expect(sw.getAttribute('aria-checked')).toBe('true');
      await userEvent.click(sw);
    }
  },
};

export const InterruptorActivo: Story = {
  name: 'Interruptor activo',
  args: { kind: 'switch', label: 'Avisarme de los cobros', checked: true },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const sw = roleIn(frame, 'switch');
      const thumb = sw.querySelector('span')!;
      const gap = sw.getBoundingClientRect().right - thumb.getBoundingClientRect().right;
      expect(sw.getAttribute('aria-checked')).toBe('true');
      expect(Math.round(gap)).toBe(2);
    }
  },
};

/** CA-3: deshabilitado no cambia; R5: opacidad 0,4. */
export const Deshabilitado: Story = {
  args: { label: 'Abono entregado', disabled: true, checked: true },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const checkbox = roleIn(frame, 'checkbox');
      expect(getComputedStyle(rowOf(checkbox)).opacity).toBe('0.4');
      // El navegador ya no deja pulsar lo deshabilitado; se simula el toque igual para comprobar que no cambia.
      const touch = userEvent.setup({ pointerEventsCheck: 0 });
      await touch.click(frame.querySelector('label span')!);
      await touch.click(checkbox);
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
    }
    expect(onChangeOf(args)).not.toHaveBeenCalled();
  },
};

// ─── Móvil ───

export const CasillaMarcadaMovil: Story = { name: 'Casilla marcada · móvil', args: { checked: true } };

export const RadioMarcadoMovil: Story = {
  name: 'Radio marcado · móvil',
  args: { kind: 'radio', value: 'cash', label: 'Efectivo' },
  render: () => <Methods value="cash" />,
};

/** CA-4: el interruptor mide 44 × 26 y la fila, al menos 44 de alto. */
export const InterruptorActivoMovil: Story = {
  name: 'Interruptor activo · móvil',
  args: { kind: 'switch', label: 'Avisarme de los cobros', checked: true },
};

/** CA-2: con Efectivo marcado, flecha abajo marca Transferencia y le pasa el foco. */
export const GrupoDeRadios: Story = {
  name: 'Grupo de radios',
  args: { kind: 'radio', value: 'cash', label: 'Efectivo' },
  render: () => <Methods value="cash" />,
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const group = frame.querySelector('fieldset')!;
      expect(group.querySelector('legend')!.textContent).toBe('Método');
      const [cash, transfer] = frame.querySelectorAll<HTMLElement>('[role="radio"]');
      await userEvent.click(cash!);
      // Radix mueve el foco en el siguiente ciclo y marca la opción si la flecha sigue pulsada: se mantiene la tecla.
      await userEvent.keyboard('{ArrowDown>}');
      await waitFor(() => expect(transfer!.getAttribute('aria-checked')).toBe('true'));
      expect(cash!.getAttribute('aria-checked')).toBe('false');
      expect(document.activeElement).toBe(transfer);
      await userEvent.keyboard('{/ArrowDown}{ArrowUp>}');
      await waitFor(() => expect(cash!.getAttribute('aria-checked')).toBe('true'));
      await userEvent.keyboard('{/ArrowUp}');
    }
  },
};

/** Todos los tipos y estados en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  args: { label: 'Recordarme mañana' },
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-2)', maxWidth: '360px' }}>
      <Choice label="Recordarme mañana" />
      <Choice label="Recordarme mañana" checked description="Aclaración debajo, en gris" />
      <Choice kind="switch" label="Avisarme de los cobros" />
      <Choice kind="switch" label="Avisarme de los cobros" checked />
      <ChoiceGroup legend="Método" value="cash">
        <Choice kind="radio" value="cash" label="Efectivo" description="$280.000 en caja" />
        <Choice kind="radio" value="transfer" label="Transferencia" />
      </ChoiceGroup>
      <Choice label="Abono entregado" checked disabled />
    </div>
  ),
};
