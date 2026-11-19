import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { expect } from 'storybook/test';
import styles from './Fundamentos.stories.module.css';
import { useComputedValue } from './useComputedValue';

const SPACES = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-8',
  '--space-12',
];

const RADII: { token: string; usage: string }[] = [
  { token: '--radius-xs', usage: 'Etiqueta, portada' },
  { token: '--radius-sm', usage: 'Ítem de menú, campo en escritorio' },
  { token: '--radius-md', usage: 'Campo en móvil, fila' },
  { token: '--radius-lg', usage: 'Tarjeta de métrica, menú' },
  { token: '--radius-xl', usage: 'Isla, buscador en móvil' },
  { token: '--radius-2xl', usage: 'Panel, diálogo' },
  { token: '--radius-sheet', usage: 'Hoja inferior' },
  { token: '--radius-pill', usage: 'Píldora' },
];

/** Alturas de control: cambian entre escritorio y móvil, y no se multiplican por --font-scale. */
const CONTROLS: { token: string; usage: string }[] = [
  { token: '--size-primary', usage: 'Botón principal' },
  { token: '--radius-primary', usage: 'Radio del botón principal' },
  { token: '--size-control', usage: 'Botón y control' },
  { token: '--size-control-sm', usage: 'Compacto / chip' },
  { token: '--size-field', usage: 'Campo' },
  { token: '--radius-field', usage: 'Radio del campo' },
  { token: '--size-search', usage: 'Buscador' },
  { token: '--size-list-row', usage: 'Fila de lista' },
  { token: '--size-data-row', usage: 'Fila de dato' },
  { token: '--size-icon', usage: 'Ícono' },
  { token: '--gap-control', usage: 'Separación entre controles' },
  { token: '--size-touch', usage: 'Área táctil mínima' },
];

function TokenRow({ token, usage, children }: { token: string; usage: string; children: ReactNode }) {
  const [ref, value] = useComputedValue<HTMLDivElement>(token);
  return (
    <div className={styles.row} ref={ref} data-token={token}>
      <div>
        <p className={styles.name}>{token}</p>
        <p className={styles.meta}>
          {usage} · <span data-value="">{value}</span>
        </p>
      </div>
      {children}
    </div>
  );
}

function SpaceAndShape() {
  return (
    <div className={styles.page}>
      <section className={styles.group}>
        <h2 className={styles.heading}>Espaciado</h2>
        {SPACES.map((token) => (
          <TokenRow key={token} token={token} usage="Múltiplo de 4">
            <div className={styles.bar} style={{ width: `var(${token})` }} />
          </TokenRow>
        ))}
      </section>
      <section className={styles.group}>
        <h2 className={styles.heading}>Radios</h2>
        {RADII.map(({ token, usage }) => (
          <TokenRow key={token} token={token} usage={usage}>
            <div className={styles.box} style={{ borderRadius: `var(${token})` }} />
          </TokenRow>
        ))}
      </section>
      <section className={styles.group}>
        <h2 className={styles.heading}>Alturas de control</h2>
        {CONTROLS.map(({ token, usage }) => (
          <TokenRow key={token} token={token} usage={usage}>
            {token.startsWith('--size') ? (
              <div className={styles.control} style={{ height: `var(${token})` }} data-sample="" />
            ) : (
              <div className={styles.box} style={{ borderRadius: `var(${token})` }} />
            )}
          </TokenRow>
        ))}
      </section>
    </div>
  );
}

const meta = {
  title: 'Fundamentos/Espacio y forma',
  component: SpaceAndShape,
  parameters: {
    design: {
      ficha: 'Lib-Fundamentos',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Márgenes, separaciones, radios y alturas de control salen de estos tokens.'],
      whenNotToUse: ['Las alturas de control no cambian con Letra: son medidas, no tamaño de letra.'],
    },
    docs: {
      description: {
        component:
          'Espaciado en múltiplos de 4, radios y las alturas de control de escritorio y móvil, con el valor que toman en cada marco.',
      },
    },
  },
} satisfies Meta<typeof SpaceAndShape>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

/** CA-5: dentro de un marco móvil (aunque la página sea ancha) el botón principal mide 52 px; en escritorio, 40. */
export const Tokens: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const mobile = frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
      const primary = frame.querySelector<HTMLElement>('[data-token="--size-primary"]')!;
      expect(primary.querySelector('[data-value]')!.textContent).toBe(mobile ? '52px' : '40px');
      expect(primary.querySelector('[data-sample]')!.getBoundingClientRect().height).toBe(mobile ? 52 : 40);
    }
  },
};
