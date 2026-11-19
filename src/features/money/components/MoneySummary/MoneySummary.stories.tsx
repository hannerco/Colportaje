import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import type { MoneySummary as MoneySummaryData } from '@/domain/money-summary';
import { MoneySummary } from './MoneySummary';

/** Datos del diseño: $385.000 por entregar ($280.000 en efectivo + $105.000 por transferencia), 52/14/34. */
const normal: MoneySummaryData = {
  toDeliver: { total: 385000, cash: 280000, transfer: 105000 },
  delivered: { amount: 1420000, pct: 52 },
  collected: { amount: 385000, pct: 14 },
  toCollect: { amount: 935000, pct: 34 },
  moneyTotal: 2740000,
  deliveredPct: 52,
  scheduledTotal: 935000,
  unscheduledTotal: 0,
  unscheduledCustomers: 0,
  totalDeliveredToLeader: 1420000,
};

const nothingPending: MoneySummaryData = {
  ...normal,
  toDeliver: { total: 0, cash: 0, transfer: 0 },
  delivered: { amount: 1805000, pct: 66 },
  collected: { amount: 0, pct: 0 },
  deliveredPct: 66,
  totalDeliveredToLeader: 1805000,
};

const meta = {
  title: 'Organismos/Resumen de dinero',
  component: MoneySummary,
  args: { summary: normal, onDeliver: fn(), onInfo: fn() },
  argTypes: { summary: { control: 'object' } },
  parameters: {
    design: {
      ficha: 'Lib-ResumenDinero',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Encima de las listas de Dinero (escritorio).', 'En la hoja «Resumen de dinero» (móvil).'],
      whenNotToUse: ['En otros módulos (cada uno arma su propio resumen con Tarjetas de métrica).'],
      usedIn: ['Dinero'],
    },
    docs: {
      description: {
        component:
          'Totalizadores del módulo Dinero, en orden fijo: Por entregar (con efectivo y transferencia), «Entregar al líder», el medidor, las tres tarjetas y el Dinero total. Sin nada por entregar, el botón queda deshabilitado con «No hay dinero por entregar» al lado. Es propio de Dinero (`features/money`), no de la biblioteca.',
      },
    },
  },
} satisfies Meta<typeof MoneySummary>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const deliverOf = (frame: HTMLElement) =>
  [...frame.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === 'Entregar al líder',
  )!;
const cardsOf = (frame: HTMLElement) => [...frame.querySelectorAll<HTMLElement>('[data-shape]')];

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-1 y CA-3: las tres cifras de Por entregar, el botón habilitado y los mismos 52/14/34 en medidor y tarjetas. */
export const Normal: Story = {
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const text = frame.textContent!;
      for (const amount of ['$385.000', '$280.000', '$105.000']) expect(text).toContain(amount);
      const deliver = deliverOf(frame);
      expect(deliver.getAttribute('aria-disabled')).toBeNull();
      await userEvent.click(deliver);
      const gauge = frame.querySelector('[role="img"][aria-label*="entregado"]')!;
      expect(gauge.getAttribute('aria-label')).toBe(
        '52 % entregado; 14 % cobrado sin entregar; 34 % por cobrar',
      );
      const cards = cardsOf(frame);
      expect(cards.map((card) => card.dataset.tone)).toEqual(['delivered', 'collected', 'pending', 'total']);
      const percents = cards.slice(0, 3).map((card) => parseInt(card.textContent!.match(/(\d+) %/)![1]!, 10));
      expect(percents).toEqual([52, 14, 34]);
      expect(percents.reduce((a, b) => a + b, 0)).toBe(100);
      expect(cards[3]!.textContent).toContain('$2.740.000');
    }
    expect(args.onDeliver).toHaveBeenCalledTimes(frames(canvasElement).length);
  },
};

/** CA-2 y R3: con Por entregar = 0, «$0», botón con `aria-disabled` y «No hay dinero por entregar» enlazado. */
export const SinPendiente: Story = {
  name: 'Sin pendiente',
  args: { summary: nothingPending },
  play: async ({ canvasElement, args }) => {
    const onDeliver = args.onDeliver as ReturnType<typeof fn>;
    onDeliver.mockClear();
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('$0');
      const deliver = deliverOf(frame);
      expect(deliver.getAttribute('aria-disabled')).toBe('true');
      const note = frame.querySelector(`#${CSS.escape(deliver.getAttribute('aria-describedby')!)}`)!;
      expect(note.textContent).toBe('No hay dinero por entregar');
      await userEvent.click(deliver);
    }
    expect(onDeliver).not.toHaveBeenCalled();
  },
};

// ─── Móvil ───

/** CA-4: en móvil las tarjetas van en forma leyenda y el botón ocupa todo el ancho. */
export const NormalMovil: Story = {
  name: 'Normal · móvil',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const shapes = cardsOf(frame).map((card) => card.dataset.shape);
      if (!isMobile(frame)) {
        expect(shapes).toEqual(['card', 'card', 'card', 'featured']);
        continue;
      }
      expect(shapes).toEqual(['legend', 'legend', 'legend', 'featured']);
      const deliver = deliverOf(frame);
      expect(deliver.getBoundingClientRect().width).toBe(
        deliver.parentElement!.getBoundingClientRect().width,
      );
      expect(
        frame.querySelector<HTMLElement>('[data-platform-shape]')!.getBoundingClientRect().width,
      ).toBeLessThanOrEqual(358);
    }
  },
};

export const SinPendienteMovil: Story = { name: 'Sin pendiente · móvil', args: { summary: nothingPending } };

/** Claro y oscuro × escritorio y móvil. */
export const Matriz: Story = { parameters: { frames: 'matrix' } };
