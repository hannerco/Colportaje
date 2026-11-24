'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { reportError } from '@/features/shared/error-report';
import { FailureScreen } from '@/features/shell';

/** Si una pantalla falla al abrir (ronda 37): logo, mensaje corto, «Volver a intentar» y el código para reportarlo. */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  // Se registra una sola vez por error mostrado (#104).
  const [report] = useState(() => reportError(error));
  return (
    <FailureScreen
      kind="error"
      onRetry={reset}
      homeHref="/"
      reference={copy.errors.reference(report.code, report.ref)}
    />
  );
}
