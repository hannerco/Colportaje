import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Banner } from '@/ui/molecules/Banner';
import { APP_NAV_ITEMS, NAV_HREFS } from '@/features/shell';
import { SettingsScreen } from './SettingsScreen';

const meta = {
  title: 'Pantallas/Ajustes',
  component: SettingsScreen,
  args: {
    theme: 'system',
    onThemeChange: fn(),
    adminMode: true,
    onAdminModeChange: fn(),
    nav: {
      active: 'settings',
      items: APP_NAV_ITEMS,
      hrefs: NAV_HREFS,
      account: { name: 'Juan Pablo Ríos' },
      onNewCustomer: fn(),
      onNavigate: fn(),
    },
    profile: { fullName: 'Juan Pablo Ríos', isAdmin: false, timeFormat: '12h' },
    isOnline: true,
    onTimeFormatChange: fn(async () => {}),
    onSignOut: fn(async () => {}),
  },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Ajustes (versión mínima, sin diseño del lienzo)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['/ajustes: la cuenta, el formato de hora y cerrar sesión.'],
      whenNotToUse: ['El modo administrador y los demás ajustes esperan su diseño.'],
      usedIn: ['Ajustes'],
    },
    docs: {
      description: {
        component:
          'Ajustes, versión mínima (pedido del dueño, 2026-11-20): la cuenta (nombre y rol), el formato de hora (12 o 24 horas, BR-GEN-07; se guarda al elegir) y «Cerrar sesión», que pide confirmar porque borra de este celular los datos guardados para consultar sin conexión.',
      },
    },
  },
} satisfies Meta<typeof SettingsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const radio = (frame: Element, label: string) =>
  [...frame.querySelectorAll<HTMLElement>('[role="radio"]')].find((r) =>
    r.closest('label, div')?.textContent?.includes(label),
  )!;
const button = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === name)!;

export const Explorar: Story = {};

/** La cuenta y el formato de hora guardado (12 h por defecto), con su ejemplo. */
export const Cuenta: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.querySelector('h1')?.textContent).toBe('Ajustes');
      expect(frame.textContent).toContain('Juan Pablo Ríos');
      expect(frame.textContent).toContain('Colportor');
      expect(frame.textContent).toContain('Ej.: 3:30 p. m.');
      expect(frame.textContent).toContain('Ej.: 15:30');
      expect(radio(frame, '12 horas')).toHaveAttribute('aria-checked', 'true');
    }
  },
};

export const Administrador: Story = {
  args: { profile: { fullName: 'Hanner Conde', isAdmin: true, timeFormat: '24h' } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Colportor · Administrador');
      expect(radio(frame, '24 horas')).toHaveAttribute('aria-checked', 'true');
    }
  },
};

/** Elegir 24 horas lo guarda. */
export const CambiarFormato: Story = {
  name: 'Cambiar formato de hora',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(radio(frame, '24 horas'));
    await waitFor(() => expect(args.onTimeFormatChange).toHaveBeenCalledWith('24h'));
  },
};

/** Sin conexión el formato no se cambia y lo dice. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false, banner: <Banner tone="offline" /> },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Necesita conexión');
      expect(radio(frame, '24 horas')).toBeDisabled();
    }
  },
};

/** «Cerrar sesión» pide confirmar antes de borrar los datos del celular. */
export const CerrarSesion: Story = {
  name: 'Cerrar sesión',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(button(frame, 'Cerrar sesión'));
    const dialog = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>('[role="alertdialog"]');
      expect(found).not.toBeNull();
      return found!;
    });
    expect(dialog.textContent).toContain('¿Cerrar sesión?');
    expect(dialog.textContent).toContain('sin conexión');
    await userEvent.click(button(dialog, 'Cerrar sesión'));
    await waitFor(() => expect(args.onSignOut).toHaveBeenCalled());
  },
};

export const Cargando: Story = { args: { profile: undefined } };

/** Las combinaciones en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = { parameters: { frames: 'matrix' } };

/** #42 (propuesta 5): el tema se elige aquí (Como el teléfono, Claro u Oscuro) y el admin ve el modo administrador. */
export const TemaYModoAdministrador: Story = {
  name: 'Tema y modo administrador',
  args: { profile: { fullName: 'Hanner Conde', isAdmin: true, timeFormat: '12h' } },
  play: async ({ canvasElement, args }) => {
    for (const frame of [...canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame')]) {
      const dark = frame.querySelector<HTMLElement>('[role="radio"][value="dark"]')!;
      await userEvent.click(dark);
      expect(args.onThemeChange).toHaveBeenCalledWith('dark');
      const adminSwitch = frame.querySelector<HTMLElement>('[role="switch"]')!;
      expect(adminSwitch.getAttribute('aria-checked')).toBe('true');
      await userEvent.click(adminSwitch);
      expect(args.onAdminModeChange).toHaveBeenCalledWith(false);
    }
  },
};
