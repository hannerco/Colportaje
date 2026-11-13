import { describe, expect, it } from 'vitest';
import { fitWithin, photoPaths } from './photo';

describe('photo', () => {
  it('BR-PHO-02: rutas bajo {owner_id}/{kind}/ con archivo y miniatura', () => {
    expect(photoPaths('owner-1', 'customer_info', 'photo-1')).toEqual({
      path: 'owner-1/customer_info/photo-1.webp',
      thumbPath: 'owner-1/customer_info/photo-1.thumb.webp',
    });
  });

  it('BR-PHO-01: 4.000 × 3.000 cabe en 1.280 × 960; en vertical, 960 × 1.280', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it('BR-PHO-01: una imagen más pequeña no se agranda', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });

  it('una imagen muy alargada no queda con un lado de 0 px', () => {
    expect(fitWithin(10_000, 2, 320)).toEqual({ width: 320, height: 1 });
  });
});
