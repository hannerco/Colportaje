'use client';

import { FailureScreen } from '@/features/shell';

/** Si una pantalla falla al abrir (ronda 37): logo, mensaje corto y «Volver a intentar». */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return <FailureScreen kind="error" onRetry={reset} homeHref="/" />;
}
