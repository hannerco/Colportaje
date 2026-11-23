import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import {
  buildDepositsListView,
  DEFAULT_DEPOSITS_LIST_PARAMS,
  type DepositsListParams,
  type MoneyDeposit,
} from '@/domain/deposits-list';
import { localDate } from '@/domain/time';
import { aMoneySummary } from '@/test-support/fixtures';
import { Banner } from '@/ui/molecules/Banner';
import { usePlatform } from '@/ui/platform';
import { APP_NAV_ITEMS, NAV_HREFS } from '../../../shell/navigation';
import { DepositsListScreen, type DepositsListScreenProps } from './DepositsListScreen';

const deposit = (id: string, patch: Partial<MoneyDeposit>): MoneyDeposit => ({
  id,
  status: 'confirmed',
  title: null,
  depositNumber: null,
  depositDate: localDate('2026-10-25'),
  cashAmount: 0,
  transferAmount: 0,
  hasReceipt: true,
  ...patch,
});

/** Abibonos del lienzo: dos entregados (uno sin título: «Abibono (3)») y un borrador sin número. */
const DEPOSITS: MoneyDeposit[] = [
  deposit('d1', {
    depositNumber: 1,
    depositDate: localDate('2026-10-04'),
    cashAmount: 190000,
    transferAmount: 120000,
  }),
  deposit('d2', {
    title: 'Campaña de octubre',
    depositNumber: 2,
    depositDate: localDate('2026-10-25'),
    cashAmount: 20000,
  }),
  deposit('d3', {
    depositNumber: 3,
    depositDate: localDate('2026-11-02'),
    cashAmount: 300000,
    transferAmount: 120000,
  }),
  deposit('d4', {
    status: 'draft',
    hasReceipt: false,
    depositDate: localDate('2026-11-04'),
    cashAmount: 280000,
    transferAmount: 105000,
  }),
];

type DemoProps = Partial<
  Pick<
    DepositsListScreenProps,
    'isOnline' | 'loading' | 'error' | 'banner' | 'onDeliver' | 'onOpenPayments' | 'onOpenDeposit'
  >
> & { deposits?: MoneyDeposit[]; summary?: DepositsListScreenProps['summary'] };

/** La pantalla con su vista local, como el contenedor (que la guarda en la URL). */
function Demo({ deposits = DEPOSITS, loading = false, error = false, summary, ...props }: DemoProps) {
  const platform = usePlatform();
  const [params, setParams] = useState<DepositsListParams>(DEFAULT_DEPOSITS_LIST_PARAMS);
  const view = loading || error ? undefined : buildDepositsListView(deposits, params);
  return (
    <div style={{ '--template-height': platform === 'mobile' ? '844px' : '900px' } as CSSProperties}>
      <DepositsListScreen
        nav={{
          active: 'money',
          items: APP_NAV_ITEMS,
          hrefs: NAV_HREFS,
          account: { name: 'Juan Pablo Ríos' },
        }}
        isOnline
        summary={summary ?? aMoneySummary()}
        paymentsCount={12}
        onOpenPayments={() => {}}
        onDeliver={() => {}}
        depositHref={(id) => `#abibono-${id}`}
        backHref="#dinero"
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
  title: 'Pantallas/Dinero/Abibonos',
  component: Demo,
  args: { onDeliver: fn(), onOpenPayments: fn() },
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
      ficha: 'Dinero · 3 · Abibonos',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['/dinero/abibonos: ver las entregas al líder, borradores y entregadas.'],
      whenNotToUse: ['Para los abonos de los clientes (HU-PAN-DIN-01).'],
      usedIn: ['Dinero'],
    },
    docs: {
      description: {
        component:
          'Lista de Abibonos (HU-PAN-DIN-03): el mismo encabezado y resumen que Dinero con el segmento en «Abibonos», buscador, orden (fecha, total o nombre), «Total abonado al líder» y la lista con nombre, fecha, total, efectivo, transferencia, Pastilla (Borrador, o Entregado con candado) y recibo. El ⓘ explica «Entrega al líder».',
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

export const Explorar: Story = {};

/** CA-1 y CA-2: el entregado sin título es «Abibono (3)» con candado; el borrador sin número sugiere el siguiente. */
export const ConBorradoresYEntregados: Story = {
  name: 'Con borradores y entregados',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Abibono (3)');
      expect(frame.textContent).toContain('Campaña de octubre');
      expect(frame.textContent).toContain('Abibono (4)');
      expect(frame.querySelector('[data-status="delivered"] svg')).not.toBeNull();
      expect(frame.querySelector('[data-status="draft"]')).not.toBeNull();
      // El total abonado al líder suma solo los entregados (BR-DEP-11).
      expect(frame.textContent).toContain('$750.000');
    }
  },
};

export const InfoAbierto: Story = {
  name: 'ⓘ abierto',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Qué es un Abibono')!);
    await waitFor(() => expect(frame.textContent).toContain('Entrega al líder'));
  },
};

export const OrdenarYBuscar: Story = {
  name: 'Buscar y ordenar',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.type(frame.querySelector('input[type="search"]')!, 'octubre');
    await waitFor(() => expect(frame.textContent).not.toContain('Abibono (3)'));
    expect(frame.textContent).toContain('Campaña de octubre');
  },
};

/** CA-3: sin Abibonos, el estado vacío del lienzo con «Entregar al líder». */
export const Vacio: Story = {
  name: 'Vacío',
  args: { deposits: [] },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    expect(frame.textContent).toContain('Aún no tienes Abibonos');
    const [deliver] = [...frame.querySelectorAll<HTMLElement>('button')].filter((b) =>
      b.textContent?.includes('Entregar al líder'),
    );
    expect(deliver).toBeDefined();
    await userEvent.click(deliver!);
    expect(args.onDeliver).toHaveBeenCalled();
  },
};

export const MovilConHoja: Story = {
  name: 'Móvil con la hoja de resumen',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, /^Por entregar\s*\$385\.000/)!);
    await waitFor(() => expect(canvasElement.ownerDocument.querySelector('[role="dialog"]')).not.toBeNull());
  },
};

export const Cargando: Story = { args: { loading: true } };
export const ConError: Story = { name: 'Con error', args: { error: true } };

export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false, banner: <Banner tone="offline" /> },
  globals: { platform: 'desktop' },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };

/**
 * #29 (corrección del dueño, 2026-11-22): en escritorio, un clic en el nombre de un Abibono no navega a su página: lo
 * abre en la Ventana de detalle de la lista, con la forma recordada (como Clientes).
 */
export const AbrirEnLaVentana: Story = {
  name: 'Abrir en la Ventana',
  globals: { platform: 'desktop' },
  args: { onOpenDeposit: fn() },
  play: async ({ canvasElement, args }) => {
    const onOpen = args.onOpenDeposit as ReturnType<typeof fn>;
    for (const frame of [...canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame')]) {
      onOpen.mockClear();
      await userEvent.click(frame.querySelector<HTMLAnchorElement>('tbody a')!);
      expect(onOpen).toHaveBeenCalledTimes(1);
    }
  },
};
