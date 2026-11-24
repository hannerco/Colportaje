import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import type { DepositPayment, DepositView } from '@/domain/deposit-draft';
import { localDate } from '@/domain/time';
import { DepositReceiptScreen } from './DepositReceiptScreen';

const payment = (
  id: string,
  customerName: string,
  paidAt: string,
  paidAmount: number,
  method: 'cash' | 'transfer',
): DepositPayment => ({
  paymentId: id,
  customerName,
  paidAt: localDate(paidAt),
  paidAmount,
  method,
});

const RECEIPT = [
  { photoId: 'r1', thumbUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' },
];

/** El Abibono (3) del 25/10: $380.000 esperados y entregados ($260.000 en efectivo y $120.000 por transferencia). */
const DEPOSIT: DepositView = {
  id: 'd1',
  title: null,
  displayTitle: 'Abibono (3)',
  depositNumber: 3,
  depositDate: localDate('2026-10-25'),
  status: 'confirmed',
  cash: 260000,
  transfer: 120000,
  note: 'Entregado en la oficina del líder.',
  payments: [
    payment('p1', 'María Camila Henao', '2026-10-18', 120000, 'transfer'),
    payment('p2', 'Sandra Milena Zapata', '2026-10-20', 90000, 'cash'),
    payment('p3', 'Jhon Fredy Ospina', '2026-10-16', 60000, 'cash'),
    payment('p4', 'Óscar Iván Mejía', '2026-10-12', 80000, 'cash'),
    payment('p5', 'Gloria Inés Patiño', '2026-10-22', 30000, 'cash'),
  ],
  receipts: RECEIPT,
  summary: { total: 380000, expected: 380000, difference: 0 },
  calculated: { cash: 260000, transfer: 120000 },
  blockers: [],
  can: { edit: false, confirm: false, reopen: true, delete: false },
  history: [{ type: 'confirmed', reason: null, at: new Date('2026-10-25T15:00:00Z') }],
};

const meta = {
  title: 'Pantallas/Dinero/Recibo del Abibono',
  component: DepositReceiptScreen,
  args: {
    deposit: DEPOSIT,
    colportor: 'Hanner Conde',
    today: localDate('2026-11-23'),
    backHref: '#abibono',
    onPrint: fn(),
    onShare: fn(),
  },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-unique', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Marca · Recibo del Abibono (Marca-6-Recibo)',
      version: 'v1.0',
      iteration: 1,
      whenToUse: [
        'Desde un Abibono entregado: «Ver recibo» para compartirlo, imprimirlo o guardarlo como PDF.',
      ],
      whenNotToUse: ['En un borrador: aún no hay entrega que respaldar.'],
      usedIn: ['Dinero · Abibono entregado'],
    },
  },
} satisfies Meta<typeof DepositReceiptScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

/** La hoja con el logotipo, los abonos y el cuadre; «Imprimir o guardar PDF» y «Compartir». */
export const Recibo: Story = {
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    const paper = frame.querySelector<HTMLElement>('article')!;
    expect(paper.dataset.theme).toBe('light');
    expect(paper.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(paper.textContent).toContain('Abibono (3)');
    expect(paper.textContent).toContain('$380.000');
    expect(paper.textContent).toContain('Hanner Conde');
    await userEvent.click(
      [...frame.querySelectorAll('button')].find((b) => b.textContent === 'Imprimir o guardar PDF')!,
    );
    expect(args.onPrint).toHaveBeenCalled();
  },
};

/** En tema oscuro la hoja sigue blanca, como el papel. */
export const Oscuro: Story = {
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    const paper = frames(canvasElement)[0]!.querySelector<HTMLElement>('article')!;
    expect(getComputedStyle(paper).backgroundColor).toBe('rgb(255, 255, 255)');
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
