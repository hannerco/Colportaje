import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { businessConfig } from './config/business-config';
import {
  APPROXIMATE_ACCURACY_METERS,
  getInitialPickerCenter,
  isApproximate,
  mapsLinkFor,
  validateLocation,
} from './customer-location';

const noLink = { latitude: null, longitude: null, mapsUrl: null, address: null };

describe('validateLocation (HU-CLI-06 R1)', () => {
  it('CA-1: 6,2518 / −75,5915 con 12 m es válida', () => {
    expect(validateLocation({ latitude: 6.2518, longitude: -75.5915, accuracyMeters: 12 })).toEqual({
      ok: true,
      value: { latitude: 6.2518, longitude: -75.5915, accuracyMeters: 12 },
    });
  });

  it('CA-3: latitud 91 → VALIDATION latitude; también fuera de rango, NaN o infinito', () => {
    for (const latitude of [91, -90.0001, Number.NaN, Number.POSITIVE_INFINITY])
      expect(validateLocation({ latitude, longitude: 0, accuracyMeters: 1 })).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION', details: { field: 'latitude' } },
      });
    expect(validateLocation({ latitude: 0, longitude: 180.5, accuracyMeters: 1 })).toMatchObject({
      error: { details: { field: 'longitude' } },
    });
    expect(validateLocation({ latitude: 0, longitude: '7' as never, accuracyMeters: 1 })).toMatchObject({
      error: { details: { field: 'longitude' } },
    });
  });

  it('los extremos son válidos', () => {
    expect(validateLocation({ latitude: -90, longitude: 180, accuracyMeters: 0 }).ok).toBe(true);
    expect(validateLocation({ latitude: 90, longitude: -180, accuracyMeters: null }).ok).toBe(true);
  });

  it('la precisión es entero ≥ 0 o null (pin ubicado a mano)', () => {
    for (const accuracyMeters of [-1, 12.5, Number.NaN])
      expect(validateLocation({ latitude: 0, longitude: 0, accuracyMeters })).toMatchObject({
        error: { details: { field: 'accuracyMeters' } },
      });
  });

  it('propiedad: toda coordenada en rango es válida y fuera de rango no', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), fc.double({ noNaN: true }), (lat, lng) => {
        const valid = Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
        expect(validateLocation({ latitude: lat, longitude: lng, accuracyMeters: null }).ok).toBe(valid);
      }),
    );
  });
});

describe('isApproximate (BR-CUS-08)', () => {
  it('CA-1 / CA-2: 12 m no es aproximada; 80 m sí; el límite (50 m) no', () => {
    expect(APPROXIMATE_ACCURACY_METERS).toBe(50);
    expect(isApproximate(12)).toBe(false);
    expect(isApproximate(80)).toBe(true);
    expect(isApproximate(50)).toBe(false);
    expect(isApproximate(51)).toBe(true);
    expect(isApproximate(null)).toBe(false);
  });
});

describe('mapsLinkFor (R2, R3)', () => {
  it('CA-1: con coordenadas, búsqueda por coordenadas aunque haya enlace y dirección', () => {
    expect(
      mapsLinkFor({
        latitude: 6.2518,
        longitude: -75.5915,
        mapsUrl: 'https://maps.app.goo.gl/abc',
        address: 'Cl. 48',
      }),
    ).toBe('https://www.google.com/maps/search/?api=1&query=6.2518,-75.5915');
  });

  it('R3: solo números (máximo 6 decimales, sin notación científica)', () => {
    expect(mapsLinkFor({ ...noLink, latitude: 1e-7, longitude: -75.12345678 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=0,-75.123457',
    );
  });

  it('sin coordenadas: el enlace pegado si es válido; uno inválido se ignora', () => {
    expect(mapsLinkFor({ ...noLink, mapsUrl: 'https://maps.app.goo.gl/abc' })).toBe(
      'https://maps.app.goo.gl/abc',
    );
    expect(mapsLinkFor({ ...noLink, mapsUrl: 'javascript:alert(1)', address: 'Envigado' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Envigado',
    );
  });

  it('una sola coordenada (dato incompleto) no arma el enlace por coordenadas', () => {
    expect(mapsLinkFor({ ...noLink, latitude: 6.25 })).toBeNull();
  });

  it('CA-4: sin coordenadas ni enlace, busca la dirección codificada; sin dirección, null', () => {
    expect(mapsLinkFor({ ...noLink, address: 'Cl. 48 #79-25, Laureles, Medellín' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Cl.%2048%20%2379-25%2C%20Laureles%2C%20Medell%C3%ADn',
    );
    expect(mapsLinkFor(noLink)).toBeNull();
    expect(mapsLinkFor({ ...noLink, address: '   ' })).toBeNull();
  });
});

describe('getInitialPickerCenter (AF-109)', () => {
  it('"Cambiar": la ubicación guardada del cliente gana', () => {
    expect(
      getInitialPickerCenter({
        customerLocation: { latitude: 6.2518, longitude: -75.5915 },
        lastChosenPoint: { lat: 6.25, lng: -75.59 },
      }),
    ).toEqual({ lat: 6.2518, lng: -75.5915, zoom: null });
  });

  it('CA-6: sin ubicación ni GPS, el último punto elegido en otro cliente', () => {
    expect(
      getInitialPickerCenter({ customerLocation: null, lastChosenPoint: { lat: 6.25, lng: -75.59 } }),
    ).toEqual({
      lat: 6.25,
      lng: -75.59,
      zoom: null,
    });
  });

  it('sin nada, la vista de Colombia', () => {
    expect(getInitialPickerCenter({ customerLocation: null, lastChosenPoint: null })).toEqual(
      businessConfig.location.defaultCenter,
    );
  });
});
