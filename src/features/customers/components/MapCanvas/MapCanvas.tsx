'use client';

import 'leaflet/dist/leaflet.css';
import type { Circle, Map as LeafletMap } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { MapPoint } from '@/domain/customer-location';
import type { MapTiles } from '../../map-tiles';
import styles from './MapCanvas.module.css';

type LeafletModule = typeof import('leaflet');

/** A dónde mirar. Cambiar `version` vuelve a centrar el mapa (el GPS respondió o se tocó recentrar). */
export type MapView = { readonly center: MapPoint; readonly zoom: number; readonly version: number };

export type MapCanvasProps = {
  view: MapView;
  /** Arrastrar y hacer zoom (el selector); la ficha solo muestra. El zoom siempre es sobre el centro (el pin). */
  interactive?: boolean;
  /** `null` = sin proveedor (SG-09): el mapa se ve liso. */
  tiles: MapTiles | null;
  /** Sin conexión no se piden las imágenes del mapa (AF-111). */
  offline?: boolean;
  /** El centro después de cada movimiento (el punto bajo el pin). */
  onMove?: (center: MapPoint) => void;
  /** Círculo de precisión del GPS, anclado a su punto. */
  accuracy?: { readonly center: MapPoint; readonly meters: number } | null;
};

/**
 * Mapa de Leaflet (ADR-0036, pieza del módulo): solo se carga en el navegador y al montarse (el mapa de la ficha se
 * monta al tocarlo). El pin no es un marcador del mapa: lo pinta quien lo usa, fijo en el centro.
 */
export function MapCanvas({
  view,
  interactive = false,
  tiles,
  offline = false,
  onMove,
  accuracy,
}: MapCanvasProps) {
  const node = useRef<HTMLDivElement>(null);
  const leaflet = useRef<LeafletModule | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const onMoveRef = useRef(onMove);
  const initialView = useRef(view);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    let cancelled = false;
    let created: LeafletMap | null = null;
    let resize: ResizeObserver | null = null;
    void import('leaflet').then((module) => {
      const L = ((module as { default?: LeafletModule }).default ?? module) as LeafletModule;
      if (cancelled || !node.current) return;
      const { center, zoom } = initialView.current;
      created = L.map(node.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: false,
        attributionControl: false,
        dragging: interactive,
        touchZoom: interactive ? 'center' : false,
        scrollWheelZoom: interactive ? 'center' : false,
        doubleClickZoom: interactive ? 'center' : false,
        boxZoom: false,
        keyboard: interactive,
      });
      created.on('moveend', () => {
        const point = created!.getCenter();
        onMoveRef.current?.({ lat: point.lat, lng: point.lng });
      });
      // La ventana o la hoja se abren con animación: Leaflet vuelve a medir cuando cambia el tamaño (sin mover el centro).
      // Se vuelve a poner el centro exacto: el reajuste de Leaflet redondea a píxeles y movería el pin unos metros.
      resize = new ResizeObserver(() => {
        if (!created) return;
        const center = created.getCenter();
        created.invalidateSize({ pan: false });
        created.setView(center, created.getZoom(), { animate: false });
      });
      resize.observe(node.current);
      leaflet.current = L;
      map.current = created;
      setReady(true);
    });
    return () => {
      cancelled = true;
      resize?.disconnect();
      created?.remove();
      map.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    const L = leaflet.current;
    const current = map.current;
    if (!ready || !L || !current || !tiles || offline) return;
    const layer = L.tileLayer(tiles.url, { maxZoom: 19 }).addTo(current);
    const attribution = tiles.attribution
      ? L.control.attribution({ prefix: false }).addAttribution(tiles.attribution).addTo(current)
      : null;
    return () => {
      layer.remove();
      attribution?.remove();
    };
  }, [ready, tiles, offline]);

  useEffect(() => {
    if (!ready || view.version === initialView.current.version) return;
    // Sin animación: la de Leaflet desplaza por píxeles redondeados y el centro no quedaría exacto en el punto.
    map.current?.setView([view.center.lat, view.center.lng], view.zoom, { animate: false });
    // Solo `version` decide recentrar: el centro cambia también cuando el usuario mueve el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, view.version]);

  const circleLat = accuracy?.center.lat;
  const circleLng = accuracy?.center.lng;
  const circleMeters = accuracy?.meters;
  useEffect(() => {
    const L = leaflet.current;
    const current = map.current;
    if (!ready || !L || !current || circleLat === undefined || circleLng === undefined || !circleMeters)
      return;
    const circle: Circle = L.circle([circleLat, circleLng], {
      radius: circleMeters,
      className: styles.accuracy,
      interactive: false,
    }).addTo(current);
    return () => {
      circle.remove();
    };
  }, [ready, circleLat, circleLng, circleMeters]);

  return <div ref={node} className={styles.map} data-ready={ready || undefined} />;
}
