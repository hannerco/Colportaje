'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { Button } from '../../atoms/Button';
import { Icon } from '../../icons';
import styles from './PhotoViewer.module.css';

export type PhotoViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «Foto 1 de 2». */
  title: string;
  /** La foto completa; sin valor mientras llega (se ve la miniatura). */
  src?: string | null;
  /** La miniatura, que ya está cargada: se ve al instante. */
  previewSrc: string;
  alt: string;
  /** No se pudo traer la foto completa. */
  error?: boolean;
  onRetry?: () => void;
  /** Acciones de abajo (p. ej. «Cambiar foto» y «Quitar foto»). */
  actions?: ReactNode;
};

const t = copy.ui.photoViewer;

/**
 * Visor de fotos (#99): la foto a pantalla completa sobre fondo oscuro, en celular y computador. Se ve al instante con la
 * miniatura y, en cuanto llega, con la foto completa; si falla, lo dice y deja reintentar. Esc o «Cerrar» lo cierran.
 */
export function PhotoViewer({
  open,
  onOpenChange,
  title,
  src,
  previewSrc,
  alt,
  error = false,
  onRetry,
  actions,
}: PhotoViewerProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const findScope = useCallback(
    (node: HTMLSpanElement | null) => setContainer(node?.closest<HTMLElement>('[data-ui-scope]') ?? null),
    [],
  );
  const full = src && loadedSrc === src;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <span ref={findScope} hidden />
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className={styles.scrim} />
        <Dialog.Content className={styles.viewer} aria-describedby={undefined}>
          <div className={styles.top}>
            <Dialog.Title className={styles.title}>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className={styles.close} aria-label={t.close}>
                <Icon name="close" size={22} tone="current" />
              </button>
            </Dialog.Close>
          </div>
          <div className={styles.stage} aria-busy={!full && !error}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto firmada de Storage. */}
            <img
              className={styles.image}
              src={full ? src : previewSrc}
              alt={alt}
              data-preview={!full || undefined}
            />
            {src && !full && (
              // Se carga escondida; al terminar, reemplaza a la miniatura.
              // eslint-disable-next-line @next/next/no-img-element -- foto firmada de Storage.
              <img
                className={styles.loader}
                src={src}
                alt=""
                aria-hidden="true"
                onLoad={() => setLoadedSrc(src)}
              />
            )}
            {!full && !error && (
              <span className={styles.status} role="status">
                <span className={styles.spinner} aria-hidden="true" />
                {t.loading}
              </span>
            )}
            {error && (
              <span className={styles.status} role="alert">
                {t.failed}
                {onRetry && (
                  <Button variant="secondary" size="compact" onClick={onRetry}>
                    {t.retry}
                  </Button>
                )}
              </span>
            )}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
