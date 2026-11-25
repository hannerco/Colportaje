import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import styles from './Fundamentos.stories.module.css';
import { useComputedValue } from './useComputedValue';

type ColorToken = { design: string; token: string; usage: string };

/** Los tokens de color de HU-UI-02, con su nombre en el diseño (`tok()`) y para qué se usan. */
const GROUPS: { name: string; tokens: ColorToken[] }[] = [
  {
    name: 'Superficies',
    tokens: [
      { design: 'page', token: '--color-page', usage: 'Fondo de página en escritorio' },
      { design: 'mbg', token: '--color-page-mobile', usage: 'Fondo de página en móvil' },
      { design: 'card', token: '--color-card', usage: 'Tarjetas e islas' },
      { design: 'panel', token: '--color-panel', usage: 'Paneles y diálogos' },
      { design: 'sheet', token: '--color-sheet', usage: 'Hoja inferior (móvil)' },
      { design: 'inBg', token: '--color-input-bg', usage: 'Fondo de los campos' },
      { design: 'ctlBg', token: '--color-control-bg', usage: 'Fondo de botones y controles' },
      { design: 'tone', token: '--color-tone', usage: 'Fondo suave de apoyo' },
      { design: 'track', token: '--color-track', usage: 'Riel del medidor y del interruptor' },
      { design: 'tabTrack', token: '--color-tab-track', usage: 'Riel de las pestañas' },
      { design: 'selRow', token: '--color-row-selected', usage: 'Fila seleccionada (la que está abierta)' },
      {
        design: '—',
        token: '--color-row-hover',
        usage: 'Fila tocable con el mouse encima (más suave que la seleccionada)',
      },
      {
        design: '—',
        token: '--color-row-pressed',
        usage: 'Fila tocable mientras se toca (más fuerte que la seleccionada)',
      },
      { design: 'activeBg', token: '--color-active-bg', usage: 'Pestaña o ítem activo' },
      { design: 'head', token: '--color-table-head', usage: 'Encabezado de tabla' },
    ],
  },
  {
    name: 'Líneas',
    tokens: [
      { design: 'line', token: '--color-line', usage: 'Separadores' },
      { design: 'rowLine', token: '--color-row-line', usage: 'Línea entre filas' },
      { design: 'cardBorder', token: '--color-card-border', usage: 'Borde de tarjetas' },
      { design: 'neuBd', token: '--color-neutral-border', usage: 'Borde neutro (chips, pastillas)' },
      { design: 'inBd', token: '--color-input-border', usage: 'Borde de los campos' },
      { design: 'ctlBorder', token: '--color-control-border', usage: 'Borde de botones y controles' },
      { design: 'ring', token: '--color-ring', usage: 'Anillo de foco' },
      { design: 'underline', token: '--color-underline', usage: 'Subrayado de enlaces' },
    ],
  },
  {
    name: 'Texto',
    tokens: [
      { design: 'text', token: '--color-text', usage: 'Texto principal' },
      { design: 'text2', token: '--color-text-2', usage: 'Texto secundario' },
      { design: 'text3', token: '--color-text-3', usage: 'Texto terciario y ayudas' },
    ],
  },
  {
    name: 'Acento',
    tokens: [
      { design: 'accent', token: '--color-accent', usage: 'Acento: botón principal' },
      { design: 'accentText', token: '--color-accent-text', usage: 'Texto y enlaces con acento' },
      { design: 'onAccent', token: '--color-on-accent', usage: 'Texto sobre el acento' },
      { design: 'accBg', token: '--color-accent-bg', usage: 'Fondo suave con acento' },
      { design: 'accBd', token: '--color-accent-border', usage: 'Borde con acento' },
      { design: 'accBg2', token: '--color-accent-bg-2', usage: 'Fondo con acento más marcado' },
    ],
  },
  {
    name: 'Semánticos',
    tokens: [
      { design: 'green', token: '--color-ok', usage: 'Bien: cobrado, saldado' },
      { design: 'okBg', token: '--color-ok-bg', usage: 'Fondo de «bien»' },
      { design: 'okBd', token: '--color-ok-border', usage: 'Borde de «bien»' },
      { design: 'red', token: '--color-bad', usage: 'Mal: vencido, faltante' },
      { design: 'danger', token: '--color-danger', usage: 'Botón de acción peligrosa' },
      { design: 'onDanger', token: '--color-on-danger', usage: 'Texto sobre el botón peligroso' },
      { design: 'badBg', token: '--color-bad-bg', usage: 'Fondo de «mal»' },
      { design: 'badBd', token: '--color-bad-border', usage: 'Borde de «mal»' },
    ],
  },
  {
    name: 'Datos',
    tokens: [
      { design: 'prBar', token: '--color-data-delivered', usage: 'Medidor: entregado' },
      { design: 'okBar', token: '--color-data-collected', usage: 'Medidor: cobrado' },
      { design: 'pendBar', token: '--color-data-pending', usage: 'Medidor: por cobrar' },
      { design: 'avatarBg', token: '--color-avatar-bg', usage: 'Fondo del avatar' },
      { design: 'avatarFg', token: '--color-avatar-fg', usage: 'Iniciales del avatar' },
      { design: 'skel', token: '--color-skeleton', usage: 'Bloques de carga' },
    ],
  },
  {
    name: 'Capas',
    tokens: [
      { design: 'scrim', token: '--color-scrim', usage: 'Velo detrás de diálogos y hojas' },
      { design: 'toast', token: '--color-toast', usage: 'Fondo del aviso' },
      { design: 'onToast', token: '--color-on-toast', usage: 'Texto del aviso' },
      { design: 'toastLink', token: '--color-toast-link', usage: 'Acción del aviso («Deshacer»)' },
      { design: 'toastOk', token: '--color-toast-ok', usage: 'Ícono de éxito en el aviso' },
      { design: 'toastBad', token: '--color-toast-bad', usage: 'Ícono de error en el aviso' },
      { design: 'bar', token: '--color-bar', usage: 'Barra de navegación inferior' },
      { design: 'barActive', token: '--color-bar-active', usage: 'Ítem activo de la barra' },
    ],
  },
];

function Swatch({ design, token, usage }: ColorToken) {
  const [ref, value] = useComputedValue<HTMLDivElement>(token);
  return (
    <div className={styles.swatch} data-token={token}>
      <div ref={ref} className={styles.chip} style={{ background: `var(${token})` }} data-chip="" />
      <p className={styles.name}>{design}</p>
      <p className={styles.meta}>{token}</p>
      <p className={styles.meta}>{usage}</p>
      <p className={styles.meta} data-value="">
        {value}
      </p>
    </div>
  );
}

function ColorPalette() {
  return (
    <div className={styles.page}>
      {GROUPS.map((group) => (
        <section key={group.name} className={styles.group}>
          <h2 className={styles.heading}>{group.name}</h2>
          <div className={styles.grid}>
            {group.tokens.map((t) => (
              <Swatch key={t.token} {...t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: 'Fundamentos/Color',
  component: ColorPalette,
  parameters: {
    design: {
      ficha: 'Lib-Fundamentos',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Todo color de un componente sale de uno de estos tokens: var(--color-…).'],
      whenNotToUse: [
        'Nunca se escribe un color a mano (#…, rgb()…) fuera de tokens.css: lo impide stylelint.',
      ],
    },
    docs: {
      description: {
        component:
          'Cada muestra dice su nombre en el diseño, su token, para qué se usa y el valor que toma en el tema del marco. Cambiar un color de toda la app es cambiar un valor en tokens.css.',
      },
    },
  },
} satisfies Meta<typeof ColorPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Paleta: Story = {};

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

/** CA-1: el acento se ve #092E53 en claro y #1D4C7C en oscuro, y cada muestra dice su nombre y su token. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const dark = frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.theme === 'dark';
      const accent = frame.querySelector<HTMLElement>('[data-token="--color-accent"]')!;
      expect(getComputedStyle(accent.querySelector('[data-chip]')!).backgroundColor).toBe(
        dark ? 'rgb(29, 76, 124)' : 'rgb(9, 46, 83)',
      );
      expect(accent.textContent).toContain('accent');
      expect(accent.textContent).toContain('--color-accent');
      expect(accent.querySelector('[data-value]')!.textContent).toBe(dark ? '#1d4c7c' : '#092e53');
      expect(frame.querySelectorAll('[data-token]').length).toBe(GROUPS.flatMap((g) => g.tokens).length);
    }
  },
};
