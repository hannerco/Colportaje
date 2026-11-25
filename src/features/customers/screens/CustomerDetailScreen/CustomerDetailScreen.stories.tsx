import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { localDate } from '@/domain/time';
import { aCustomerAccount, aCustomerDetailView, aPaymentRow } from '@/test-support/fixtures';
import { CustomerDetailScreen } from './CustomerDetailScreen';

const meta = {
  title: 'Pantallas/Clientes/Ficha',
  component: CustomerDetailScreen,
  args: {
    detail: aCustomerDetailView(),
    isOnline: true,
    window: { mode: 'page', breadcrumb: { label: 'Clientes', href: '#clientes' }, onClose: fn() },
    copyHref: (id: string) => `#ejemplar-${id}`,
    onOpenArchive: fn(),
    onArchive: fn(async () => {}),
    onRestore: fn(async () => {}),
    onAddBook: fn(),
    today: localDate('2026-11-17'),
    onCollect: fn(),
    schedule: {
      drafts: [],
      onAdd: fn(),
      onChangeDate: fn(),
      onChangeAmount: fn(),
      onRemove: fn(),
      onReview: fn(),
    },
    onRetry: fn(),
    onChooseLocation: fn(),
    onRemoveLocation: fn(),
    onAddPhoto: fn(),
  },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          // Los marcos repiten la ficha (y sus regiones) en la misma página; en la app hay una sola.
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Clientes · 2 · Ficha de cliente',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Al abrir un cliente desde la lista (ventana o página) o en /clientes/[id].'],
      whenNotToUse: ['Para crear un cliente (ficha viva, HU-PAN-CLI-03).'],
      usedIn: ['Clientes'],
    },
    docs: {
      description: {
        component:
          'Ficha de cliente (HU-PAN-CLI-02) sobre la Plantilla de detalle, en cuatro islas: identidad (avatar, nombre, estado, «Llamar» y «WhatsApp», y la cuenta: saldo pendiente, abonado, deuda total, saldo a favor y sin programar), libros, abonos (con «Cancelados» plegable) y datos. Franjas «Aún no tiene libro» y «Cliente archivado»; lo programado de más lo dice el totalizador de abonos (ronda 38). Más acciones: Archivar (diálogo con los abonos que se cancelarán) o Restaurar. Diferencias con el lienzo (manda la biblioteca): ver la HU.',
      },
    },
  },
} satisfies Meta<typeof CustomerDetailScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const button = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
  );

export const Explorar: Story = {};

/** CA-1: saldo $380.000 y abonado 40 %, con la Pastilla «Pagando». */
export const Pagando: Story = {
  args: {
    detail: aCustomerDetailView({
      account: aCustomerAccount({
        balance: 380000,
        debt: 640000,
        paidTotal: 260000,
        paidPct: 40,
        standing: 'current',
        hasOverdue: false,
      }),
      payments: [aPaymentRow({ paymentId: 'p-3', dueDate: localDate('2026-11-28') })],
    }),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('$380.000');
      expect(frame.querySelector('[role="img"][aria-label^="Abonado el 40"]')).not.toBeNull();
      expect(frame.textContent).toContain('Pagando');
    }
  },
};

/** El diseño: un abono vencido («Vencido hace 17 días») y «Abono vencido desde el 31/10/2026». CA-2: WhatsApp con 57. */
export const Vencido: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Abono vencido desde el 31/10/2026');
      expect(frame.textContent).toContain('Vencido hace 17 días');
      const whatsapp = [...frame.querySelectorAll('a')].find((a) => a.textContent === 'WhatsApp')!;
      expect(whatsapp.getAttribute('href')).toBe('https://wa.me/573015579032');
      const call = [...frame.querySelectorAll('a')].find((a) => a.textContent === 'Llamar')!;
      expect(call.getAttribute('href')).toBe('tel:3015579032');
    }
  },
};

/** Saldado con saldo a favor (BR-CUS-06): saldo $0 y la fila «Saldo a favor». */
export const SaldadoConSaldoAFavor: Story = {
  name: 'Saldado con saldo a favor',
  args: {
    detail: aCustomerDetailView({
      account: aCustomerAccount({
        balance: -20000,
        credit: 20000,
        paidTotal: 480000,
        paidPct: 100,
        unscheduled: 0,
        standing: 'settled',
        hasOverdue: false,
      }),
      payments: [
        aPaymentRow({
          paymentId: 'p-1',
          status: 'collected',
          paidAmount: 480000,
          paidAt: localDate('2026-11-02'),
          method: 'cash',
        }),
      ],
      canceledPayments: [],
    }),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Saldo a favor');
      expect(frame.textContent).toContain('$20.000');
      expect(frame.textContent).toContain('Saldado');
    }
  },
};

/** CA-5 (BR-PAY-14): un prospecto con abonos y sin libros ve la franja «Aún no tiene libro»; no tiene Pastilla. */
export const Prospecto: Story = {
  args: {
    detail: aCustomerDetailView({
      name: 'Andrés Felipe Gómez',
      avatarEmoji: null,
      account: aCustomerAccount({
        balance: 0,
        debt: 0,
        paidTotal: 0,
        paidPct: 0,
        unscheduled: 0,
        standing: null,
        isProspect: true,
        hasOverdue: false,
        notices: { noBook: true, excess: false },
      }),
      books: [],
      payments: [aPaymentRow({ paymentId: 'p-1', dueDate: localDate('2026-11-28') })],
      canceledPayments: [],
      notices: { noBook: true, excess: null },
      invoices: [],
    }),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Aún no tiene libro');
      expect(button(frame, 'Agregar libro del inventario')).toBeDefined();
    }
  },
};

/** Ronda 38: lo programado pasa del saldo; el totalizador lo dice y ofrece «Revisar» (ya no hay franja). */
export const ConAlertaDeSobrante: Story = {
  name: 'Con alerta de sobrante',
  args: {
    detail: aCustomerDetailView({
      account: aCustomerAccount({ balance: 80000, remaining: 80000 }),
      notices: { noBook: false, excess: { amount: 40000 } },
    }),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Programaste de más');
      expect(frame.textContent).not.toContain('Lo programado supera el saldo');
    }
  },
};

/** Archivado: la franja «Cliente archivado» y «Restaurar» como acción principal. */
export const Archivado: Story = {
  args: {
    detail: aCustomerDetailView({ archived: true, payments: aCustomerDetailView().payments.slice(0, 2) }),
  },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Cliente archivado');
      await userEvent.click(button(frame, 'Restaurar')!);
    }
    expect(args.onRestore).toHaveBeenCalled();
  },
};

/** CA-4: Archivar abre el diálogo con los 2 abonos programados que se cancelarán; confirmar archiva. */
export const ArchivarConAbonos: Story = {
  name: 'Archivar con abonos',
  globals: { platform: 'desktop' },
  args: {
    archivePreview: {
      canArchive: true,
      soldCount: 0,
      scheduledToCancel: [
        { paymentId: 'p-2', dueDate: localDate('2026-10-31'), agreedAmount: 60000 },
        { paymentId: 'p-3', dueDate: localDate('2026-11-14'), agreedAmount: 60000 },
      ],
    },
  },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Más acciones')!);
    await waitFor(() => expect(frame.querySelector('[role="menuitem"]')).not.toBeNull());
    await userEvent.click(
      [...frame.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) =>
        i.textContent?.includes('Archivar'),
      )!,
    );
    expect(args.onOpenArchive).toHaveBeenCalled();
    await waitFor(() => expect(frame.querySelector('[role="alertdialog"]')).not.toBeNull());
    const dialog = frame.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('Se cancelarán 2 abonos programados');
    await userEvent.click(button(dialog, 'Archivar')!);
    expect(args.onArchive).toHaveBeenCalled();
  },
};

/** HU-CLI-11 R1: con libros vendidos no se archiva; el diálogo lo explica. */
export const ArchivarConLibros: Story = {
  name: 'Archivar con libros',
  globals: { platform: 'desktop' },
  args: { archivePreview: { canArchive: false, soldCount: 3, scheduledToCancel: [] } },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Más acciones')!);
    await waitFor(() => expect(frame.querySelector('[role="menuitem"]')).not.toBeNull());
    await userEvent.click(
      [...frame.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) =>
        i.textContent?.includes('Archivar'),
      )!,
    );
    await waitFor(() =>
      expect(frame.querySelector('[role="alertdialog"]')?.textContent).toContain('Tiene 3 libros vendidos'),
    );
    expect(args.onArchive).not.toHaveBeenCalled();
  },
};

/** HU-PAN-CLI-04 CA-2: de vuelta en la ficha, el libro con $93.000 y $98.000 tachado; la deuda lo incluye. */
export const ConLibroDePrecioCambiado: Story = {
  name: 'Con libro de precio cambiado',
  args: {
    detail: aCustomerDetailView({
      books: [
        {
          copyId: 'copy-6',
          titleName: 'Psiconutrición',
          number: 6,
          agreedPrice: 93000,
          publicPriceSnapshot: 98000,
          priceDelta: -5000,
          soldAt: new Date('2026-11-17T17:00:00.000Z'),
        },
      ],
      account: aCustomerAccount({
        debt: 93000,
        balance: 93000,
        paidTotal: 0,
        paidPct: 0,
        unscheduled: 93000,
        standing: 'current',
        hasOverdue: false,
      }),
      payments: [],
      canceledPayments: [],
    }),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('$93.000');
      expect(frame.querySelector('s')?.textContent).toBe('antes $98.000');
    }
  },
};

/** HU-PAN-CLI-04 CA-3: a un archivado no se le agregan libros; se explica que primero hay que restaurarlo. */
export const ArchivadoSinAgregarLibro: Story = {
  name: 'Archivado: sin agregar libro',
  args: { detail: aCustomerDetailView({ archived: true }) },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const add = button(frame, 'Agregar libro del inventario')!;
      expect(add.getAttribute('aria-disabled')).toBe('true');
      const note = frame.querySelector(`#${CSS.escape(add.getAttribute('aria-describedby')!)}`);
      expect(note?.textContent).toBe('Restaura el cliente para agregarle libros.');
      await userEvent.click(add, { pointerEventsCheck: 0 });
    }
    expect(args.onAddBook).not.toHaveBeenCalled();
  },
};

/** Ronda 38: tocar la fecha de un abono por cobrar pregunta «¿Por qué cambia?»; «Aplazar» lo anota con su nota. */
export const AplazarUnAbono: Story = {
  name: 'Aplazar un abono',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    // Solo los por cobrar son botón: el vencido del 31/10 y el del 14/11.
    const dates = [...frame.querySelectorAll<HTMLButtonElement>('button[aria-label^="Cambiar la fecha"]')];
    expect(dates.map((b) => b.textContent)).toEqual(['31/10/2026', '14/11/2026']);
    await userEvent.click(dates[1]!);
    const dialogs = () => [...canvasElement.querySelectorAll<HTMLElement>('[role="alertdialog"]')];
    await waitFor(() => expect(dialogs().length).toBeGreaterThan(0));
    const dialog = dialogs().at(-1)!;
    expect(dialog.textContent).toContain('Fecha del abono 4 de 4');
    const radio = [...dialog.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((r) =>
      r.textContent?.includes('El cliente pidió aplazar'),
    )!;
    await userEvent.click(radio);
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2026-11-28"]')!);
    expect(dialog.textContent).toContain('Lo estás aplazando 14 días');
    await userEvent.click(button(dialog, 'Aplazar')!);
    expect(args.schedule!.onChangeDate).toHaveBeenCalledWith('p-3', '2026-11-28', 'reschedule', undefined);
  },
};

/** Sin conexión la fecha, el valor y la basura se ven apagados (no se intenta guardar). */
export const SinConexionSinPlazo: Story = {
  name: 'Sin conexión: sin editar abonos',
  args: { isOnline: false },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      for (const b of frame.querySelectorAll<HTMLButtonElement>('button[aria-label^="Cambiar la fecha"]'))
        expect(b.disabled).toBe(true);
  },
};

/** HU-PAN-CLI-06: con ubicación, el mapa (carga al tocar), «Abrir en Maps» con las coordenadas, «Cambiar» y «Quitar». */
export const ConUbicacion: Story = {
  name: 'Con ubicación',
  args: {
    detail: aCustomerDetailView({
      address: 'Cra. 43 #52-18, Boston, Medellín',
      location: { latitude: 6.2518, longitude: -75.5915, accuracyMeters: 12, isApproximate: false },
      mapsLink: 'https://www.google.com/maps/search/?api=1&query=6.2518,-75.5915',
    }),
  },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const links = [...frame.querySelectorAll<HTMLAnchorElement>('a[href*="google.com/maps"]')];
      // Con ubicación, «Abrir en Maps» va solo debajo del mapa (no repetido en la dirección).
      expect(links).toHaveLength(1);
      expect(links[0]!.href).toBe('https://www.google.com/maps/search/?api=1&query=6.2518,-75.5915');
      await userEvent.click(button(frame, 'Cambiar')!);
      await userEvent.click(button(frame, 'Quitar')!);
    }
    expect(args.onChooseLocation).toHaveBeenCalled();
    expect(args.onRemoveLocation).toHaveBeenCalled();
  },
};

/** HU-PAN-CLI-06: sin ubicación, «Elegir en mapa»; la dirección en texto sigue abriendo Maps (BR-CUS-08). */
export const SinUbicacion: Story = {
  name: 'Sin ubicación',
  args: {
    detail: aCustomerDetailView({
      address: 'Cl. 48 #79-25, Laureles, Medellín',
      location: null,
      mapsLink:
        'https://www.google.com/maps/search/?api=1&query=Cl.%2048%20%2379-25%2C%20Laureles%2C%20Medell%C3%ADn',
    }),
  },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.querySelector('a[href*="google.com/maps"]')).not.toBeNull();
      await userEvent.click(button(frame, 'Elegir en mapa')!);
      expect(button(frame, 'Agregar imagen')).toBeDefined();
    }
    expect(args.onChooseLocation).toHaveBeenCalled();
  },
};

export const Cargando: Story = {
  args: { detail: undefined, loading: true, fallbackTitle: 'María Camila Henao' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(frame.querySelector('[aria-busy="true"]')).not.toBeNull();
  },
};

/** R3: sin conexión, Restaurar (y Archivar en Más acciones) se ven deshabilitados. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false, detail: aCustomerDetailView({ archived: true }) },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const restore = button(frame, 'Restaurar')!;
      expect(restore.getAttribute('aria-disabled')).toBe('true');
      await userEvent.click(restore, { pointerEventsCheck: 0 });
    }
    expect(args.onRestore).not.toHaveBeenCalled();
  },
};

/** Las formas de escritorio: lateral, centrada y página (R1: en la app, la recordada). */
export const Lateral: Story = {
  globals: { platform: 'desktop' },
  args: { window: { ...meta.args.window, mode: 'side' } },
};

/** #66: en una pantalla angosta el estado de un abono nunca queda encima de su valor ni de «Cobrar». */
export const Angosta: Story = {
  globals: { platform: 'desktop' },
  args: { onCollect: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    // Ronda 38: a 420 px ninguna fila de abonos se desborda (fecha, valor, Cobrar y basura caben).
    const rows = [...canvasElement.querySelectorAll<HTMLElement>('ul[aria-label="Abonos programados"] > li')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const box = row.getBoundingClientRect();
      for (const child of row.querySelectorAll<HTMLElement>('button'))
        expect(child.getBoundingClientRect().right).toBeLessThanOrEqual(box.right + 1);
    }
  },
};
export const Centrada: Story = {
  globals: { platform: 'desktop' },
  args: { window: { ...meta.args.window, mode: 'center' } },
};
/** CA-3: como página, la ruta «Clientes / María Camila Henao». */
export const Pagina: Story = {
  name: 'Página',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const crumbs = frame.querySelector('nav[aria-label]')!;
      expect(crumbs.textContent).toContain('Clientes');
      expect(crumbs.textContent).toContain('María Camila Henao');
    }
  },
};
/** Móvil: pantalla completa con Volver a Clientes; «Cancelados» se despliega. */
export const Movil: Story = {
  name: 'Móvil',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const toggle = button(frame, 'Cancelados 1')!;
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      await userEvent.click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(frame.textContent).toContain('Cancelado');
    }
  },
};

/** Las combinaciones en claro y oscuro × escritorio y móvil. */
/** #61: un cliente ya guardado sin factura muestra «Foto de la factura» para agregarla. */
export const AgregarFactura: Story = {
  name: 'Agregar factura',
  args: {
    detail: aCustomerDetailView({ invoices: [] }),
    invoiceActions: { onCreate: fn(), onAddPhoto: fn(), onChange: fn() },
  },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const add = button(frame, 'Foto de la factura');
      expect(add).toBeDefined();
      expect(add).toBeEnabled();
    }
    const input = frames(canvasElement)[0]!.querySelector<HTMLInputElement>(
      'input[type="file"][aria-label="Foto de la factura"]',
    )!;
    await userEvent.upload(input, new File(['x'], 'factura.jpg', { type: 'image/jpeg' }));
    expect(args.invoiceActions?.onCreate).toHaveBeenCalled();
  },
};

/** #61: archivado, la factura solo se ve (no hay botón para agregarla). */
export const ArchivadoSinAgregarFactura: Story = {
  name: 'Archivado sin agregar factura',
  args: {
    detail: aCustomerDetailView({ archived: true, invoices: [] }),
    invoiceActions: { onCreate: fn(), onAddPhoto: fn(), onChange: fn() },
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) expect(button(frame, 'Foto de la factura')).toBeUndefined();
  },
};

/** #69: «Editar» en Datos abre el diálogo con lo que tiene el cliente. */
export const EditarDatos: Story = {
  name: 'Editar datos',
  globals: { platform: 'desktop' },
  args: { onEditData: fn(async () => {}) },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Editar')!);
    await waitFor(() =>
      expect(canvasElement.ownerDocument.querySelector('[role="alertdialog"]')).not.toBeNull(),
    );
    const dialog = canvasElement.ownerDocument.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(dialog.querySelector<HTMLInputElement>('input')!.value).toBe(aCustomerDetailView().name);
  },
};

/** #68: tocar una foto de la factura ofrece «Cambiar foto» y «Quitar foto». */
export const CambiarFotoDeFactura: Story = {
  name: 'Ver y quitar foto de factura',
  globals: { platform: 'desktop' },
  args: {
    detail: aCustomerDetailView({
      invoices: [
        {
          invoiceId: 'f1',
          number: '0042',
          date: localDate('2026-11-20'),
          photos: [{ photoId: 'ph1', thumbUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }],
        },
      ],
    }),
    invoiceActions: {
      onCreate: fn(),
      onAddPhoto: fn(),
      onChange: fn(),
      onReplacePhoto: fn(),
      onRemovePhoto: fn(),
    },
  },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    // #99: tocar la foto la abre en grande; desde el visor se cambia o se quita.
    await userEvent.click(frame.querySelector<HTMLElement>('[aria-label="Ver foto 1"]')!);
    const remove = await waitFor(() => {
      const viewer = frame.querySelector<HTMLElement>('[role="dialog"]');
      expect(viewer).not.toBeNull();
      const actions = [...viewer!.querySelectorAll<HTMLElement>('button')].map((b) => b.textContent?.trim());
      expect(actions).toEqual(expect.arrayContaining(['Cambiar foto', 'Quitar foto']));
      return [...viewer!.querySelectorAll<HTMLElement>('button')].find(
        (b) => b.textContent?.trim() === 'Quitar foto',
      )!;
    });
    await userEvent.click(remove);
    expect(args.invoiceActions?.onRemovePhoto).toHaveBeenCalledWith('ph1');
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
