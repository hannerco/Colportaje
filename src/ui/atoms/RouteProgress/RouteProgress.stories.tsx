import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { RouteProgress } from './RouteProgress';

const meta = {
  title: 'Átomos/Progreso de navegación',
  component: RouteProgress,
  args: { active: true },
  render: (args) => (
    <div style={{ transform: 'translateZ(0)', height: 80 }}>
      <RouteProgress {...args} />
    </div>
  ),
  parameters: {
    design: {
      ficha: 'Sin ficha en el lienzo (#98: patrón de GitHub y YouTube)',
      version: 'v1.0',
      iteration: 1,
      whenToUse: ['Mientras llega una pantalla al cambiar de módulo.'],
      whenNotToUse: ['Para cargar datos dentro de una pantalla: ahí va el esqueleto.'],
      usedIn: ['Armazón de la app'],
    },
  },
} satisfies Meta<typeof RouteProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

/** En camino: la barra se ve y avisa al lector que está cargando. */
export const Cargando: Story = {
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector<HTMLElement>('[role="progressbar"]')!;
    expect(bar).toHaveAttribute('aria-busy', 'true');
    expect(bar.dataset.active).toBeDefined();
  },
};

/** Quieta: no se ve. */
export const Quieta: Story = {
  args: { active: false },
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector<HTMLElement>('[role="progressbar"]')!;
    expect(bar.dataset.active).toBeUndefined();
  },
};
