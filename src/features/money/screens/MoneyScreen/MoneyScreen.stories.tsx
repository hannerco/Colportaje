import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import {
  buildPaymentsListView,
  DEFAULT_PAYMENTS_LIST_PARAMS,
  defaultPaymentsSort,
  type ListPayment,
  type PaymentsListParams,
} from '@/domain/payments-list';
import { localDate } from '@/domain/time';
import { APP_NAV_ITEMS, NAV_HREFS } from '../../../shell/navigation';
import { aMoneySummary } from '@/test-support/fixtures';
import { Banner } from '@/ui/molecules/Banner';
import { usePlatform } from '@/ui/platform';
import { MoneyScreen, type MoneyScreenProps } from './MoneyScreen';

const TODAY = localDate('2026-11-04');
const CUSTOMERS = [
  { id: 'c1', name: 'María Camila Henao', avatarEmoji: '🌷', archived: false },
  { id: 'c2', name: 'Jorge Iván Ospina', avatarEmoji: null, archived: false },
  { id: 'c3', name: 'Luz Marina Arango', avatarEmoji: '🌻', archived: true },
];

const payment = (id: string, customerId: string, patch: Partial<ListPayment>): ListPayment => ({
  id,
  customerId,
  kind: 'scheduled',
  status: 'scheduled',
  originalDueDate: null,
  dueDate: null,
  paidAt: null,
  agreedAmount: 30000,
  paidAmount: null,
  method: null,
  canceledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  depositId: null,
  ...patch,
});

/** Abonos del lienzo: vencidos, por cobrar, cobrados (efectivo y transferencia), entregados y uno cancelado. */
const PAYMENTS: ListPayment[] = [
  payment('p1', 'c1', { dueDate: localDate('2026-10-20'), agreedAmount: 40000 }),
  payment('p2', 'c2', { dueDate: localDate('2026-11-10'), agreedAmount: 30000 }),
  payment('p3', 'c3', { dueDate: localDate('2026-11-18'), agreedAmount: 25000 }),
  payment('p4', 'c1', {
    status: 'collected',
    dueDate: localDate('2026-10-27'),
    paidAt: localDate('2026-10-28'),
    paidAmount: 40000,
    method: 'cash',
  }),
  payment('p5', 'c2', {
    status: 'collected',
    dueDate: localDate('2026-10-30'),
    paidAt: localDate('2026-11-01'),
    paidAmount: 30000,
    method: 'transfer',
  }),
  payment('p6', 'c1', {
    status: 'delivered',
    dueDate: localDate('2026-10-05'),
    paidAt: localDate('2026-10-06'),
    paidAmount: 40000,
    method: 'cash',
  }),
  payment('p7', 'c2', { status: 'canceled', dueDate: localDate('2026-10-12') }),
];

const UNSCHEDULED = [
  { customerId: 'c2', name: 'Jorge Iván Ospina', avatarEmoji: null, unscheduled: 120000 },
  { customerId: 'c1', name: 'María Camila Henao', avatarEmoji: '🌷', unscheduled: 80000 },
];
const SUMMARY = aMoneySummary({ unscheduledTotal: 200000, unscheduledCustomers: 2 });

type DemoProps = Partial<
  Pick<
    MoneyScreenProps,
    | 'isOnline'
    | 'loading'
    | 'error'
    | 'banner'
    | 'onDeliver'
    | 'onOpenDeposits'
    | 'summary'
    | 'onCollectPayment'
    | 'onExtendPayment'
    | 'onOpenPayment'
  >
> & { initial?: Partial<PaymentsListParams>; empty?: boolean };

/** La pantalla con su vista local, como el contenedor (que la guarda en la URL). */
function Demo({ initial = {}, empty = false, loading = false, error = false, ...props }: DemoProps) {
  const platform = usePlatform();
  const [params, setParams] = useState<PaymentsListParams>({
    ...DEFAULT_PAYMENTS_LIST_PARAMS,
    ...initial,
    sort: initial.sort ?? defaultPaymentsSort(initial.view ?? 'all'),
  });
  const view =
    loading || error ? undefined : buildPaymentsListView(empty ? [] : PAYMENTS, CUSTOMERS, params, TODAY);
  return (
    <div style={{ '--template-height': platform === 'mobile' ? '844px' : '900px' } as CSSProperties}>
      <MoneyScreen
        nav={{
          active: 'money',
          items: APP_NAV_ITEMS,
          hrefs: NAV_HREFS,
          account: { name: 'Juan Pablo Ríos' },
        }}
        isOnline
        summary={empty ? aMoneySummary({ toDeliver: { total: 0, cash: 0, transfer: 0 } }) : SUMMARY}
        unscheduled={UNSCHEDULED}
        depositsCount={3}
        onOpenDeposits={() => {}}
        onDeliver={() => {}}
        onCollectPayment={() => {}}
        onExtendPayment={() => {}}
        paymentHref={(id) => `#/abono/${id}`}
        customerHref={(id) => `#/cliente/${id}`}
        backHref="#/dinero"
        {...props}
        params={params}
        onParamsChange={setParams}
        view={view}
        loading={loading}
        error={error}
      />
    </div>
  );
}

const meta = {
  title: 'Pantallas/Dinero/Abonos de clientes',
  component: Demo,
  args: { onDeliver: fn(), onOpenDeposits: fn(), onCollectPayment: fn(), onExtendPayment: fn() },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-banner', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Dinero · 1 · Abonos de clientes',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['/dinero: ver cuánto hay que entregar al líder y los abonos de los clientes por estado.'],
      whenNotToUse: ['Para la lista de Abibonos (HU-PAN-DIN-03).'],
      usedIn: ['Dinero'],
    },
    docs: {
      description: {
        component:
          'Dinero (HU-PAN-DIN-01): el resumen de lo que hay que entregar al líder (en escritorio arriba de la lista; en móvil, en una hoja que abre el botón «Por entregar»), las pestañas Todos, Por cobrar, Por entregar, Entregados y Cancelados con conteos que no cambian con la búsqueda, los filtros Método y «solo vencidos», el orden y, en Por cobrar, lo programado y la lista de clientes sin programar.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const button = (root: Element, name: string | RegExp) =>
  [...root.querySelectorAll<HTMLElement>('button, a')].find((b) => {
    const label = b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '';
    return typeof name === 'string' ? label === name : name.test(label);
  });
const tab = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLElement>('[role="tab"]')].find((b) => b.textContent?.startsWith(name));

export const Explorar: Story = {};

export const Todos: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(tab(frame, 'Todos')?.getAttribute('aria-selected')).toBe('true');
      // Todos = por cobrar + cobrados + entregados; el cancelado no cuenta (CA-3).
      expect(tab(frame, 'Todos')?.textContent).toContain('6');
      expect(tab(frame, 'Cancelados')?.textContent).toContain('1');
      expect(frame.textContent).toContain('$385.000');
    }
  },
};

/** CA-2: Por cobrar con «solo vencidos» deja solo abonos con la Pastilla «Vencido». */
export const SoloVencidos: Story = {
  name: 'Solo vencidos',
  args: { initial: { view: 'to_collect', overdueOnly: true } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Vencido');
      expect(frame.textContent).toContain('hace 15 días');
      expect(frame.textContent).not.toContain('Luz Marina Arango');
    }
  },
};

export const PorCobrar: Story = {
  name: 'Por cobrar',
  args: { initial: { view: 'to_collect' } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Programado');
      expect(frame.textContent).toContain('Sin programar $200.000 · 2 clientes');
      // La más antigua primero.
      expect(frame.textContent!.indexOf('María Camila Henao')).toBeLessThan(
        frame.textContent!.indexOf('Jorge Iván Ospina'),
      );
    }
  },
};

export const SinProgramar: Story = {
  name: 'Sin programar',
  args: { initial: { view: 'to_collect' } },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, /^Sin programar \$200\.000/)!);
    await waitFor(() =>
      expect(frame.querySelector('ul[aria-label="Clientes sin programar"]')).not.toBeNull(),
    );
    expect(frame.textContent).toContain('$120.000');
    await userEvent.click(button(frame, 'Volver a Por cobrar')!);
    await waitFor(() => expect(frame.querySelector('ul[aria-label="Clientes sin programar"]')).toBeNull());
  },
};

/** Por entregar: ⓘ abierto en escritorio. */
export const PorEntregar: Story = {
  name: 'Por entregar',
  args: { initial: { view: 'to_deliver' } },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    // #39: en escritorio el resumen se abre con el mismo botón del celular.
    await userEvent.click(button(frame, /^Por entregar\s*\$385\.000/)!);
    const dialog = await waitFor(() => {
      const found = canvasElement.ownerDocument.querySelector<HTMLElement>('[role="dialog"]');
      expect(found).not.toBeNull();
      return found!;
    });
    expect(dialog.textContent).toContain('Dinero total');
    expect(dialog.textContent).toContain('Transferencia');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Qué es Por entregar' }));
    await waitFor(() => expect(dialog.textContent).toContain('falta entregar al líder'));
  },
};

export const Entregados: Story = { args: { initial: { view: 'delivered' } } };

/** CA-3: los cancelados solo están en su pestaña. */
export const Cancelados: Story = {
  args: { initial: { view: 'canceled' } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) expect(frame.textContent).toContain('Cancelado');
  },
};

/** CA-1: «Entregar al líder» abre Nuevo Abibono. */
export const EntregarAlLider: Story = {
  name: 'Entregar al líder',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, /^Por entregar\s*\$385\.000/)!);
    const dialog = await waitFor(() => {
      const found = canvasElement.ownerDocument.querySelector<HTMLElement>('[role="dialog"]');
      expect(found).not.toBeNull();
      return found!;
    });
    expect(dialog.textContent).toContain('$280.000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Entregar al líder' }));
    expect(args.onDeliver).toHaveBeenCalled();
  },
};

/** CA-4: en móvil, «Por entregar $385.000» sube la hoja con el medidor y las tarjetas. */
export const HojaDeResumenMovil: Story = {
  name: 'Móvil con la hoja de resumen',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, /^Por entregar\s*\$385\.000/)!);
    const dialog = await waitFor(() => {
      const found = canvasElement.ownerDocument.querySelector('[role="dialog"]');
      expect(found).not.toBeNull();
      return found!;
    });
    expect(dialog.textContent).toContain('Dinero total');
    expect(dialog.textContent).toContain('Entregar al líder');
  },
};

/** CA-5: en móvil, las acciones de deslizar están en cada abono por cobrar y llevan al mismo formulario. */
export const DeslizarMovil: Story = {
  name: 'Deslizar (móvil)',
  args: { initial: { view: 'to_collect' } },
  globals: { platform: 'mobile' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Cobrar a María Camila Henao')!);
    expect(args.onCollectPayment).toHaveBeenCalledWith('p1');
    await userEvent.click(button(frame, 'Dar más plazo a María Camila Henao')!);
    expect(args.onExtendPayment).toHaveBeenCalledWith('p1');
  },
};

export const BuscarCliente: Story = {
  name: 'Buscar un cliente',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.type(frame.querySelector('input[type="search"]')!, 'jorge');
    await waitFor(() => expect(frame.textContent).not.toContain('María Camila Henao'));
    // Los conteos de las pestañas no cambian con la búsqueda (I-12).
    expect(tab(frame, 'Todos')?.textContent).toContain('6');
  },
};

export const Cargando: Story = { args: { loading: true } };
export const Vacio: Story = { name: 'Vacío', args: { empty: true } };
export const ConError: Story = { name: 'Con error', args: { error: true } };

export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false, banner: <Banner tone="offline" /> },
  globals: { platform: 'desktop' },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };

/**
 * #29 (corrección del dueño, 2026-11-22): en escritorio, un clic en el cliente de un abono no navega a su página: lo
 * abre en la Ventana de detalle de Dinero, con la forma recordada (como Clientes).
 */
export const AbrirEnLaVentana: Story = {
  name: 'Abrir en la Ventana',
  globals: { platform: 'desktop' },
  args: { onOpenPayment: fn() },
  play: async ({ canvasElement, args }) => {
    const onOpen = args.onOpenPayment as ReturnType<typeof fn>;
    for (const frame of [...canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame')]) {
      onOpen.mockClear();
      await userEvent.click(frame.querySelector<HTMLAnchorElement>('tbody a')!);
      expect(onOpen).toHaveBeenCalledTimes(1);
    }
  },
};
