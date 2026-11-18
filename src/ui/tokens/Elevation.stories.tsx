import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import styles from './Fundamentos.stories.module.css';
import { useComputedValue } from './useComputedValue';

const SHADOWS: { design: string; token: string; usage: string }[] = [
  { design: 'ctlShadow', token: '--shadow-control', usage: 'Botones y controles' },
  { design: 'shadow', token: '--shadow-card', usage: 'Tarjetas e islas' },
  { design: 'modalShadow', token: '--shadow-modal', usage: 'Diálogos y ventanas' },
  { design: 'barShadow', token: '--shadow-bar', usage: 'Barra de navegación flotante' },
];

function Shadow({ design, token, usage }: (typeof SHADOWS)[number]) {
  const [ref, value] = useComputedValue<HTMLDivElement>(token);
  return (
    <div className={styles.swatch} data-token={token}>
      <div ref={ref} className={styles.elevated} style={{ boxShadow: `var(${token})` }} data-sample="" />
      <p className={styles.name}>{design}</p>
      <p className={styles.meta}>{token}</p>
      <p className={styles.meta}>{usage}</p>
      <p className={styles.meta} data-value="">
        {value}
      </p>
    </div>
  );
}

function Elevation() {
  return (
    <div className={styles.grid}>
      {SHADOWS.map((s) => (
        <Shadow key={s.token} {...s} />
      ))}
    </div>
  );
}

const meta = {
  title: 'Fundamentos/Elevación',
  component: Elevation,
  parameters: {
    design: {
      ficha: 'Lib-Fundamentos',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Las cuatro sombras del diseño: box-shadow: var(--shadow-…).'],
      whenNotToUse: ['Nunca se escribe una sombra a mano. En oscuro, controles y tarjetas no llevan sombra.'],
    },
    docs: {
      description: { component: 'Las cuatro sombras, con el valor que toman en el tema de cada marco.' },
    },
  },
} satisfies Meta<typeof Elevation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sombras: Story = {};

/** En oscuro, controles y tarjetas van sin sombra; diálogos y barra la conservan (HU-UI-02). */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  play: async ({ canvasElement }) => {
    for (const frame of canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame')) {
      const dark = frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.theme === 'dark';
      const value = (token: string) =>
        frame.querySelector(`[data-token="${token}"] [data-value]`)!.textContent ?? '';
      expect(value('--shadow-card')).toBe(dark ? 'none' : '0 1px 2px rgba(31, 30, 29, 0.04)');
      expect(value('--shadow-modal')).toBe(
        dark ? '0 24px 64px rgba(0, 0, 0, 0.6)' : '0 20px 60px rgba(31, 30, 29, 0.2)',
      );
    }
  },
};
