'use client';

import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import styles from './SwipeRow.module.css';

export type SwipeRowProps = {
  /** Contenido de la fila (normalmente un enlace al detalle): se desliza encima de las acciones. */
  children: ReactNode;
  /** Acciones que aparecen al deslizar hacia la derecha (a la izquierda de la fila). */
  start?: ReactNode;
  /** Acciones que aparecen al deslizar hacia la izquierda (a la derecha de la fila). */
  end?: ReactNode;
  /** Sin deslizar (p. ej. sin conexión): las acciones siguen en el orden del foco, deshabilitadas por quien las pone. */
  disabled?: boolean;
};

type Side = 'start' | 'end';

/** Píxeles que hay que mover para que cuente como deslizar (y no como tocar). */
const DRAG_START = 8;
/** Fracción del ancho de las acciones que deja la fila abierta al soltar. */
const OPEN_RATIO = 0.4;

/**
 * Fila que se desliza (diseño «Por resolver · deslizar», pieza del módulo): hacia la derecha muestra las acciones de
 * `start`; hacia la izquierda, las de `end`. Las acciones son botones reales detrás de la fila: con el teclado o un
 * lector de pantalla se llega a ellas sin deslizar, y al recibir el foco la fila se abre hacia su lado.
 */
export function SwipeRow({ children, start, end, disabled = false }: SwipeRowProps) {
  // Desplazamiento en reposo: 0 (cerrada), el ancho de `start` (abierta a la derecha) o menos el de `end`.
  const [rest, setRest] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const widthOf = (side: Side) => (side === 'start' ? startRef.current : endRef.current)?.offsetWidth ?? 0;
  const openTo = (side: Side | null) =>
    setRest(side === 'start' ? widthOf('start') : side === 'end' ? -widthOf('end') : 0);
  const offset = drag ?? rest;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.pointerType === 'mouse') return;
    startX.current = event.clientX;
    moved.current = false;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    if (!moved.current && Math.abs(delta) < DRAG_START) return;
    moved.current = true;
    const next = rest + delta;
    const min = end ? -widthOf('end') : 0;
    const max = start ? widthOf('start') : 0;
    setDrag(Math.max(min, Math.min(max, next)));
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    if (drag === null) return;
    if (drag > widthOf('start') * OPEN_RATIO && start) openTo('start');
    else if (drag < -widthOf('end') * OPEN_RATIO && end) openTo('end');
    else openTo(null);
    setDrag(null);
  };

  return (
    <div className={styles.row} data-dragging={drag !== null || undefined}>
      {start && (
        <div ref={startRef} className={`${styles.actions} ${styles.start}`} onFocus={() => openTo('start')}>
          {start}
        </div>
      )}
      {end && (
        <div ref={endRef} className={`${styles.actions} ${styles.end}`} onFocus={() => openTo('end')}>
          {end}
        </div>
      )}
      <div
        className={styles.content}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onFocus={() => openTo(null)}
        // Un deslizamiento no abre el enlace de la fila.
        onClickCapture={(event) => {
          if (moved.current) {
            event.preventDefault();
            event.stopPropagation();
            moved.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
