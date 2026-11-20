// Proveedor del mapa (ADR-0036, SG-09 resuelta: OpenFreeMap). Teselas vectoriales de OpenStreetMap, gratis, sin cuenta ni
// clave, que se dibujan con MapLibre GL dentro de Leaflet. Nunca el servidor público de OpenStreetMap en una app
// distribuida. Para alojar el estilo propio (plan B), basta `NEXT_PUBLIC_MAP_STYLE_URL`.

export type MapTiles = {
  /** URL del estilo MapLibre (JSON). */
  readonly styleUrl: string;
  /** Atribución visible (HTML corto con enlaces; es una constante o una variable de entorno del dueño). */
  readonly attribution: string;
};

const OPENFREEMAP: MapTiles = {
  styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
  attribution:
    '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ' +
    '© <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> ' +
    'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
};

/** El estilo del mapa. Se leen las variables con su nombre literal (Next). */
export const mapTiles = (): MapTiles => {
  const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  if (!styleUrl) return OPENFREEMAP;
  return {
    styleUrl,
    attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION?.trim() ?? OPENFREEMAP.attribution,
  };
};
