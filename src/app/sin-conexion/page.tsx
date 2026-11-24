'use client';

import { FailureScreen } from '@/features/shell';

/** Lo que muestra el service worker si la app se abre sin conexión y esa página aún no está guardada (ronda 37). */
export default function OfflinePage() {
  return <FailureScreen kind="offline" onRetry={() => window.location.reload()} />;
}
