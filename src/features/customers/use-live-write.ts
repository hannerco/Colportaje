'use client';

import { useCallback, useEffect, useRef } from 'react';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Ficha viva (HU-PAN-CLI-03, ADR-0038): escribe `value` en el servidor un momento después del último cambio, sin botón
 * de guardar. `flush()` escribe ya lo pendiente (al pulsar «Guardar cliente») y dice si quedó bien. Solo escribe si el
 * valor cambió desde la última escritura buena (`initial` cuenta como escrita).
 */
export function useLiveWrite<T>(
  value: T,
  options: { enabled: boolean; initial: T; write: (value: T) => Promise<boolean>; delayMs?: number },
) {
  const { enabled, write, delayMs = 600 } = options;
  const written = useRef<T>(options.initial);
  const writeRef = useRef(write);
  const valueRef = useRef(value);
  useEffect(() => {
    writeRef.current = write;
    valueRef.current = value;
  });

  const flush = useCallback(async (): Promise<boolean> => {
    const current = valueRef.current;
    if (same(current, written.current)) return true;
    const ok = await writeRef.current(current);
    if (ok) written.current = current;
    return ok;
  }, []);

  useEffect(() => {
    if (!enabled || same(value, written.current)) return;
    const timer = setTimeout(() => void flush(), delayMs);
    return () => clearTimeout(timer);
  }, [value, enabled, delayMs, flush]);

  /** Marca un valor como ya escrito (p. ej. el nombre con el que se creó el cliente). */
  const markWritten = useCallback((next: T) => {
    written.current = next;
  }, []);

  return { flush: enabled ? flush : async () => true, markWritten };
}
