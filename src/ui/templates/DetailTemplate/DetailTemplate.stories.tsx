import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { formatCOP } from '@/domain/money';
import { formatDate, localDate } from '@/domain/time';
import { Button } from '../../atoms/Button';
import { DataList, DataRow } from '../../molecules/DataRow';
import { HistoryTimeline } from '../../molecules/HistoryTimeline';
import { Menu } from '../../molecules/Menu';
import { Island } from '../../organisms/Island';
import { DetailTemplate, type DetailTemplateProps } from './DetailTemplate';

const moreActions = (
  <Menu
    trigger={
      <Button variant="tertiary" iconOnly icon="more">
        Más acciones
      </Button>
    }
    items={[
      { id: 'flag', label: 'Marcar con novedad', icon: 'alert' },
      { id: 'delete', label: 'Eliminar', icon: 'delete', danger: true },
    ]}
    title="Más acciones"
    onSelect={() => {}}
  />
);

const copyDetail: DetailTemplateProps = {
  window: {
    mode: 'page',
    title: 'Psiconutrición #6',
    breadcrumb: { label: 'Inventario', href: '#inventario' },
    onClose: () => {},
    onPrev: () => {},
    onNext: () => {},
    moreActions,
  },
  banner: { tone: 'neutral', children: 'Recibido hace 10 días' },
  identity: {
    avatar: { kind: 'cover' },
    title: 'Psiconutrición',
    number: 6,
    status: 'in_stock',
    subtitle: 'En tu inventario',
  },
  children: (
    <>
      <Island title="Precio y fechas">
        <DataList>
          <DataRow
            kind="editable"
            label="Precio acordado"
            value={formatCOP(98000)}
            divider={false}
            onEdit={() => {}}
          />
          <DataRow label="Recibido el" value={formatDate(localDate('2026-11-08'))} icon="calendar" />
        </DataList>
      </Island>
      <Island title="Historial">
        <HistoryTimeline
          items={[{ id: 'h1', text: 'Recibido', date: localDate('2026-11-08') }]}
          undo={{ label: 'Deshacer', onUndo: () => {} }}
        />
      </Island>
    </>
  ),
};

const paymentDetail = (mode: 'side' | 'sheet'): DetailTemplateProps => ({
  window: {
    mode,
    title: 'Abono de Luz Marina Restrepo',
    breadcrumb: { label: 'Dinero', href: '#dinero' },
    onClose: () => {},
    moreActions,
  },
  banner: { tone: 'overdue', children: 'Vencido hace 3 días' },
  identity: {
    avatar: { kind: 'emoji', emoji: '🌻' },
    title: 'Luz Marina Restrepo',
    status: 'overdue',
    subtitle: 'Cuota 3 de 4 · Las bellas historias de la Biblia',
    primaryAction: { label: 'Cobrar', icon: 'money', onClick: fn() },
  },
  children: (
    <>
      <Island title="Abono">
        <DataList>
          <DataRow kind="amount" label="Monto" value={formatCOP(30000)} divider={false} />
          <DataRow
            kind="editable"
            label="Fecha acordada"
            value={formatDate(localDate('2026-11-15'))}
            onEdit={() => {}}
          />
        </DataList>
      </Island>
      <Island title="Historial">
        <HistoryTimeline
          items={[
            { id: 'p2', text: 'Fecha acordada cambiada', date: localDate('2026-11-03') },
            { id: 'p1', text: 'Abono creado', date: localDate('2026-10-20') },
          ]}
          undo={{ label: 'Deshacer', onUndo: () => {} }}
        />
      </Island>
    </>
  ),
});

const meta = {
  title: 'Plantillas/Detalle en islas',
  component: DetailTemplate,
  args: copyDetail,
  argTypes: { children: { control: false }, window: { control: false } },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          // Los marcos repiten el detalle (y las ventanas modales se ocultan entre sí) en la misma página.
          { id: 'landmark-unique', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Lib-Plantilla-Detalle',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En el detalle de ejemplar, abono, cliente y Abibono.'],
      whenNotToUse: ['En pantallas de crear con muchos pasos.'],
      usedIn: [
        'Detalle de un ejemplar',
        'Detalle de un abono',
        'Detalle de un cliente',
        'Detalle de un Abibono',
      ],
    },
    docs: {
      description: {
        component:
          'El esqueleto de cualquier detalle, dentro de la Ventana de detalle: Franja, isla de identidad (avatar, nombre con número, estado y la acción principal) y las demás islas (datos, historial). Contenido de máximo 900 en escritorio. Las acciones secundarias van en «Más acciones». Máximo 4 islas y 7 filas por isla (se avisa en desarrollo).',
      },
    },
  },
} satisfies Meta<typeof DetailTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
/** Los bloques del detalle, en orden: franja, isla de identidad y demás islas. */
const blocks = (frame: HTMLElement) =>
  [...frame.querySelector<HTMLElement>('[data-tone]')!.parentElement!.children] as HTMLElement[];

/** CA-2 y R4: en página de escritorio, el contenido no pasa de 900; la identidad es el `<h1>` con avatar `xl`. */
export const EjemplarPagina: Story = {
  name: 'Ejemplar · página',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const stack = blocks(frame)[0]!.parentElement!;
      expect(stack.getBoundingClientRect().width).toBeLessThanOrEqual(900);
      const h1s = frame.querySelectorAll('h1');
      expect(h1s).toHaveLength(1);
      expect(h1s[0]!.textContent).toBe('Psiconutrición #6');
      expect(getComputedStyle(h1s[0]!).fontSize).toBe('32px');
      expect(stack.querySelector<HTMLElement>('[data-size="xl"]')).not.toBeNull();
    }
  },
};

/** R4: en móvil, título `--text-heading`; la portada va grande (`xl`, diseño de Ejemplar móvil). */
export const EjemplarMovil: Story = {
  name: 'Ejemplar · móvil',
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const identity = blocks(frame)[1]!;
      expect(identity.querySelector('[data-size="xl"]')).not.toBeNull();
      expect(getComputedStyle(identity.querySelector('h1, h2')!).fontSize).toBe('20px');
      expect(frame.querySelector('[aria-label="Volver a Inventario"]')).not.toBeNull();
    }
  },
};

/** CA-1: abono vencido: primero la franja, luego la identidad con «Cobrar», los datos y el historial. */
export const AbonoLateral: Story = {
  name: 'Abono · lateral',
  args: paymentDetail('side'),
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const [banner, identity, data, history] = blocks(frame);
      expect(banner!.textContent).toBe('Vencido hace 3 días');
      expect(identity!.querySelector('h2')!.textContent).toBe('Luz Marina Restrepo');
      expect([...identity!.querySelectorAll('button')].some((b) => b.textContent === 'Cobrar')).toBe(true);
      expect(data!.querySelector('h2')!.textContent).toBe('Abono');
      expect(history!.querySelector('h2')!.textContent).toBe('Historial');
      expect(history!.querySelector('[aria-label], button')!.textContent).toContain('Deshacer');
      // R3: la barra no lleva acciones sueltas, solo cerrar, forma, anterior/siguiente y «Más acciones».
      const dialog = frame.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.querySelector('h1')).toBeNull();
    }
  },
};

/** CA-3: en móvil, «Cobrar» ocupa todo el ancho de la isla de identidad. */
export const AbonoHojaMovil: Story = {
  name: 'Abono · hoja móvil',
  args: paymentDetail('sheet'),
  globals: { platform: 'mobile' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const identity = blocks(frame)[1]!;
      const cobrar = [...identity.querySelectorAll('button')].find((b) => b.textContent === 'Cobrar')!;
      const island = identity.getBoundingClientRect();
      const style = getComputedStyle(identity);
      const room = island.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2;
      expect(Math.round(cobrar.getBoundingClientRect().width)).toBe(Math.round(room));
      expect(isMobile(frame)).toBe(true);
    }
  },
};

/** Claro y oscuro × escritorio y móvil. */
export const Matriz: Story = { parameters: { frames: 'matrix' } };
