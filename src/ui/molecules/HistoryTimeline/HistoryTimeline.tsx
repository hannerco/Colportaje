'use client';

import { useEffect, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { formatDate, type LocalDate } from '@/domain/time';
import styles from './HistoryTimeline.module.css';

export type HistoryItem = {
  id: string;
  /** Qué pasó, armado por la pantalla desde `copy/es.ts` («Apareció», «Cobrado en efectivo · $65.000»). */
  text: string;
  /** Nota opcional, en gris. */
  note?: string;
  date: LocalDate;
};

export type HistoryTimelineProps = {
  /** Entradas (`conjunto`), de la más reciente a la más antigua. */
  items: HistoryItem[];
  /** Deshacer el último cambio (`deshacer`). Si existe, aparece en la primera entrada; lo decide el modelo de vista. */
  undo?: { label: string; onUndo: () => void };
  /** Cuántas entradas se ven antes de «Ver todo». */
  maxVisible?: number;
  className?: string;
};

/**
 * Historial (HU-UI-19, ficha Lib-Historial): línea de tiempo de lo que le pasó a un registro, del más reciente al
 * más antiguo (`<ol>`). El último cambio se puede deshacer desde la primera entrada.
 */
export function HistoryTimeline({ items, undo, maxVisible = 5, className }: HistoryTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const firstRevealed = useRef<HTMLLIElement>(null);
  const focusRevealed = useRef(false);
  const limit = Math.max(1, maxVisible);
  const shown = expanded ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;

  // R3: «Ver todo» desaparece al desplegar; el foco pasa a la primera entrada que apareció.
  useEffect(() => {
    if (!focusRevealed.current) return;
    focusRevealed.current = false;
    firstRevealed.current?.focus();
  }, [expanded]);

  return (
    <div className={[styles.history, className].filter(Boolean).join(' ')}>
      <ol className={styles.list}>
        {shown.map((item, i) => (
          <li
            key={item.id}
            className={styles.item}
            data-latest={i === 0 || undefined}
            ref={expanded && i === limit ? firstRevealed : undefined}
            tabIndex={expanded && i === limit ? -1 : undefined}
          >
            <span className={styles.rail} aria-hidden="true">
              <span className={styles.dot} />
            </span>
            <span className={styles.body}>
              <span className={styles.line}>
                <span className={styles.text}>{item.text}</span>
                <span className={styles.date}>{formatDate(item.date)}</span>
              </span>
              {item.note && <span className={styles.note}>{item.note}</span>}
              {i === 0 && undo && (
                <button type="button" className={styles.undo} onClick={undo.onUndo}>
                  {undo.label}
                  <span className={styles.visuallyHidden}>{copy.ui.history.undoTarget(item.text)}</span>
                </button>
              )}
            </span>
          </li>
        ))}
      </ol>
      {hidden > 0 && (
        <button
          type="button"
          className={styles.showAll}
          onClick={() => {
            focusRevealed.current = true;
            setExpanded(true);
          }}
        >
          {copy.ui.history.showAll}
        </button>
      )}
    </div>
  );
}
