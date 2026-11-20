import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapTiles } from './map-tiles';

describe('proveedor del mapa (SG-09)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('por defecto usa OpenFreeMap, con su atribución y a OpenStreetMap', () => {
    vi.stubEnv('NEXT_PUBLIC_MAP_STYLE_URL', '');
    const tiles = mapTiles();
    expect(tiles.styleUrl).toBe('https://tiles.openfreemap.org/styles/liberty');
    expect(tiles.attribution).toContain('OpenFreeMap');
    expect(tiles.attribution).toContain('OpenStreetMap');
  });

  it('nunca apunta al servidor público de OpenStreetMap', () => {
    vi.stubEnv('NEXT_PUBLIC_MAP_STYLE_URL', '');
    expect(mapTiles().styleUrl).not.toContain('tile.openstreetmap.org');
  });

  it('un estilo propio (plan B) reemplaza al de OpenFreeMap, con su atribución si la hay', () => {
    vi.stubEnv('NEXT_PUBLIC_MAP_STYLE_URL', ' https://mapas.ejemplo.com/style.json ');
    vi.stubEnv('NEXT_PUBLIC_MAP_ATTRIBUTION', '© Ejemplo');
    expect(mapTiles()).toEqual({
      styleUrl: 'https://mapas.ejemplo.com/style.json',
      attribution: '© Ejemplo',
    });
  });
});
