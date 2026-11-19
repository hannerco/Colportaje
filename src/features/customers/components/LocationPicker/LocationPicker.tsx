'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import type { MapPoint } from '@/domain/customer-location';
import { Button } from '@/ui/atoms/Button';
import { Icon, type IconName } from '@/ui/icons';
import { DetailWindow } from '@/ui/organisms/DetailWindow';
import { usePlatform } from '@/ui/platform';
import { formatCoordinates, type PickerStatus } from '../../location-picker-state';
import type { MapTiles } from '../../map-tiles';
import { MapCanvas, MapPin, type MapView } from '../MapCanvas';
import styles from './LocationPicker.module.css';

export type LocationPickerProps = {
  status: PickerStatus;
  /** El punto bajo el pin (lo que se guarda). */
  pin: MapPoint;
  /** La precisión del GPS si el pin sigue en su punto (encontrada o aproximada). */
  accuracyMeters: number | null;
  view: MapView;
  onMove: (center: MapPoint) => void;
  /** Círculo de precisión del GPS. */
  accuracyCircle?: { center: MapPoint; meters: number } | null;
  tiles: MapTiles | null;
  /** CA-4: sin conexión, «Confirmar» está deshabilitado y el mapa no carga (AF-111). */
  isOnline: boolean;
  /** «Repetir» (aproximada) y «Reintentar» (sin señal): vuelven a pedir el GPS. */
  onRetry: () => void;
  /** Centrar en la ubicación actual (no aparece sin permiso ni sin señal). */
  onRecenter: () => void;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  /** Ruta de vuelta de la ventana (no se usa en hoja ni centrada). */
  backHref: string;
};

const t = copy.customers.location.picker;

/** Una línea de estado con su ícono (y, si hay, su acción). */
function StatusLine({
  icon,
  text,
  action,
}: {
  icon: IconName | 'spinner';
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <p className={styles.statusLine} role="status">
      {icon === 'spinner' ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        <Icon name={icon} size={16} tone="current" />
      )}
      <span>{text}</span>
      {action && (
        <button type="button" className={styles.inlineAction} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </p>
  );
}

/**
 * Elegir ubicación (diseño «8 · Elegir ubicación», ADR-0036, pieza del módulo): mapa con el pin fijo al centro y el
 * mapa que se mueve debajo; círculo de precisión; recentrar en el GPS; «Confirmar» guarda el punto bajo el pin. Va en
 * la Ventana de detalle de la biblioteca: centrada en escritorio y hoja en móvil.
 */
export function LocationPicker({
  status,
  pin,
  accuracyMeters,
  view,
  onMove,
  accuracyCircle,
  tiles,
  isOnline,
  onRetry,
  onRecenter,
  onConfirm,
  onClose,
  backHref,
}: LocationPickerProps) {
  const mobile = usePlatform() === 'mobile';
  const [saving, setSaving] = useState(false);
  const coordinates = formatCoordinates(pin);
  const withAccuracy = (status === 'found' || status === 'approximate') && accuracyMeters !== null;
  const recenter = status !== 'denied' && status !== 'noSignal';

  const statusLine = !isOnline ? (
    <StatusLine icon="offline" text={t.offline} />
  ) : status === 'searching' ? (
    <StatusLine icon="spinner" text={t.searching} />
  ) : status === 'approximate' ? (
    <StatusLine icon="alert" text={t.approximate} action={{ label: t.repeat, onClick: onRetry }} />
  ) : status === 'denied' ? (
    <StatusLine icon="location" text={t.denied} />
  ) : status === 'noSignal' ? (
    <StatusLine icon="location" text={t.noSignal} action={{ label: t.retry, onClick: onRetry }} />
  ) : null;
  const coordinatesLine = status !== 'searching' && (
    <p className={styles.coordinates}>
      {withAccuracy ? t.accuracy(accuracyMeters!, coordinates) : coordinates}
    </p>
  );

  return (
    <DetailWindow
      mode={mobile ? 'sheet' : 'center'}
      title={t.title}
      breadcrumb={{ label: copy.customers.list.title, href: backHref }}
      onClose={onClose}
    >
      <div className={styles.picker} data-shape={mobile ? 'mobile' : 'desktop'}>
        <div className={styles.mapArea} role="group" aria-label={t.map}>
          <MapCanvas
            view={view}
            interactive
            tiles={tiles}
            offline={!isOnline}
            onMove={onMove}
            accuracy={accuracyCircle}
          />
          <MapPin label={t.pin} />
          {!isOnline && (
            <span className={styles.chip}>
              <Icon name="offline" size={14} tone="current" />
              {copy.customers.location.mapOffline}
            </span>
          )}
          {recenter && (
            <span className={styles.recenter}>
              <Button variant="secondary" iconOnly icon="location" onClick={onRecenter}>
                {t.recenter}
              </Button>
            </span>
          )}
        </div>
        <div className={styles.footer}>
          <div className={styles.status}>
            <p className={styles.heading}>{t.heading}</p>
            {/* Sin conexión, el aviso va debajo de las coordenadas; los demás, encima (lienzo). */}
            {isOnline && statusLine}
            {coordinatesLine}
            {!isOnline && statusLine}
          </div>
          <Button
            variant="primary"
            icon="check"
            width={mobile ? 'full' : 'auto'}
            state={!isOnline ? 'disabled' : saving ? 'loading' : 'normal'}
            onClick={async () => {
              setSaving(true);
              try {
                await onConfirm();
              } finally {
                setSaving(false);
              }
            }}
          >
            {t.confirm}
          </Button>
        </div>
      </div>
    </DetailWindow>
  );
}
