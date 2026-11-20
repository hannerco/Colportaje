import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { MapPoint } from '@/domain/customer-location';
import type { PickerStatus } from '../../location-picker-state';
import { LocationPicker } from './LocationPicker';

/** El punto del lienzo (Medellín) y el último punto elegido en el dispositivo (permiso negado o sin señal). */
const FOUND: MapPoint = { lat: 6.2518, lng: -75.5915 };
const LAST_CHOSEN: MapPoint = { lat: 6.2442, lng: -75.5812 };

type DemoProps = {
  status: PickerStatus;
  pin?: MapPoint;
  /** Precisión del GPS (círculo y «±N m»), con el GPS simulado. */
  accuracyMeters?: number | null;
  isOnline?: boolean;
  onConfirm?: () => void;
  onRetry?: () => void;
  onRecenter?: () => void;
  onClose?: () => void;
};

/** El selector con el GPS simulado: el estado y la precisión llegan hechos; mover el mapa mueve el pin. */
function Demo({
  status,
  pin = FOUND,
  accuracyMeters = null,
  isOnline = true,
  onConfirm = () => {},
  onRetry = () => {},
  onRecenter = () => {},
  onClose = () => {},
}: DemoProps) {
  const [current, setCurrent] = useState(pin);
  return (
    <LocationPicker
      status={status}
      pin={current}
      accuracyMeters={accuracyMeters}
      view={{ center: pin, zoom: 17, version: 0 }}
      onMove={setCurrent}
      accuracyCircle={accuracyMeters ? { center: pin, meters: accuracyMeters } : null}
      tiles={null}
      isOnline={isOnline}
      onRetry={onRetry}
      onRecenter={onRecenter}
      onConfirm={onConfirm}
      onClose={onClose}
      backHref="#clientes"
    />
  );
}

const meta = {
  title: 'Pantallas/Clientes/Dirección y ubicación',
  component: Demo,
  args: {
    status: 'found',
    accuracyMeters: 12,
    onConfirm: fn(),
    onRetry: fn(),
    onRecenter: fn(),
    onClose: fn(),
  },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          // Cada marco abre su ventana modal; lo de atrás queda oculto con `aria-hidden` (Radix).
          { id: 'aria-hidden-focus', enabled: false },
          { id: 'landmark-unique', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Clientes · 8 · Elegir ubicación',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Al tocar «Elegir en mapa» (pide el GPS) o «Cambiar» (abre en la ubicación guardada).'],
      whenNotToUse: ['Para escribir la dirección: es texto manual en la ficha (no se rellena sola).'],
      usedIn: ['Crear cliente', 'Ficha de cliente'],
    },
    docs: {
      description: {
        component:
          'Elegir ubicación (HU-PAN-CLI-06, ADR-0036): mapa de Leaflet con el pin fijo en el centro y el mapa que se mueve debajo, círculo de precisión del GPS, botón para recentrar y «Confirmar», que guarda el punto bajo el pin. Siete estados: buscando, encontrada, aproximada (más de 50 m, con «Repetir»), cambiar una ubicación guardada, permiso negado, sin señal (con «Reintentar») y sin conexión («Confirmar» deshabilitado). Va en la Ventana de detalle: centrada en escritorio y hoja en móvil (el lienzo dibuja el móvil a pantalla completa con botones flotantes). Las stories no cargan imágenes del mapa (el proveedor espera SG-09).',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cada marco abre su ventana modal: se prueba en la última (la de encima). */
const lastWindow = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1)!;
const button = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
  );

export const Explorar: Story = {};

export const Buscando: Story = {
  args: { status: 'searching', accuracyMeters: null },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(lastWindow(canvasElement).textContent).toContain('Buscando tu ubicación…'));
    expect(lastWindow(canvasElement).textContent).not.toContain('6,2518');
  },
};

export const Encontrada: Story = {
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const window = await waitFor(() => lastWindow(canvasElement));
    expect(window.textContent).toContain('±12 m · 6,2518, −75,5915');
    expect(window.querySelector('[aria-label="Pin en el centro del mapa"]')).not.toBeNull();
    await userEvent.click(button(window, 'Confirmar')!);
    expect(args.onConfirm).toHaveBeenCalled();
  },
};

/** CA-1: con 120 m se ve «Ubicación aproximada» y se puede repetir la captura (AF-110). */
export const Aproximada: Story = {
  args: { status: 'approximate', accuracyMeters: 120 },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const window = await waitFor(() => lastWindow(canvasElement));
    expect(window.textContent).toContain('Ubicación aproximada');
    expect(window.textContent).toContain('±120 m · 6,2518, −75,5915');
    await userEvent.click(button(window, 'Repetir')!);
    expect(args.onRetry).toHaveBeenCalled();
  },
};

/** «Cambiar»: abre en la ubicación guardada, sin precisión y sin pedir el GPS. */
export const CambiarGuardada: Story = {
  name: 'Cambiar ubicación guardada',
  args: { status: 'manual', accuracyMeters: null },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const window = await waitFor(() => lastWindow(canvasElement));
    expect(window.textContent).toContain('6,2518, −75,5915');
    expect(window.textContent).not.toContain('±');
    await userEvent.click(button(window, 'Centrar en tu ubicación actual')!);
    expect(args.onRecenter).toHaveBeenCalled();
  },
};

/** CA-2: sin permiso, el selector abre en el último punto elegido (o en Colombia) con el aviso, sin recentrar. */
export const PermisoNegado: Story = {
  name: 'Permiso negado',
  args: { status: 'denied', accuracyMeters: null, pin: LAST_CHOSEN },
  play: async ({ canvasElement }) => {
    const window = await waitFor(() => lastWindow(canvasElement));
    expect(window.textContent).toContain('Sin permiso de ubicación. Ubica el pin a mano.');
    expect(window.textContent).toContain('6,2442, −75,5812');
    expect(button(window, 'Centrar en tu ubicación actual')).toBeUndefined();
  },
};

export const SinSenal: Story = {
  name: 'Sin señal',
  args: { status: 'noSignal', accuracyMeters: null, pin: LAST_CHOSEN },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const window = await waitFor(() => lastWindow(canvasElement));
    expect(window.textContent).toContain('No hay señal de GPS. Ubica el pin a mano.');
    await userEvent.click(button(window, 'Reintentar')!);
    expect(args.onRetry).toHaveBeenCalled();
  },
};

/** CA-4: sin conexión, «Confirmar» está deshabilitado y el mapa no carga (AF-111). */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { status: 'found', accuracyMeters: 15, isOnline: false },
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const window = await waitFor(() => lastWindow(canvasElement));
    expect(window.textContent).toContain('Sin conexión. Guardar necesita conexión.');
    expect(window.textContent).toContain('Mapa sin conexión');
    const confirm = button(window, 'Confirmar')!;
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(confirm);
    expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

export const Movil: Story = {
  name: 'Móvil',
  args: { status: 'approximate', accuracyMeters: 180 },
  globals: { platform: 'mobile' },
};
