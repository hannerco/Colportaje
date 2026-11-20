'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import type { MapPoint } from '@/domain/customer-location';
import { Icon } from '@/ui/icons';
import type { MapTiles } from '../../map-tiles';
import { MapCanvas, MapPin } from '../MapCanvas';
import styles from './MapPreview.module.css';

export type MapPreviewProps = {
  point: MapPoint;
  tiles: MapTiles | null;
  isOnline: boolean;
};

const t = copy.customers.location;
const PREVIEW_ZOOM = 16;

/**
 * Mapa pequeño de la ficha (diseño «7 · Información y dirección»): el mapa carga solo al tocarlo (ADR-0036), así la
 * ficha no gasta datos ni pide imágenes a cada apertura. Sin conexión no carga y lo dice (AF-111).
 */
export function MapPreview({ point, tiles, isOnline }: MapPreviewProps) {
  const [loaded, setLoaded] = useState(false);

  if (loaded)
    return (
      <div className={styles.preview} role="img" aria-label={t.map}>
        <MapCanvas
          view={{ center: point, zoom: PREVIEW_ZOOM, version: 0 }}
          tiles={tiles}
          offline={!isOnline}
        />
        <MapPin />
      </div>
    );
  if (!isOnline)
    return (
      <div className={styles.preview} role="img" aria-label={t.map}>
        <MapPin />
        <span className={styles.chip}>
          <Icon name="offline" size={14} tone="current" />
          {t.mapOffline}
        </span>
      </div>
    );
  return (
    <button type="button" className={`${styles.preview} ${styles.button}`} onClick={() => setLoaded(true)}>
      <MapPin />
      <span className={styles.chip}>
        <Icon name="location" size={14} tone="current" />
        {t.showMap}
      </span>
    </button>
  );
}
