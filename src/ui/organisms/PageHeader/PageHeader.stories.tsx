import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { Button } from '../../atoms/Button';
import { Menu } from '../../molecules/Menu';
import { PageHeader } from './PageHeader';

const moreActions = (
  <Menu
    trigger={
      <Button variant="tertiary" iconOnly icon="more">
        Más acciones
      </Button>
    }
    items={[
      { id: 'archive', label: 'Archivar', icon: 'locked' },
      { id: 'page', label: 'Abrir como página', icon: 'next' },
    ]}
    title="Más acciones"
    onSelect={() => {}}
  />
);

const meta = {
  title: 'Organismos/Encabezado',
  component: PageHeader,
  args: {
    kind: 'root',
    title: 'Clientes',
    count: 48,
    primaryAction: { label: 'Nuevo cliente', icon: 'new-customer', onClick: fn() },
  },
  argTypes: { kind: { control: 'inline-radio', options: ['root', 'detail'] } },
  parameters: {
    // Los marcos dibujan el encabezado varias veces en la misma página (tema × plataforma); en la app hay uno solo.
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-banner', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Lib-Encabezado',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En toda pantalla raíz (Clientes, Inventario, Dinero) y en todo detalle.'],
      whenNotToUse: ['Dentro de una isla (la isla tiene su propio título).'],
      usedIn: ['Clientes', 'Inventario', 'Dinero', 'Detalle de un cliente', 'Detalle de un ejemplar'],
    },
    docs: {
      description: {
        component:
          'Parte superior de una pantalla. Raíz: título grande (el único `<h1>`) con conteo en gris y la acción principal a la derecha, solo en escritorio (en móvil va en el botón flotante); en Dinero, el botón de resumen la reemplaza. Detalle: «Volver a …», título (centrado en móvil) y más acciones.',
      },
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const headerOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('header')!;

export const Explorar: Story = {};

// ─── Escritorio ───

/** R1 y CA-1: «Clientes 48» en el `<h1>`; «Nuevo cliente» a la derecha en escritorio y ausente en móvil. */
export const Raiz: Story = {
  name: 'Raíz',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const header = headerOf(frame);
      expect(frame.querySelectorAll('h1')).toHaveLength(1);
      expect(header.querySelector('h1')!.textContent).toBe('Clientes 48');
      expect(header.getBoundingClientRect().height).toBe(isMobile(frame) ? 52 : 56);
      expect(getComputedStyle(header.querySelector('h1')!).fontSize).toBe(isMobile(frame) ? '28px' : '32px');
      const action = [...header.querySelectorAll('button')].find((b) => b.textContent === 'Nuevo cliente');
      if (isMobile(frame)) expect(action).toBeUndefined();
      else expect(action!.getBoundingClientRect().right).toBe(header.getBoundingClientRect().right);
    }
  },
};

/** CA-2 y R2: «Por entregar $385.000»; al pulsarlo se llama `onOpen`; no hay acción principal. */
export const RaizConResumen: Story = {
  name: 'Raíz con resumen',
  args: {
    title: 'Dinero',
    count: undefined,
    summary: { label: 'Por entregar', amount: 385000, onOpen: fn() },
  },
  play: async ({ canvasElement, args }) => {
    const onOpen = (args as unknown as { summary: { onOpen: ReturnType<typeof fn> } }).summary.onOpen;
    onOpen.mockClear();
    for (const frame of frames(canvasElement)) {
      const buttons = headerOf(frame).querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      const summary = buttons[0]!;
      expect(summary.textContent).toBe('Por entregar$385.000');
      expect(summary.getBoundingClientRect().height).toBe(isMobile(frame) ? 40 : 36);
      expect(summary.querySelector<SVGElement>('svg')!.dataset.icon).toBe('expand');
      await userEvent.click(summary);
    }
    expect(onOpen).toHaveBeenCalledTimes(frames(canvasElement).length);
  },
};

/** R3 y CA-3: volver con texto en escritorio y solo ícono en móvil, siempre «Volver a Clientes». */
export const Detalle: Story = {
  args: {
    kind: 'detail',
    title: 'María Camila Henao',
    back: { label: 'Clientes', href: '#clientes' },
    moreActions,
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const header = headerOf(frame);
      const back = header.querySelector<HTMLAnchorElement>('a[href="#clientes"]')!;
      expect(back.getAttribute('aria-label')).toBe('Volver a Clientes');
      expect(back.textContent).toBe(isMobile(frame) ? '' : 'Clientes');
      expect(header.querySelector('h1')!.textContent).toBe('María Camila Henao');
      expect(header.querySelector('[aria-label="Más acciones"]')).not.toBeNull();
    }
  },
};

// ─── Móvil ───

export const RaizMovil: Story = { name: 'Raíz · móvil' };

export const RaizConResumenMovil: Story = {
  name: 'Raíz con resumen · móvil',
  args: {
    title: 'Dinero',
    count: undefined,
    summary: { label: 'Por entregar', amount: 385000, onOpen: fn() },
  },
};

/** CA-3: el botón volver se llama «Volver a Inventario»; en móvil el título queda centrado. */
export const DetalleMovil: Story = {
  name: 'Detalle · móvil',
  args: {
    kind: 'detail',
    title: 'Psiconutrición #6',
    back: { label: 'Inventario', onClick: fn() },
    moreActions,
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const header = headerOf(frame);
      const back = header.querySelector<HTMLButtonElement>('[aria-label="Volver a Inventario"]')!;
      expect(back).not.toBeNull();
      if (!isMobile(frame)) continue;
      const title = header.querySelector('h1')!;
      const range = document.createRange();
      range.selectNodeContents(title);
      const text = range.getBoundingClientRect();
      const box = header.getBoundingClientRect();
      expect(Math.abs(text.left + text.width / 2 - (box.left + box.width / 2))).toBeLessThan(1);
    }
  },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. Un `<h1>` por marco no aplica aquí: son tres pantallas. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <PageHeader
        kind="root"
        title="Clientes"
        count={48}
        primaryAction={{ label: 'Nuevo cliente', icon: 'new-customer', onClick: () => {} }}
      />
      <PageHeader
        kind="root"
        title="Dinero"
        summary={{ label: 'Por entregar', amount: 385000, onOpen: () => {} }}
      />
      <PageHeader
        kind="detail"
        title="Psiconutrición #6"
        back={{ label: 'Inventario', href: '#inventario' }}
        moreActions={moreActions}
      />
    </div>
  ),
};
