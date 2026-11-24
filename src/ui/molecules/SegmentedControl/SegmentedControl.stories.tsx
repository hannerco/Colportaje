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

/**
 * Tres opciones del mismo ancho cuando caben (en escritorio, con cualquier letra). Si una no cabe en su parte (#84:
 * celular angosto o letra más ancha), crece lo justo en vez de montarse sobre la vecina.
 */
export const Frecuencia: Story = {
  args: { label: 'Frecuencia', options: FREQUENCIES, value: 'biweekly' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const radios = [...frame.querySelectorAll<HTMLElement>('[role="radio"]')];
      const boxes = radios.map((r) => r.getBoundingClientRect());
      boxes.forEach((box, i) => {
        if (i > 0) expect(box.left).toBeGreaterThanOrEqual(boxes[i - 1]!.right - 0.5);
      });
      if (frame.getAttribute('aria-label')?.startsWith('Escritorio')) {
        expect(new Set(boxes.map((b) => Math.round(b.width))).size).toBe(1);
      }
    }
  },
};

/**
 * #84: una etiqueta larga en poco espacio («Como el dispositivo» en Ajustes, en el celular) pasa a dos líneas; ninguna
 * opción se monta sobre otra ni se sale del carril.
 */
export const EtiquetaLarga: Story = {
  name: 'Etiqueta larga en poco espacio',
  args: {
    label: 'Tema',
    options: [
      { value: 'system', label: 'Como el dispositivo' },
      { value: 'light', label: 'Claro' },
      { value: 'dark', label: 'Oscuro' },
    ],
    value: 'light',
  },
  decorators: [
    (Story) => (
      // Ancho del carril en el celular más angosto (320 px, menos los márgenes de la página y de la isla).
      <div style={{ width: 256 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const group = frame.querySelector<HTMLElement>('[role="radiogroup"]')!.getBoundingClientRect();
      const boxes = [...frame.querySelectorAll<HTMLElement>('[role="radio"]')].map((r) => {
        expect(r.scrollWidth).toBeLessThanOrEqual(r.clientWidth);
        return r.getBoundingClientRect();
      });
      boxes.forEach((box, i) => {
        expect(box.left).toBeGreaterThanOrEqual(group.left);
        expect(box.right).toBeLessThanOrEqual(group.right + 0.5);
        if (i > 0) expect(box.left).toBeGreaterThanOrEqual(boxes[i - 1]!.right - 0.5);
      });
    }
  },
};

export const Deshabilitado: Story = { args: { disabled: true } };

export const Matriz: Story = { parameters: { frames: 'matrix' } };

/** Dos «páginas» con el mismo control: al pasar de una a otra, el control se vuelve a montar. */
function TwoPages() {
  const [page, setPage] = useState<'a' | 'b'>('a');
  return (
    <>
      <button type="button" onClick={() => setPage(page === 'a' ? 'b' : 'a')}>
        Cambiar de página
      </button>
      <SegmentedControl
        key={page}
        label="Sección"
        options={[
          { value: 'in-stock', label: 'Libros en físico' },
          { value: 'copies', label: 'Ejemplares' },
        ]}
        value={page === 'a' ? 'in-stock' : 'copies'}
        onValueChange={(next) => setPage(next === 'in-stock' ? 'a' : 'b')}
      />
    </>
  );
}

/**
 * #78 («como en WhatsApp»): al cambiar de página, el indicador no aparece de la nada; sale de donde estaba y se desliza
 * hasta la opción nueva.
 */
export const DeUnaPaginaAOtra: Story = {
  name: 'De una página a otra',
  render: () => <TwoPages />,
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>('figure.sb-frame') ?? canvasElement;
    const toggle = [...frame.querySelectorAll('button')].find((b) => b.textContent === 'Cambiar de página')!;
    // Como en la app: el clic cambia de página y el navegador pinta en el siguiente cuadro (sin mirar antes).
    toggle.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const indicator = frame.querySelector<HTMLElement>('[class*="indicator"]')!;
    // Recién montado ya va en camino: hay una transición corriendo hacia «Ejemplares».
    expect(indicator.getAnimations().length).toBeGreaterThan(0);
    await waitFor(() => expect(indicator.getAnimations().length).toBe(0));
  },
};
