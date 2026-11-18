'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { Icon } from '../../icons';
import { createDismissTimer, type DismissTimer } from './dismiss-timer';
import styles from './Toast.module.css';

export type ToastTone = 'info' | 'success' | 'error';

export type ToastAction = { label: string; onAction: () => void };

export type ToastProps = {
  /** Qué pasó, en pasado (`mensaje`). */
  message: string;
  /** Botón del aviso (`accion`), p. ej. «Deshacer» o «Reintentar». Sin acción no hay botón. */
  action?: ToastAction;
  /** Tipo (`tipo`): cambia el ícono (éxito ✓, error ⚠; información sin ícono). */
  tone?: ToastTone;
  /**
   * Se cierra solo a los `durationMs` (R3); el tiempo se pausa con el foco o el puntero encima. Con `useToast()`, por
   * defecto el de `ToastProvider` (`undo.toastSeconds`, I-34). Sin valor, no se cierra solo.
   */
  durationMs?: number;
  /** Ancho (`ancho`) en px, o `auto` (el del contenido). Por defecto, 380 en escritorio y el 100 % en móvil. */
  width?: number | 'auto';
  /** Al cerrarse: por tiempo o tras pulsar la acción. */
  onDismiss?: () => void;
  /**
   * El aviso es su propia región `role="status"`. `ToastProvider` lo pone en `false` porque su contenedor ya es la
   * región (siempre presente, para que el lector anuncie cada aviso nuevo).
   */
  live?: boolean;
  className?: string;
};

const ICON = { success: 'check', error: 'alert' } as const;

/**
 * Aviso (HU-UI-15, ficha Lib-Aviso): mensaje breve y temporal que confirma lo que acaba de pasar y deja deshacerlo.
 * Se muestra con `useToast().show()`; `ToastProvider` lo coloca abajo a la izquierda (escritorio) o sobre la barra
 * inferior (móvil). Un aviso a la vez.
 */
export function Toast({
  message,
  action,
  tone = 'success',
  durationMs,
  width,
  onDismiss,
  live = true,
  className,
}: ToastProps) {
  const timer = useRef<DismissTimer | null>(null);
  const done = useRef(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    if (durationMs === undefined) return;
    const created = createDismissTimer(durationMs, () => {
      done.current = true;
      dismiss.current?.();
    });
    timer.current = created;
    return () => {
      created.stop();
      timer.current = null;
    };
  }, [durationMs]);

  // R5: la acción corre una sola vez y cierra el aviso.
  const handleAction = () => {
    if (done.current || !action) return;
    done.current = true;
    timer.current?.stop();
    action.onAction();
    dismiss.current?.();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) timer.current?.resume('focus');
  };

  const style =
    width === undefined
      ? undefined
      : ({ '--toast-width': width === 'auto' ? 'max-content' : `${width}px` } as CSSProperties);
  const icon = tone === 'info' ? undefined : ICON[tone];

  return (
    <div
      className={[styles.toast, className].filter(Boolean).join(' ')}
      style={style}
      data-tone={tone}
      {...(live ? { role: 'status', 'aria-live': 'polite' as const } : {})}
      onPointerEnter={() => timer.current?.pause('hover')}
      onPointerLeave={() => timer.current?.resume('hover')}
      onFocus={() => timer.current?.pause('focus')}
      onBlur={handleBlur}
    >
      {icon && <Icon name={icon} size={18} tone="current" className={styles.icon} />}
      <span className={styles.message}>{message}</span>
      {action && (
        <button type="button" className={styles.action} onClick={handleAction}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── Proveedor ───

export type ToastOptions = Omit<ToastProps, 'onDismiss' | 'live' | 'className'>;

type ToastContextValue = {
  /** Muestra un aviso; si ya había uno, lo reemplaza (R2). */
  show: (options: ToastOptions) => void;
  /** Cierra el aviso visible. */
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export type ToastProviderProps = {
  /** Duración por defecto de los avisos: `businessConfig.undo.toastSeconds × 1000` (la raíz de la app la pasa). */
  durationMs: number;
  children: ReactNode;
};

/** Va en la raíz de la app: da `useToast()` y pinta el aviso visible en su sitio (R4). */
export function ToastProvider({ durationMs, children }: ToastProviderProps) {
  const [current, setCurrent] = useState<{ id: number; options: ToastOptions } | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback(() => setCurrent(null), []);
  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setCurrent({ id: nextId.current, options });
  }, []);
  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} role="status" aria-live="polite">
        {current && (
          <Toast
            key={current.id}
            {...current.options}
            durationMs={current.options.durationMs ?? durationMs}
            onDismiss={dismiss}
            live={false}
          />
        )}
      </div>
    </ToastContext.Provider>
  );
}

/** Muestra avisos desde cualquier pantalla. Necesita `ToastProvider` arriba. */
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast() needs a <ToastProvider> above it.');
  return value;
}
