import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { ThemeScope } from './ThemeScope';
import { usePlatform } from './PlatformProvider';
import styles from './Platform.stories.module.css';

/** Muestra lo que ve `usePlatform()` dentro de cada marco y un texto con el rol `--text-body`. */
function PlatformReadout() {
  const platform = usePlatform();
  return (
    <div>
      <p className={styles.sample} data-testid="platform">
        usePlatform(): {platform}
      </p>
      <p className={styles.sample} data-testid="sample">
        Texto de ejemplo con el rol --text-body.
      </p>
    </div>
  );
}

const meta = {
  title: 'Fundamentos/Plataforma',
  component: PlatformReadout,
  parameters: {
    design: {
      ficha: 'Lib-Fundamentos',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Los componentes que cambian de forma entre celular y computador (Navegación, Diálogo, Menú…) leen la plataforma con usePlatform().',
      ],
      whenNotToUse: ['Para cambiar colores o tamaños: eso lo hacen los tokens por CSS.'],
    },
    docs: {
      description: {
        component:
          'Cada marco pone el tema, la plataforma y la escala de letra de lo que muestra. Esta página enseña lo que un componente ve en cada marco.',
      },
    },
  },
} satisfies Meta<typeof PlatformReadout>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const scopeOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-ui-scope]')!;
const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize);

/** CA-2: con Plataforma = Lado a lado (por defecto), un marco de escritorio y uno de móvil, cada uno con lo suyo. */
export const Plataforma: Story = {
  play: async ({ canvasElement }) => {
    const shown = frames(canvasElement);
    expect(shown.length).toBeGreaterThan(0);
    for (const frame of shown) {
      const scope = scopeOf(frame);
      const platform = scope.dataset.platform;
      const label = frame.querySelector('figcaption')!.textContent ?? '';
      expect(label.startsWith(platform === 'mobile' ? 'Móvil' : 'Escritorio')).toBe(true);
      expect(scope.getBoundingClientRect().width).toBe(platform === 'mobile' ? 390 : 1280);
      expect(frame.querySelector('[data-testid="platform"]')!.textContent).toBe(`usePlatform(): ${platform}`);
    }
  },
};

/** CA-3: el rol `--text-body` crece en la misma proporción que `--font-scale` (aquí, 1,3 dentro del marco). */
export const Letra: Story = {
  render: () => (
    <div>
      <PlatformReadout />
      <ThemeScope fontScale={1.3}>
        <p className={styles.sample} data-testid="scaled">
          El mismo texto con Letra = 1,3.
        </p>
      </ThemeScope>
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const base = px(frame.querySelector('[data-testid="sample"]')!);
      const scaled = px(frame.querySelector('[data-testid="scaled"]')!);
      const scale = Number(getComputedStyle(scopeOf(frame)).getPropertyValue('--font-scale'));
      // Con Letra = 1 en la barra: 16 px en escritorio y 17 px en móvil (valores de HU-UI-02).
      const expectedBase = (scopeOf(frame).dataset.platform === 'mobile' ? 17 : 16) * scale;
      expect(base).toBeCloseTo(expectedBase, 1);
      expect(scaled / base).toBeCloseTo(1.3 / scale, 2);
    }
  },
};

/** CA-1 y R2: las cuatro combinaciones juntas; en los marcos oscuros, fondo de página oscura y `data-theme="dark"`. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  play: async ({ canvasElement }) => {
    const shown = frames(canvasElement);
    expect(shown.map((f) => f.querySelector('figcaption')!.textContent)).toEqual([
      'Escritorio · Claro',
      'Móvil · Claro',
      'Escritorio · Oscuro',
      'Móvil · Oscuro',
    ]);
    const background = shown.map((f) => getComputedStyle(scopeOf(f)).backgroundColor);
    expect(shown.map((f) => scopeOf(f).dataset.theme)).toEqual(['light', 'light', 'dark', 'dark']);
    // Página clara #F5F4F1 (escritorio) y #F4F2EE (móvil); oscura #181817 y #111110 (HU-UI-02).
    expect(background).toEqual([
      'rgb(245, 244, 241)',
      'rgb(244, 242, 238)',
      'rgb(24, 24, 23)',
      'rgb(17, 17, 16)',
    ]);
  },
};
