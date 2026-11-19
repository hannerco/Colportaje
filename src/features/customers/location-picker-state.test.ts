import { describe, expect, it } from 'vitest';
import {
  formatCoordinates,
  pickerAccuracy,
  pickerPoint,
  pickerStatus,
  roundCoordinate,
  type GpsState,
} from './location-picker-state';

const fix = (accuracyMeters: number): GpsState => ({
  status: 'fixed',
  point: { lat: 6.2518, lng: -75.5915 },
  accuracyMeters,
});
const onFix = { lat: 6.2518, lng: -75.5915 };
const moved = { lat: 6.2525, lng: -75.5915 };

describe('selector de ubicación (HU-PAN-CLI-06)', () => {
  it('con el pin en el punto del GPS: encontrada hasta 50 m y aproximada por encima (CA-1, AF-110)', () => {
    expect(pickerStatus(fix(12), onFix)).toBe('found');
    expect(pickerStatus(fix(50), onFix)).toBe('found');
    expect(pickerStatus(fix(120), onFix)).toBe('approximate');
  });

  it('si el usuario mueve el mapa, el pin queda a mano y sin precisión', () => {
    expect(pickerStatus(fix(120), moved)).toBe('manual');
    expect(pickerAccuracy(fix(120), moved)).toBeNull();
    expect(pickerAccuracy(fix(12), onFix)).toBe(12);
  });

  it('el redondeo del mapa (menos de 1 m) no cuenta como mover el pin; se guarda el punto del GPS', () => {
    const rounded = { lat: 6.251797, lng: -75.591495 };
    expect(pickerStatus(fix(12), rounded)).toBe('found');
    expect(pickerPoint(fix(12), rounded)).toEqual(onFix);
    expect(pickerPoint(fix(12), moved)).toEqual(moved);
  });

  it('buscando, permiso negado, sin señal y sin GPS pedido (CA-2, AF-109)', () => {
    expect(pickerStatus({ status: 'searching' }, onFix)).toBe('searching');
    expect(pickerStatus({ status: 'denied' }, onFix)).toBe('denied');
    expect(pickerStatus({ status: 'unavailable' }, onFix)).toBe('noSignal');
    expect(pickerStatus({ status: 'idle' }, onFix)).toBe('manual');
    expect(pickerAccuracy({ status: 'denied' }, onFix)).toBeNull();
  });

  it('las coordenadas se ven como en el lienzo: «6,2518, −75,5915»', () => {
    expect(formatCoordinates(onFix)).toBe('6,2518, −75,5915');
    expect(formatCoordinates({ lat: -4.5, lng: 74.29731 })).toBe('−4,5000, 74,2973');
  });

  it('se guardan con 6 decimales', () => {
    expect(roundCoordinate(6.251812345)).toBe(6.251812);
  });
});
