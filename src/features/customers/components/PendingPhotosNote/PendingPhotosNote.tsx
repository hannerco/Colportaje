'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { Button } from '@/ui/atoms/Button';
import { Icon } from '@/ui/icons';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import styles from './PendingPhotosNote.module.css';

export type PendingPhotosNoteProps = {
  /** Fotos que esperan su turno o señal. */
  pending: number;
  /** Una de ellas se está subiendo ahora. */
  uploading: boolean;
  /** Fotos que no se pudieron subir y esperan que la persona decida. */
  failed: number;
  /** Vuelve a subir las que fallaron. */
  onRetry: () => void;
  /** Borra del teléfono las que fallaron (pide confirmación). */
  onDiscard: () => Promise<void> | void;
};

const t = copy.customers.pendingPhotos;

/**
 * Lo que este teléfono aún no sube (bandeja de fotos, ADR-0054), en la ficha del cliente. «Subiendo…» mientras sube;
 * «guardadas en este teléfono» mientras espera señal; y, si alguna falló sin remedio, «Reintentar» o «Descartar».
 * Pieza del módulo, sin diseño propio: usa la misma línea de «Subiendo la foto…» de la Factura.
 */
export function PendingPhotosNote({
  pending,
  uploading,
  failed,
  onRetry,
  onDiscard,
}: PendingPhotosNoteProps) {
  const [confirming, setConfirming] = useState(false);
  if (pending === 0 && failed === 0) return null;
  return (
    <div className={styles.note}>
      {pending > 0 && (
        <p className={styles.line} role="status">
          {uploading ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : (
            <Icon name="offline" size={16} tone="current" />
          )}
          {uploading ? t.uploading(pending) : t.waiting(pending)}
        </p>
      )}
      {failed > 0 && (
        <div className={styles.failed} role="alert">
          <p className={styles.line}>
            <Icon name="alert" size={16} tone="current" />
            {t.failed(failed)}
          </p>
          <span className={styles.actions}>
            <Button variant="link" onClick={onRetry}>
              {t.retry}
            </Button>
            <Button variant="link" onClick={() => setConfirming(true)}>
              {t.discard}
            </Button>
          </span>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        tone="danger"
        title={t.discardTitle(failed)}
        message={t.discardMessage}
        confirmLabel={t.discard}
        cancelLabel={t.cancel}
        onConfirm={async () => {
          await onDiscard();
          setConfirming(false);
        }}
      />
    </div>
  );
}
