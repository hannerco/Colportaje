import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { FlaggedCopy, InStockCopiesOfTitle, InStockSummary, InStockTitle } from '@/domain/inventory';
import { localDate } from '@/domain/time';
import { Banner } from '@/ui/molecules/Banner';
import { ToastProvider, useToast } from '@/ui/molecules/Toast';
import { InStockScreen, type FlaggedResolution } from './InStockScreen';

const title = (
  titleId: string,
  name: string,
  referencePrice: number,
  inStockCount: number,
  category: InStockTitle['category'] = 'cultural',
): InStockTitle => ({ titleId, name, imageUrl: null, category, referencePrice, inStockCount });

/** Lo del lienzo, con «Psiconutrición» en 3 (CA-1). */
const TITLES: InStockTitle[] = [
  title('t-bebidas', 'Bebidas saludables', 75000, 4),
  title('t-camino', 'El camino a Cristo', 30000, 2, 'religious'),
  title('t-poder', 'El poder de mis palabras', 90000, 1),
  title('t-zoo', 'Había una vez un zoológico', 65000, 3),
  title('t-esperanza', 'La gran esperanza', 45000, 5, 'religious'),
  title('t-biblia', 'Las bellas historias de la Biblia', 280000, 1, 'religious'),
  title('t-casaria', 'Me casaría de nuevo contigo', 88000, 2),
  title('t-psico', 'Psiconutrición', 98000, 3),
  title('t-corazon', 'Un corazón tranquilo', 85000, 3),
];
const MINIBOOKS: InStockTitle[] = [
  title('m-esperanza', 'Esperanza para hoy', 1500, 12, 'minibook'),
  title('m-paz', 'Paz para el corazón', 1500, 24, 'minibook'),
  title('m-salud', 'Salud en casa', 2000, 30, 'minibook'),
];

const FLAGGED: FlaggedCopy[] = [
  {
    copyId: 'c-psico-4',
    titleName: 'Psiconutrición',
    number: 4,
    note: 'El líder contó 3 y tengo 2',
    flaggedAt: new Date('2026-11-04T15:00:00.000Z'),
  },
  {
    copyId: 'c-esperanza-11',
    titleName: 'La gran esperanza',
    number: 11,
    note: 'No aparece en la maleta',
    flaggedAt: new Date('2026-11-01T15:00:00.000Z'),
  },
];

const COPIES_OF: Record<string, InStockCopiesOfTitle> = {
  't-psico': {
    title: { name: 'Psiconutrición', inStockCount: 3, referencePrice: 98000 },
    copies: [
      { copyId: 'c-psico-4b', number: 4, receivedAt: localDate('2026-10-18') },
      { copyId: 'c-psico-6', number: 6, receivedAt: localDate('2026-10-25') },
      { copyId: 'c-psico-7', number: 7, receivedAt: localDate('2026-11-03') },
    ],
  },
};

type DemoProps = {
  titles?: InStockTitle[];
  minibooks?: InStockTitle[];
  flagged?: FlaggedCopy[];
  loading?: boolean;
  isOnline?: boolean;
  initialTitle?: string | null;
  initialFlaggedOpen?: boolean;
  withReturnToLeader?: boolean;
  onAdd?: () => void;
  onOpenCopies?: () => void;
  onResolve?: (copyId: string, resolution: FlaggedResolution, note: string | null) => void;
};

function Demo(props: DemoProps) {
  return (
    <ToastProvider durationMs={6000}>
      <DemoInner {...props} />
    </ToastProvider>
  );
}

/** La pantalla con el estado del contenedor: resolver saca el ejemplar de la lista y el Aviso lo devuelve. */
function DemoInner({
  titles = TITLES,
  minibooks = MINIBOOKS,
  flagged: initialFlagged = FLAGGED,
  loading = false,
  isOnline = true,
  initialTitle = null,
  initialFlaggedOpen = false,
  withReturnToLeader = false,
  onAdd = () => {},
  onOpenCopies = () => {},
  onResolve = () => {},
}: DemoProps) {
  const toast = useToast();
  const [openTitle, setOpenTitle] = useState(initialTitle);
  const [flaggedOpen, setFlaggedOpen] = useState(initialFlaggedOpen);
  const [flagged, setFlagged] = useState(initialFlagged);
  const summary: InStockSummary | undefined = loading
    ? undefined
    : {
        booksTotal: titles.reduce((sum, t) => sum + t.inStockCount, 0),
        titles,
        minibooks,
        flaggedCount: flagged.length,
      };
  return (
    <InStockScreen
      summary={summary}
      loading={loading}
      isOnline={isOnline}
      banner={isOnline ? undefined : <Banner tone="offline" />}
      copiesCount={46}
      onOpenCopies={onOpenCopies}
      onAdd={onAdd}
      onReturnToLeader={withReturnToLeader ? () => {} : undefined}
      openTitle={openTitle ? { titleId: openTitle, data: COPIES_OF[openTitle] } : null}
      onOpenTitle={setOpenTitle}
      copyHref={(id) => `#ejemplar-${id}`}
      flaggedOpen={flaggedOpen}
      onFlaggedOpenChange={setFlaggedOpen}
      flagged={flagged}
      onResolve={async (item, resolution, note) => {
        onResolve(item.copyId, resolution, note);
        setFlagged((list) => list.filter((f) => f.copyId !== item.copyId));
        const name = `${item.titleName} #${item.number}`;
        const message =
          resolution === 'found'
            ? `${name} está de nuevo en físico`
            : resolution === 'lost'
              ? `${name} quedó como perdido`
              : `${name} se eliminó`;
        toast.show({
          message,
          tone: 'success',
          action: {
            label: 'Deshacer',
            onAction: () => setFlagged((list) => [item, ...list.filter((f) => f.copyId !== item.copyId)]),
          },
        });
      }}
      backHref="#inventario"
    />
  );
}

const meta = {
  title: 'Pantallas/Inventario/Libros en físico',
  component: Demo,
  args: { onAdd: fn(), onOpenCopies: fn(), onResolve: fn() },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          // Los marcos repiten la pantalla (y sus regiones) en la misma página; en la app hay una sola.
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-banner', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Inventario · 1 · Libros en físico, Agregar y Por resolver',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['/inventario: qué hay en la maleta por título y las novedades por resolver.'],
      whenNotToUse: ['Para ver cada ejemplar con su estado (Ejemplares, HU-PAN-INV-02).'],
      usedIn: ['Inventario'],
    },
    docs: {
      description: {
        component:
          'Libros en físico y Por resolver (HU-PAN-INV-01): títulos en físico con el precio de referencia y la cantidad (los minibooks al final), un título abierto con sus ejemplares (tocar uno abre el Ejemplar) y Por resolver con «Apareció», «Perdido (lo asumo yo)» y «Eliminar» (nota opcional) y el Aviso con «Deshacer». En escritorio, Por resolver es una ventana centrada con botones; en móvil, una página con filas que se deslizan (las acciones también se alcanzan con el teclado). «Agregar» lleva a Agregar al inventario (HU-PAN-INV-04).',
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
const lastDialog = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1)!;

export const Explorar: Story = {};

export const ConLibros: Story = {
  name: 'Con libros',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Libros en físico');
      expect(button(frame, /^Psiconutrición.*3 en físico$/)).toBeDefined();
      expect(frame.textContent).toContain('Minibooks');
      expect(button(frame, '2 por resolver')).toBeDefined();
    }
  },
};

/** CA-1: «Psiconutrición» con 3; al abrirlo, #4, #6 y #7, y cada uno lleva a su Ejemplar. */
export const TituloAbierto: Story = {
  name: 'Un título abierto',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    await userEvent.click(button(frames(canvasElement)[0]!, /^Psiconutrición.*3 en físico$/)!);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('3 en físico · $98.000');
    const links = [...dialog.querySelectorAll<HTMLAnchorElement>('a')].filter((a) =>
      a.textContent?.startsWith('#'),
    );
    expect(links.map((a) => a.textContent?.slice(0, 2))).toEqual(['#4', '#6', '#7']);
    expect(links[1]!.getAttribute('href')).toBe('#ejemplar-c-psico-6');
  },
};

export const TituloAbiertoMovil: Story = {
  name: 'Un título abierto · móvil',
  args: { initialTitle: 't-psico' },
  globals: { platform: 'mobile' },
};

export const PorResolver: Story = {
  name: 'Por resolver abierto',
  args: { initialFlaggedOpen: true },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('Por resolver');
    // I-17: de la novedad más nueva a la más antigua.
    const names = [...dialog.querySelectorAll('li')].map((li) => li.textContent);
    expect(names[0]).toContain('Psiconutrición #4');
    expect(names[1]).toContain('La gran esperanza #11');
  },
};

/** CA-2: Apareció saca el ejemplar, el Aviso dice que está de nuevo en físico y «Deshacer» lo devuelve. */
export const AparecioConDeshacer: Story = {
  name: 'Apareció con Deshacer',
  args: { initialFlaggedOpen: true },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    await userEvent.click(button(dialog, 'Apareció: Psiconutrición #4')!);
    expect(args.onResolve).toHaveBeenCalledWith('c-psico-4', 'found', null);
    await waitFor(() => expect(dialog.textContent).not.toContain('Psiconutrición #4'));
    const toast = await waitFor(() => {
      const found = [...canvasElement.ownerDocument.querySelectorAll<HTMLElement>('[role="status"]')].find(
        (el) => el.textContent?.includes('Psiconutrición #4 está de nuevo en físico'),
      );
      expect(found).toBeDefined();
      return found!;
    });
    // El Aviso queda fuera de la ventana: tocarlo la cierra (Radix), pero el ejemplar vuelve a Por resolver.
    await userEvent.click(button(toast, 'Deshacer')!);
    await waitFor(() => expect(button(frames(canvasElement)[0]!, '2 por resolver')).toBeDefined());
  },
};

/** Perdido (lo asumo yo) con nota opcional y el Aviso con «Deshacer». */
export const PerdidoConNota: Story = {
  name: 'Perdido con nota y Deshacer',
  args: { initialFlaggedOpen: true },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const dialog = await waitFor(() => lastDialog(canvasElement));
    await userEvent.click(button(dialog, 'Perdido (lo asumo yo): Psiconutrición #4')!);
    const noteDialog = await waitFor(() => {
      const found = [...canvasElement.querySelectorAll<HTMLElement>('[role="alertdialog"]')].at(-1);
      expect(found?.textContent).toContain('Perdido (lo asumo yo) · Psiconutrición #4');
      return found!;
    });
    await userEvent.type(noteDialog.querySelector('textarea')!, 'Se quedó en el bus');
    await userEvent.click(button(noteDialog, 'Marcar como perdido')!);
    await waitFor(() =>
      expect(args.onResolve).toHaveBeenCalledWith('c-psico-4', 'lost', 'Se quedó en el bus'),
    );
  },
};

export const PorResolverMovil: Story = {
  name: 'Por resolver · móvil',
  args: { initialFlaggedOpen: true },
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    // Sin deslizar: las acciones están en el orden del foco (pieza SwipeRow).
    await waitFor(() => expect(button(frame, 'Apareció: Psiconutrición #4')).toBeDefined());
    expect(button(frame, 'Eliminar: La gran esperanza #11')).toBeDefined();
  },
};

export const Vacio: Story = {
  name: 'Vacío',
  args: { titles: [], minibooks: [], flagged: [] },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(frame.textContent).toContain('Todavía no tienes libros en físico');
  },
};

export const Cargando: Story = { args: { loading: true } };

/** CA-3: sin conexión, Agregar y Resolver deshabilitados; la lista se consulta. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false, initialFlaggedOpen: true },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    expect(button(frame, 'Agregar')).toHaveAttribute('aria-disabled', 'true');
    const dialog = await waitFor(() => lastDialog(canvasElement));
    const found = button(dialog, 'Apareció: Psiconutrición #4')!;
    expect(found).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(found);
    expect(args.onResolve).not.toHaveBeenCalled();
  },
};

export const ConDevolverAlLider: Story = {
  name: 'Con «Devolver al líder»',
  args: { withReturnToLeader: true },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
