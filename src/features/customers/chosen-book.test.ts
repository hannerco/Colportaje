import { describe, expect, it } from 'vitest';
import { localDate } from '@/domain/time';
import { chosenBookValues } from './chosen-book';

const today = localDate('2026-11-22');

describe('chosenBookValues (#31)', () => {
  it('mientras el servidor no responde, muestra hoy y el precio público, sin esperar', () => {
    expect(chosenBookValues({ typed: {}, publicPrice: 89000, today })).toEqual({
      agreedPrice: 89000,
      soldOn: today,
    });
  });

  it('cuando el servidor responde, muestra lo que guardó', () => {
    const saved = { agreedPrice: 85000, soldOn: localDate('2026-11-20') };
    expect(chosenBookValues({ typed: {}, saved, publicPrice: 89000, today })).toEqual(saved);
  });

  it('lo que el colportor escribió manda, aunque lo haya borrado', () => {
    const saved = { agreedPrice: 85000, soldOn: localDate('2026-11-20') };
    expect(
      chosenBookValues({
        typed: { agreedPrice: null, soldOn: localDate('2026-11-21') },
        saved,
        publicPrice: 89000,
        today,
      }),
    ).toEqual({ agreedPrice: null, soldOn: localDate('2026-11-21') });
  });
});
