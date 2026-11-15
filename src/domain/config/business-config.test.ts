import { describe, expect, it } from 'vitest';
import { businessConfig } from './business-config';

describe('businessConfig', () => {
  it('BR-GEN-15: contiene todas las claves de 00-REGLAS-COMUNES §8 con sus valores iniciales', () => {
    expect(businessConfig).toEqual({
      timezone: 'America/Bogota',
      defaultPaymentMethod: 'transfer',
      paymentPlan: {
        amountMultiple: 1000,
        paydays: { biweekly: [15, 30], monthly: [30] },
        weeklyStepDays: 7,
      },
      reschedule: { confirmBeyondMonths: 2 },
      location: {
        approximateAccuracyMeters: 50,
        defaultCenter: { lat: expect.any(Number), lng: expect.any(Number), zoom: expect.any(Number) },
      },
      copyDelete: { noteRequired: false },
      undo: { toastSeconds: 6 },
      photos: {
        format: 'webp',
        maxLongSidePx: 1280,
        targetBytes: 150_000,
        thumbnailMaxLongSidePx: 320,
        thumbnailTargetBytes: 15_000,
        signedUrlSeconds: 3600,
      },
      search: { fuzzyThreshold: 0.3 },
      duplicates: { nameThreshold: 0.85 },
    });
  });

  it('BR-GEN-15: el centro por defecto cae dentro de Colombia', () => {
    const { lat, lng } = businessConfig.location.defaultCenter;
    expect(lat).toBeGreaterThan(-4.3);
    expect(lat).toBeLessThan(13.5);
    expect(lng).toBeGreaterThan(-79.1);
    expect(lng).toBeLessThan(-66.8);
  });

  it('BR-GEN-15: está congelada en todos sus niveles', () => {
    expect(Object.isFrozen(businessConfig)).toBe(true);
    expect(Object.isFrozen(businessConfig.paymentPlan.paydays)).toBe(true);
    expect(Object.isFrozen(businessConfig.paymentPlan.paydays.biweekly)).toBe(true);
    expect(() => {
      (businessConfig.undo as { toastSeconds: number }).toastSeconds = 10;
    }).toThrow(TypeError);
  });
});
