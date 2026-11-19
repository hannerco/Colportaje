import { describe, expect, it } from 'vitest';
import { GAUGE_GAP_DEGREES, gaugeSegments, normalizePercents } from './gauge-segments';

const span = (s: { start: number; end: number }) => s.end - s.start;

describe('gaugeSegments (HU-UI-18, R4)', () => {
  it('R1: 52/14/34 da tres tramos en orden, de 0° a 180°, con 1,2° entre ellos', () => {
    const { segments, width, height, stroke } = gaugeSegments({ delivered: 52, collected: 14, pending: 34 });
    expect({ width, height, stroke }).toEqual({ width: 240, height: 120, stroke: 24 });
    expect(segments.map((s) => s.key)).toEqual(['delivered', 'collected', 'pending']);
    expect(segments[0]!.start).toBe(0);
    expect(segments[2]!.end).toBe(180);
    expect(segments[1]!.start - segments[0]!.end).toBeCloseTo(GAUGE_GAP_DEGREES);
    expect(segments[2]!.start - segments[1]!.end).toBeCloseTo(GAUGE_GAP_DEGREES);
    const available = 180 - 2 * GAUGE_GAP_DEGREES;
    expect(span(segments[0]!)).toBeCloseTo(available * 0.52, 2);
    expect(span(segments[1]!)).toBeCloseTo(available * 0.14, 2);
  });

  it('el arco empieza a la izquierda y termina a la derecha, en el borde inferior', () => {
    const { segments } = gaugeSegments({ delivered: 0, collected: 0, pending: 100 });
    // radio al centro del grosor: (240 - 24) / 2 = 108; centro en (120, 120).
    expect(segments[0]!.d).toBe('M 12 120 A 108 108 0 0 1 228 120');
  });

  it('grande: 320 de ancho y 30 de grosor', () => {
    const { width, height, stroke } = gaugeSegments({ delivered: 1, collected: 1, pending: 1 }, 'large');
    expect({ width, height, stroke }).toEqual({ width: 320, height: 160, stroke: 30 });
  });

  it('CA-2: 0/0/100 dibuja solo por cobrar, sin separaciones, en todo el arco', () => {
    const { segments, percents } = gaugeSegments({ delivered: 0, collected: 0, pending: 100 });
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ key: 'pending', start: 0, end: 180 });
    expect(percents.delivered).toBe(0);
  });

  it('CA-3: 30/30/30 se normaliza y cada tramo ocupa un tercio del arco', () => {
    const { segments, percents } = gaugeSegments({ delivered: 30, collected: 30, pending: 30 });
    const third = (180 - 2 * GAUGE_GAP_DEGREES) / 3;
    for (const segment of segments) expect(span(segment)).toBeCloseTo(third, 2);
    expect(percents).toEqual({ delivered: 34, collected: 33, pending: 33 });
  });

  it('CA-4: 0/0/0 no dibuja tramos, da 0 % y no divide por cero', () => {
    const geometry = gaugeSegments({ delivered: 0, collected: 0, pending: 0 });
    expect(geometry.segments).toEqual([]);
    expect(geometry.percents).toEqual({ delivered: 0, collected: 0, pending: 0 });
    expect(geometry.track).not.toContain('NaN');
  });

  it('R2: un tramo de 0 en medio no se dibuja ni deja separación', () => {
    const { segments } = gaugeSegments({ delivered: 50, collected: 0, pending: 50 });
    expect(segments.map((s) => s.key)).toEqual(['delivered', 'pending']);
    expect(span(segments[0]!)).toBeCloseTo((180 - GAUGE_GAP_DEGREES) / 2, 2);
    expect(segments[1]!.start - segments[0]!.end).toBeCloseTo(GAUGE_GAP_DEGREES);
  });

  it('valores negativos o no finitos cuentan como 0', () => {
    const { segments } = gaugeSegments({ delivered: -5, collected: Number.NaN, pending: 10 });
    expect(segments.map((s) => s.key)).toEqual(['pending']);
  });
});

describe('normalizePercents (I-11: enteros que suman 100)', () => {
  it('respeta los valores que ya suman 100', () => {
    expect(normalizePercents({ delivered: 52, collected: 14, pending: 34 })).toEqual({
      delivered: 52,
      collected: 14,
      pending: 34,
    });
  });

  it('reparte el resto al mayor decimal', () => {
    expect(normalizePercents({ delivered: 1, collected: 1, pending: 4 })).toEqual({
      delivered: 17,
      collected: 17,
      pending: 66,
    });
  });
});
