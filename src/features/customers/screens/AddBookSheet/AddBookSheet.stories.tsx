import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { AssignableCopy } from '@/domain/assignable-copies';
import { localDate } from '@/domain/time';
import { AddBookSheet, type ChosenBook } from './AddBookSheet';

const copyOf = (titleName: string, number: number, price: number): AssignableCopy => ({
  copyId: `${titleName}-${number}`,
  titleName,
  number,
  price,
  imageUrl: null,
});

/** Lo que el diseño muestra en «Ejemplares en físico». */
const STOCK: AssignableCopy[] = [
  copyOf('Bebidas saludables', 9, 75000),
  copyOf('Bebidas saludables', 10, 75000),
  copyOf('El camino a Cristo', 2, 30000),
  copyOf('Psiconutrición', 4, 98000),
  copyOf('Psiconutrición', 6, 98000),
  copyOf('Psiconutrición', 7, 98000),
  copyOf('Un corazón tranquilo', 23, 95000),
];

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

type DemoProps = {
  stock?: AssignableCopy[];
  initialChosen?: ChosenBook[];
  isOnline?: boolean;
  onSelect?: (copyId: string) => void;
  onPriceChange?: (copyId: string, price: number | null) => void;
  onAddToInventory?: () => void;
};

/** La hoja con un estado como el del contenedor: tocar un ejemplar lo pasa a «seleccionados». */
function Demo({
  stock = STOCK,
  initialChosen = [],
  isOnline = true,
  onSelect = () => {},
  onPriceChange = () => {},
  onAddToInventory = () => {},
}: DemoProps) {
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<ChosenBook[]>(initialChosen);
  const ids = new Set(chosen.map((c) => c.copyId));
  const query = fold(search.trim()).replace('#', '');
  const available = stock.filter(
    (c) => !ids.has(c.copyId) && (!query || fold(c.titleName).includes(query) || String(c.number) === query),
  );
  return (
    <AddBookSheet
      onClose={() => {}}
      search={search}
      onSearchChange={setSearch}
      available={available}
      chosen={chosen}
      isOnline={isOnline}
      onSelect={(copyId) => {
        onSelect(copyId);
        const copy = stock.find((c) => c.copyId === copyId)!;
        setChosen((list) => [
          ...list,
          {
            copyId,
            titleName: copy.titleName,
            number: copy.number,
            agreedPrice: copy.price,
            publicPrice: copy.price,
            soldOn: localDate('2026-11-17'),
          },
        ]);
      }}
      onRemove={(copyId) => setChosen((list) => list.filter((c) => c.copyId !== copyId))}
      onPriceChange={(copyId, price) => {
        onPriceChange(copyId, price);
        setChosen((list) => list.map((c) => (c.copyId === copyId ? { ...c, agreedPrice: price } : c)));
      }}
      onSoldOnChange={(copyId, soldOn) =>
        setChosen((list) => list.map((c) => (c.copyId === copyId ? { ...c, soldOn } : c)))
      }
      onAddToInventory={onAddToInventory}
      backHref="#clientes"
    />
  );
}

const meta = {
  title: 'Pantallas/Clientes/Agregar libro',
  component: Demo,
  args: { onSelect: fn(), onPriceChange: fn(), onAddToInventory: fn() },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Clientes · 5 · Agregar libro',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Desde «Agregar libro del inventario» en la ficha del cliente o en la ficha nueva.'],
      whenNotToUse: ['Para agregar ejemplares nuevos al inventario (HU-PAN-INV-04).'],
      usedIn: ['Ficha de cliente', 'Crear cliente'],
    },
    docs: {
      description: {
        component:
          'Agregar libro (HU-PAN-CLI-04): «Ejemplares en físico» con buscador (por título o número), los seleccionados con su precio acordado (el público se ve tachado si cambia), su fecha de venta y Quitar, y los que quedan «Para seleccionar». Escritorio: Ventana de detalle centrada; móvil: hoja inferior (el lienzo de escritorio lo dibuja como panel bajo el buscador; manda la biblioteca).',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const dialogOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[role="dialog"]')!;
const byLabel = (root: Element, label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.getAttribute('aria-label') === label);

export const Explorar: Story = {};

/** CA-1: «psico» deja ver los tres ejemplares de Psiconutrición con su número y precio. */
export const BuscarConResultados: Story = {
  name: 'Buscar con resultados',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const dialog = dialogOf(frame);
      await userEvent.type(dialog.querySelector('input')!, 'psico');
      await waitFor(() => expect(dialog.querySelectorAll('[aria-label^="Seleccionar"]')).toHaveLength(3));
      for (const n of [4, 6, 7]) expect(byLabel(dialog, `Seleccionar Psiconutrición #${n}`)).toBeDefined();
      expect(dialog.textContent).toContain('$98.000');
    }
  },
};

/** CA-2: elegir el #6 y cambiar el precio de $98.000 a $93.000; el público queda tachado («antes $98.000»). */
export const SeleccionadoEditandoPrecio: Story = {
  name: 'Seleccionado y editando precio',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const dialog = dialogOf(frame);
      await userEvent.click(byLabel(dialog, 'Seleccionar Psiconutrición #6')!);
      await waitFor(() => expect(dialog.textContent).toContain('1 seleccionado'));
      expect(args.onSelect).toHaveBeenCalledWith('Psiconutrición-6');
      const price = [...dialog.querySelectorAll<HTMLLabelElement>('label')].find((l) =>
        l.textContent?.startsWith('Precio acordado'),
      )!.control as HTMLInputElement;
      await userEvent.clear(price);
      await userEvent.type(price, '93000');
      await waitFor(() => expect(dialog.textContent).toContain('antes $98.000'));
      expect(args.onPriceChange).toHaveBeenLastCalledWith('Psiconutrición-6', 93000);
    }
  },
};

/** Sin ejemplares en físico: el Estado vacío lleva a «Agregar al inventario». */
export const SinEjemplares: Story = {
  name: 'Sin ejemplares en físico',
  args: { stock: [] },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement))
      expect(dialogOf(frame).textContent).toContain('No tienes ejemplares en físico');
    // Cada marco abre su ventana modal; se prueba la acción en el último (el que queda encima).
    const last = dialogOf(frames(canvasElement).at(-1)!);
    await userEvent.click(
      [...last.querySelectorAll('button')].find((b) => b.textContent === 'Agregar al inventario')!,
    );
    expect(args.onAddToInventory).toHaveBeenCalled();
  },
};

/** Sin conexión no se agrega: los botones se ven deshabilitados. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const select = byLabel(dialogOf(frame), 'Seleccionar Psiconutrición #4')!;
      expect(select.getAttribute('aria-disabled')).toBe('true');
      await userEvent.click(select, { pointerEventsCheck: 0 });
    }
    expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const Movil: Story = { name: 'Móvil', globals: { platform: 'mobile' } };
