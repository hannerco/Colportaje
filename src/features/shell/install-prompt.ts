'use client';

import { useCallback, useEffect, useState } from 'react';

/** El evento de Chrome/Edge/Android que permite abrir la instalación de la PWA. */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISSED_KEY = 'colportor.install.dismissed';

const dismissedHere = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone o iPad en Safari: no hay botón de instalar; se explica «Compartir › Agregar a pantalla de inicio». */
const isIosSafari = (): boolean => {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

/**
 * Invitación a instalar (lienzo «Invitación a instalar», ronda 37): `native` si el navegador permite instalar (Android,
 * escritorio), `ios` en Safari del iPhone; `null` si ya está instalada, si se dijo «Ahora no» en este dispositivo o si
 * no se puede instalar.
 */
export function useInstallPrompt(): {
  kind: 'native' | 'ios' | null;
  install: () => Promise<void>;
  dismiss: () => void;
} {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [kind, setKind] = useState<'native' | 'ios' | null>(null);

  useEffect(() => {
    if (isStandalone() || dismissedHere()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setKind('native');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    // En Safari del iPhone no llega ese evento: se muestran los pasos (después de pintar, para no cambiar el primer cuadro).
    const frame = isIosSafari() ? requestAnimationFrame(() => setKind('ios')) : null;
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Sin almacenamiento (modo privado): se esconde solo en esta visita.
    }
    setKind(null);
  }, []);

  const install = useCallback(async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice.catch(() => undefined);
    setEvent(null);
    setKind(null);
  }, [event]);

  return { kind, install, dismiss };
}
