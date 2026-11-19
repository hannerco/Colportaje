import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import { localDate } from '@/domain/time';
import { Field, type FieldProps } from './Field';

/** El campo es controlado: en el Storybook guarda su valor para poder escribir en él. */
function Stateful(args: FieldProps) {
  const [value, setValue] = useState(args.value);
  const onChange = (next: typeof value) => {
    setValue(next);
    (args.onChange as ((v: typeof value) => void) | undefined)?.(next);
  };
  return <Field {...({ ...args, value, onChange } as FieldProps)} />;
}

const meta = {
  title: 'Átomos/Campo de formulario',
  component: Field,
  render: (args) => <Stateful {...args} />,
  args: { label: 'Nombre', kind: 'text', value: '', onChange: fn(), onOpen: fn() },
  argTypes: {
    kind: { control: 'inline-radio', options: ['text', 'money', 'date', 'phone', 'select', 'textarea'] },
    value: { control: false },
    width: { control: 'object' },
  },
  parameters: {
    design: {
      ficha: 'Lib-Campo',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'En Crear cliente, Agregar libro, Programar abono y Editar precio.',
        'Tipo selección para listas cortas.',
      ],
      whenNotToUse: [
        'Para buscar (Buscador).',
        'Para elegir entre 2 o 3 opciones visibles (Selección radio o Pestañas segmento).',
      ],
      usedIn: ['Crear cliente', 'Agregar libro', 'Programar abono', 'Editar precio'],
    },
    docs: {
      description: {
        component:
          'Entrada de un dato con su etiqueta arriba, ayuda opcional y mensaje de error. El tipo decide el ícono, el teclado del celular y el formato: dinero con «$» y miles con punto, fechas dd/mm/aaaa. No valida mientras se escribe: muestra el `error` que le pasan.',
      },
    },
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const controlOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('input, textarea, button')!;
const boxOf = (frame: HTMLElement) => controlOf(frame).parentElement!;
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};

export const Explorar: Story = { args: { placeholder: 'Ej.: Luz Marina Gómez', help: 'Como lo conoces' } };

// ─── Escritorio ───

/** CA-3 y CA-4: teclado de teléfono, alto 40 / 48, letra 16 / 17; tocar la etiqueta enfoca la caja. */
export const Telefono: Story = {
  name: 'Teléfono',
  args: { kind: 'phone', label: 'Teléfono', value: '300 123 4567' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const input = controlOf(frame);
      const mobile = isMobile(frame);
      expect(input.getAttribute('inputmode')).toBe('tel');
      expect(boxOf(frame).getBoundingClientRect().height).toBe(mobile ? 48 : 40);
      expect(getComputedStyle(input).fontSize).toBe(mobile ? '17px' : '16px');
      expect(boxOf(frame).querySelector('svg')!.dataset.icon).toBe('call');
      await userEvent.click(frame.querySelector('label')!);
      expect(document.activeElement).toBe(input);
    }
  },
};

/** CA-1: «93000» se ve «$ 93.000» y entrega 93000; al borrar todo, `null`. Termina enfocado. */
export const MonedaEnfocado: Story = {
  name: 'Moneda · enfocado',
  args: { kind: 'money', label: 'Precio acordado', value: null },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const input = controlOf(frame) as HTMLInputElement;
      await userEvent.type(input, '93000');
      expect(input.value).toBe('93.000');
      expect(boxOf(frame).textContent).toBe('$');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(args.onChange).toHaveBeenLastCalledWith(93000);
      await userEvent.clear(input);
      expect(args.onChange).toHaveBeenLastCalledWith(null);
      await userEvent.type(input, '93000');
      expect(document.activeElement).toBe(input);
    }
  },
};

/** CA-2: «32/11/2026» entrega `null`; con error, borde rojo, mensaje con `role="alert"` y `aria-invalid`. */
export const FechaError: Story = {
  name: 'Fecha · error',
  args: {
    kind: 'date',
    label: 'Fecha acordada',
    value: null,
    error: 'Esa fecha no existe',
    placeholder: 'dd/mm/aaaa',
  },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const input = controlOf(frame) as HTMLInputElement;
      await userEvent.type(input, '05/11/2026');
      expect(args.onChange).toHaveBeenLastCalledWith(localDate('2026-11-05'));
      await userEvent.clear(input);
      await userEvent.type(input, '32/11/2026');
      expect(args.onChange).toHaveBeenLastCalledWith(null);
      expect(input.value).toBe('32/11/2026');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const alert = frame.querySelector('[role="alert"]')!;
      expect(alert.textContent).toBe('Esa fecha no existe');
      expect(input.getAttribute('aria-describedby')).toBe(alert.id);
      expect(getComputedStyle(boxOf(frame)).borderColor).toBe(tokenColor(frame, '--color-bad'));
      input.blur();
    }
  },
};

/** R6: solo el disparador; abre la lista con `onOpen`. */
export const Seleccion: Story = {
  name: 'Selección',
  args: { kind: 'select', label: 'Método', value: 'Efectivo' },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const button = controlOf(frame);
      expect(button.getAttribute('aria-haspopup')).toBe('listbox');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(button.querySelector('svg')!.dataset.icon).toBe('expand');
      await userEvent.click(button);
      button.blur();
    }
    expect(args.onOpen).toHaveBeenCalledTimes(frames(canvasElement).length);
  },
};

/** CA-5: no se puede escribir y el texto se ve en `text-3`. */
export const Deshabilitado: Story = {
  args: { label: 'Vendedor', value: 'Carlos Pérez', disabled: true },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const input = controlOf(frame) as HTMLInputElement;
      expect(input.disabled).toBe(true);
      await userEvent.type(input, 'x');
      expect(input.value).toBe('Carlos Pérez');
      expect(getComputedStyle(input).color).toBe(tokenColor(frame, '--color-text-3'));
    }
    expect(args.onChange).not.toHaveBeenCalled();
  },
};

export const AreaDeTexto: Story = {
  name: 'Área de texto',
  args: { kind: 'textarea', label: 'Nota', value: '', help: 'Opcional' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(controlOf(frame).tagName).toBe('TEXTAREA');
      expect(boxOf(frame).getBoundingClientRect().height).toBe(104);
      expect(
        frame.querySelector(`#${CSS.escape(controlOf(frame).getAttribute('aria-describedby')!)}`)!
          .textContent,
      ).toBe('Opcional');
    }
  },
};

// ─── Móvil ───

export const TelefonoMovil: Story = { ...Telefono, name: 'Teléfono · móvil', play: undefined };

export const MonedaEnfocadoMovil: Story = {
  name: 'Moneda · enfocado · móvil',
  args: { kind: 'money', label: 'Precio acordado', value: 93000 },
  play: async ({ canvasElement }) => {
    const all = frames(canvasElement);
    controlOf(all[all.length - 1]!).focus();
  },
};

export const FechaErrorMovil: Story = {
  name: 'Fecha · error · móvil',
  args: {
    kind: 'date',
    label: 'Fecha acordada',
    value: null,
    error: 'Esa fecha no existe',
    placeholder: 'dd/mm/aaaa',
  },
};

/** Todos los tipos y estados en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: '360px' }}>
      <Field label="Nombre" value="" placeholder="Ej.: Luz Marina Gómez" help="Como lo conoces" />
      <Field kind="phone" label="Teléfono" value="300 123 4567" />
      <Field kind="money" label="Precio acordado" value={93000} />
      <Field kind="date" label="Fecha acordada" value={localDate('2026-11-05')} />
      <Field kind="date" label="Fecha acordada" value={null} error="Esa fecha no existe" />
      <Field kind="select" label="Método" value="Efectivo" />
      <Field label="Vendedor" value="Carlos Pérez" disabled />
      <Field kind="textarea" label="Nota" value="" help="Opcional" />
    </div>
  ),
};
