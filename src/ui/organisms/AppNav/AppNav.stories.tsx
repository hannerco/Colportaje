import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { AppNav, type NavId } from './AppNav';

const hrefs: Record<NavId, string> = {
  today: '#hoy',
  customers: '#clientes',
  inventory: '#inventario',
  minibooks: '#minibooks',
  calendar: '#calendario',
  money: '#dinero',
  stocktake: '#hacer-inventario',
  settings: '#ajustes',
  admin: '#admin',
};

const meta = {
  title: 'Organismos/Navegación',
  component: AppNav,
  // Deja alto para la barra lateral y para que la barra inferior (fija) se vea dentro del marco.
  render: (args) => (
    <div style={{ height: 560 }}>
      <AppNav {...args} />
    </div>
  ),
  args: {
    active: 'customers',
    hrefs,
    account: { name: 'Juan Pablo Ríos' },
    onNewCustomer: fn(),
    search: { onOpen: fn() },
    fab: { icon: 'new-customer', label: 'Nuevo cliente', onClick: fn() },
  },
  argTypes: {
    active: {
      control: 'select',
      options: [
        'today',
        'customers',
        'inventory',
        'minibooks',
        'calendar',
        'money',
        'stocktake',
        'settings',
        'admin',
      ],
    },
  },
  parameters: {
    // Los marcos repiten la navegación en la misma página; en la app hay una sola.
    a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } },
    design: {
      ficha: 'Lib-Navegacion',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En todas las pantallas raíz.'],
      whenNotToUse: [
        'En pantallas de crear ni en detalles a pantalla completa en móvil (ahí se usa Volver).',
      ],
      usedIn: ['Plantilla de lista', 'Clientes', 'Inventario', 'Dinero'],
    },
    docs: {
      description: {
        component:
          'Escritorio: barra lateral con la cuenta, Buscar, Hoy, Nuevo cliente, los grupos plegables Trabajo y Dinero, y Ajustes y Admin al pie. Móvil: barra inferior flotante (Hoy, Clientes, Inventario y Más) con el botón flotante de crear; «Más» abre una hoja con grupos de 4 como máximo. La app pasa en `items` solo los módulos con pantalla (I-37) y no pasa `search` (FT-01).',
      },
    },
  },
} satisfies Meta<typeof AppNav>;

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
const navOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('nav[aria-label="Principal"]')!;
const labels = (root: Element, selector: string) =>
  [...root.querySelectorAll(selector)].map((el) => el.textContent);
const current = (frame: HTMLElement) => navOf(frame).querySelector<HTMLElement>('[aria-current="page"]');

export const Explorar: Story = {};

// ─── Escritorio ───

/** R1 y R6: cuenta sin «Cambiar de cuenta»; accesos de arriba; grupos; Ajustes y Admin al pie. */
export const ClientesActivo: Story = {
  name: 'Clientes activo',
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) continue;
      const nav = navOf(frame);
      expect(nav.textContent).toContain('Juan Pablo Ríos');
      expect(nav.querySelector('[data-icon="up-down"]')).toBeNull();
      expect(labels(nav, 'a')).toEqual([
        'Hoy',
        'Clientes',
        'Inventario',
        'Minibooks',
        'Calendario',
        'Dinero',
        'Hacer inventario',
        'Ajustes',
        'Admin',
      ]);
      expect(getComputedStyle(nav).backgroundColor).toBe(tokenColor(frame, '--color-page-mobile'));
      expect(getComputedStyle(nav).fontSize).toBe('15px');
      const create = [...nav.querySelectorAll('button')].find((b) => b.textContent === 'Nuevo cliente')!;
      expect(getComputedStyle(create).color).toBe(tokenColor(frame, '--color-accent-text'));
      await userEvent.click(create);
      // Plegar «Trabajo» oculta sus módulos; desplegar los muestra otra vez.
      const work = [...nav.querySelectorAll('button')].find((b) => b.textContent === 'Trabajo')!;
      await userEvent.click(work);
      expect(work.getAttribute('aria-expanded')).toBe('false');
      expect(labels(nav, 'a')).not.toContain('Clientes');
      await userEvent.click(work);
      expect(labels(nav, 'a')).toContain('Clientes');
    }
    expect(args.onNewCustomer).toHaveBeenCalled();
  },
};

/** CA-1: «Dinero» es la tarjeta activa (`aria-current="page"`) dentro del grupo «Dinero». */
export const DineroActivo: Story = {
  name: 'Dinero activo',
  args: { active: 'money' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) continue;
      const item = current(frame)!;
      expect(item.textContent).toBe('Dinero');
      expect(item.closest('ul')!.previousElementSibling!.textContent).toBe('Dinero');
      const style = getComputedStyle(item);
      expect(style.backgroundColor).toBe(tokenColor(frame, '--color-card'));
      expect(style.color).toBe(tokenColor(frame, '--color-accent-text'));
      expect(style.fontWeight).toBe('600');
      expect(style.boxShadow).not.toBe('none');
    }
  },
};

// ─── Móvil ───

/** R2: cuatro destinos con ícono y nombre, de al menos 44 × 44; el activo en `bar-active`. */
export const ClientesActivoMovil: Story = {
  name: 'Clientes activo · móvil',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      const nav = navOf(frame);
      const cells = [...nav.querySelectorAll<HTMLElement>('li > a, li > button')];
      expect(cells.map((c) => c.textContent)).toEqual(['Hoy', 'Clientes', 'Inventario', 'Más']);
      for (const cell of cells) {
        const { width, height } = cell.getBoundingClientRect();
        expect(width).toBeGreaterThanOrEqual(44);
        expect(height).toBeGreaterThanOrEqual(44);
        expect(cell.querySelector('svg')).not.toBeNull();
      }
      const active = current(frame)!;
      expect(active.textContent).toBe('Clientes');
      expect(getComputedStyle(active).backgroundColor).toBe(tokenColor(frame, '--color-bar-active'));
      expect(getComputedStyle(active.querySelector('svg')!).strokeWidth).toBe('2px');
      // R3: el botón flotante tiene nombre y queda encima de la barra, a la derecha.
      const fab = frame.querySelector<HTMLElement>('[aria-label="Nuevo cliente"]')!;
      expect(fab.getBoundingClientRect().bottom).toBeLessThan(nav.getBoundingClientRect().top);
      expect(Math.abs(fab.getBoundingClientRect().right - nav.getBoundingClientRect().right)).toBeLessThan(8);
    }
  },
};

export const InventarioActivo: Story = {
  name: 'Inventario activo · móvil',
  args: { active: 'inventory', fab: { icon: 'add', label: 'Agregar a inventario', onClick: fn() } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      if (isMobile(frame)) expect(frame.querySelector('[aria-label="Agregar a inventario"]')).not.toBeNull();
  },
};

/** CA-2 y CA-5: con Dinero activo, la barra marca «Más»; sin `fab` no hay botón flotante. */
export const MasActivoSinFab: Story = {
  name: 'Más activo · sin botón flotante · móvil',
  args: { active: 'money', fab: undefined },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      expect(current(frame)!.textContent).toBe('Más');
      expect(frame.querySelector('[data-variant="fab"]')).toBeNull();
    }
  },
};

/** CA-3: «Más» abre la hoja con los grupos Trabajo, Dinero y Cuenta, ninguno con más de 4 opciones. */
export const HojaMasAbierta: Story = {
  name: 'Hoja Más abierta · móvil',
  args: { active: 'money' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      const more = [...navOf(frame).querySelectorAll('button')].find((b) => b.textContent === 'Más')!;
      await userEvent.click(more);
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).not.toBeNull());
      const sheet = frame.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(labels(sheet, 'h3')).toEqual(['Trabajo', 'Dinero', 'Cuenta']);
      for (const group of sheet.querySelectorAll('section'))
        expect(group.querySelectorAll('a').length).toBeLessThanOrEqual(4);
      expect(sheet.querySelector('[aria-current="page"]')!.textContent).toBe('Dinero');
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).toBeNull());
      expect(document.activeElement).toBe(more);
    }
  },
};

/** CA-4: solo Clientes, Inventario y Dinero (I-37); en móvil, Dinero va dentro de «Más». */
export const SoloModulosConPantalla: Story = {
  name: 'Solo módulos con pantalla',
  args: { items: ['customers', 'inventory', 'money'], search: undefined },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const nav = navOf(frame);
      for (const hidden of ['Hoy', 'Minibooks', 'Calendario', 'Hacer inventario'])
        expect(nav.textContent).not.toContain(hidden);
      if (!isMobile(frame)) {
        expect(labels(nav, 'a')).toEqual(['Clientes', 'Inventario', 'Dinero']);
        expect(nav.textContent).not.toContain('Buscar');
        continue;
      }
      expect(labels(nav, 'li > a, li > button')).toEqual(['Clientes', 'Inventario', 'Más']);
      await userEvent.click([...nav.querySelectorAll('button')].find((b) => b.textContent === 'Más')!);
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).not.toBeNull());
      expect(labels(frame.querySelector('[role="dialog"]')!, 'a')).toEqual(['Dinero']);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(frame.querySelector('[role="dialog"]')).toBeNull());
    }
  },
};

/** Sin conexión (BR-GEN-08, HU-PAN-BASE-01 CA-4): «Nuevo cliente» deshabilitado con «Necesita conexión». */
export const NuevoClienteSinConexion: Story = {
  name: 'Nuevo cliente sin conexión',
  globals: { platform: 'desktop' },
  args: { items: ['customers', 'inventory', 'money'], search: undefined, newCustomerDisabled: true },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const button = [...navOf(frame).querySelectorAll('button')].find(
        (b) => b.textContent === 'Nuevo cliente',
      )!;
      expect(button.disabled).toBe(true);
      const note = frame.querySelector(`#${CSS.escape(button.getAttribute('aria-describedby')!)}`);
      expect(note?.textContent).toBe('Necesita conexión');
      await userEvent.click(button, { pointerEventsCheck: 0 });
      expect(args.onNewCustomer).not.toHaveBeenCalled();
    }
  },
};

/** La app pasa `onNavigate` (el enrutador): un clic normal no recarga la página; Ctrl + clic abre el enlace. */
export const NavegarSinRecargar: Story = {
  name: 'Navegar sin recargar',
  args: { items: ['customers', 'inventory', 'money'], search: undefined, onNavigate: fn() },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const link = [...navOf(frame).querySelectorAll('a')].find((a) => a.textContent === 'Inventario')!;
      let prevented = false;
      const spy = (event: Event) => (prevented = event.defaultPrevented);
      window.addEventListener('click', spy);
      await userEvent.click(link);
      window.removeEventListener('click', spy);
      expect(prevented).toBe(true);
      expect(args.onNavigate).toHaveBeenLastCalledWith('#inventario');
    }
  },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  args: { active: 'money' },
};
