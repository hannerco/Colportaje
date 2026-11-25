import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { formatCOP } from '@/domain/money';
import { formatDate, localDate } from '@/domain/time';
import { Button } from '../../atoms/Button';
import { DataList, DataRow } from '../../molecules/DataRow';
import { HistoryTimeline } from '../../molecules/HistoryTimeline';
import { ListRow, ListTable } from '../../molecules/ListRow';
import { Menu } from '../../molecules/Menu';
import { Island } from '../Island';
import {
  DETAIL_WINDOW_MODE_KEY,
  DetailWindow,
  readStoredDetailWindowMode,
  type DetailWindowMode,
  type DetailWindowProps,
} from './DetailWindow';

type Record = { id: string; title: string; copyNumber: number; price: number };

const copies: Record[] = [
  { id: 'e6', title: 'Psiconutrición', copyNumber: 6, price: 98000 },
  { id: 'e7', title: 'Las bellas historias de la Biblia', copyNumber: 7, price: 120000 },
  { id: 'e2', title: 'El conflicto de los siglos', copyNumber: 2, price: 85000 },
];

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

function CopyIslands({ record }: { record: Record }) {
  return (
    <>
      <Island title={`${record.title} #${record.copyNumber}`} icon="books">
        <DataList>
          <DataRow label="Precio acordado" value={formatCOP(record.price)} divider={false} />
          <DataRow label="Recibido el" value={formatDate(localDate('2026-10-15'))} icon="calendar" />
        </DataList>
      </Island>
      <Island title="Historial">
        <HistoryTimeline
          items={[
            { id: 'h2', text: 'Con novedad', date: localDate('2026-11-05') },
            { id: 'h1', text: 'Recibido', date: localDate('2026-10-15') },
          ]}
        />
      </Island>
    </>
  );
}

function PaymentIslands() {
  return (
    <>
      {/* R7: la acción principal va en la isla de identidad, no en la barra. */}
      <Island title="Luz Marina Restrepo · cuota 3/4" icon="money">
        <DataList>
          <DataRow kind="amount" label="Monto" value={formatCOP(30000)} divider={false} />
          <DataRow label="Fecha acordada" value={formatDate(localDate('2026-10-28'))} />
        </DataList>
        <div style={{ paddingBottom: 'var(--space-2)' }}>
          <Button icon="money" onClick={() => {}}>
            Cobrar
          </Button>
        </div>
      </Island>
    </>
  );
}

type ScreenProps = Omit<DetailWindowProps, 'title' | 'children' | 'onClose' | 'breadcrumb'> & {
  /** Registro abierto al empezar; `null`: la lista sin ventana. */
  initial?: string | null;
  kind?: 'copy' | 'payment';
  /** Sin `onNext` en el último registro (CA-4). */
  lastHasNoNext?: boolean;
};

/** La pantalla de ejemplo: la lista (el «fondo» del diseño) y la ventana del registro abierto. */
function Screen({
  initial = 'e6',
  kind = 'copy',
  lastHasNoNext = true,
  mode,
  onModeChange,
  onPrev,
  onNext,
}: ScreenProps) {
  const [openId, setOpenId] = useState<string | null>(initial);
  const index = copies.findIndex((c) => c.id === openId);
  const record = copies[index];
  const go = (step: number) => setOpenId(copies[(index + step + copies.length) % copies.length]!.id);
  const hasNext = !(lastHasNoNext && index === copies.length - 1);
  return (
    <div style={{ minHeight: 640 }}>
      <ListTable kind="copy" aria-label="Ejemplares">
        {copies.map((c) => (
          <ListRow
            key={c.id}
            kind="copy"
            title={c.title}
            copyNumber={c.copyNumber}
            amount={c.price}
            date={localDate('2026-10-15')}
            status="in_stock"
            selected={c.id === openId}
            onOpen={() => setOpenId(c.id)}
          />
        ))}
      </ListTable>
      {record && (
        <DetailWindow
          mode={mode}
          onModeChange={onModeChange}
          title={kind === 'copy' ? `${record.title} #${record.copyNumber}` : 'Abono de Luz Marina Restrepo'}
          breadcrumb={{ label: kind === 'copy' ? 'Inventario' : 'Dinero', href: '#lista' }}
          onClose={() => setOpenId(null)}
          onPrev={() => {
            onPrev?.();
            go(-1);
          }}
          onNext={
            hasNext
              ? () => {
                  onNext?.();
                  go(1);
                }
              : undefined
          }
          moreActions={moreActions}
        >
          {kind === 'copy' ? <CopyIslands record={record} /> : <PaymentIslands />}
        </DetailWindow>
      )}
    </div>
  );
}

const meta = {
  title: 'Organismos/Ventana de detalle',
  component: DetailWindow,
  render: (args) => (
    <Screen mode={args.mode} onModeChange={args.onModeChange} onPrev={args.onPrev} onNext={args.onNext} />
  ),
  args: {
    title: 'Psiconutrición #6',
    breadcrumb: { label: 'Inventario', href: '#lista' },
    onClose: fn(),
    onModeChange: fn(),
    onPrev: fn(),
    onNext: fn(),
    children: null,
  },
  argTypes: {
    mode: { control: 'inline-radio', options: ['side', 'center', 'page', 'sheet'] },
    children: { control: false },
  },
  // R4: cada story empieza sin forma guardada (lateral), tampoco la de cada tipo.
  beforeEach: () => {
    try {
      window.localStorage.removeItem(DETAIL_WINDOW_MODE_KEY);
      for (const kind of ['customer', 'payment', 'copy', 'deposit'])
        window.localStorage.removeItem(`${DETAIL_WINDOW_MODE_KEY}.${kind}`);
    } catch {
      // Sin almacenamiento: nada que limpiar.
    }
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          // Cada marco abre su propia ventana; una modal (centrada u hoja) oculta lo demás, incluidos los otros marcos.
          { id: 'aria-hidden-focus', enabled: false },
          // Los marcos repiten la misma sección o diálogo con el mismo nombre en la página.
          { id: 'landmark-unique', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Lib-VentanaDetalle',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Lateral, para revisar varios registros seguidos (anterior / siguiente).',
        'Centrada, para editar o confirmar con toda la atención.',
        'Página, para trabajo largo o un enlace para compartir.',
        'En móvil, la hoja para una vista rápida y la página para el detalle completo.',
      ],
      whenNotToUse: [
        'Para crear un registro con muchos pasos (pantalla de crear).',
        'Para una confirmación simple (Diálogo).',
      ],
      usedIn: ['Inventario', 'Clientes', 'Dinero'],
    },
    docs: {
      description: {
        component:
          'Abre el detalle de un registro sin perder la lista. Escritorio: lateral (780, la lista sigue viva), centrada (940 sobre fondo oscurecido) o página (con ruta de vuelta). La última forma elegida se guarda en el dispositivo. Móvil: página completa con Volver, u hoja al 80 % que se cierra deslizando hacia abajo. J y K van al anterior y al siguiente. Las URL (página y parámetro de las demás formas, R8) las pone la pantalla.',
      },
    },
  },
} satisfies Meta<typeof DetailWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const windowOf = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[role="dialog"], section[aria-labelledby], section[aria-label]');
const titleOf = (frame: HTMLElement) => windowOf(frame)!.querySelector('h1, h2')!.textContent;
const rowButton = (frame: HTMLElement, i: number) =>
  frame.querySelectorAll<HTMLElement>(
    '[role="table"] [role="row"] button, ul[aria-label="Ejemplares"] li > button',
  )[i]!;
const bodyRect = (frame: HTMLElement) => frame.querySelector('.sb-frame__body')!.getBoundingClientRect();
const radio = (frame: HTMLElement, name: string) =>
  [...frame.querySelectorAll<HTMLElement>('[role="radio"]')].find((r) => r.textContent === name)!;

export const Explorar: Story = {};

// ─── Escritorio ───

/** R2 y R6: lateral de 780 a la derecha, sin bloquear la lista; abrir otra fila reemplaza el contenido. */
export const Lateral: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) continue;
      const win = windowOf(frame)!;
      expect(win.getAttribute('role')).toBe('dialog');
      expect(win.getAttribute('aria-modal')).toBeNull();
      expect(win.getBoundingClientRect().width).toBe(780);
      expect(Math.abs(win.getBoundingClientRect().right - (bodyRect(frame).right - 1))).toBeLessThanOrEqual(
        1,
      );
      expect(frame.querySelector('[role="row"][aria-current="true"]')).not.toBeNull();
      expect(radio(frame, 'Lateral').getAttribute('aria-checked')).toBe('true');
      await userEvent.click(rowButton(frame, 1));
      await waitFor(() => expect(titleOf(frame)).toBe('Las bellas historias de la Biblia #7'));
      expect(frame.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    }
  },
};

/** CA-1: de lateral a «Centrada»: 940 sobre fondo oscurecido, `onModeChange('center')`, y el próximo detalle abre centrado. */
export const CambiarACentrada: Story = {
  name: 'Cambiar a centrada',
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) continue;
      await userEvent.click(radio(frame, 'Centrada'));
      await waitFor(() => expect(windowOf(frame)!.getBoundingClientRect().width).toBe(940));
      expect(windowOf(frame)!.getAttribute('aria-modal')).toBe('true');
      expect(args.onModeChange).toHaveBeenCalledWith('center');
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(windowOf(frame)).toBeNull());
      await userEvent.click(rowButton(frame, 2));
      await waitFor(() => expect(windowOf(frame)).not.toBeNull());
      expect(windowOf(frame)!.getBoundingClientRect().width).toBe(940);
      expect(radio(frame, 'Centrada').getAttribute('aria-checked')).toBe('true');
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(windowOf(frame)).toBeNull());
    }
  },
};

/**
 * 2026-11-25: cada tipo de ventana recuerda su forma. Elegir «Centrada» en un abono no cambia la ficha del cliente;
 * un tipo que aún no eligió arranca con la forma que se guardó antes sin tipo.
 */
export const CadaTipoRecuerdaSuForma: Story = {
  name: 'Cada tipo recuerda su forma',
  globals: { platform: 'desktop' },
  render: () => (
    <div style={{ minHeight: 640 }}>
      <DetailWindow
        rememberAs="payment"
        title="Abono de Luz Marina Restrepo"
        breadcrumb={{ label: 'Dinero', href: '#lista' }}
        onClose={() => {}}
      >
        <PaymentIslands />
      </DetailWindow>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    window.localStorage.setItem(`${DETAIL_WINDOW_MODE_KEY}.customer`, 'side');
    await userEvent.click(radio(frame, 'Centrada'));
    await waitFor(() => expect(readStoredDetailWindowMode('payment')).toBe('center'));
    expect(readStoredDetailWindowMode('customer')).toBe('side');
    window.localStorage.setItem(DETAIL_WINDOW_MODE_KEY, 'page');
    expect(readStoredDetailWindowMode('copy')).toBe('page');
    expect(readStoredDetailWindowMode('payment')).toBe('center');
  },
};

/**
 * 2026-11-25: «Página» desde una lista no vuelve la ventana una página dentro de la lista (a la derecha, con la lista
 * a la izquierda): se queda lateral mientras quien la usa navega a la página del registro.
 */
export const PaginaDesdeLaLista: Story = {
  name: 'Página desde la lista, sin salto',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    const before = windowOf(frame)!.getBoundingClientRect().width;
    await userEvent.click(radio(frame, 'Página'));
    expect(args.onModeChange).toHaveBeenCalledWith('page');
    expect(windowOf(frame)!.getBoundingClientRect().width).toBe(before);
    expect(readStoredDetailWindowMode()).toBe('page');
  },
};

/** CA-3: centrada abierta desde una fila; Esc la cierra y el foco vuelve a esa fila. */
export const Centrada: Story = {
  args: { mode: 'center' },
  render: (args) => <Screen initial={null} mode={args.mode} />,
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) continue;
      const row = rowButton(frame, 0);
      row.focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(windowOf(frame)).not.toBeNull());
      expect(windowOf(frame)!.getAttribute('aria-modal')).toBe('true');
      expect(frame.querySelector('[data-state="open"]:not([role="dialog"])')).not.toBeNull();
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(windowOf(frame)).toBeNull());
      expect(document.activeElement).toBe(row);
    }
  },
};

/** R1: en página, la ruta «Inventario / Psiconutrición #6» en lugar de cerrar, y el título es el `<h1>`. */
export const Pagina: Story = {
  name: 'Página',
  args: { mode: 'page' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) continue;
      const win = windowOf(frame)!;
      const crumb = win.querySelector('nav[aria-label="Ruta"]')!;
      expect(crumb.textContent).toBe('Inventario/Psiconutrición #6');
      expect(crumb.querySelector('a')!.getAttribute('href')).toBe('#lista');
      expect(win.querySelector('h1')!.textContent).toBe('Psiconutrición #6');
      expect(win.querySelector('[aria-label="Cerrar"]')).toBeNull();
    }
  },
};

/** CA-4: con el foco dentro, K llama `onNext` y J `onPrev`; en el último, sin `onNext`, el botón está deshabilitado. */
export const LateralAbono: Story = {
  name: 'Lateral · abono',
  render: (args) => <Screen kind="payment" initial="e2" onPrev={args.onPrev} onNext={args.onNext} />,
  play: async ({ canvasElement, args }) => {
    const onNext = args.onNext as ReturnType<typeof fn>;
    const onPrev = args.onPrev as ReturnType<typeof fn>;
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) continue;
      onNext.mockClear();
      onPrev.mockClear();
      const win = windowOf(frame)!;
      expect([...win.querySelectorAll('button')].some((b) => b.textContent === 'Cobrar')).toBe(true);
      const next = win.querySelector<HTMLElement>('[aria-label="Siguiente"]')!;
      expect(next.getAttribute('aria-disabled')).toBe('true');
      win.querySelector<HTMLElement>('[aria-label="Cerrar"]')!.focus();
      await userEvent.keyboard('k');
      expect(onNext).not.toHaveBeenCalled();
      await userEvent.keyboard('j');
      expect(onPrev).toHaveBeenCalledTimes(1);
      windowOf(frame)!.querySelector<HTMLElement>('[aria-label="Cerrar"]')!.focus();
      await userEvent.keyboard('k');
      expect(onNext).toHaveBeenCalledTimes(1);
    }
  },
};

// ─── Móvil ───

/** CA-2: `mode="side"` en móvil se pinta como página completa con Volver. */
export const PaginaMovil: Story = {
  name: 'Página · móvil',
  args: { mode: 'side' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      const win = windowOf(frame)!;
      expect(win.tagName).toBe('SECTION');
      expect(win.querySelector('[aria-label="Volver a Inventario"]')).not.toBeNull();
      expect(win.querySelector('h1')!.textContent).toBe('Psiconutrición #6');
      expect(frame.querySelector('[role="radio"]')).toBeNull();
    }
  },
};

/** CA-5: la hoja al 80 % se cierra deslizándola hacia abajo. */
export const Hoja: Story = {
  name: 'Hoja · móvil',
  args: { mode: 'sheet' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      const win = windowOf(frame)!;
      expect(win.getAttribute('aria-modal')).toBe('true');
      const body = bodyRect(frame);
      expect(Math.round(win.getBoundingClientRect().height)).toBe(Math.round((body.height - 2) * 0.8));
      const handle = win.querySelector<HTMLElement>('[data-part="handle"]')!;
      const { left, top } = handle.getBoundingClientRect();
      await userEvent.pointer([
        { keys: '[MouseLeft>]', target: handle, coords: { clientX: left + 4, clientY: top } },
        { target: handle, coords: { clientX: left + 4, clientY: top + 60 } },
        { target: handle, coords: { clientX: left + 4, clientY: top + 160 } },
        { keys: '[/MouseLeft]', target: handle, coords: { clientX: left + 4, clientY: top + 160 } },
      ]);
      await waitFor(() => expect(windowOf(frame)).toBeNull());
    }
  },
};

export const PaginaAbonoMovil: Story = {
  name: 'Página · abono · móvil',
  render: () => <Screen kind="payment" mode="page" />,
};

export const HojaAbonoMovil: Story = {
  name: 'Hoja · abono · móvil',
  render: () => <Screen kind="payment" mode="sheet" />,
};

/** Claro y oscuro × escritorio y móvil, en lateral (escritorio) y página (móvil). */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => <Screen mode={'side' as DetailWindowMode} />,
};
