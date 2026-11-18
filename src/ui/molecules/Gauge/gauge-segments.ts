/**
 * Geometría del Medidor (HU-UI-18, R4): función pura, sin DOM, probada aparte con Vitest.
 * Arco de 180° de izquierda a derecha por arriba, en tres tramos (R1), con 1,2° entre tramos dibujados (R2).
 */

export type GaugeSize = 'normal' | 'large';
export type GaugeKey = 'delivered' | 'collected' | 'pending';
export type GaugeValues = Record<GaugeKey, number>;

export type GaugeSegment = {
  key: GaugeKey;
  /** Ángulos en grados medidos desde la izquierda (0) hasta la derecha (180), por arriba. */
  start: number;
  end: number;
  /** Trazo SVG del arco, sobre la circunferencia que pasa por el centro del grosor. */
  d: string;
};

export type GaugeGeometry = {
  width: number;
  height: number;
  stroke: number;
  /** El arco completo (para el fondo cuando no hay nada que dibujar). */
  track: string;
  segments: GaugeSegment[];
  /** Porcentajes enteros normalizados que suman 100 (resto mayor), o 0/0/0 si todo es 0. */
  percents: GaugeValues;
};

/** R1: ancho 240 o 320; grosor 24 o 30. */
export const GAUGE_SIZES: Record<GaugeSize, { width: number; stroke: number }> = {
  normal: { width: 240, stroke: 24 },
  large: { width: 320, stroke: 30 },
};

export const GAUGE_GAP_DEGREES = 1.2;

const KEYS: GaugeKey[] = ['delivered', 'collected', 'pending'];

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Enteros que suman 100 por el método del resto mayor (I-11); los negativos o no finitos cuentan como 0. */
export function normalizePercents(values: GaugeValues): GaugeValues {
  const clean = KEYS.map((key) => {
    const value = values[key];
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = clean.reduce((sum, value) => sum + value, 0);
  if (total === 0) return { delivered: 0, collected: 0, pending: 0 };
  const exact = clean.map((value) => (value / total) * 100);
  const floors = exact.map(Math.floor);
  let missing = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, i) => ({ i, rest: value - floors[i]! }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (missing <= 0) break;
    floors[i]! += 1;
    missing -= 1;
  }
  return { delivered: floors[0]!, collected: floors[1]!, pending: floors[2]! };
}

export function gaugeSegments(values: GaugeValues, size: GaugeSize = 'normal'): GaugeGeometry {
  const { width, stroke } = GAUGE_SIZES[size];
  const radius = (width - stroke) / 2;
  const cx = width / 2;
  const cy = width / 2;
  const point = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return `${round(cx - radius * Math.cos(rad))} ${round(cy - radius * Math.sin(rad))}`;
  };
  const arc = (start: number, end: number) => `M ${point(start)} A ${radius} ${radius} 0 0 1 ${point(end)}`;

  const clean = KEYS.map((key) => {
    const value = values[key];
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = clean.reduce((sum, value) => sum + value, 0);
  const drawn = KEYS.map((key, i) => ({ key, value: clean[i]! })).filter(({ value }) => value > 0);
  // R2: solo hay separación entre tramos dibujados; con total 0 no se divide.
  const available = 180 - GAUGE_GAP_DEGREES * Math.max(0, drawn.length - 1);

  const segments: GaugeSegment[] = [];
  let cursor = 0;
  for (const [i, { key, value }] of drawn.entries()) {
    const start = cursor;
    const end = i === drawn.length - 1 ? 180 : cursor + (value / total) * available;
    segments.push({ key, start: round(start), end: round(end), d: arc(start, end) });
    cursor = end + GAUGE_GAP_DEGREES;
  }

  return {
    width,
    height: width / 2,
    stroke,
    track: arc(0, 180),
    segments,
    percents: normalizePercents(values),
  };
}
