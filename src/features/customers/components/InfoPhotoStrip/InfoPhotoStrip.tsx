'use client';

import { useId, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { Icon } from '@/ui/icons';
import { Menu } from '@/ui/molecules/Menu';
import styles from './InfoPhotoStrip.module.css';

export type InfoPhotoStripProps = {
  photos: readonly { photoId: string; thumbUrl: string }[];
  /** «Agregar imagen»: la foto elegida (cámara o galería). Sin función no hay botón. */
  onAdd?: (file: File) => Promise<void> | void;
  /** Por qué no se puede agregar todavía (sin conexión, sin nombre). */
  disabledReason?: string | null;
  /**
   * #68: tocar una foto abre «Cambiar foto» y «Quitar foto». Cambiar sube la nueva y luego quita la anterior (BR-PHO-03).
   * Sin funciones, la foto solo se ve.
   */
  onReplace?: (photoId: string, file: File) => Promise<void> | void;
  onRemove?: (photoId: string) => Promise<void> | void;
};

const t = copy.customers;

/**
 * «Imágenes» del cliente (diseño «7 · Información y dirección», HU-CLI-07, pieza del módulo): miniaturas y el botón
 * de agregar, que abre la cámara o la galería del teléfono.
 */
export function InfoPhotoStrip({ photos, onAdd, disabledReason, onReplace, onRemove }: InfoPhotoStripProps) {
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const editable = Boolean(onReplace || onRemove) && !disabledReason;
  const input = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const reasonId = useId();
  const disabled = Boolean(disabledReason) || adding;

  return (
    <div className={styles.strip}>
      <div className={styles.photos}>
        {photos.map((photo, i) => {
          // eslint-disable-next-line @next/next/no-img-element -- miniatura firmada de Storage, ya en WebP.
          const img = <img className={styles.photo} src={photo.thumbUrl} alt={t.detail.data.image(i + 1)} />;
          if (!editable) return <span key={photo.photoId}>{img}</span>;
          return (
            <Menu
              key={photo.photoId}
              title={t.photos.photoMenu(i + 1)}
              trigger={
                <button
                  type="button"
                  className={styles.photoButton}
                  aria-label={t.photos.photoMenu(i + 1)}
                  aria-busy={replacing === photo.photoId || undefined}
                >
                  {img}
                </button>
              }
              items={[
                ...(onReplace ? [{ id: 'replace', label: t.photos.replace, icon: 'edit' as const }] : []),
                ...(onRemove
                  ? [{ id: 'remove', label: t.photos.remove, icon: 'delete' as const, danger: true }]
                  : []),
              ]}
              onSelect={(id) => {
                if (id === 'remove') return void onRemove?.(photo.photoId);
                setReplacing(photo.photoId);
                replaceInput.current?.click();
              }}
            />
          );
        })}
        {onReplace && (
          <input
            ref={replaceInput}
            className={styles.input}
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden="true"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              const photoId = replacing;
              if (!file || !photoId) return setReplacing(null);
              try {
                await onReplace(photoId, file);
              } finally {
                setReplacing(null);
              }
            }}
          />
        )}
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
