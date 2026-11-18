import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { Banner } from './Banner';

const meta = {
  title: 'Moléculas/Franja',
  component: Banner,
  args: { tone: 'offline' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['offline', 'overdue', 'collected', 'delivered', 'neutral'] },
    children: { control: 'text' },
  },
  parameters: {
    design: {
      ficha: 'Lib-Franja',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'En el encabezado de un abono o ejemplar, para resumir su situación.',
        'Arriba de la pantalla cuando no hay conexión.',
      ],
      whenNotToUse: ['Para confirmar una acción (Aviso).', 'Para el estado en sí (la Pastilla ya lo dice).'],
      usedIn: ['Detalle de un abono', 'Detalle de un ejemplar', 'Todas las pantallas (sin conexión)'],
    },
    docs: {
      description: {
        component:
          'Aviso fijo dentro de una pantalla o isla. Sin texto, `offline` dice «Sin conexión: puedes consultar, pero no registrar» (BR-GEN-08). No se apilan dos franjas: la de sin conexión va arriba de la pantalla y la otra dentro de su isla. El texto «hace 3 días» lo calcula la pantalla.',
      },
    },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
const bannerOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-tone]')!;

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-1: sin texto dice el de BR-GEN-08, con el ícono `offline` y `role="status"`; alto 40/44 y ancho completo. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const banner = bannerOf(frame);
      expect(banner.textContent).toBe('Sin conexión: puedes consultar, pero no registrar');
      expect(banner.querySelector<SVGElement>('svg')!.dataset.icon).toBe('offline');
      expect(banner.getAttribute('role')).toBe('status');
      // En un celular angosto el texto de sin conexión no cabe en una línea: la franja crece en vez de cortarlo.
      if (isMobile(frame)) expect(banner.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      else expect(banner.getBoundingClientRect().height).toBe(40);
      const parent = banner.parentElement!;
      const style = getComputedStyle(parent);
      const room = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      expect(banner.getBoundingClientRect().width).toBe(room);
      expect(getComputedStyle(banner).color).toBe(tokenColor(frame, '--color-text-2'));
    }
  },
};

/** CA-2: al pulsar «Cobrar» se llama `onAction`. */
export const Vencido: Story = {
  args: { tone: 'overdue', children: 'Vencido hace 3 días', action: { label: 'Cobrar', onAction: fn() } },
  play: async ({ canvasElement, args }) => {
    const onAction = args.action!.onAction as ReturnType<typeof fn>;
    onAction.mockClear();
    for (const frame of frames(canvasElement)) {
      const banner = bannerOf(frame);
      expect(banner.getAttribute('role')).toBe('status');
      expect(banner.getBoundingClientRect().height).toBe(isMobile(frame) ? 44 : 40);
      expect(banner.querySelector<SVGElement>('svg')!.dataset.icon).toBe('alert');
      expect(getComputedStyle(banner).color).toBe(tokenColor(frame, '--color-bad'));
      const button = banner.querySelector('button')!;
      expect(button.textContent).toBe('Cobrar');
      expect(getComputedStyle(button).textDecorationLine).toBe('underline');
      await userEvent.click(button);
    }
    expect(onAction).toHaveBeenCalledTimes(frames(canvasElement).length);
  },
};

export const Cobrado: Story = {
  args: { tone: 'collected', children: '05/11/2026 · 3 días tarde' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const banner = bannerOf(frame);
      expect(banner.getAttribute('role')).toBe('note');
      expect(getComputedStyle(banner).color).toBe(tokenColor(frame, '--color-ok'));
    }
  },
};

/** CA-3: fondo `accent-bg` y sin `role="status"`. */
export const Entregado: Story = {
  args: { tone: 'delivered', children: 'A tiempo' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const banner = bannerOf(frame);
      expect(banner.getAttribute('role')).not.toBe('status');
      const probe = document.createElement('span');
      probe.style.backgroundColor = 'var(--color-accent-bg)';
      frame.querySelector('[data-ui-scope]')!.appendChild(probe);
      expect(getComputedStyle(banner).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
      probe.remove();
      expect(banner.querySelector<SVGElement>('svg')!.dataset.icon).toBe('delivered');
    }
  },
};

export const Neutro: Story = {
  args: { tone: 'neutral', children: 'Faltan 10 días' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(bannerOf(frame).querySelector<SVGElement>('svg')!.dataset.icon).toBe('scheduled');
  },
};

// ─── Móvil ───

export const SinConexionMovil: Story = { name: 'Sin conexión · móvil' };

export const VencidoMovil: Story = {
  name: 'Vencido · móvil',
  args: { tone: 'overdue', children: 'Vencido hace 3 días', action: { label: 'Cobrar', onAction: fn() } },
};

export const NeutroMovil: Story = {
  name: 'Neutro · móvil',
  args: { tone: 'neutral', children: 'Recibido hace 10 días' },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <Banner />
      <Banner tone="overdue" action={{ label: 'Cobrar', onAction: () => {} }}>
        Vencido hace 3 días
      </Banner>
      <Banner tone="collected">05/11/2026 · 3 días tarde</Banner>
      <Banner tone="delivered">A tiempo</Banner>
      <Banner tone="neutral">Faltan 10 días</Banner>
    </div>
  ),
};
