import type { MetadataRoute } from 'next';

// Manifiesto de la PWA instalable (HU-BASE-06, ARCHITECTURE §6). Colores e íconos provisionales hasta
// que el diseño defina los definitivos (tokens, ADR-0034): acento #1F1E1D de ARCHITECTURE §4b.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Colportor',
    short_name: 'Colportor',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#1F1E1D',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
