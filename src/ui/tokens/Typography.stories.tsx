import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { ThemeScope } from '../platform';
import styles from './Fundamentos.stories.module.css';
import { useComputedValue } from './useComputedValue';

type Role = { design: string; token: string; weight: string; example: string };

/** Roles de texto de HU-UI-02 (`size()` del diseño). Cada uno vale su base × --font-scale. */
const ROLES: Role[] = [
  { design: 'fig', token: '--text-figure', weight: '--weight-figure', example: '$2.740.000' },
  { design: 'title', token: '--text-title', weight: '--weight-title', example: 'Clientes' },
  { design: 'h', token: '--text-heading', weight: '--weight-heading', example: 'Libros' },
  { design: 'body', token: '--text-body', weight: '--weight-regular', example: 'Ana María Restrepo' },
  { design: 'sec', token: '--text-secondary', weight: '--weight-regular', example: 'Debe $380.000' },
  {
    design: 'cap',
    token: '--text-caption',
    weight: '--weight-regular',
    example: 'Última modificación 05/11/2026',
  },
  { design: 'barra lateral', token: '--text-sidebar', weight: '--weight-regular', example: 'Inventario' },
];

function RoleRow({ design, token, weight, example }: Role) {
  const [sampleRef, px] = useComputedValue<HTMLParagraphElement>('font-size');
  const [baseRef, rem] = useComputedValue<HTMLDivElement>(`${token}-base`);
  return (
    <div className={styles.row} ref={baseRef} data-role={token}>
      <div>
        <p className={styles.name}>{design}</p>
        <p className={styles.meta}>{token}</p>
        <p className={styles.meta}>
          {rem} · {px.replace('px', ' px')}
        </p>
      </div>
      <p
        ref={sampleRef}
        className={styles.sample}
        style={{ fontSize: `var(${token})`, fontWeight: `var(${weight})` }}
        data-sample=""
      >
        {example}
      </p>
    </div>
  );
}

function TypeScale() {
  return (
    <div>
      {ROLES.map((role) => (
        <RoleRow key={role.token} {...role} />
      ))}
    </div>
  );
}

const meta = {
  title: 'Fundamentos/Tipografía',
  component: TypeScale,
  parameters: {
    design: {
      ficha: 'Lib-Fundamentos',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Todo texto usa uno de estos roles: font-size: var(--text-…).'],
      whenNotToUse: [
        'Nunca se fija un tamaño de letra a mano: toda la letra se agranda o se achica con --font-scale.',
      ],
    },
    docs: {
      description: {
        component:
          'Cada rol muestra su tamaño en rem y en px en el marco donde se ve. Escritorio y móvil tienen tamaños distintos, y Letra los multiplica todos por igual.',
      },
    },
  },
} satisfies Meta<typeof TypeScale>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Roles: Story = {};

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize);

/**
 * CA-2: --text-body mide 16 px en escritorio y 17 px en móvil; con Letra = 1,3, 20,8 y 22,1 px.
 * El segundo bloque es el mismo texto dentro de un ámbito con --font-scale = 1,3.
 */
export const Escala: Story = {
  render: () => (
    <div>
      <RoleRow {...ROLES[3]!} />
      <ThemeScope fontScale={1.3}>
        <div data-scaled="">
          <RoleRow {...ROLES[3]!} />
        </div>
      </ThemeScope>
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const mobile = frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
      const scale = Number(
        getComputedStyle(frame.querySelector('[data-ui-scope]')!).getPropertyValue('--font-scale'),
      );
      const [normal, scaled] = [...frame.querySelectorAll('[data-sample]')];
      expect(px(normal!)).toBeCloseTo((mobile ? 17 : 16) * scale, 1);
      expect(px(scaled!)).toBeCloseTo(mobile ? 22.1 : 20.8, 1);
    }
  },
};
