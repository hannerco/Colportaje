'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapPoint } from '@/domain/customer-location';
import type { GpsState } from './location-picker-state';

/** Cuánto se espera al GPS antes de decir «No hay señal de GPS». */
const GPS_TIMEOUT_MS = 15_000;

/**
 * GPS del navegador para el selector de ubicación (ADR-0036): el permiso se pide solo al llamar `request` (al tocar
 * «Elegir en mapa», «Repetir», «Reintentar» o recentrar), nunca al abrir la app. Sin seguimiento: una lectura cada vez.
 */
export function useGeolocation({ onFix }: { onFix?: (point: MapPoint) => void } = {}) {
  const [gps, setGps] = useState<GpsState>({ status: 'idle' });
  // Al responder el GPS, quien lo usa mueve el mapa a su punto (en el mismo momento, no en un efecto después).
  const onFixRef = useRef(onFix);
  useEffect(() => {
    onFixRef.current = onFix;
  }, [onFix]);
  // Una respuesta vieja (de un pedido anterior) no pisa a la nueva.
  const attempt = useRef(0);

  const request = useCallback(() => {
    const current = ++attempt.current;
    const geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
    if (!geolocation) {
      setGps({ status: 'unavailable' });
      return;
    }
    setGps({ status: 'searching' });
    geolocation.getCurrentPosition(
      (position) => {
        if (current !== attempt.current) return;
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGps({ status: 'fixed', point, accuracyMeters: Math.max(0, Math.round(position.coords.accuracy)) });
        onFixRef.current?.(point);
      },
      (error) => {
        if (current !== attempt.current) return;
        setGps({ status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' });
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 },
    );
  }, []);

  return { gps, request };
}
