// Proveedor de teselas del mapa (ADR-0036, SG-09: por decidir; nunca el servidor público de OpenStreetMap en una app
// distribuida). Mientras el dueño decide, solo `pnpm dev` usa un proveedor de pruebas; la app compilada sin
// `NEXT_PUBLIC_MAP_TILES_URL` muestra el mapa sin imágenes (el pin, las coordenadas y «Abrir en Maps» funcionan).

export type MapTiles = { readonly url: string; readonly attribution: string };

/** Solo en desarrollo, para probar en local (SG-09). */
const DEVELOPMENT_TILES: MapTiles = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap',
};

/** Las teselas configuradas; `null` = sin proveedor (el mapa se ve liso). Se leen con su nombre literal (Next). */
export const mapTiles = (): MapTiles | null => {
  const url = process.env.NEXT_PUBLIC_MAP_TILES_URL?.trim();
  if (url) return { url, attribution: process.env.NEXT_PUBLIC_MAP_TILES_ATTRIBUTION?.trim() ?? '' };
  return process.env.NODE_ENV === 'development' ? DEVELOPMENT_TILES : null;
};
