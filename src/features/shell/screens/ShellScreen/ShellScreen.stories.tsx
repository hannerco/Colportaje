import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Banner } from '@/ui/molecules/Banner';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { APP_NAV_ITEMS, NAV_HREFS } from '../../navigation';
import { ShellScreen } from './ShellScreen';

const meta = {
  title: 'Pantallas/Armazón',
  component: ShellScreen,
  args: {
    title: 'Clientes',
    nav: {
      active: 'customers',
      items: APP_NAV_ITEMS,
      hrefs: NAV_HREFS,
      account: { name: 'Juan Pablo Ríos' },
      onNewCustomer: fn(),
      onNavigate: fn(),
    },
  },
  parameters: {
    frameSize: 'screen',
    // Los marcos repiten la navegación y el contenido principal en la misma página; en la app hay uno solo.
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Sistema §05 (navegación) y Plantilla de lista',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Raíz de las rutas de la app: la navegación, el encabezado y la Franja de sin conexión.'],
      whenNotToUse: ['Las pantallas hechas usan su plantilla (lista o detalle), que ya trae la navegación.'],
      usedIn: ['Clientes', 'Inventario', 'Dinero'],
    },
    docs: {
      description: {
        component:
          'El armazón de la app (HU-PAN-BASE-01). Muestra todos los módulos que tendrá la app (I-37 revisada, 2026-11-20); los que aún no están terminados abren «Próximamente», y Admin solo lo ve quien tiene el rol. Por debajo de 768 px es la barra inferior con «Más»; desde 768 px, la barra lateral con «Nuevo cliente» y los grupos Trabajo y Dinero. Sin conexión aparece la Franja y «Nuevo cliente» se deshabilita con «Necesita conexión» (BR-GEN-08). Cada HU de pantalla reemplaza el contenido por su plantilla.',
      },
    },
  },
} satisfies Meta<typeof ShellScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const navOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('nav[aria-label="Principal"]')!;
const texts = (root: Element, selector: string) =>
  [...root.querySelectorAll(selector)].map((el) => el.textContent?.trim());

export const Explorar: Story = {};

/** CA-1: celular de 390 px: barra inferior con Hoy, Clientes, Inventario y Más; en «Más», el resto de los módulos. */
export const Movil: Story = {
  name: 'Móvil',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const nav = navOf(frame);
      expect(texts(nav, 'li > a, li > button')).toEqual(['Hoy', 'Clientes', 'Inventario', 'Más']);
      await userEvent.click([...nav.querySelectorAll('button')].find((b) => b.textContent === 'Más')!);
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).not.toBeNull());
      expect(texts(frame.querySelector('[role="dialog"]')!, 'a')).toEqual([
        'Minibooks',
        'Calendario',
        'Dinero',
        'Hacer inventario',
        'Ajustes',
      ]);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).toBeNull());
    }
  },
};

/** CA-2: computador de 1440 px: barra lateral con todos los módulos (Admin solo para administradores). */
export const Escritorio: Story = {
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const nav = navOf(frame);
      expect(texts(nav, 'button')).toEqual(['Nuevo cliente', 'Trabajo', 'Dinero']);
      expect(texts(nav, 'a')).toEqual([
        'Hoy',
        'Clientes',
        'Inventario',
        'Minibooks',
        'Calendario',
        'Dinero',
        'Hacer inventario',
        'Ajustes',
      ]);
      for (const hidden of ['Admin', 'Buscar']) expect(nav.textContent).not.toContain(hidden);
      expect(frame.querySelector('h1')?.textContent).toBe('Clientes');
    }
  },
};

/** CA-4: sin red, la Franja «Sin conexión: puedes consultar, pero no registrar» y «Nuevo cliente» deshabilitado. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: {
    nav: { ...meta.args.nav, newCustomerDisabled: true },
    banner: <Banner tone="offline" />,
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.querySelector('[role="status"]')?.textContent).toContain(
        'Sin conexión: puedes consultar, pero no registrar',
      );
      const mobile = frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
      if (mobile) continue; // En móvil «Nuevo cliente» es el botón flotante de cada pantalla.
      const create = [...navOf(frame).querySelectorAll('button')].find(
        (b) => b.textContent === 'Nuevo cliente',
      )!;
      expect(create.disabled).toBe(true);
    }
  },
};

/** El módulo activo sigue a la ruta: en Dinero, «Más» queda marcado en móvil. */
export const DineroActivo: Story = {
  name: 'Dinero activo',
  args: { title: 'Dinero', nav: { ...meta.args.nav, active: 'money' } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const current = navOf(frame).querySelector('[aria-current="page"]');
      expect(current?.textContent).toMatch(/Dinero|Más/);
    }
  },
};

/** Un módulo sin terminar: «Próximamente» dentro del armazón. */
export const Proximamente: Story = {
  name: 'Próximamente',
  args: {
    title: 'Calendario',
    nav: { ...meta.args.nav, active: 'calendar' },
    children: (
      <EmptyState
        kind="empty"
        icon="calendar"
        title="Próximamente"
        text="Calendario todavía no está listo. Lo verás aquí cuando esté terminado."
      />
    ),
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Próximamente');
      expect(frame.textContent).toContain('Calendario todavía no está listo');
      expect(frame.querySelector('h1')?.textContent).toBe('Calendario');
    }
  },
};

/** Las combinaciones en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
};
