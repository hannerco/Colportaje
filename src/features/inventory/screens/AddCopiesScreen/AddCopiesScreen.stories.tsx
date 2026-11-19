import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { addCatalogGroups, createAddBatch } from '@/domain/add-batch';
import { localDate } from '@/domain/time';
import type { Title } from '@/domain/title';
import { Banner } from '@/ui/molecules/Banner';
import { ToastProvider, useToast } from '@/ui/molecules/Toast';
import { AddCopiesScreen, type AddCopiesScreenProps } from './AddCopiesScreen';

const title = (id: string, name: string, category: Title['category']): Title => ({
  id,
  name,
  author: null,
  description: null,
  imageUrl: null,
  publicPrice: category === 'minibook' ? null : 75000,
  colportorPrice: 50000,
  category,
  isActive: true,
});

/** El catálogo del lienzo. */
const CATALOG: Title[] = [
  title('t1', 'Bebidas saludables', 'cultural'),
  title('t2', 'Cocina vegetariana', 'cultural'),
  title('t3', 'El poder de mis palabras', 'cultural'),
  title('t4', 'Había una vez un zoológico', 'cultural'),
  title('t5', 'Me casaría de nuevo contigo', 'cultural'),
  title('t6', 'Psiconutrición', 'cultural'),
  title('t7', 'Un corazón tranquilo', 'cultural'),
  title('t8', 'El camino a Cristo', 'religious'),
  title('t9', 'La gran esperanza', 'religious'),
  title('m1', 'Esperanza para hoy', 'minibook'),
  title('m2', 'Paz para el corazón', 'minibook'),
];

const TODAY = localDate('2026-11-04');

type DemoProps = Partial<
  Pick<AddCopiesScreenProps, 'isOnline' | 'loading' | 'banner' | 'onConfirm' | 'onDiscard' | 'onCancel'>
> & { initial?: Record<string, number>; initialSearch?: string; initialSummary?: boolean };

/** La pantalla con su lote local, como el contenedor. */
function Demo(props: DemoProps) {
  return (
    <ToastProvider durationMs={6000}>
      <DemoInner {...props} />
    </ToastProvider>
  );
}

function DemoInner({
  isOnline = true,
  loading = false,
  banner,
  initial = {},
  initialSearch = '',
  initialSummary = false,
  onConfirm = async () => {},
  onDiscard = () => {},
  onCancel = () => {},
}: DemoProps) {
  const toast = useToast();
  const [batch, setBatch] = useState(() =>
    Object.entries(initial).reduce((b, [id, q]) => b.setQuantity(id, q), createAddBatch(CATALOG)),
  );
  const [search, setSearch] = useState(initialSearch);
  const [receivedAt, setReceivedAt] = useState(TODAY);
  const [summaryOpen, setSummaryOpen] = useState(initialSummary);
  return (
    <AddCopiesScreen
      groups={loading ? [] : addCatalogGroups(CATALOG, search)}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      quantityOf={batch.quantityOf}
      onAdd={(id) => setBatch((b) => b.increment(id))}
      onRemove={(id) => setBatch((b) => b.decrement(id))}
      onSetQuantity={(id, q) => setBatch((b) => b.setQuantity(id, q))}
      summary={batch.summary()}
      receivedAt={receivedAt}
      onReceivedAtChange={setReceivedAt}
      today={TODAY}
      isOnline={isOnline}
      banner={banner}
      summaryOpen={summaryOpen}
      onSummaryOpenChange={setSummaryOpen}
      onConfirm={async () => {
        try {
          await onConfirm();
        } catch {
          toast.show({
            message: 'No se pudo conectar. Vuelve a intentarlo.',
            tone: 'error',
            action: { label: 'Reintentar', onAction: () => {} },
          });
          throw new Error('fails');
        }
      }}
      onDiscard={() => {
        onDiscard();
        setBatch((b) => b.clear());
      }}
      onCancel={onCancel}
    />
  );
}

const meta = {
  title: 'Pantallas/Inventario/Agregar',
  component: Demo,
  args: { onDiscard: fn(), onCancel: fn() },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-banner', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Inventario · 4 · Agregar al inventario',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['/inventario/agregar: cargar los libros que entregó el líder.'],
      whenNotToUse: ['Para devolver libros al líder (HU-PAN-INV-05).'],
      usedIn: ['Inventario'],
    },
    docs: {
      description: {
        component:
          'Agregar al inventario (HU-PAN-INV-04): el catálogo por categoría con un botón por título (cada toque suma un ejemplar; en móvil, categorías en pestañas y la cantidad también se escribe), la fecha de recibido (Hoy, Ayer, Anteayer u otra, nunca futura) y el resumen con las cajas por categoría. «Agregar N» crea todo el lote o nada; si falla, el lote sigue y reintentar manda lo mismo. El lote es local hasta confirmar.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const button = (root: Element, name: string | RegExp) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => {
    const label = b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '';
    return typeof name === 'string' ? label === name : name.test(label);
  });
const lastDialog = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[role="alertdialog"]')].at(-1)!;

export const Explorar: Story = {};

export const Catalogo: Story = {
  name: 'Catálogo',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(button(frame, 'Agregar un ejemplar de Psiconutrición')).toBeDefined();
      expect(frame.textContent).toContain('Agregar al inventario');
    }
  },
};

export const ConLoteEnCurso: Story = {
  name: 'Con lote en curso',
  args: { initial: { t1: 1, t7: 2 } },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Agregar 3');
      expect(button(frame, 'Quitar uno de Un corazón tranquilo')).toBeDefined();
      expect(button(frame, /^Agregar un ejemplar de Un corazón tranquilo, 2 en el lote$/)).toBeDefined();
    }
  },
};

/** CA-1: «Psiconutrición» 3 veces y «Bebidas saludables» 2 → el resumen dice 3 + 2 y «Agregar 5». */
export const Resumen: Story = {
  args: { initial: { t6: 3, t1: 2 }, initialSummary: true },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('Vas a agregar 5 ejemplares');
    expect(dialog.textContent).toContain('Psiconutrición(3)');
    expect(dialog.textContent).toContain('Bebidas saludables(2)');
    expect(dialog.textContent).toContain('Total(5)');
    expect(button(dialog, 'Agregar 5')).toBeDefined();
    // Tocar una caja resalta su categoría.
    const cultural = button(dialog, /Culturales/)!;
    await userEvent.click(cultural);
    expect(cultural.getAttribute('aria-pressed')).toBe('true');
  },
};

export const ResumenMovil: Story = {
  name: 'Resumen · móvil',
  args: { initial: { t6: 3, t1: 2 }, initialSummary: true },
  globals: { platform: 'mobile' },
};

export const EscribirCantidad: Story = {
  name: 'Escribir la cantidad (móvil)',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, /^Agregar un ejemplar de Psiconutrición/)!);
    await userEvent.click(button(frame, /^1 de Psiconutrición/)!);
    const input = frame.querySelector<HTMLInputElement>(
      'input[aria-label="Cantidad total de Psiconutrición"]',
    )!;
    await userEvent.clear(input);
    await userEvent.type(input, '24{Enter}');
    await waitFor(() => expect(button(frame, /^24 de Psiconutrición/)).toBeDefined());
    expect(frame.textContent).not.toContain('Agregar 3');
  },
};

export const SumarYRestar: Story = {
  name: 'Sumar, restar y descartar',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, /^Agregar un ejemplar de Psiconutrición/)!);
    await userEvent.click(button(frame, /^Agregar un ejemplar de Psiconutrición/)!);
    expect(frame.textContent).toContain('Agregar 2');
    await userEvent.click(button(frame, 'Quitar uno de Psiconutrición')!);
    expect(frame.textContent).toContain('Agregar 1');
    await userEvent.click(button(frame, 'Descartar')!);
    expect(args.onDiscard).toHaveBeenCalled();
    expect(frame.textContent).not.toContain('Agregar 1');
  },
};

export const BuscarLibro: Story = {
  name: 'Buscar un libro',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.type(frame.querySelector('input[type="search"]')!, 'psico');
    await waitFor(() => expect(button(frame, 'Agregar un ejemplar de Bebidas saludables')).toBeUndefined());
    expect(button(frame, 'Agregar un ejemplar de Psiconutrición')).toBeDefined();
  },
};

/** Fecha de recibido: Ayer; con la fecha pasada el resumen dice «Recibidos ayer, 03/11/2026». */
export const FechaPasada: Story = {
  name: 'Fecha pasada',
  args: { initial: { t6: 1 } },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Fecha de recibido: Hoy')!);
    const item = await waitFor(() => {
      const found = [
        ...canvasElement.ownerDocument.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
      ].find((i) => i.textContent?.includes('Ayer'));
      expect(found).toBeDefined();
      return found!;
    });
    await userEvent.click(item);
    await waitFor(() => expect(button(frame, 'Fecha de recibido: Ayer')).toBeDefined());
    expect(frame.textContent).toContain('recibidos ayer');
  },
};

export const Agregando: Story = {
  args: { initial: { t6: 2 }, initialSummary: true, onConfirm: () => new Promise<void>(() => {}) },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    await userEvent.click(button(dialog, 'Agregar 2')!);
    await waitFor(() => expect(dialog.querySelector('[aria-busy="true"]')).not.toBeNull());
  },
};

/** CA-3: si el envío falla, el lote sigue en pantalla con «Reintentar». */
export const ErrorAlConfirmar: Story = {
  name: 'Error al confirmar',
  args: {
    initial: { t6: 2 },
    initialSummary: true,
    onConfirm: async () => {
      throw new Error('network');
    },
  },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    await userEvent.click(button(dialog, 'Agregar 2')!);
    await waitFor(() => expect(canvasElement.ownerDocument.body.textContent).toContain('Reintentar'));
    expect(lastDialog(canvasElement).textContent).toContain('Vas a agregar 2 ejemplares');
  },
};

export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false, initial: { t6: 2 }, banner: <Banner tone="offline" /> },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    expect(button(frame, 'Agregar 2')).toHaveAttribute('aria-disabled', 'true');
  },
};

export const Cargando: Story = { args: { loading: true } };

export const Matriz: Story = { parameters: { frames: 'matrix' } };
