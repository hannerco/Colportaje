'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { Button } from '../../atoms/Button';
import { Icon } from '../../icons';
import { PhotoViewer } from '../PhotoViewer';
import styles from './PhotoStrip.module.css';

export type PhotoStripPhoto = { readonly photoId: string; readonly thumbUrl: string };

export type PhotoStripProps = {
  photos: readonly PhotoStripPhoto[];
  /** Nombre de cada foto para el lector y el visor: «Foto 2», «Foto del recibo 2». Por defecto «Foto N». */
  photoLabel?: (n: number) => string;
  /** Nombre del botón «+»: «Agregar imagen», «Agregar foto del recibo». Por defecto «Agregar foto». */
  addLabel?: string;
  /**
   * La foto elegida (cámara o galería). Sin función no hay «+». Si devuelve `false`, la subida falló: se ve «No se pudo
   * subir la foto» con «Reintentar» (el mismo archivo).
   */
  onAdd?: (file: File) => Promise<boolean | void> | boolean | void;
  /** Desde el visor: «Cambiar foto» (sube la nueva y luego quita la anterior, BR-PHO-03). */
  onReplace?: (photoId: string, file: File) => Promise<void> | void;
  /** Desde el visor: «Quitar foto». */
  onRemove?: (photoId: string) => Promise<void> | void;
  /** Por qué todavía no se puede agregar ni cambiar (sin conexión, sin nombre). */
  disabledReason?: string | null;
  /** Trae la foto completa para el visor. Sin función (o con una foto que aún vive en el teléfono), la miniatura. */
  fullUrl?: (photoId: string) => Promise<string>;
};

const t = copy.ui.photos;

/**
 * Fotos (revisión 2026-11-24): **la única pieza de fotos de la app**. Imágenes del cliente, facturas y recibos del
 * Abibono se ven igual: miniaturas del mismo tamaño y un «+» punteado que abre la cámara o la galería. Tocar una foto la
 * abre en grande (#99) y, si se puede, desde ahí se cambia o se quita (#68). Si una subida falla, «Reintentar».
 */
export function PhotoStrip({
  photos,
  photoLabel = t.photo,
  addLabel = t.add,
  onAdd,
  onReplace,
  onRemove,
  disabledReason,
  fullUrl,
}: PhotoStripProps) {
  const input = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const reasonId = useId();
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState<File | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const editable = Boolean(onReplace || onRemove) && !disabledReason;
  const disabled = Boolean(disabledReason) || adding;
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

  const upload = async (file: File) => {
    if (!onAdd) return;
    setAdding(true);
    setFailed(null);
    try {
      if ((await onAdd(file)) === false) setFailed(file);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.strip}>
      {failed && (
        <div role="alert" className={styles.failed}>
          <Icon name="alert" size={16} tone="current" />
          <span className={styles.failedText}>{t.uploadFailed}</span>
          <button type="button" className={styles.retry} onClick={() => void upload(failed)}>
            {t.retry}
          </button>
        </div>
      )}
      <div className={styles.photos}>
        {photos.map((photo, i) => (
          <button
            key={photo.photoId}
            type="button"
            className={styles.photoButton}
            aria-label={t.open(i + 1)}
            aria-busy={replacing === photo.photoId || undefined}
            onClick={() => setViewing(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura firmada de Storage, ya en WebP. */}
            <img className={styles.photo} src={photo.thumbUrl} alt={photoLabel(i + 1)} />
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
              aria-label={adding ? t.adding : addLabel}
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
              data-testid="photo-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void upload(file);
              }}
            />
          </>
        )}
      </div>
      {shown && (
        <PhotoViewer
          open
          onOpenChange={(open) => !open && setViewing(null)}
          title={t.viewerTitle(viewing! + 1, photos.length)}
          previewSrc={shown.thumbUrl}
          src={local ? shown.thumbUrl : current?.url}
          alt={photoLabel(viewing! + 1)}
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
                    {t.replace}
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
                    {t.remove}
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
