import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Logo } from './Logo';

const meta = {
  title: 'Átomos/Logo',
  component: Logo,
  args: { variant: 'mark', size: 64 },
  argTypes: {
    variant: { control: 'inline-radio', options: ['mark', 'app-icon', 'logotype', 'mono'] },
    size: { control: { type: 'number', min: 12, max: 512 } },
  },
  parameters: {
    design: {
      ficha: 'Lib-Logo',
      version: 'v1.0',
      iteration: 1,
      whenToUse: [
        'Entrar, arranque, Ajustes › Acerca de, instalar y compartir.',
        'Dentro del Avatar tipo «marca» (barra lateral y «Más»).',
      ],
      whenNotToUse: [
        'Como botón o ícono de navegación.',
        'Rotado, con sombra, en un círculo o en otro color.',
      ],
      usedIn: ['Entrar'],
    },
    docs: {
      description: {
        component:
          'Logo «La puerta abierta»: una puerta abierta y, en la luz que sale, una cruz. Por debajo de 32 px usa la versión reducida (sin la luz del piso, bordes en píxeles enteros). Sobre el panel marino (`onBrand`) va en blanco.',
      },
    },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

export const Explorar: Story = {};

/** Se anuncia una sola vez como «Colportor»; el nombre escrito del logotipo va oculto al lector. */
export const Logotipo: Story = {
  args: { variant: 'logotype', size: 28 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const logo = frame.querySelector('[role="img"]')!;
      expect(logo).toHaveAttribute('aria-label', 'Colportor');
      expect(logo.lastElementChild).toHaveAttribute('aria-hidden', 'true');
      expect(logo.lastElementChild!.textContent).toContain('Colportor');
    }
  },
};

/** Por debajo de 32 px usa la versión reducida (cuadrícula de 16 o 24); desde 32, la completa. */
export const Reducida: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Logo size={16} />
      <Logo size={24} />
      <Logo size={32} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const boxes = [...frame.querySelectorAll('svg')].map((s) => s.getAttribute('viewBox'));
    expect(boxes).toEqual(['0 0 16 16', '0 0 24 24', '0 0 64 64']);
  },
};

export const IconoDeApp: Story = { name: 'Ícono de app', args: { variant: 'app-icon', size: 64 } };

export const Matriz: Story = { parameters: { frames: 'matrix' } };
