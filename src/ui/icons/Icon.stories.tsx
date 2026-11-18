import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Icon } from './Icon';
import { ICON_NAMES, type IconName } from './icon-map';
import styles from './Icon.stories.module.css';

type Row = { name: IconName; design: string; lucide: string; usage: string };

/** La tabla de la ficha (HU-UI-03), copiada aparte del mapa para verificar que el mapa la cumple (CA-5). */
const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Navegación',
    rows: [
      { name: 'today', design: 'hoy', lucide: 'sun', usage: 'Hoy' },
      { name: 'customers', design: 'clientes', lucide: 'users', usage: 'Clientes' },
      { name: 'inventory', design: 'inventario', lucide: 'library', usage: 'Inventario' },
      { name: 'minibooks', design: 'minibooks', lucide: 'book', usage: 'Minibooks' },
      { name: 'calendar', design: 'calendario', lucide: 'calendar', usage: 'Calendario y fechas' },
      { name: 'money', design: 'dinero', lucide: 'banknote', usage: 'Dinero y efectivo' },
      { name: 'stocktake', design: 'hacer-inventario', lucide: 'clipboard-check', usage: 'Hacer inventario' },
      { name: 'settings', design: 'ajustes', lucide: 'settings', usage: 'Ajustes' },
      { name: 'admin', design: 'admin', lucide: 'shield', usage: 'Admin' },
      { name: 'more', design: 'mas', lucide: 'ellipsis', usage: 'Más y más acciones' },
    ],
  },
  {
    title: 'Acciones',
    rows: [
      { name: 'new-customer', design: 'nuevo-cliente', lucide: 'user-plus', usage: 'Nuevo cliente' },
      { name: 'add', design: 'agregar', lucide: 'plus', usage: 'Agregar' },
      { name: 'search', design: 'buscar', lucide: 'search', usage: 'Buscar' },
      { name: 'filter', design: 'filtro', lucide: 'list-filter', usage: 'Filtrar' },
      { name: 'sort', design: 'orden', lucide: 'arrow-up-down', usage: 'Ordenar' },
      { name: 'edit', design: 'editar', lucide: 'pencil', usage: 'Editar' },
      { name: 'delete', design: 'eliminar', lucide: 'trash-2', usage: 'Eliminar' },
      { name: 'undo', design: 'deshacer', lucide: 'undo-2', usage: 'Deshacer' },
      { name: 'call', design: 'llamar', lucide: 'phone', usage: 'Llamar y teléfono' },
      { name: 'whatsapp', design: 'whatsapp', lucide: 'message-circle', usage: 'WhatsApp' },
      { name: 'open-page', design: 'abrir-pagina', lucide: 'maximize-2', usage: 'Abrir como página' },
      { name: 'close', design: 'cerrar', lucide: 'x', usage: 'Cerrar' },
      { name: 'back', design: 'volver', lucide: 'chevron-left', usage: 'Volver' },
      { name: 'next', design: 'siguiente', lucide: 'chevron-right', usage: 'Siguiente' },
      { name: 'expand', design: 'abajo', lucide: 'chevron-down', usage: 'Desplegar' },
      { name: 'check', design: 'check', lucide: 'check', usage: 'Confirmar' },
      { name: 'up-down', design: 'arriba-abajo', lucide: 'chevrons-up-down', usage: 'Cambiar de cuenta' },
      { name: 'window-side', design: 'panel-lateral', lucide: 'panel-right', usage: 'Ventana lateral' },
      { name: 'window-center', design: 'panel-centro', lucide: 'app-window', usage: 'Ventana centrada' },
      { name: 'window-page', design: 'pagina', lucide: 'square', usage: 'Ventana como página' },
    ],
  },
  {
    title: 'Estados',
    rows: [
      { name: 'scheduled', design: 'por-cobrar', lucide: 'clock', usage: 'Por cobrar, Pagando' },
      { name: 'collected', design: 'cobrado', lucide: 'circle-check', usage: 'Cobrado, Saldado, Vendido' },
      { name: 'delivered', design: 'entregado', lucide: 'check-check', usage: 'Entregado' },
      { name: 'locked', design: 'candado', lucide: 'lock', usage: 'Abibono entregado' },
      { name: 'alert', design: 'alerta', lucide: 'triangle-alert', usage: 'Vencido, Con novedad' },
      { name: 'canceled', design: 'cancelado', lucide: 'circle-slash', usage: 'Cancelado' },
      { name: 'draft', design: 'borrador', lucide: 'pencil-line', usage: 'Borrador' },
      { name: 'in-stock', design: 'en-fisico', lucide: 'backpack', usage: 'En físico' },
      { name: 'offline', design: 'sin-conexion', lucide: 'wifi-off', usage: 'Sin conexión' },
    ],
  },
  {
    title: 'Objetos',
    rows: [
      { name: 'info', design: 'ayuda', lucide: 'info', usage: 'Ayuda e información' },
      { name: 'books', design: 'libros', lucide: 'book-open', usage: 'Libros y títulos' },
      { name: 'person', design: 'persona', lucide: 'user', usage: 'Cliente sin foto' },
      { name: 'transfer', design: 'transferencia', lucide: 'smartphone', usage: 'Transferencia' },
      { name: 'receipt', design: 'recibo', lucide: 'receipt', usage: 'Recibo' },
      { name: 'note', design: 'nota', lucide: 'notebook-pen', usage: 'Nota' },
      { name: 'location', design: 'ubicacion', lucide: 'map-pin', usage: 'Dirección' },
    ],
  },
];
const ROWS = GROUPS.flatMap((g) => g.rows);

const meta = {
  title: 'Átomos/Ícono',
  component: Icon,
  args: { name: 'money' },
  argTypes: {
    name: { control: 'select', options: ICON_NAMES },
    tone: { control: 'select', options: ['current', 'text', 'secondary', 'tertiary', 'accent', 'ok', 'bad'] },
    size: { control: { type: 'number', min: 12, max: 48 } },
  },
  parameters: {
    design: {
      ficha: 'Lib-Icono',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Para reforzar una etiqueta en menús, botones y filas de dato.',
        'Como única señal en acciones universales (cerrar, volver, más acciones).',
        'Para el estado de una pastilla.',
      ],
      whenNotToUse: [
        'Como decoración sin significado.',
        'Sin texto ni etiqueta accesible cuando la acción no es obvia.',
        'Con relleno o con otro grosor.',
      ],
      usedIn: ['Botón', 'Pastilla de estado', 'Fila de dato', 'Menú', 'Navegación', 'Aviso', 'Franja'],
    },
    docs: {
      description: {
        component:
          'Ícono de Lucide (licencia ISC, versión 1.74) con nombre propio de Colportor: 46 íconos, siempre con trazo 1,8 sobre 24 × 24. Cambiar el ícono Lucide asignado a un nombre lo cambia en toda la web. Decorativo por defecto; con «etiqueta» se anuncia.',
      },
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const platformOf = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform;
const themeOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.theme;
const svgOf = (frame: HTMLElement) => frame.querySelector<SVGElement>('svg[data-icon]')!;

export const Explorar: Story = {};

/** CA-1: `money` es el `banknote` de Lucide, 18 px en escritorio y 20 en móvil, con trazo 1,8 y decorativo. */
export const TamanoAutomatico: Story = {
  name: 'Tamaño automático',
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const svg = svgOf(frame);
      expect(svg.classList.contains('lucide-banknote')).toBe(true);
      expect(svg.getBoundingClientRect().width).toBe(platformOf(frame) === 'mobile' ? 20 : 18);
      expect(svg.getAttribute('stroke-width')).toBe('1.8');
      expect(svg.getAttribute('fill')).toBe('none');
      expect(svg.getAttribute('stroke-linecap')).toBe('round');
      // CA-4 (sin etiqueta): decorativo.
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.hasAttribute('role')).toBe(false);
    }
  },
};

export const Acento: Story = { args: { name: 'customers', tone: 'accent' } };

export const Exito: Story = { name: 'Éxito', args: { name: 'collected', tone: 'ok' } };

/** CA-3: el color es `--color-bad` del tema de cada marco. */
export const Peligro: Story = {
  args: { name: 'alert', tone: 'bad' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(getComputedStyle(svgOf(frame)).color).toBe(
        themeOf(frame) === 'dark' ? 'rgb(242, 135, 124)' : 'rgb(180, 35, 24)',
      );
  },
};

/** CA-2: a 16 px el trazo es 2. */
export const Px16: Story = {
  name: '16 px',
  args: { name: 'search', size: 16 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(svgOf(frame).getAttribute('stroke-width')).toBe('2');
      expect(svgOf(frame).getBoundingClientRect().width).toBe(16);
    }
  },
};

export const Px24: Story = {
  name: '24 px',
  args: { name: 'search', size: 24 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) expect(svgOf(frame).getAttribute('stroke-width')).toBe('1.8');
  },
};

export const BarraInferiorActivo: Story = {
  name: 'Barra inferior · activo',
  args: { name: 'customers', size: 22, tone: 'accent' },
};

export const BarraInferiorInactivo: Story = {
  name: 'Barra inferior · inactivo',
  args: { name: 'customers', size: 22 },
};

/** CA-4: con etiqueta se anuncia como imagen con ese nombre. */
export const ConEtiqueta: Story = {
  name: 'Con etiqueta',
  args: { name: 'close', label: 'Cerrar', tone: 'text' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const svg = svgOf(frame);
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Cerrar');
      expect(svg.hasAttribute('aria-hidden')).toBe(false);
    }
  },
};

function FullSet() {
  return (
    <div className={styles.page}>
      {GROUPS.map((group) => (
        <section key={group.title} className={styles.group}>
          <h2 className={styles.heading}>{group.title}</h2>
          <div className={styles.grid}>
            {group.rows.map((row) => (
              <div key={row.name} className={styles.cell} data-row={row.name} data-expected={row.lucide}>
                <Icon name={row.name} tone="text" size={24} />
                <p className={styles.code}>{row.name}</p>
                <p className={styles.meta}>
                  {row.design} · {row.lucide}
                </p>
                <p className={styles.meta}>{row.usage}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** CA-5: exactamente 46 íconos, cada uno el de su nombre Lucide en la tabla. */
export const JuegoCompleto: Story = {
  name: 'Juego completo',
  render: () => <FullSet />,
  play: async ({ canvasElement }) => {
    expect(ROWS).toHaveLength(46);
    expect(new Set(ROWS.map((r) => r.name))).toEqual(new Set(ICON_NAMES));
    for (const frame of frames(canvasElement)) {
      const cells = [...frame.querySelectorAll<HTMLElement>('[data-row]')];
      expect(cells).toHaveLength(46);
      for (const cell of cells)
        expect(cell.querySelector('svg')!.classList.contains(`lucide-${cell.dataset.expected}`)).toBe(true);
    }
  },
};

/** Todas las variantes de color en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div className={styles.row}>
      {(['text', 'secondary', 'tertiary', 'accent', 'ok', 'bad'] as const).map((tone) => (
        <Icon key={tone} name="money" tone={tone} />
      ))}
      <Icon name="search" size={16} />
      <Icon name="search" size={24} />
    </div>
  ),
};
