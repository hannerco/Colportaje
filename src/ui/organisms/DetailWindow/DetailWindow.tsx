'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as RadioGroup from '@radix-ui/react-radio-group';
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { copy } from '@/copy/es';
import { Button } from '../../atoms/Button';
import { Icon } from '../../icons';
import { usePlatform, type Platform } from '../../platform';
import { PageHeader } from '../PageHeader';
import styles from './DetailWindow.module.css';

export type DetailWindowMode = 'side' | 'center' | 'page' | 'sheet';
type DesktopMode = 'side' | 'center' | 'page';

/**
 * R4: dónde se guarda en el dispositivo la última forma elegida en escritorio (FT-04). Desde el 2026-11-25 cada tipo
 * de ventana guarda la suya (`…-mode.customer`, `…-mode.payment`…): la ficha puede abrirse lateral y el abono
 * centrado. La clave sin tipo (la de antes) queda como valor inicial de los tipos que aún no eligieron.
 */
export const DETAIL_WINDOW_MODE_KEY = 'colportor.detail-window-mode';
const keyOf = (rememberAs?: string) =>
  rememberAs ? `${DETAIL_WINDOW_MODE_KEY}.${rememberAs}` : DETAIL_WINDOW_MODE_KEY;

const DESKTOP_MODES: DesktopMode[] = ['side', 'center', 'page'];
const isDesktopMode = (value: unknown): value is DesktopMode => DESKTOP_MODES.includes(value as DesktopMode);

/**
 * La forma guardada para ese tipo de ventana (`rememberAs`: «customer», «payment»…); si ese tipo aún no eligió, la que
 * se guardó antes sin tipo; sin nada guardado (o sin acceso al almacenamiento), lateral.
 */
export function readStoredDetailWindowMode(rememberAs?: string): DesktopMode {
  try {
    if (typeof window === 'undefined') return 'side';
    const own = window.localStorage.getItem(keyOf(rememberAs));
    if (isDesktopMode(own)) return own;
    const legacy = window.localStorage.getItem(DETAIL_WINDOW_MODE_KEY);
    return isDesktopMode(legacy) ? legacy : 'side';
  } catch {
    return 'side';
  }
}

function storeMode(mode: DesktopMode, rememberAs?: string) {
  try {
    window.localStorage.setItem(keyOf(rememberAs), mode);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): la forma vale solo mientras la ventana esté abierta.
  }
}

/** Una forma que no existe en la plataforma se convierte: lateral o centrada → página en móvil; hoja → lateral. */
export function resolveDetailWindowMode(mode: DetailWindowMode, platform: Platform): DetailWindowMode {
  if (platform === 'mobile') return mode === 'sheet' ? 'sheet' : 'page';
  return mode === 'sheet' ? 'side' : mode;
}

export type DetailWindowProps = {
  /** Forma (`modo`). Sin valor: en escritorio la última elegida en el dispositivo (R4); en móvil, página. */
  mode?: DetailWindowMode;
  /** Al elegir otra forma en el selector (escritorio). La forma también queda guardada en el dispositivo. */
  onModeChange?: (mode: DetailWindowMode) => void;
  /**
   * Qué se abre («customer», «payment», «copy», «deposit»…): cada tipo recuerda su última forma por separado
   * (2026-11-25). Sin valor, la forma compartida de antes.
   */
  rememberAs?: string;
  /** Nombre con número, p. ej. «Psiconutrición #6». */
  title: string;
  /** Ruta de vuelta en modo página («Inventario»); en móvil, a dónde lleva Volver. */
  breadcrumb: { label: string; href: string };
  onClose: () => void;
  /** Registro anterior (también con J). Sin función, el botón queda deshabilitado. */
  onPrev?: () => void;
  /** Registro siguiente (también con K). Sin función, el botón queda deshabilitado. */
  onNext?: () => void;
  /** Menú «Más acciones» (un `Menu` con disparador `more`). */
  moreActions?: ReactElement;
  /** Las islas del registro. La acción principal (p. ej. Cobrar) va en la isla de identidad, no en la barra (R7). */
  children: ReactNode;
  /**
   * El encabezado del detalle lo pone el contenido (la isla de identidad de la Plantilla de detalle, HU-UI-29): la
   * barra muestra el título como texto, sin `<h1>`/`<h2>`, y el diálogo sigue nombrado por él.
   */
  headingInContent?: boolean;
  className?: string;
};

/** Lo que el contenido necesita saber de la ventana que lo contiene. */
export type DetailWindowContextValue = {
  mode: DetailWindowMode;
  /** Nivel del encabezado del contenido: `h1` en la página de escritorio; `h2` en las demás formas. */
  heading: 'h1' | 'h2';
};

const DetailWindowContext = createContext<DetailWindowContextValue | null>(null);

/** La forma de la ventana que contiene a este componente (o `null` fuera de una ventana de detalle). */
export const useDetailWindow = () => useContext(DetailWindowContext);

/** Distancia en px que hay que deslizar la hoja hacia abajo para cerrarla (CA-5). */
const SWIPE_TO_CLOSE = 96;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Ventana de detalle (HU-UI-27, ficha Lib-VentanaDetalle): abre el detalle de un registro sin perder la lista.
 * Escritorio: lateral (780, sin bloquear la lista), centrada (940 sobre fondo oscurecido) o página. Móvil: página
 * completa con Volver, u hoja inferior al 80 % para una vista rápida. Nunca se abre una encima de otra: abrir otro
 * registro reemplaza el contenido (R6).
 */
export function DetailWindow(props: DetailWindowProps) {
  const {
    mode,
    onModeChange,
    rememberAs,
    title,
    breadcrumb,
    onClose,
    onPrev,
    onNext,
    moreActions,
    children,
    headingInContent = false,
    className,
  } = props;
  const platform = usePlatform();
  const mobile = platform === 'mobile';
  const [stored, setStored] = useState<DesktopMode>(() => readStoredDetailWindowMode(rememberAs));
  const resolved = resolveDetailWindowMode(mode ?? (mobile ? 'page' : stored), platform);

  const changeMode = (next: DesktopMode) => {
    storeMode(next, rememberAs);
    // «Página» desde una lista: quien la usa navega a la página del registro. Mientras llega, la ventana se queda
    // como está; antes se volvía página dentro de la lista (a la derecha, con la lista a la izquierda) y luego saltaba.
    if (!(next === 'page' && mode === undefined && onModeChange)) setStored(next);
    onModeChange?.(next);
  };

  // Esc devuelve el foco a quien abrió la ventana (la fila de la lista): se recuerda al abrirse.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
  }, []);
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    opener.current?.focus();
  };

  // Las capas flotantes se pintan en el ámbito de tema y plataforma más cercano (un marco del Storybook) o en el body.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const findScope = useCallback(
    (node: HTMLSpanElement | null) => setContainer(node?.closest<HTMLElement>('[data-ui-scope]') ?? null),
    [],
  );

  // R5: J anterior y K siguiente, con el foco dentro y sin un campo de texto enfocado.
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
    const key = event.key.toLowerCase();
    if (key === 'k' && onNext) {
      event.preventDefault();
      onNext();
    } else if (key === 'j' && onPrev) {
      event.preventDefault();
      onPrev();
    }
  };

  const titleId = useId();
  const [drag, setDrag] = useState(0);
  // En móvil la página ya tiene el `<h1>` del Encabezado; en escritorio, solo si el contenido no pone el suyo.
  const context: DetailWindowContextValue = {
    mode: resolved,
    heading: resolved === 'page' && (!mobile || headingInContent) ? 'h1' : 'h2',
  };
  const body = (
    <DetailWindowContext.Provider value={context}>
      <div className={styles.body}>{children}</div>
    </DetailWindowContext.Provider>
  );
  const PageTitle = headingInContent ? 'span' : 'h1';
  const navButtons = (
    <span className={styles.group}>
      <Button variant="tertiary" iconOnly icon="back" state={onPrev ? 'normal' : 'disabled'} onClick={onPrev}>
        {copy.ui.detailWindow.prev}
      </Button>
      <Button variant="tertiary" iconOnly icon="next" state={onNext ? 'normal' : 'disabled'} onClick={onNext}>
        {copy.ui.detailWindow.next}
      </Button>
    </span>
  );
  const toolbar = (
    <span className={styles.tools}>
      {!mobile && <ModeSelector value={resolved as DesktopMode} onChange={changeMode} />}
      {!mobile && navButtons}
      {moreActions}
    </span>
  );
  const rootClass = (shape: string) => [styles.window, styles[shape], className].filter(Boolean).join(' ');

  // ─── Página ───
  if (resolved === 'page') {
    if (mobile)
      return (
        <section className={rootClass('mobilePage')} aria-label={title} onKeyDown={handleKeyDown}>
          <PageHeader
            kind="detail"
            title={title}
            back={{ label: breadcrumb.label, href: breadcrumb.href }}
            moreActions={moreActions}
            hideTitle={headingInContent}
          />
          {body}
        </section>
      );
    return (
      <section className={rootClass('page')} aria-labelledby={titleId} onKeyDown={handleKeyDown}>
        <div className={styles.bar}>
          <nav aria-label={copy.ui.detailWindow.breadcrumb} className={styles.breadcrumb}>
            <a href={breadcrumb.href}>{breadcrumb.label}</a>
            <span aria-hidden="true">/</span>
            <PageTitle id={titleId} className={styles.title}>
              {title}
            </PageTitle>
          </nav>
          {toolbar}
        </div>
        <div className={styles.pageBody}>{body}</div>
      </section>
    );
  }

  // ─── Lateral, centrada y hoja: Radix Dialog ───
  const modal = resolved !== 'side';
  const dialogTitle = headingInContent ? (
    <Dialog.Title asChild>
      <span className={styles.title}>{title}</span>
    </Dialog.Title>
  ) : (
    <Dialog.Title className={styles.title}>{title}</Dialog.Title>
  );
  return (
    <>
      <span ref={findScope} hidden />
      <Dialog.Root
        open
        modal={modal}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Dialog.Portal container={container ?? undefined}>
          {modal && <Dialog.Overlay className={styles.scrim} />}
          <Dialog.Content
            className={rootClass(resolved)}
            aria-describedby={undefined}
            // Centrada y hoja bloquean lo de atrás: se dice explícitamente (Radix solo lo oculta con `aria-hidden`).
            aria-modal={modal || undefined}
            data-dragging={drag > 0 || undefined}
            style={drag > 0 ? ({ '--sheet-drag': `${drag}px` } as CSSProperties) : undefined}
            onKeyDown={handleKeyDown}
            onCloseAutoFocus={restoreFocus}
            // Lateral: la lista sigue viva detrás; tocarla (abrir otra fila) no cierra la ventana (R6).
            onInteractOutside={(event) => {
              if (!modal) event.preventDefault();
            }}
          >
            {resolved === 'sheet' ? (
              <SheetGrip onDrag={setDrag} onClose={onClose}>
                {dialogTitle}
                {toolbar}
              </SheetGrip>
            ) : (
              <div className={styles.bar}>
                <span className={styles.group}>
                  <Button variant="tertiary" iconOnly icon="close" onClick={onClose}>
                    {copy.ui.detailWindow.close}
                  </Button>
                  {dialogTitle}
                </span>
                {toolbar}
              </div>
            )}
            {body}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/** R1: selector de forma, un grupo de radios con ícono (escritorio). */
function ModeSelector({ value, onChange }: { value: DesktopMode; onChange: (mode: DesktopMode) => void }) {
  const icons = { side: 'window-side', center: 'window-center', page: 'window-page' } as const;
  return (
    <RadioGroup.Root
      className={styles.modes}
      value={value}
      onValueChange={(next) => {
        if (isDesktopMode(next)) onChange(next);
      }}
      orientation="horizontal"
      aria-label={copy.ui.detailWindow.modeGroup}
    >
      {DESKTOP_MODES.map((mode) => (
        <RadioGroup.Item
          key={mode}
          value={mode}
          className={styles.mode}
          title={copy.ui.detailWindow.modes[mode]}
        >
          <Icon name={icons[mode]} tone="current" />
          <span className={styles.visuallyHidden}>{copy.ui.detailWindow.modes[mode]}</span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

/** R3 y CA-5: la parte de arriba de la hoja (asa y barra) se puede deslizar hacia abajo para cerrarla. */
function SheetGrip({
  onDrag,
  onClose,
  children,
}: {
  onDrag: (distance: number) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const start = useRef<number | null>(null);
  const distance = useRef(0);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a, [role="radio"]')) return;
    start.current = event.clientY;
    distance.current = 0;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Algunos punteros simulados no se pueden capturar; el gesto sigue funcionando.
    }
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return;
    distance.current = Math.max(0, event.clientY - start.current);
    onDrag(distance.current);
  };
  const onPointerUp = () => {
    if (start.current === null) return;
    start.current = null;
    onDrag(0);
    if (distance.current >= SWIPE_TO_CLOSE) onClose();
  };

  return (
    <div
      className={styles.grip}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className={styles.handle} aria-hidden="true" data-part="handle" />
      <div className={styles.bar}>{children}</div>
    </div>
  );
}
