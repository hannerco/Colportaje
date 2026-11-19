'use client';

import { useId, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { Icon } from '@/ui/icons';
import styles from './InfoPhotoStrip.module.css';

export type InfoPhotoStripProps = {
  photos: readonly { photoId: string; thumbUrl: string }[];
  /** «Agregar imagen»: la foto elegida (cámara o galería). Sin función no hay botón. */
  onAdd?: (file: File) => Promise<void> | void;
  /** Por qué no se puede agregar todavía (sin conexión, sin nombre). */
  disabledReason?: string | null;
};

const t = copy.customers;

/**
 * «Imágenes» del cliente (diseño «7 · Información y dirección», HU-CLI-07, pieza del módulo): miniaturas y el botón
 * de agregar, que abre la cámara o la galería del teléfono.
 */
export function InfoPhotoStrip({ photos, onAdd, disabledReason }: InfoPhotoStripProps) {
  const input = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const reasonId = useId();
  const disabled = Boolean(disabledReason) || adding;

  return (
    <div className={styles.strip}>
      <div className={styles.photos}>
        {photos.map((photo, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura firmada de Storage, ya en WebP.
          <img
            key={photo.photoId}
            className={styles.photo}
            src={photo.thumbUrl}
            alt={t.detail.data.image(i + 1)}
          />
        ))}
        {onAdd && (
          <>
            <button
              type="button"
              className={styles.add}
              aria-label={adding ? t.photos.adding : t.photos.add}
              aria-disabled={disabled || undefined}
              aria-busy={adding || undefined}
              aria-describedby={disabledReason ? reasonId : undefined}
              onClick={() => {
                if (!disabled) input.current?.click();
              }}
            >
              {adding ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                <Icon name="add" tone="current" />
              )}
            </button>
            <input
              ref={input}
              className={styles.input}
              type="file"
              accept="image/*"
              tabIndex={-1}
              aria-hidden="true"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setAdding(true);
                try {
                  await onAdd(file);
                } finally {
                  setAdding(false);
                }
              }}
            />
          </>
        )}
      </div>
      {onAdd && disabledReason && (
        <span id={reasonId} className={styles.reason}>
          {disabledReason}
        </span>
      )}
    </div>
  );
}
