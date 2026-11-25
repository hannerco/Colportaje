/**
 * Valores de negocio que pueden cambiar (BR-GEN-15, ADR-0041, 00-REGLAS-COMUNES §8).
 * Es el ÚNICO lugar donde viven: el resto del código los lee de aquí, nunca los repite.
 */

type DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] };

const deepFreeze = <T extends object>(value: T): DeepReadonly<T> => {
  for (const child of Object.values(value)) {
    if (typeof child === 'object' && child !== null) deepFreeze(child);
  }
  return Object.freeze(value);
};

export const businessConfig = deepFreeze({
  /** BR-GEN-05: "hoy" y toda comparación por día. */
  timezone: 'America/Bogota',

  /** BR-PAY-04: método de pago preseleccionado. */
  defaultPaymentMethod: 'transfer',

  /** BR-PAY-15: plan de abonos automático. */
  paymentPlan: {
    /** Los valores sugeridos se redondean a múltiplos de $1.000. */
    amountMultiple: 1000,
    /** Días de pago; 30 = último día del mes si el mes es más corto. */
    paydays: {
      biweekly: [15, 30],
      monthly: [30],
    },
    weeklyStepDays: 7,
  },

  /** BR-PAY-06: una prórroga más allá de N meses desde hoy pide confirmación. */
  reschedule: {
    confirmBeyondMonths: 2,
  },

  /** BR-CUS-08: ubicación del cliente. */
  location: {
    /** Con una precisión peor que esta, la ubicación se marca como aproximada. */
    approximateAccuracyMeters: 50,
    /** Vista país de Colombia para el selector de ubicación. */
    defaultCenter: { lat: 4.5709, lng: -74.2973, zoom: 5 },
  },

  /** BR-COPY-17: la nota al eliminar un ejemplar es opcional. */
  copyDelete: {
    noteRequired: false,
  },

  /** BR-COPY-11/17: duración del aviso "Deshacer" (lo usa el front, INTERPRETACIONES I-03). */
  /**
   * Red (2026-11-25): una acción que no responde en este tiempo se da por fallida y se avisa («La conexión está
   * tardando demasiado»), en vez de dejar el botón cargando para siempre. Reintentar no duplica (cada acción es
   * idempotente).
   */
  network: { actionTimeoutSeconds: 45 },
  undo: {
    toastSeconds: 6,
  },

  /** BR-PHO-01: compresión de fotos. */
  photos: {
    format: 'webp',
    maxLongSidePx: 1280,
    targetBytes: 150_000,
    /** Lado mayor de la miniatura para listas; con ~320 px queda cerca de los ~15 KB. */
    thumbnailMaxLongSidePx: 320,
    thumbnailTargetBytes: 15_000,
    /** R3 de HU-BASE-05: las fotos se ven con URL firmadas de corta duración. */
    signedUrlSeconds: 3600,
  },

  /**
   * Portadas de los títulos (DT-10 cerrada, ronda 32, #40): cuadradas de 600 × 600 a ~60 KB en WebP. Si la foto no es
   * cuadrada se centra y el resto queda transparente: nunca se recorta el libro.
   */
  covers: {
    sidePx: 600,
    targetBytes: 60_000,
    thumbnailSidePx: 160,
    thumbnailTargetBytes: 8_000,
  },

  /**
   * BR-CUS-07: umbral de la búsqueda difusa (Fuse.js: 0 = exacto, 1 = cualquier cosa). Fijado en HU-CLI-05 con
   * su prueba (src/domain/customer-search.test.ts): con 0,3 se toleran errores de una o dos letras ("maria
   * gomes", "cardenaz") y no aparece ruido ("carlos" no trae a "Marcos", que sí aparece con 0,35).
   */
  search: {
    fuzzyThreshold: 0.3,
  },

  /**
   * BR-CUS-11: nombre "casi idéntico" para posibles duplicados = similitud ≥ umbral (1 − distancia de edición
   * relativa entre nombres normalizados). Fijado en HU-CLI-02 con su prueba (src/domain/customer-data.test.ts):
   * con 0,85 se detectan errores de una o dos letras ("Natalia Cardenaz") y se descartan nombres distintos
   * ("Pedro Pérez" / "Pablo Pérez").
   */
  duplicates: {
    nameThreshold: 0.85,
  },
});

export type BusinessConfig = typeof businessConfig;
