import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { returnSelectionSummary, type ReturnCandidates } from '@/domain/return-to-leader';
import { localDate } from '@/domain/time';
import { Banner } from '@/ui/molecules/Banner';
import { ToastProvider, useToast } from '@/ui/molecules/Toast';
import { ReturnToLeaderScreen, type ReturnToLeaderScreenProps } from './ReturnToLeaderScreen';

const book = (
  copyId: string,
  titleName: string,
  number: number,
  category: 'cultural' | 'religious',
  receivedAt: string,
) => ({ copyId, titleId: `t-${titleName}`, titleName, number, category, receivedAt: localDate(receivedAt) });

/** Los ejemplares del lienzo. */
const CANDIDATES: ReturnCandidates = {
  books: [
    book('c1', 'Un corazón tranquilo', 4, 'cultural', '2026-10-18'),
    book('c2', 'El camino a Cristo', 3, 'religious', '2026-10-20'),
    book('c3', 'Había una vez un zoológico', 2, 'cultural', '2026-10-21'),
    book('c4', 'La gran esperanza', 12, 'religious', '2026-10-22'),
    book('c5', 'Psiconutrición', 4, 'cultural', '2026-10-24'),
    book('c6', 'Psiconutrición', 5, 'cultural', '2026-10-24'),
  ],
  minibooks: [
    { titleId: 'm1', name: 'Esperanza para hoy', inStockCount: 12 },
    { titleId: 'm2', name: 'Paz para el corazón', inStockCount: 24 },
  ],
};

type DemoProps = Partial<
  Pick<ReturnToLeaderScreenProps, 'isOnline' | 'loading' | 'error' | 'banner' | 'onConfirm' | 'onCancel'>
> & {
  candidates?: ReturnCandidates;
  initialSelected?: string[];
  initialQuantities?: Record<string, number>;
  initialNote?: string;
  initialSummary?: boolean;
};

/** La pantalla con su selección local, como el contenedor. */
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
  error = false,
  banner,
  candidates = CANDIDATES,
  initialSelected = [],
  initialQuantities = {},
  initialNote = '',
  initialSummary = false,
  onConfirm = async () => {},
  onCancel = () => {},
}: DemoProps) {
  const toast = useToast();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(initialSelected));
  const [quantities, setQuantities] = useState(initialQuantities);
  const [note, setNote] = useState(initialNote);
  const [search, setSearch] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(initialSummary);
  const query = search.trim().toLowerCase();
  const shown: ReturnCandidates = {
    books: candidates.books.filter((b) => b.titleName.toLowerCase().includes(query)),
    minibooks: candidates.minibooks.filter((m) => m.name.toLowerCase().includes(query)),
  };
  return (
    <ReturnToLeaderScreen
      candidates={loading || error ? undefined : shown}
      loading={loading}
      error={error}
      onRetry={() => {}}
      search={search}
      onSearchChange={setSearch}
      selectedCopyIds={selected}
      onToggleCopy={(id, on) =>
        setSelected((current) => {
          const next = new Set(current);
          if (on) next.add(id);
          else next.delete(id);
          return next;
        })
      }
      minibookQuantityOf={(id) => quantities[id] ?? 0}
      onMinibookQuantityChange={(id, quantity) =>
        setQuantities((current) => ({ ...current, [id]: quantity }))
      }
      summary={returnSelectionSummary(
        {
          copyIds: [...selected],
          minibookLines: Object.entries(quantities)
            .filter(([, quantity]) => quantity > 0)
            .map(([titleId, quantity]) => ({ titleId, quantity })),
        },
        candidates,
      )}
      note={note}
      onNoteChange={setNote}
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
      onCancel={onCancel}
    />
  );
}

const meta = {
  title: 'Pantallas/Inventario/Devolver al líder',
  component: Demo,
  args: { onCancel: fn() },
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
      ficha: 'Inventario · 5 · Devolver al líder',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['/inventario/devolver: devolver al líder ejemplares en físico, con nota, en un solo lote.'],
      whenNotToUse: ['Para eliminar o marcar un ejemplar con novedad (HU-PAN-INV-03).'],
      usedIn: ['Inventario'],
    },
    docs: {
      description: {
        component:
          'Devolver al líder (HU-PAN-INV-05): los ejemplares en físico con casilla (y los minibooks por cantidad), la nota del historial y el resumen con las cajas por categoría. En escritorio, una sola hoja con «Listo»; en móvil, dos pasos (elegir → nota). «Devolver N» devuelve todo o nada; si falla, la selección sigue y reintentar manda lo mismo.',
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
const box = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLElement>('[role="checkbox"]')].find((b) => {
    const label = b.closest('label')?.textContent ?? '';
    return label.includes(name);
  })!;

const NOTE = 'Fin de campaña, entregados en la oficina';

export const Explorar: Story = {};

export const Eligiendo: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(box(frame, 'Un corazón tranquilo #4')).toBeDefined();
      expect(frame.textContent).toContain('Recibido 18/10/2026');
    }
  },
};

export const MinibooksAbierto: Story = {
  name: 'Minibooks abierto',
  args: { initialQuantities: { m2: 2 } },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Minibooks (por cantidad)')!);
    const input = frame.querySelector<HTMLInputElement>(
      'input[aria-label="Cantidad de Paz para el corazón a devolver"]',
    )!;
    expect(input.value).toBe('2');
    expect(frame.textContent).toContain('de 24');
    // No se puede pedir más de lo que hay.
    await userEvent.clear(input);
    await userEvent.type(input, '99');
    expect(input.value).toBe('24');
  },
};

export const Nota: Story = {
  args: { initialSelected: ['c1', 'c2', 'c4'], initialNote: NOTE },
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Siguiente')!);
    await waitFor(() =>
      expect(frame.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe('Paso 2 de 2'),
    );
    expect(frame.querySelector('textarea')?.value).toBe(NOTE);
    expect(button(frame, 'Listo')).toBeDefined();
    await userEvent.click(button(frame, 'Atrás')!);
    await waitFor(() => expect(box(frame, 'Un corazón tranquilo #4')).toBeDefined());
  },
};

/** CA-1: 2 ejemplares de «Psiconutrición» y 1 minibook → el resumen dice 3 y los lista con la nota. */
export const Resumen: Story = {
  args: {
    initialSelected: ['c5', 'c6'],
    initialQuantities: { m1: 1 },
    initialNote: NOTE,
    initialSummary: true,
  },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('Vas a devolver 3 ejemplares');
    expect(dialog.textContent).toContain('Psiconutrición(2)');
    expect(dialog.textContent).toContain('Esperanza para hoy(1)');
    expect(dialog.textContent).toContain('Total(3)');
    expect(dialog.textContent).toContain(NOTE);
    expect(button(dialog, 'Devolver 3')).toBeDefined();
    const cultural = button(dialog, /Culturales/)!;
    await userEvent.click(cultural);
    expect(cultural.getAttribute('aria-pressed')).toBe('true');
  },
};

export const ResumenMovil: Story = {
  name: 'Resumen · móvil',
  args: {
    initialSelected: ['c5', 'c6'],
    initialQuantities: { m1: 1 },
    initialNote: NOTE,
    initialSummary: true,
  },
  globals: { platform: 'mobile' },
};

/** CA-3: sin ejemplares elegidos, «Listo» (escritorio) y «Siguiente» (móvil) están deshabilitados. */
export const SinSeleccion: Story = {
  name: 'Sin selección',
  play: async ({ canvasElement, globals }) => {
    const frame = frames(canvasElement)[0]!;
    const next = button(frame, globals.platform === 'mobile' ? 'Siguiente' : 'Listo')!;
    expect(next).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(box(frame, 'Un corazón tranquilo #4'));
    await waitFor(() => expect(frame.textContent).toContain('1 ejemplar'));
  },
};

export const Elegir: Story = {
  name: 'Elegir y contar',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(box(frame, 'Un corazón tranquilo #4'));
    await userEvent.click(box(frame, 'La gran esperanza #12'));
    expect(frame.textContent).toContain('2 ejemplares seleccionados');
    // Con nota y selección, «Listo» queda habilitado.
    expect(button(frame, 'Listo')).toHaveAttribute('aria-disabled', 'true');
    await userEvent.type(frame.querySelector('textarea')!, NOTE);
    await waitFor(() => expect(button(frame, 'Listo')).not.toHaveAttribute('aria-disabled', 'true'));
  },
};

export const BuscarLibro: Story = {
  name: 'Buscar un libro',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.type(frame.querySelector('input[type="search"]')!, 'psico');
    await waitFor(() => expect(box(frame, 'Un corazón tranquilo #4')).toBeUndefined());
    expect(box(frame, 'Psiconutrición #4')).toBeDefined();
  },
};

export const Devolviendo: Story = {
  args: {
    initialSelected: ['c5'],
    initialNote: NOTE,
    initialSummary: true,
    onConfirm: () => new Promise<void>(() => {}),
  },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    await userEvent.click(button(dialog, 'Devolver 1')!);
    await waitFor(() => expect(dialog.querySelector('[aria-busy="true"]')).not.toBeNull());
  },
};

/** Si el envío falla, la selección sigue en pantalla con «Reintentar». */
export const ErrorAlConfirmar: Story = {
  name: 'Error al devolver',
  args: {
    initialSelected: ['c5'],
    initialNote: NOTE,
    initialSummary: true,
    onConfirm: async () => {
      throw new Error('network');
    },
  },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    await userEvent.click(button(dialog, 'Devolver 1')!);
    await waitFor(() => expect(canvasElement.ownerDocument.body.textContent).toContain('Reintentar'));
    expect(lastDialog(canvasElement).textContent).toContain('Vas a devolver 1 ejemplar');
  },
};

export const SinConexion: Story = {
  name: 'Sin conexión',
  args: {
    isOnline: false,
    initialSelected: ['c5'],
    initialNote: NOTE,
    banner: <Banner tone="offline" />,
  },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    expect(button(frame, 'Listo')).toHaveAttribute('aria-disabled', 'true');
  },
};

export const Vacio: Story = {
  name: 'Sin libros en físico',
  args: { candidates: { books: [], minibooks: [] } },
};
export const Cargando: Story = { args: { loading: true } };
export const ConError: Story = { name: 'Con error', args: { error: true } };

export const Matriz: Story = { parameters: { frames: 'matrix' } };
