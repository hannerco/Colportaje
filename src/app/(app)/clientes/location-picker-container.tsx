'use client';

import { useEffect, useState } from 'react';
import type { CustomerLocation, MapPoint, PickerCenter } from '@/domain/customer-location';
import {
  LocationPicker,
  PICKER_POINT_ZOOM,
  mapTiles,
  pickerAccuracy,
  pickerPoint,
  pickerStatus,
  roundCoordinate,
  useGeolocation,
  useInitialPickerCenter,
  type MapView,
} from '@/features/customers';
import { ROUTES, useAppShell } from '@/features/shell';

type Props = {
  /** La ubicación guardada del cliente («Cambiar»); `null` = «Elegir en mapa». */
  saved: { latitude: number; longitude: number } | null;
  /** Guarda el punto; `true` si quedó guardado (entonces se cierra). */
  onConfirm: (location: CustomerLocation) => Promise<boolean>;
  onClose: () => void;
};

/**
 * Contenedor del selector de ubicación (HU-PAN-CLI-06, ADR-0036): «Elegir en mapa» pide el GPS al abrir (el permiso se
 * pide al tocar el botón); «Cambiar» abre en la ubicación guardada y el GPS solo se pide al recentrar.
 */
export function LocationPickerContainer({ saved, onConfirm, onClose }: Props) {
  const center = useInitialPickerCenter(saved);
  if (!center.data) return null;
  return <Picker start={center.data} askGps={!saved} onConfirm={onConfirm} onClose={onClose} />;
}

function Picker({
  start,
  askGps,
  onConfirm,
  onClose,
}: {
  start: PickerCenter;
  askGps: boolean;
} & Pick<Props, 'onConfirm' | 'onClose'>) {
  const { isOnline } = useAppShell();
  const [tiles] = useState(mapTiles);
  const [view, setView] = useState<MapView>({
    center: { lat: start.lat, lng: start.lng },
    zoom: start.zoom ?? PICKER_POINT_ZOOM,
    version: 0,
  });
  const [pin, setPin] = useState<MapPoint>(view.center);
  const goTo = (point: MapPoint) => {
    setPin(point);
    setView((current) => ({ center: point, zoom: PICKER_POINT_ZOOM, version: current.version + 1 }));
  };
  // El GPS respondió: el mapa va a su punto (si el usuario se movía, el GPS manda: lo pidió él).
  const { gps, request } = useGeolocation({ onFix: goTo });
  const fix = gps.status === 'fixed' ? gps : null;

  useEffect(() => {
    if (askGps) request();
  }, [askGps, request]);

  return (
    <LocationPicker
      status={pickerStatus(gps, pin)}
      pin={pickerPoint(gps, pin)}
      accuracyMeters={pickerAccuracy(gps, pin)}
      view={view}
      onMove={setPin}
      accuracyCircle={fix ? { center: fix.point, meters: fix.accuracyMeters } : null}
      tiles={tiles}
      isOnline={isOnline}
      onRetry={request}
      onRecenter={() => (fix ? goTo(fix.point) : request())}
      onConfirm={async () => {
        const point = pickerPoint(gps, pin);
        const saved = await onConfirm({
          latitude: roundCoordinate(point.lat),
          longitude: roundCoordinate(point.lng),
          accuracyMeters: pickerAccuracy(gps, pin),
        });
        if (saved) onClose();
      }}
      onClose={onClose}
      backHref={ROUTES.customers}
    />
  );
}
