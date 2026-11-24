import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { MapPreview } from './MapPreview';

const meta = {
  title: 'Pantallas/Clientes/Piezas/Vista del mapa',
  component: MapPreview,
  args: { point: { lat: 6.2442, lng: -75.5812 }, tiles: null, isOnline: true },
  parameters: {
    design: {
      ficha: 'Clientes · 7 · Información y dirección (mapa)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En «Datos» de la ficha, con la ubicación guardada.'],
      whenNotToUse: ['Para elegir la ubicación: eso es el selector de ubicación.'],
      usedIn: ['Ficha del cliente'],
    },
  },
} satisfies Meta<typeof MapPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** #100: el pin vive dentro de la capa del mapa; no queda encima de diálogos ni hojas. */
export const PinDentroDelMapa: Story = {
  name: 'El pin no se sale del mapa',
  play: async ({ canvasElement }) => {
    for (const frame of canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame')) {
      const preview = frame.querySelector<HTMLElement>('button, [role="img"]')!;
      expect(getComputedStyle(preview).isolation).toBe('isolate');
    }
  },
};
