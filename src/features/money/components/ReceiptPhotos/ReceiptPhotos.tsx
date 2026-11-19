'use client';

import { useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { Icon } from '@/ui/icons';
import styles from './ReceiptPhotos.module.css';

export type ReceiptPhotosProps = {
  photos: readonly { photoId: string; thumbUrl: string }[];
  /** La foto elegida (cámara o galería). Devuelve si se subió; si no, la pieza ofrece «Reintentar» con el mismo archivo. */
  onAdd?: (file: File) => Promise<boolean>;
  /** Quita una foto (solo en un borrador o en una propuesta). Sin función no hay botón. */
  onRemove?: (photoId: string) => void;
  /** Por qué no se puede agregar todavía (sin conexión). */
  disabledReason?: string | null;
};

const t = copy.money.depositEditor;

/**
 * Recibo del Abibono (diseño «4 · Nuevo Abibono», pieza del módulo): miniaturas con «Quitar», «Añadir foto» (o «Añadir
 * otra») que abre la cámara o la galería y, si la subida falla, una Franja con «Reintentar» (`Dinero-*-nuevo-error`).
 * También la usarán facturas y fotos de información.
 */
export function ReceiptPhotos({ photos, onAdd, onRemove, disabledReason }: ReceiptPhotosProps) {
  const input = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState<File | null>(null);
  const disabled = Boolean(disabledReason) || adding;

  const upload = async (file: File) => {
    if (!onAdd) return;
    setAdding(true);
    setFailed(null);
    try {
      const done = await onAdd(file);
      if (!done) setFailed(file);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.photos}>
      {failed && (
        <div role="alert" className={styles.failed}>
          <Icon name="alert" size={16} tone="current" />
          <span className={styles.failedText}>{t.uploadFailed}</span>
          <button type="button" className={styles.retry} onClick={() => void upload(failed)}>
            {t.retry}
          </button>
        </div>
      )}
      <div className={styles.row}>
        {photos.map((photo, i) => (
          <span key={photo.photoId} className={styles.item}>
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura firmada de Storage, ya en WebP. */}
            <img className={styles.photo} src={photo.thumbUrl} alt={t.receiptPhoto(i + 1)} />
            {onRemove && (
              <button
                type="button"
                className={styles.remove}
                aria-label={t.removePhoto(i + 1)}
                onClick={() => onRemove(photo.photoId)}
              >
                <Icon name="close" size={14} tone="current" />
              </button>
            )}
          </span>
        ))}
        {onAdd && (
          <>
            <button
              type="button"
              className={styles.add}
              aria-disabled={disabled || undefined}
              aria-busy={adding || undefined}
              onClick={() => {
                if (!disabled) input.current?.click();
              }}
            >
              {adding ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                <Icon name="add" size={18} tone="current" />
              )}
              {adding ? t.uploading : photos.length > 0 ? t.addAnother : t.addPhoto}
            </button>
            <input
              ref={input}
              className={styles.input}
              type="file"
              accept="image/*"
              tabIndex={-1}
              aria-hidden="true"
              data-testid="receipt-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void upload(file);
              }}
            />
          </>
        )}
      </div>
      {onAdd && disabledReason && <span className={styles.reason}>{disabledReason}</span>}
    </div>
  );
}
