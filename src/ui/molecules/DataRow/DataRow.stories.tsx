import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { formatCOP } from '@/domain/money';
import { formatDate, localDate } from '@/domain/time';
import { DataList, DataRow } from './DataRow';

const meta = {
  title: 'Moléculas/Fila de dato',
  component: DataRow,
  render: (args) => (
    <DataList>
      <DataRow {...args} />
    </DataList>
  ),
  args: { label: 'Precio acordado', value: formatCOP(93000), kind: 'text' },
  argTypes: {
    kind: { control: 'inline-radio', options: ['text', 'editable', 'amount', 'link'] },
    value: { control: 'text' },
    previous: { control: 'text' },
  },
  parameters: {
    design: {
      ficha: 'Lib-FilaDato',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Datos de un detalle: precio, diferencia, fechas, cliente.',
        'Valores editables en el lugar (subrayado punteado).',
      ],
      whenNotToUse: ['Para listas de elementos (Fila de lista).'],
      usedIn: ['Detalle de un abono', 'Detalle de un ejemplar', 'Detalle de un Abibono'],
    },
    docs: {
      description: {
        component:
          'Una línea «etiqueta: valor» dentro de una isla de detalle; varias filas van dentro de `DataList` (`<dl>`). En escritorio la etiqueta va en una columna de 170; en móvil, a la izquierda con el valor a la derecha. Quien la usa formatea el valor y, en `editable`, abre la edición con `onEdit`.',
      },
    },
  },
} satisfies Meta<typeof DataRow>;

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

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-1 y CA-2: el valor es un botón «Editar Precio acordado, $93.000»; el anterior se anuncia «antes $98.000». */
export const EditableConAnterior: Story = {
  name: 'Editable con anterior',
  args: { kind: 'editable', onEdit: fn(), previous: formatCOP(98000), divider: false },
  play: async ({ canvasElement, args }) => {
    const onEdit = (args as unknown as { onEdit: ReturnType<typeof fn> }).onEdit;
    for (const frame of frames(canvasElement)) {
      const row = frame.querySelector<HTMLElement>('dl > div')!;
      const button = row.querySelector('button')!;
      expect(row.querySelector('dt')!.textContent).toBe('Precio acordado');
      expect(button.textContent).toBe('Editar Precio acordado, $93.000');
      expect(getComputedStyle(button).textDecorationStyle).toBe('dotted');
      expect(getComputedStyle(row).borderTopStyle).toBe('none');
      const previous = row.querySelector('s')!;
      expect(previous.textContent).toBe('antes $98.000');
      expect(getComputedStyle(previous).textDecorationLine).toBe('line-through');
      expect(getComputedStyle(previous).color).toBe(tokenColor(frame, '--color-text-3'));
      onEdit.mockClear();
      await userEvent.click(button);
      expect(onEdit).toHaveBeenCalledTimes(1);
      button.focus();
      await userEvent.keyboard('{Enter}');
      expect(onEdit).toHaveBeenCalledTimes(2);
      button.blur();
    }
  },
};

export const Monto: Story = {
  args: { kind: 'amount', label: 'Diferencia', value: formatCOP(-5000) },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const row = frame.querySelector<HTMLElement>('dl > div')!;
      expect(row.querySelector('dd')!.textContent).toBe('−$5.000');
      expect(getComputedStyle(row.querySelector('dd')!).fontWeight).toBe('600');
      expect(getComputedStyle(row).borderTopStyle).toBe('solid');
      expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(isMobile(frame) ? 48 : 44);
    }
  },
};

export const Enlace: Story = {
  args: { kind: 'link', label: 'Cliente', value: 'María Camila Henao', icon: 'person', href: '#cliente' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const link = frame.querySelector<HTMLAnchorElement>('dd a')!;
      expect(link.getAttribute('href')).toBe('#cliente');
      expect(getComputedStyle(link).color).toBe(tokenColor(frame, '--color-accent-text'));
      expect(frame.querySelector<SVGElement>('dt svg')!.dataset.icon).toBe('person');
    }
  },
};

export const FechaEditable: Story = {
  args: {
    kind: 'editable',
    onEdit: fn(),
    label: 'Vendido el',
    value: formatDate(localDate('2026-11-02')),
    icon: 'calendar',
  },
};

// ─── Móvil ───

export const EditableConAnteriorMovil: Story = {
  name: 'Editable con anterior · móvil',
  args: { kind: 'editable', onEdit: fn(), previous: formatCOP(98000), divider: false },
};

export const MontoMovil: Story = {
  name: 'Monto · móvil',
  args: { kind: 'amount', label: 'Diferencia', value: formatCOP(-5000) },
};

export const EnlaceMovil: Story = {
  name: 'Enlace · móvil',
  args: { kind: 'link', label: 'Cliente', value: 'María Camila Henao', onClick: fn() },
};

/** CA-3: en escritorio las etiquetas de varias filas quedan en una columna de 170; en móvil, el valor a la derecha. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <DataList>
      <DataRow
        kind="editable"
        label="Precio acordado"
        value={formatCOP(93000)}
        previous={formatCOP(98000)}
        divider={false}
        onEdit={() => {}}
      />
      <DataRow kind="amount" label="Diferencia" value={formatCOP(-5000)} />
      <DataRow kind="link" label="Cliente" value="María Camila Henao" href="#cliente" icon="person" />
      <DataRow
        kind="editable"
        label="Vendido el"
        value={formatDate(localDate('2026-11-02'))}
        icon="calendar"
        onEdit={() => {}}
      />
      <DataRow label="Método" value="Efectivo" />
    </DataList>
  ),
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const rows = [...frame.querySelectorAll<HTMLElement>('dl > div')];
      const values = rows.map((row) => row.querySelector('dd')!.getBoundingClientRect());
      if (isMobile(frame)) {
        for (const [i, value] of values.entries())
          expect(Math.round(value.right)).toBe(Math.round(rows[i]!.getBoundingClientRect().right));
      } else {
        const lefts = new Set(values.map((value) => Math.round(value.left)));
        expect(lefts.size).toBe(1);
        const row = rows[0]!.getBoundingClientRect();
        expect(Math.round(values[0]!.left - row.left)).toBe(170 + 12);
        expect(rows[0]!.querySelector('dt')!.getBoundingClientRect().width).toBe(170);
      }
    }
  },
};
