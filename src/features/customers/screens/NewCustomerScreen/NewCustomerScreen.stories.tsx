import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { CustomerDetail } from '@/domain/customer-detail';
import { suggestFirstDueDate } from '@/domain/payment-plan';
import { localDate, type LocalDate } from '@/domain/time';
import { Banner } from '@/ui/molecules/Banner';
import { ToastProvider, useToast } from '@/ui/molecules/Toast';
import type { PaymentPlanValue } from '../../components/PaymentPlanFields';
import { planPreview } from '../../new-customer-form';
import { NewCustomerScreen, type DownPaymentValue } from './NewCustomerScreen';
import type { CustomerInvoice } from '../../use-cases/customer-invoices';

const today = localDate('2026-11-17');
const sold = new Date('2026-11-17T17:00:00.000Z');

/** Natalia del diseño: 2 libros por $180.000. */
const BOOKS: CustomerDetail['books'] = [
  {
    copyId: 'copy-22',
    titleName: 'Un corazón tranquilo',
    number: 22,
    agreedPrice: 95000,
    publicPriceSnapshot: 95000,
    priceDelta: null,
    soldAt: sold,
  },
  {
    copyId: 'copy-9',
    titleName: 'Bebidas saludables',
    number: 9,
    agreedPrice: 85000,
    publicPriceSnapshot: 85000,
    priceDelta: null,
    soldAt: sold,
  },
];

type DemoProps = {
  initialName?: string;
  books?: CustomerDetail['books'];
  initialDown?: Partial<DownPaymentValue>;
  initialPlan?: Partial<PaymentPlanValue>;
  isOnline?: boolean;
  excess?: number | null;
  /** Al guardar: bien, falla (Aviso con Reintentar) o queda guardando. */
  save?: 'ok' | 'fails' | 'pending';
  discardSummary?: {
    books: number;
    payments: number;
    invoices: number;
    photos: number;
    blockedByDeposit: boolean;
  };
  onSave?: () => void;
  onDiscard?: () => void;
  onLeave?: () => void;
  /** HU-PAN-CLI-06: dirección, información y ubicación ya elegidas. */
  initialAddress?: string;
  initialInfo?: string;
  initialLocation?: { lat: number; lng: number } | null;
  onChooseLocation?: () => void;
  initialInvoices?: CustomerInvoice[];
};

/** La pantalla con su estado (como el contenedor) y un Aviso para el error al guardar. */
function Demo(props: DemoProps) {
  return (
    <ToastProvider durationMs={6000}>
      <DemoInner {...props} />
    </ToastProvider>
  );
}

function DemoInner({
  initialName = '',
  books = [],
  initialDown,
  initialPlan,
  isOnline = true,
  excess = null,
  save = 'ok',
  discardSummary,
  onSave = () => {},
  onDiscard = () => {},
  onLeave = () => {},
  initialAddress = '',
  initialInfo = '',
  initialLocation = null,
  onChooseLocation = () => {},
  initialInvoices,
}: DemoProps) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(initialAddress);
  const [info, setInfo] = useState(initialInfo);
  const [location, setLocation] = useState(initialLocation);
  const [down, setDown] = useState<DownPaymentValue>({
    amount: null,
    method: 'transfer',
    paidOn: today,
    ...initialDown,
  });
  const [plan, setPlan] = useState<PaymentPlanValue>({
    frequency: 'biweekly',
    amount: null,
    firstDueDate: null,
    ...initialPlan,
  });
  const [discardOpen, setDiscardOpen] = useState(false);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>(initialInvoices ?? []);
  const [overrides, setOverrides] = useState<Record<number, LocalDate>>({});
  const debt = books.reduce((sum, b) => sum + b.agreedPrice, 0);
  const firstDueDate =
    plan.firstDueDate ?? (plan.amount !== null ? suggestFirstDueDate(plan.frequency, today) : null);
  return (
    <NewCustomerScreen
      name={name}
      onNameChange={setName}
      avatarEmoji={emoji}
      onAvatarChange={setEmoji}
      invoices={invoices}
      onCreateInvoice={() =>
        setInvoices((current) => [
          ...current,
          { invoiceId: `f${current.length + 1}`, number: null, date: today, photos: [] },
        ])
      }
      onInvoiceChange={(invoiceId, patch) =>
        setInvoices((current) => current.map((i) => (i.invoiceId === invoiceId ? { ...i, ...patch } : i)))
      }
      phone={phone}
      onPhoneChange={setPhone}
      address={address}
      onAddressChange={setAddress}
      info={info}
      onInfoChange={setInfo}
      location={location}
      mapsLink={
        location ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}` : null
      }
      tiles={null}
      onChooseLocation={onChooseLocation}
      onRemoveLocation={() => setLocation(null)}
      photos={[]}
      onAddPhoto={() => {}}
      books={books}
      copyHref={(id) => `#ejemplar-${id}`}
      debt={debt}
      downPayment={down}
      onDownPaymentChange={(patch) => setDown((d) => ({ ...d, ...patch }))}
      downPaymentDateError={down.paidOn > today ? 'La fecha no puede ser futura' : undefined}
      plan={{ ...plan, firstDueDate }}
      onPlanChange={(patch) => {
        setPlan((p) => ({ ...p, ...patch }));
        setOverrides({});
      }}
      onPlanDateChange={(index, date) => setOverrides((o) => ({ ...o, [index]: date }))}
      today={today}
      preview={planPreview({
        debt,
        downPayment: down.amount,
        frequency: plan.frequency,
        amount: plan.amount,
        firstDueDate,
        today,
        overrides,
      })}
      excess={excess}
      banner={isOnline ? undefined : <Banner tone="offline" />}
      isOnline={isOnline}
      created={name.trim() !== ''}
      onSave={async () => {
        onSave();
        if (save === 'pending') return new Promise<void>(() => {});
        if (save === 'fails')
          toast.show({
            message: 'No se pudo conectar. Vuelve a intentarlo.',
            tone: 'error',
            action: { label: 'Reintentar', onAction: () => {} },
          });
      }}
      discardOpen={discardOpen}
      onDiscardOpenChange={setDiscardOpen}
      discardSummary={discardSummary}
      onDiscard={async () => onDiscard()}
      backHref="#clientes"
      onLeave={onLeave}
    />
  );
}

const meta = {
  title: 'Pantallas/Clientes/Crear cliente',
  component: Demo,
  args: { onSave: fn(), onDiscard: fn(), onLeave: fn(), onChooseLocation: fn() },
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
      ficha: 'Clientes · 3 · Crear cliente (llena) y 4 · (vacía)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['«Nuevo cliente» (/clientes/nuevo): la ficha viva de un cliente nuevo.'],
      whenNotToUse: ['Para un cliente ya guardado (su ficha, HU-PAN-CLI-02).'],
      usedIn: ['Clientes'],
    },
    docs: {
      description: {
        component:
          'Nuevo cliente, ficha viva (HU-PAN-CLI-03): el cliente existe desde que tiene nombre y cada dato se guarda solo. Nombre, cuenta (saldo, abonado, deuda), información (teléfono), libros vendidos, cuota inicial (valor, fecha y medio) y el plan para el saldo con «Así quedan los abonos». «Guardar cliente» muestra el resumen y lleva a la ficha; «Descartar» (o salir) pregunta con lo que se perderá. Los libros se agregan con HU-PAN-CLI-04. Información y dirección (HU-PAN-CLI-06): dirección en texto, ubicación en el mapa («Elegir en mapa»; con ubicación, el mapa que carga al tocarlo, «Abrir en Maps», «Cambiar» y «Quitar»), información e imágenes.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const button = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === name);
const input = (root: Element, label: string) =>
  [...root.querySelectorAll<HTMLLabelElement>('label')].find((l) => l.textContent?.trim().startsWith(label))
    ?.control as HTMLInputElement | null;

export const Explorar: Story = {};

/** Vacía: los campos vacíos con sus ejemplos; «Guardar cliente» deshabilitado hasta que haya nombre. */
export const Vacia: Story = {
  name: 'Vacía',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain(
        'Las fechas aparecen cuando pones el valor de cada abono y el primero.',
      );
      expect(button(frame, 'Guardar cliente')!.getAttribute('aria-disabled')).toBe('true');
    }
  },
};

export const VaciaMovil: Story = { name: 'Vacía · móvil', globals: { platform: 'mobile' } };

/** Llena: Natalia con 2 libros, cuota inicial de $40.000 y 4 abonos de $35.000. */
export const Llena: Story = {
  args: {
    initialName: 'Natalia Andrea Cárdenas',
    books: BOOKS,
    initialDown: { amount: 40000 },
    initialPlan: { amount: 35000 },
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Plan para el saldo de $140.000');
      expect(frame.textContent).toContain('4 abonos cubren el saldo de $140.000');
    }
  },
};

/** CA-3: deuda $240.000, quincenal y $60.000 → 4 abonos; al cambiar a $80.000, 3. */
export const PlanRecalcula: Story = {
  name: 'Plan se recalcula',
  globals: { platform: 'desktop' },
  args: {
    initialName: 'Natalia Andrea Cárdenas',
    books: [{ ...BOOKS[0]!, agreedPrice: 240000 }],
    initialPlan: { amount: 60000 },
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const list = () => frame.querySelectorAll('section[aria-label="Así quedan los abonos"] li');
      expect(list()).toHaveLength(4);
      const amount = input(frame, 'Valor de cada abono')!;
      await userEvent.clear(amount);
      await userEvent.type(amount, '80000');
      await waitFor(() => expect(list()).toHaveLength(3));
    }
  },
};

/** HU-PAN-CLI-05 CA-1: al crear, cambiar la fecha de un abono en el calendario mueve solo ese («fecha cambiada»). */
export const CorregirFechaDeUnAbono: Story = {
  name: 'Corregir fecha de un abono',
  globals: { platform: 'desktop' },
  args: {
    initialName: 'Natalia Andrea Cárdenas',
    books: BOOKS,
    initialDown: { amount: 40000 },
    initialPlan: { amount: 35000, firstDueDate: localDate('2026-11-30') },
  },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const dates = () =>
      [...frame.querySelectorAll<HTMLButtonElement>('button[aria-label^="Cambiar fecha"]')].map(
        (b) => b.textContent,
      );
    expect(dates()).toEqual(['30/11/2026', '15/12/2026', '30/12/2026', '15/01/2027']);
    await userEvent.click(
      frame.querySelector<HTMLButtonElement>('button[aria-label="Cambiar fecha, 30/11/2026"]')!,
    );
    await waitFor(() => expect(frame.querySelector('[role="alertdialog"]')).not.toBeNull());
    const dialog = frame.querySelector<HTMLElement>('[role="alertdialog"]')!;
    await userEvent.click(dialog.querySelector<HTMLButtonElement>('[data-date="2026-12-05"]')!);
    await userEvent.click(button(dialog, 'Guardar fecha')!);
    await waitFor(() => expect(dates()).toEqual(['05/12/2026', '15/12/2026', '30/12/2026', '15/01/2027']));
    expect(frame.textContent).toContain('fecha cambiada');
  },
};

/** CA-4: un primer abono el 01/11/2026 (hoy 17/11/2026) avisa «Esta fecha ya pasó» y se puede guardar. */
export const ConAbonoDeFechaPasada: Story = {
  name: 'Con abono de fecha pasada',
  args: {
    initialName: 'Natalia Andrea Cárdenas',
    books: BOOKS,
    initialPlan: { amount: 60000, firstDueDate: localDate('2026-11-01') },
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Esta fecha ya pasó');
      expect(button(frame, 'Guardar cliente')!.getAttribute('aria-disabled')).toBeNull();
    }
  },
};

/** BR-PAY-13: lo programado supera el saldo (franja). */
export const ConAlertaDeSobrante: Story = {
  name: 'Con alerta de sobrante',
  args: { initialName: 'Natalia Andrea Cárdenas', books: BOOKS, excess: 20000 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(frame.textContent).toContain('Lo programado supera el saldo en $20.000');
  },
};

/** CA-1: «Guardar cliente» muestra el resumen y, al confirmar, guarda. */
export const Guardar: Story = {
  globals: { platform: 'desktop' },
  args: {
    initialName: 'Natalia Andrea Cárdenas',
    books: BOOKS,
    initialDown: { amount: 40000 },
    initialPlan: { amount: 35000 },
  },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Guardar cliente')!);
    await waitFor(() => expect(frame.querySelector('[role="alertdialog"]')).not.toBeNull());
    const dialog = frame.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('Libros (2)');
    expect(dialog.textContent).toContain('4 de $35.000');
    await userEvent.click(button(dialog, 'Guardar cliente')!);
    expect(args.onSave).toHaveBeenCalled();
  },
};

/** Guardando: el botón del resumen queda cargando mientras se termina de escribir lo pendiente. */
export const Guardando: Story = {
  globals: { platform: 'desktop' },
  args: { initialName: 'Natalia Andrea Cárdenas', books: BOOKS, save: 'pending' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Guardar cliente')!);
    await waitFor(() => expect(frame.querySelector('[role="alertdialog"]')).not.toBeNull());
    const dialog = frame.querySelector<HTMLElement>('[role="alertdialog"]')!;
    await userEvent.click(button(dialog, 'Guardar cliente')!);
    await waitFor(() => expect(dialog.querySelector('[aria-busy="true"]')).not.toBeNull());
  },
};

/** Error al guardar: el Aviso con «Reintentar». */
export const ErrorAlGuardar: Story = {
  name: 'Error al guardar',
  globals: { platform: 'desktop' },
  args: { initialName: 'Natalia Andrea Cárdenas', books: BOOKS, save: 'fails' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Guardar cliente')!);
    await waitFor(() => expect(frame.querySelector('[role="alertdialog"]')).not.toBeNull());
    await userEvent.click(button(frame.querySelector('[role="alertdialog"]')!, 'Guardar cliente')!);
    await waitFor(() => expect(button(frame, 'Reintentar')).toBeDefined());
  },
};

/** CA-2: con 2 libros y 1 abono, Descartar dice «Se quitarán 2 libros y 1 abono»; al confirmar, descarta. */
/** #57 (ronda 35): el cliente aún no existe; «Descartar» pregunta «¿Salir sin guardar?» y no deja nada. */
export const Descartar: Story = {
  globals: { platform: 'desktop' },
  args: { initialName: 'Natalia Andrea Cárdenas', books: BOOKS },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Descartar')!);
    await waitFor(() => expect(frame.querySelector('[role="alertdialog"]')).not.toBeNull());
    const dialog = frame.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('¿Salir sin guardar?');
    expect(dialog.textContent).toContain('Se pierde lo que escribiste');
    await userEvent.click(button(dialog, 'Salir')!);
    expect(args.onDiscard).toHaveBeenCalled();
  },
};

/** Sin nombre todavía no hay cliente: «Descartar» vuelve sin preguntar. */
export const DescartarVacia: Story = {
  name: 'Descartar vacía',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Descartar')!);
    expect(frame.querySelector('[role="alertdialog"]')).toBeNull();
    expect(args.onLeave).toHaveBeenCalled();
  },
};

/** CA-5: sin conexión, «Guardar cliente» deshabilitado con «Necesita conexión». */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { initialName: 'Natalia Andrea Cárdenas', books: BOOKS, isOnline: false },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const save = button(frame, 'Guardar cliente')!;
      expect(save.getAttribute('aria-disabled')).toBe('true');
      const note = frame.querySelector(`#${CSS.escape(save.getAttribute('aria-describedby')!)}`);
      expect(note?.textContent).toBe('Necesita conexión');
    }
  },
};

/** HU-PAN-CLI-06 · Información y dirección sin ubicación: «Elegir en mapa» abre el selector. */
export const InformacionSinUbicacion: Story = {
  name: 'Información y dirección · sin ubicación',
  args: {
    initialName: 'Natalia Andrea Cárdenas',
    initialAddress: 'Cl. 48 #79-25, Laureles, Medellín',
    initialInfo: 'Vive con la mamá; mejor visitarla los sábados en la mañana.',
  },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      expect(input(frame, 'Dirección')!.value).toBe('Cl. 48 #79-25, Laureles, Medellín');
      expect(frame.textContent).toContain('Imágenes');
      expect(frame.querySelector('a[href*="google.com/maps"]')).toBeNull();
      await userEvent.click(button(frame, 'Elegir en mapa')!);
    }
    expect(args.onChooseLocation).toHaveBeenCalledTimes(frames(canvasElement).length);
  },
};

/** CA-3: con ubicación, «Abrir en Maps» lleva las coordenadas (BR-CUS-08); «Quitar» vuelve a «Elegir en mapa». */
export const InformacionConUbicacion: Story = {
  name: 'Información y dirección · con ubicación',
  args: {
    initialName: 'Natalia Andrea Cárdenas',
    initialAddress: 'Cl. 48 #79-25, Laureles, Medellín',
    initialInfo: 'Vive con la mamá; mejor visitarla los sábados en la mañana.',
    initialLocation: { lat: 6.2518, lng: -75.5915 },
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const link = frame.querySelector<HTMLAnchorElement>('a[href*="google.com/maps"]')!;
      expect(link.textContent).toContain('Abrir en Maps');
      expect(link.href).toBe('https://www.google.com/maps/search/?api=1&query=6.2518,-75.5915');
      expect(link.target).toBe('_blank');
      // El mapa carga solo al tocarlo (ADR-0036).
      await userEvent.click(button(frame, 'Ver mapa')!);
      await waitFor(() =>
        expect(
          frame.querySelector('[role="img"][aria-label="Mapa de la ubicación del cliente"]'),
        ).not.toBeNull(),
      );
      await userEvent.click(button(frame, 'Quitar')!);
      expect(button(frame, 'Elegir en mapa')).toBeDefined();
    }
  },
};

export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  args: {
    initialName: 'Natalia Andrea Cárdenas',
    books: BOOKS,
    initialDown: { amount: 40000 },
    initialPlan: { amount: 35000 },
  },
};

/**
 * #32, #33 y #34 (corrección del dueño, 2026-11-22): Nuevo cliente como el lienzo CrearV5: avatar con emoji, islas con
 * su estado (círculo vacío o chulo), isla «Factura» y Medio de pago y Frecuencia como botones segmentados.
 */
export const ComoElDiseno: Story = {
  name: 'Como el diseño (CrearV5)',
  args: {
    initialName: 'Luz Marina Restrepo',
    initialInvoices: [{ invoiceId: 'f1', number: '0458', date: localDate('2026-11-22'), photos: [] }],
  },
  play: async ({ canvasElement }) => {
    for (const frame of [...canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame')]) {
      expect(frame.querySelector('[aria-label="Elegir emoji del cliente"]')).not.toBeNull();
      const island = (title: string) =>
        [...frame.querySelectorAll('section')].find((el) => el.querySelector('h2')?.textContent === title)!;
      expect(island('Factura')).toBeTruthy();
      expect(frame.querySelector('[role="radiogroup"][aria-labelledby]')).not.toBeNull();
      // Factura con foto: su isla está completa; Libros vendidos (vacía) no.
      expect(island('Factura').querySelector('[aria-label="Sección completa"]')).not.toBeNull();
      expect(island('Libros vendidos').querySelector('[aria-label="Falta completar"]')).not.toBeNull();
    }
  },
};
