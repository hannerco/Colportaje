import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { Copy, CopyEvent } from '@/domain/copy';
import { buildCopyDetail } from '@/domain/copy-detail';
import { localDate } from '@/domain/time';
import { CopyDetailScreen } from './CopyDetailScreen';

const at = (day: string) => new Date(`${day}T17:00:00.000Z`);
const CUSTOMERS = [{ id: 'c1', name: 'María Camila Henao', avatarEmoji: null }];
const event = (
  id: string,
  type: CopyEvent['type'],
  day: string,
  note: string | null = null,
  data: CopyEvent['data'] = {},
): CopyEvent => ({ id, type, at: at(day), note, data });

type Overrides = Partial<
  Pick<
    Copy,
    'status' | 'customerId' | 'agreedPrice' | 'publicPriceSnapshot' | 'receivedAt' | 'soldAt' | 'number'
  >
>;
const detailOf = (
  title: { name: string; category?: 'cultural' | 'religious' },
  copy: Overrides,
  events: CopyEvent[],
  openIssue: { note: string; createdAt: Date } | null = null,
) =>
  buildCopyDetail({
    copy: {
      id: 'copy-1',
      titleId: 't-1',
      number: 6,
      status: 'in_stock',
      customerId: null,
      agreedPrice: null,
      publicPriceSnapshot: 98000,
      receivedAt: localDate('2026-10-20'),
      soldAt: null,
      deletedAt: null,
      ...copy,
    },
    title: { name: title.name, imageUrl: null, category: title.category ?? 'cultural' },
    customers: CUSTOMERS,
    openIssue,
    events,
  });

/** #6 vendido a $93.000 con público $98.000 (CA-1). */
const SOLD = detailOf(
  { name: 'Psiconutrición' },
  {
    status: 'sold',
    customerId: 'c1',
    agreedPrice: 93000,
    soldAt: at('2026-11-02'),
  },
  [
    event('e3', 'price_changed', '2026-11-02', null, { oldPrice: 98000, newPrice: 93000 }),
    event('e2', 'sold', '2026-11-02', null, { customerId: 'c1', agreedPrice: 93000 }),
    event('e1', 'received', '2026-10-20'),
  ],
);

const IN_STOCK = detailOf(
  { name: 'Bebidas saludables' },
  { number: 9, publicPriceSnapshot: 75000, receivedAt: localDate('2026-10-26') },
  [
    event('e3', 'resolved', '2026-11-04', 'Estaba en la caja de la casa', { resolution: 'found' }),
    event('e2', 'flagged', '2026-11-03', 'No aparece en la maleta'),
    event('e1', 'received', '2026-10-26'),
  ],
);

const RETURNED = detailOf(
  { name: 'El camino a Cristo', category: 'religious' },
  {
    number: 2,
    status: 'returned_to_leader',
    publicPriceSnapshot: 30000,
    receivedAt: localDate('2026-10-12'),
  },
  [event('e2', 'returned_to_leader', '2026-11-03', 'Fin de campaña'), event('e1', 'received', '2026-10-12')],
);

const LOST = detailOf(
  { name: 'El poder de mis palabras' },
  { number: 5, status: 'lost', publicPriceSnapshot: 90000, receivedAt: localDate('2026-10-15') },
  [
    event('e3', 'resolved', '2026-11-04', 'No apareció después de la campaña', { resolution: 'lost' }),
    event('e2', 'flagged', '2026-11-01', 'No aparece en la maleta'),
    event('e1', 'received', '2026-10-15'),
  ],
);

const meta = {
  title: 'Pantallas/Inventario/Ejemplar',
  component: CopyDetailScreen,
  args: {
    detail: SOLD,
    isOnline: true,
    window: { mode: 'page', breadcrumb: { label: 'Inventario', href: '#inventario' }, onClose: fn() },
    today: localDate('2026-11-17'),
    customerHref: (id: string) => `#cliente-${id}`,
    onChangePrice: fn(async () => {}),
    onRestorePrice: fn(async () => {}),
    onChangeReceived: fn(async () => {}),
    onFlag: fn(async () => {}),
    onDelete: fn(async () => {}),
    onUndoResolution: fn(async () => {}),
    onUndoReturn: fn(async () => {}),
    onRetry: fn(),
  },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Inventario · 3 · Ejemplar',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Al abrir un ejemplar desde la lista (/inventario/ejemplares/[id]).'],
      whenNotToUse: ['Para devolver varios libros al líder (Devolver al líder, HU-PAN-INV-05).'],
      usedIn: ['Inventario'],
    },
    docs: {
      description: {
        component:
          'Detalle de un ejemplar (HU-PAN-INV-03) sobre la Plantilla de detalle: identidad con su estado, datos (cliente con enlace a su ficha, precio acordado con el público tachado, diferencia, vendido y recibido, ambos editables según lo que permite el ejemplar) e historial con «Deshacer» en el último cambio. Más acciones: Marcar con novedad (nota obligatoria) y Eliminar (con nota; Aviso con «Deshacer»); un vendido no se elimina. Deshacer una devolución al líder pide una nota (BR-COPY-16).',
      },
    },
  },
} satisfies Meta<typeof CopyDetailScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const button = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
  );
/** El botón «Deshacer» de la primera entrada (su nombre lleva, oculto, lo que se deshace). */
const undoButton = (root: Element) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.startsWith('Deshacer'));
const lastDialog = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[role="alertdialog"]')].at(-1)!;
const doc = (root: HTMLElement) => root.ownerDocument;

export const Explorar: Story = {};

/** CA-1: «Precio acordado $93.000», «$98.000» tachado y «Diferencia −$5.000 · descuento». */
export const Vendido: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('$93.000');
      expect(frame.querySelector('s')!.textContent).toContain('$98.000');
      expect(frame.textContent).toContain('−$5.000');
      expect(frame.textContent).toContain('descuento');
      expect(frame.textContent).toContain('Vendido a María Camila Henao');
      expect(frame.querySelector<HTMLAnchorElement>('a[href="#cliente-c1"]')).not.toBeNull();
    }
  },
};

export const EnFisico: Story = {
  name: 'En físico',
  args: { detail: IN_STOCK },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('$75.000');
      expect(frame.textContent).toContain('Apareció');
      expect(frame.textContent).toContain('Estaba en la caja de la casa');
    }
  },
};

/** CA-4: un vendido no se elimina: Más acciones solo ofrece lo permitido. */
export const AccionesDeUnVendido: Story = {
  name: 'Vendido: sin Eliminar',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    expect(button(frames(canvasElement)[0]!, 'Más acciones')).toBeUndefined();
  },
};

export const AccionesAbiertas: Story = {
  name: 'Acciones abiertas',
  args: { detail: IN_STOCK },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    await userEvent.click(button(frames(canvasElement)[0]!, 'Más acciones')!);
    await waitFor(() => expect(doc(canvasElement).body.textContent).toContain('Marcar con novedad'));
    expect(doc(canvasElement).body.textContent).toContain('Eliminar');
  },
};

export const MarcarConNovedad: Story = {
  name: 'Marcar con novedad',
  args: { detail: IN_STOCK },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(button(frames(canvasElement)[0]!, 'Más acciones')!);
    const item = await waitFor(() => {
      const found = [...doc(canvasElement).querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) =>
        i.textContent?.includes('Marcar con novedad'),
      );
      expect(found).toBeDefined();
      return found!;
    });
    await userEvent.click(item);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    // La nota es obligatoria: sin ella no se confirma.
    await userEvent.click(button(dialog, 'Marcar con novedad')!);
    expect(args.onFlag).not.toHaveBeenCalled();
    await userEvent.type(dialog.querySelector('textarea')!, 'El líder contó 4 y tengo 3');
    await userEvent.click(button(dialog, 'Marcar con novedad')!);
    await waitFor(() => expect(args.onFlag).toHaveBeenCalledWith('El líder contó 4 y tengo 3'));
  },
};

/** CA-2: eliminar con nota. */
export const EliminarConNota: Story = {
  name: 'Eliminar con nota',
  args: { detail: IN_STOCK },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(button(frames(canvasElement)[0]!, 'Más acciones')!);
    const item = await waitFor(() => {
      const found = [...doc(canvasElement).querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) =>
        i.textContent?.includes('Eliminar'),
      );
      expect(found).toBeDefined();
      return found!;
    });
    await userEvent.click(item);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('Eliminar Bebidas saludables #9');
    await userEvent.type(dialog.querySelector('textarea')!, 'Lo registré dos veces');
    await userEvent.click(button(dialog, 'Eliminar')!);
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledWith('Lo registré dos veces'));
  },
};

export const DevueltoAlLider: Story = {
  name: 'Devuelto al líder con Deshacer',
  args: { detail: RETURNED },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Devuelto al líder');
      expect(frame.textContent).toContain('Fin de campaña');
      expect(undoButton(frame)).toBeDefined();
    }
  },
};

/** CA-3: deshacer una devolución pide una nota y no se confirma sin ella. */
export const DeshacerDevueltoConNota: Story = {
  name: 'Deshacer devuelto: nota obligatoria',
  args: { detail: RETURNED },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(undoButton(frames(canvasElement)[0]!)!);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    expect(dialog.textContent).toContain('Deshacer devolución · El camino a Cristo #2');
    expect(dialog.textContent).toContain('Nota (obligatoria)');
    await userEvent.click(button(dialog, 'Deshacer devolución')!);
    expect(args.onUndoReturn).not.toHaveBeenCalled();
    await userEvent.type(dialog.querySelector('textarea')!, 'El líder no lo recibió');
    await userEvent.click(button(dialog, 'Deshacer devolución')!);
    await waitFor(() => expect(args.onUndoReturn).toHaveBeenCalledWith('El líder no lo recibió'));
  },
};

export const PerdidoConDeshacer: Story = {
  name: 'Perdido con Deshacer',
  args: { detail: LOST },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    expect(frame.textContent).toContain('Perdido (lo asumo yo)');
    await userEvent.click(undoButton(frame)!);
    expect(args.onUndoResolution).toHaveBeenCalled();
  },
};

export const CambiarPrecio: Story = {
  name: 'Cambiar el precio acordado',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(button(frames(canvasElement)[0]!, 'Editar Precio acordado, $93.000')!);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    const input = dialog.querySelector<HTMLInputElement>('input')!;
    await userEvent.clear(input);
    await userEvent.type(input, '90000');
    await userEvent.click(button(dialog, 'Guardar fecha')!);
    await waitFor(() => expect(args.onChangePrice).toHaveBeenCalledWith(90000));
  },
};

export const RestaurarPrecio: Story = {
  name: 'Restaurar el precio de inventario',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(button(frames(canvasElement)[0]!, 'Editar Precio acordado, $93.000')!);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    await userEvent.click(button(dialog, 'Restaurar precio de inventario $98.000')!);
    await waitFor(() => expect(args.onRestorePrice).toHaveBeenCalled());
  },
};

export const CambiarFechaDeRecibido: Story = {
  name: 'Cambiar la fecha de recibido',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(button(frames(canvasElement)[0]!, 'Editar Recibido el, 20/10/2026')!);
    const dialog = await waitFor(() => lastDialog(canvasElement));
    // La fecha de recibido se elige en la misma ventana de calendario de toda la app.
    const day = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      (b.getAttribute('aria-label') ?? '').startsWith('19 de octubre de 2026'),
    );
    await userEvent.click(day!);
    await userEvent.click(button(dialog, 'Guardar fecha')!);
    await waitFor(() => expect(args.onChangeReceived).toHaveBeenCalledWith('2026-10-19'));
  },
};

export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { detail: IN_STOCK, isOnline: false },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      // Sin conexión, la fecha no se edita y el menú de acciones las deshabilita.
      expect(button(frame, 'Editar Recibido el, 26/10/2026')).toBeUndefined();
      expect(undoButton(frame)).toBeUndefined();
    }
  },
};

export const Cargando: Story = {
  args: { detail: undefined, loading: true, fallbackTitle: 'Psiconutrición #6' },
};

export const ConError: Story = { name: 'Con error', args: { detail: undefined, error: true } };

export const Lateral: Story = {
  args: { window: { mode: 'side', breadcrumb: { label: 'Inventario', href: '#inventario' }, onClose: fn() } },
  globals: { platform: 'desktop' },
};

export const Centrada: Story = {
  args: {
    window: { mode: 'center', breadcrumb: { label: 'Inventario', href: '#inventario' }, onClose: fn() },
  },
  globals: { platform: 'desktop' },
};

export const Pagina: Story = { globals: { platform: 'desktop' } };

export const Movil: Story = { name: 'Móvil', globals: { platform: 'mobile' } };

export const Matriz: Story = { parameters: { frames: 'matrix' } };
