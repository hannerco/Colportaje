import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { BootScreen } from './BootScreen';

const meta = {
  title: 'Pantallas/Sesión/Arranque',
  component: BootScreen,
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
      ficha: 'Marca · Arranque, error y sin conexión (Marca-2-Arranque)',
      version: 'v1.0',
      iteration: 1,
      whenToUse: ['Mientras se abre la sesión al entrar a la app.'],
      whenNotToUse: ['Para cargar una lista o una ficha: cada pantalla tiene su esqueleto.'],
      usedIn: ['Armazón de la app'],
    },
  },
} satisfies Meta<typeof BootScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El logo de 96 y la frase de la marca, centrados. */
export const Arranque: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame')) {
      expect(frame.querySelector('[role="img"][aria-label="Colportor"] svg')).toHaveAttribute('width', '96');
      expect(frame.textContent).toContain('Tu colportaje, en orden.');
    }
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
