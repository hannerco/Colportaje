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
    /** Separación mínima entre abonos sugeridos (INTERPRETACIONES I-07). */
    minGapDays: {
      biweekly: 7,
      monthly: 20,
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
  undo: {
    toastSeconds: 6,
  },

  /** BR-PHO-01: compresión de fotos. */
  photos: {
    format: 'webp',
    maxLongSidePx: 1280,
    targetBytes: 150_000,
    thumbnailTargetBytes: 15_000,
  },

  /** BR-CUS-07: umbral de la búsqueda difusa; lo fija HU-CLI-05 con su prueba. */
  search: {
    fuzzyThreshold: null as number | null,
  },

  /** BR-CUS-11: umbral de nombre "muy parecido" para posibles duplicados; lo fija HU-CLI-02 con su prueba. */
  duplicates: {
    nameThreshold: null as number | null,
  },
});

export type BusinessConfig = typeof businessConfig;
