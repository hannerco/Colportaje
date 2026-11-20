import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { createAppQueryClient } from './query-client';

/** Espera tiempo real (los temporizadores de limpieza de la caché son reales). */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('caché de lecturas (HU-BASE-06)', () => {
  it('una lectura restaurada sin conexión no se borra antes de que una pantalla la lea', async () => {
    // Lo que se guardó en el dispositivo: una lectura con datos.
    const saved = new QueryClient();
    saved.setQueryData(['customers', 'list'], { rows: ['María Gómez'] });
    const dehydrated = dehydrate(saved);

    // Al abrir la app sin conexión se restaura en la caché de la app, todavía sin pantallas que la miren.
    const client = createAppQueryClient();
    hydrate(client, dehydrated);
    await wait(30);
    expect(client.getQueryData(['customers', 'list'])).toEqual({ rows: ['María Gómez'] });
  });

  it('el tiempo de limpieza no desborda setTimeout (máximo ~24,8 días)', () => {
    const gcTime = createAppQueryClient().getDefaultOptions().queries?.gcTime;
    expect(gcTime === Infinity || (typeof gcTime === 'number' && gcTime <= 2 ** 31 - 1)).toBe(true);
  });
});
