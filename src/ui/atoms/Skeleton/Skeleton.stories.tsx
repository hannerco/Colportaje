import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Skeleton, SkeletonScope } from './Skeleton';

const meta = {
  title: 'Átomos/Esqueleto',
  component: Skeleton,
  args: { shape: 'text' },
  parameters: {
    design: {
      ficha: 'Sin ficha (#67): la forma de lo que va a aparecer',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Mientras carga: cada pantalla arma su esqueleto con la forma de lo que va a mostrar.'],
      whenNotToUse: ['Para un error o una lista vacía (Estado vacío).'],
      usedIn: ['Todas las listas y los detalles'],
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explorar: Story = {};

/** Todas las formas, dentro de un ámbito que anuncia «Cargando…» una sola vez. */
export const Formas: Story = {
  render: () => (
    <SkeletonScope>
      {(['text', 'title', 'figure', 'circle', 'pill', 'cover', 'button'] as const).map((shape) => (
        <div key={shape} style={{ padding: 8 }}>
          <Skeleton shape={shape} />
        </div>
      ))}
    </SkeletonScope>
  ),
  play: async ({ canvasElement }) => {
    const status = canvasElement.querySelectorAll('[role="status"][aria-busy="true"]');
    expect(status.length).toBeGreaterThan(0);
    expect(status[0]!.textContent).toBe('Cargando…');
    expect(canvasElement.querySelectorAll('[data-shape]').length).toBeGreaterThanOrEqual(7);
  },
};
