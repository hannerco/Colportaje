'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { Button } from '@/ui/atoms/Button';
import { Icon } from '@/ui/icons';
import { PhotoViewer } from '@/ui/organisms/PhotoViewer';
import styles from './InfoPhotoStrip.module.css';

export type InfoPhotoStripProps = {
  photos: readonly { photoId: string; thumbUrl: string }[];
  /** «Agregar imagen»: la foto elegida (cámara o galería). Sin función no hay botón. */
  onAdd?: (file: File) => Promise<void> | void;
  /** Por qué no se puede agregar todavía (sin conexión, sin nombre). */
  disabledReason?: string | null;
  /**
   * #99: tocar una foto la abre en grande. #68: desde ahí, «Cambiar foto» y «Quitar foto» (cambiar sube la nueva y
   * luego quita la anterior, BR-PHO-03). Sin funciones, la foto solo se ve.
   */
  onReplace?: (photoId: string, file: File) => Promise<void> | void;
  onRemove?: (photoId: string) => Promise<void> | void;
  /** #99: trae la foto completa para verla en grande. Sin función, se ve la miniatura. */
  fullUrl?: (photoId: string) => Promise<string>;
};

const t = copy.customers;

/**
 * «Imágenes» del cliente (diseño «7 · Información y dirección», HU-CLI-07, pieza del módulo): miniaturas y el botón
 * de agregar, que abre la cámara o la galería del teléfono.
 */
export function InfoPhotoStrip({
  photos,
  onAdd,
  disabledReason,
  onReplace,
  onRemove,
  fullUrl,
}: InfoPhotoStripProps) {
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const editable = Boolean(onReplace || onRemove) && !disabledReason;
  const input = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const reasonId = useId();
  const disabled = Boolean(disabledReason) || adding;
  const [viewing, setViewing] = useState<number | null>(null);
  const shown = viewing !== null ? photos[viewing] : undefined;
  // Una foto que aún no se guarda (Nuevo cliente) vive en el teléfono: se ve tal cual, sin pedirla al servidor.
  const local = shown ? /^(blob|data):/.test(shown.thumbUrl) || !fullUrl : false;
  const [full, setFull] = useState<{
    photoId: string;
    url?: string;
    failed?: boolean;
    attempt: number;
  } | null>(null);
  const shownId = shown?.photoId;
  const attempt = full?.photoId === shownId ? (full?.attempt ?? 0) : 0;
  useEffect(() => {
    if (!shownId || local || !fullUrl) return;
    let alive = true;
    fullUrl(shownId).then(
      (url) => alive && setFull({ photoId: shownId, url, attempt }),
      () => alive && setFull({ photoId: shownId, failed: true, attempt }),
    );
    return () => {
      alive = false;
    };
  }, [shownId, local, fullUrl, attempt]);
  const current = full?.photoId === shownId ? full : null;

  return (
    <div className={styles.strip}>
      <div className={styles.photos}>
        {photos.map((photo, i) => (
          <button
            key={photo.photoId}
            type="button"
            className={styles.photoButton}
            aria-label={t.photos.open(i + 1)}
            aria-busy={replacing === photo.photoId || undefined}
            onClick={() => setViewing(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura firmada de Storage, ya en WebP. */}
            <img className={styles.photo} src={photo.thumbUrl} alt={t.detail.data.image(i + 1)} />
          </button>
        ))}
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
      {shown && (
        <PhotoViewer
          open
          onOpenChange={(open) => !open && setViewing(null)}
          title={t.photos.viewerTitle(viewing! + 1, photos.length)}
          previewSrc={shown.thumbUrl}
          src={local ? shown.thumbUrl : current?.url}
          alt={t.detail.data.image(viewing! + 1)}
          error={Boolean(current?.failed)}
          onRetry={() => setFull({ photoId: shown.photoId, attempt: attempt + 1 })}
          actions={
            editable ? (
              <>
                {onReplace && (
                  <Button
                    variant="secondary"
                    icon="edit"
                    onClick={() => {
                      setReplacing(shown.photoId);
                      setViewing(null);
                      replaceInput.current?.click();
                    }}
                  >
                    {t.photos.replace}
                  </Button>
                )}
                {onRemove && (
                  <Button
                    variant="danger"
                    icon="delete"
                    onClick={() => {
                      setViewing(null);
                      void onRemove(shown.photoId);
                    }}
                  >
                    {t.photos.remove}
                  </Button>
                )}
              </>
            ) : undefined
          }
        />
      )}
      {onAdd && disabledReason && (
        <span id={reasonId} className={styles.reason}>
          {disabledReason}
        </span>
      )}
    </div>
  );
}
