import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { localDate } from '@/domain/time';
import { aCustomerAccount } from '@/test-support/fixtures';
import { CustomerAccountSummary } from './CustomerAccountSummary';

const meta = {
  title: 'Pantallas/Clientes/Piezas/Cuenta',
  component: CustomerAccountSummary,
  args: { account: aCustomerAccount(), overdueSince: localDate('2026-10-31') },
  parameters: {
    design: {
      ficha: 'Clientes · 2 · Ficha de cliente (bloque Saldo)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En la isla de identidad de la ficha de cliente.'],
      whenNotToUse: ['En listas (ahí va el saldo en la Fila de lista).'],
      usedIn: ['Ficha de cliente'],
    },
    docs: {
      description: {
        component:
          'Pieza del módulo Clientes (la biblioteca aún no tiene una barra de avance): saldo pendiente, la barra «Abonado el N %», abonado y deuda total, saldo a favor y sin programar si los hay, y el aviso del abono vencido más antiguo.',
      },
    },
  },
} satisfies Meta<typeof CustomerAccountSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

export const Explorar: Story = {};

/** El diseño: $320.000 pendiente, abonado el 30 %, $200.000 sin programar y un abono vencido. */
export const ConVencido: Story = {
  name: 'Con vencido',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('$320.000');
      expect(frame.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe(
        'Abonado el 30 % de la deuda',
      );
      expect(frame.textContent).toContain('Sin programar');
      expect(frame.textContent).toContain('Abono vencido desde el 31/10/2026');
    }
  },
};

/** Un prospecto: solo el saldo ($0), sin barra. */
export const Prospecto: Story = {
  args: {
    account: aCustomerAccount({
      balance: 0,
      debt: 0,
      paidTotal: 0,
      paidPct: 0,
      unscheduled: 0,
      isProspect: true,
    }),
    overdueSince: null,
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) expect(frame.querySelector('[role="img"]')).toBeNull();
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
