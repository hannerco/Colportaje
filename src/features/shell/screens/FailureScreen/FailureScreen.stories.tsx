import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { FailureScreen } from './FailureScreen';

const meta = {
  title: 'Pantallas/Sesión/Error y sin conexión',
  component: FailureScreen,
  args: { kind: 'error', onRetry: fn(), homeHref: '/' },
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
      whenToUse: [
        'Si una pantalla falla al abrir, o si la app se abre sin conexión antes de tenerla guardada.',
      ],
      whenNotToUse: ['Para un error de una acción: va en un aviso o en la franja de la pantalla.'],
      usedIn: ['Armazón de la app'],
    },
  },
} satisfies Meta<typeof FailureScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

/** Algo falló: «Volver a intentar» y «Ir al inicio». */
export const Error: Story = {
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    expect(frame.querySelector('[role="img"][aria-label="Colportor"]')).not.toBeNull();
    expect(frame.textContent).toContain('Algo salió mal');
    await userEvent.click(
      [...frame.querySelectorAll('button')].find((b) => b.textContent === 'Volver a intentar')!,
    );
    expect(args.onRetry).toHaveBeenCalled();
    expect([...frame.querySelectorAll('a')].some((a) => a.textContent === 'Ir al inicio')).toBe(true);
  },
};

/** Sin conexión la primera vez: una sola acción. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { kind: 'offline' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    expect(frame.textContent).toContain('Sin conexión');
    expect(frame.querySelectorAll('a')).toHaveLength(0);
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
