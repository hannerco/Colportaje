import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type ReactNode } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Button } from '../../atoms/Button';
import { Menu, SelectField, type MenuItem, type MenuProps } from './Menu';

const sortItems: MenuItem[] = [
  { id: 'recent', label: 'Más recientes' },
  { id: 'name', label: 'Nombre (A–Z)' },
  { id: 'balance', label: 'Saldo pendiente' },
  { id: 'last_payment', label: 'Último abono' },
];

const copyActions: MenuItem[] = [
  { id: 'delete', label: 'Eliminar', icon: 'delete', danger: true },
  { id: 'flag', label: 'Marcar con novedad', icon: 'alert' },
  { id: 'return', label: 'Devolver al líder', icon: 'back' },
  { id: 'page', label: 'Abrir como página', icon: 'next' },
];

const paymentActions: MenuItem[] = [
  { id: 'reschedule', label: 'Cambiar fecha acordada', icon: 'calendar' },
  { id: 'edit', label: 'Editar monto', icon: 'edit' },
  { id: 'cancel', label: 'Cancelar abono', icon: 'canceled', danger: true },
];

/** Deja espacio para que el menú o la hoja se vean dentro del marco. */
const Stage = ({ children }: { children: ReactNode }) => <div style={{ minHeight: 380 }}>{children}</div>;

/** Con estado: el orden queda marcado al elegir. */
function SortMenu(args: Omit<MenuProps, 'trigger'>) {
  const [value, setValue] = useState(args.value);
  return (
    <Stage>
      <Menu
        {...args}
        value={value}
        onSelect={(id) => {
          setValue(id);
          args.onSelect(id);
        }}
        trigger={
          <Button variant="secondary" size="compact" icon="sort">
            Orden
          </Button>
        }
      />
    </Stage>
  );
}

function MethodField() {
  const [value, setValue] = useState('cash');
  return (
    <Stage>
      <SelectField
        label="Método"
        width={320}
        options={[
          { id: 'cash', label: 'Efectivo' },
          { id: 'transfer', label: 'Transferencia' },
        ]}
        value={value}
        onChange={setValue}
      />
    </Stage>
  );
}

const meta = {
  title: 'Moléculas/Menú',
  component: Menu,
  render: (args) => <SortMenu {...args} />,
  args: {
    trigger: <span />,
    items: sortItems,
    selectable: true,
    value: 'recent',
    title: 'Ordenar por',
    onSelect: fn(),
  },
  argTypes: { trigger: { control: false } },
  parameters: {
    design: {
      ficha: 'Lib-Menu',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Para el orden de una lista.',
        'Para las acciones secundarias de un detalle (Más acciones).',
      ],
      whenNotToUse: ['Para navegar entre módulos.', 'Para una sola acción (Botón).'],
      usedIn: ['Clientes', 'Inventario', 'Dinero', 'Detalle de un ejemplar', 'Detalle de un abono'],
    },
    docs: {
      description: {
        component:
          'Lista de opciones que se abre desde un botón. En escritorio es un menú flotante de 260 (Radix DropdownMenu); en móvil sube como hoja inferior con título. Las destructivas van en rojo y al final. Máximo 7 opciones, sin submenús. `SelectField` usa el menú como lista del Campo de tipo selección.',
      },
    },
  },
} satisfies Meta<typeof Menu>;

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
const menuOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[role="menu"]');
const itemsOf = (frame: HTMLElement) => [
  ...frame.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]'),
];
const user = userEvent.setup({ pointerEventsCheck: 0 });

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-1 y CA-3: flechas + Enter en «Saldo pendiente» llama `onSelect('balance')`, cierra y devuelve el foco. */
export const Orden: Story = {
  play: async ({ canvasElement, args }) => {
    const onSelect = args.onSelect as ReturnType<typeof fn>;
    for (const frame of frames(canvasElement)) {
      onSelect.mockClear();
      const trigger = frame.querySelector<HTMLButtonElement>('button')!;
      trigger.focus();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(menuOf(frame)).not.toBeNull());
      const items = itemsOf(frame);
      expect(items).toHaveLength(4);
      expect(items[0]!.getAttribute('aria-checked')).toBe('true');
      expect(getComputedStyle(items[0]!).backgroundColor).toBe(tokenColor(frame, '--color-row-selected'));
      if (!isMobile(frame)) {
        const menu = menuOf(frame)!;
        expect(menu.getBoundingClientRect().width).toBe(260);
        // Debajo del botón, alineado a su borde izquierdo, a 6 de distancia.
        const button = trigger.getBoundingClientRect();
        expect(Math.round(menu.getBoundingClientRect().top - button.bottom)).toBe(6);
        expect(Math.round(menu.getBoundingClientRect().left)).toBe(Math.round(button.left));
        expect(getComputedStyle(menu).borderRadius).toBe('14px');
        expect(items[1]!.getBoundingClientRect().height).toBe(40);
      } else {
        expect(items[1]!.getBoundingClientRect().height).toBe(52);
      }
      // CA-3: Esc cierra sin elegir.
      await user.keyboard('{Escape}');
      await waitFor(() => expect(menuOf(frame)).toBeNull());
      expect(onSelect).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(trigger);
      // CA-1: abrir, bajar con flechas hasta «Saldo pendiente» y Enter.
      await user.keyboard('{Enter}');
      await waitFor(() => expect(menuOf(frame)).not.toBeNull());
      await waitFor(() => expect(itemsOf(frame)).toContain(document.activeElement));
      while (document.activeElement?.textContent !== 'Saldo pendiente') await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(menuOf(frame)).toBeNull());
      expect(onSelect).toHaveBeenCalledWith('balance');
      expect(onSelect).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    }
  },
};

/** R3: la destructiva va al final y en rojo, aunque llegue primero. */
export const AccionesDeEjemplar: Story = {
  name: 'Acciones de ejemplar',
  args: { items: copyActions, selectable: false, value: undefined, title: 'Más acciones' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      await user.click(frame.querySelector('button')!);
      await waitFor(() => expect(menuOf(frame)).not.toBeNull());
      const items = itemsOf(frame);
      expect(items.map((item) => item.textContent)).toEqual([
        'Marcar con novedad',
        'Devolver al líder',
        'Abrir como página',
        'Eliminar',
      ]);
      expect(items.every((item) => item.getAttribute('role') === 'menuitem')).toBe(true);
      expect(getComputedStyle(items[3]!).color).toBe(tokenColor(frame, '--color-bad'));
      expect(getComputedStyle(items[0]!.querySelector('svg')!).color).toBe(
        tokenColor(frame, '--color-text-2'),
      );
      await user.keyboard('{Escape}');
      await waitFor(() => expect(menuOf(frame)).toBeNull());
    }
  },
};

export const AccionesDeAbono: Story = {
  name: 'Acciones de abono',
  args: { items: paymentActions, selectable: false, value: undefined, title: 'Más acciones' },
};

// ─── Móvil ───

/** CA-2: en móvil sube una hoja con título, opciones de 52 y «Cancelar abono» en rojo al final. */
export const AccionesDeAbonoHoja: Story = {
  name: 'Acciones de abono (hoja) · móvil',
  args: { items: paymentActions, selectable: false, value: undefined, title: 'Más acciones' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      await user.click(frame.querySelector('button')!);
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).not.toBeNull());
      const sheet = frame.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(sheet.querySelector('h2')!.textContent).toBe('Más acciones');
      expect(getComputedStyle(sheet).borderTopLeftRadius).toBe('28px');
      const body = frame.querySelector<HTMLElement>('.sb-frame__body')!.getBoundingClientRect();
      // Pegada abajo del marco (dentro de su borde de 1).
      expect(body.bottom - sheet.getBoundingClientRect().bottom).toBeLessThanOrEqual(1);
      const items = itemsOf(frame);
      for (const item of items) expect(item.getBoundingClientRect().height).toBe(52);
      expect(items.at(-1)!.textContent).toBe('Cancelar abono');
      expect(getComputedStyle(items.at(-1)!).color).toBe(tokenColor(frame, '--color-bad'));
      // Las flechas mueven entre opciones; Esc cierra y devuelve el foco.
      expect(document.activeElement).toBe(items[0]);
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(items[1]);
      await user.keyboard('{ArrowUp}{ArrowUp}');
      expect(document.activeElement).toBe(items[2]);
      await user.keyboard('{Escape}');
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).toBeNull());
      expect(document.activeElement).toBe(frame.querySelector('button'));
    }
  },
};

/** CA-4: al elegir «Transferencia», el campo la muestra y `aria-expanded` vuelve a `false`. */
export const CampoDeSeleccion: Story = {
  name: 'Campo de selección',
  render: () => <MethodField />,
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const field = frame.querySelector<HTMLButtonElement>('button')!;
      expect(field.textContent).toBe('Efectivo');
      expect(field.getAttribute('aria-expanded')).toBe('false');
      expect(frame.querySelector('label')!.htmlFor).toBe(field.id);
      await user.click(field);
      await waitFor(() => expect(menuOf(frame)).not.toBeNull());
      expect(field.getAttribute('aria-expanded')).toBe('true');
      const transfer = itemsOf(frame).find((item) => item.textContent === 'Transferencia')!;
      await user.click(transfer);
      await waitFor(() => expect(menuOf(frame)).toBeNull());
      expect(field.textContent).toBe('Transferencia');
      expect(field.getAttribute('aria-expanded')).toBe('false');
    }
  },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil (los disparadores; los menús se abren con un toque). */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
      <Menu
        trigger={
          <Button variant="secondary" size="compact" icon="sort">
            Orden
          </Button>
        }
        items={sortItems}
        selectable
        value="recent"
        title="Ordenar por"
        onSelect={() => {}}
      />
      <Menu
        trigger={
          <Button variant="tertiary" iconOnly>
            Más acciones
          </Button>
        }
        items={paymentActions}
        title="Más acciones"
        onSelect={() => {}}
      />
      <SelectField
        label="Método"
        width={240}
        options={[
          { id: 'cash', label: 'Efectivo' },
          { id: 'transfer', label: 'Transferencia' },
        ]}
        value="cash"
        onChange={() => {}}
      />
    </div>
  ),
};
