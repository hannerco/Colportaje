'use client';

import { copy } from '@/copy/es';
import type { MapPoint } from '@/domain/customer-location';
import { Button } from '@/ui/atoms/Button';
import { Icon } from '@/ui/icons';
import type { MapTiles } from '../../map-tiles';
import { MapPreview } from '../MapPreview';
import styles from './CustomerLocationBlock.module.css';

export type CustomerLocationBlockProps = {
  /** La ubicación guardada (o elegida en la ficha nueva); `null` = sin ubicación. */
  location: MapPoint | null;
  /** `mapsLinkFor` (con ubicación, el de las coordenadas: BR-CUS-08). */
  mapsLink: string | null;
  tiles: MapTiles | null;
  isOnline: boolean;
  /** «Elegir en mapa» y «Cambiar» abren el selector. Sin función (archivado) no hay botones. */
  onChoose?: () => void;
  /** «Quitar» la ubicación (necesita conexión). */
  onRemove?: () => void;
};

const t = copy.customers.location;

/**
 * Ubicación del cliente (diseño «7 · Información y dirección», pieza del módulo): sin ubicación, «Elegir en mapa»;
 * con ubicación, el mapa pequeño, «Abrir en Maps», «Cambiar» y «Quitar».
 */
export function CustomerLocationBlock({
  location,
  mapsLink,
  tiles,
  isOnline,
  onChoose,
  onRemove,
}: CustomerLocationBlockProps) {
  if (!location)
    return onChoose ? (
      <Button variant="secondary" width="full" icon="location" onClick={onChoose}>
        {t.choose}
      </Button>
    ) : null;
  return (
    <div className={styles.block}>
      <MapPreview point={location} tiles={tiles} isOnline={isOnline} />
      <div className={styles.actions}>
        {mapsLink && (
          <a className={styles.openMaps} href={mapsLink} target="_blank" rel="noreferrer">
            <Icon name="open-page" size={16} tone="current" />
            {t.openMaps}
          </a>
        )}
        <span className={styles.spacer} />
        {onChoose && (
          <Button variant="link" size="compact" onClick={onChoose}>
            {t.change}
          </Button>
        )}
        {onRemove && (
          <Button
            variant="tertiary"
            size="compact"
            state={isOnline ? 'normal' : 'disabled'}
            onClick={onRemove}
          >
            {t.remove}
          </Button>
        )}
      </div>
    </div>
  );
}
