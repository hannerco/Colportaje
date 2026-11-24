import type { MetadataRoute } from 'next';
import { copy } from '@/copy/es';
import { ROUTES } from '@/features/shell/navigation';

// Manifiesto de la PWA instalable (HU-BASE-06, ARCHITECTURE §6; marca: lienzo «Íconos de instalación», ronda 37).
// Los colores van escritos porque el manifiesto no entiende variables CSS: theme_color = accent (#092E53) y
// background_color = fondo claro de la app (page-mobile, #F4F2EE).
// #103: Android actualiza el ícono de la app instalada cuando cambia el manifest (lo revisa al abrirla, como mucho una
// vez al día). Necesita una identidad fija (`id`) y que la dirección del ícono cambie al cambiar el dibujo: subir
// ICONS_VERSION cada vez que se cambien los íconos. iPhone no actualiza el ícono de una app ya instalada.
const ICONS_VERSION = 'marca-1';
const icon = (path: string) => `${path}?v=${ICONS_VERSION}`;

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: copy.app.name,
    short_name: copy.app.name,
    description: copy.app.tagline,
    lang: 'es-CO',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F4F2EE',
    theme_color: '#092E53',
    icons: [
      { src: icon('/icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon('/icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icon('/icons/icon-512-maskable.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: icon('/icons/icon-monochrome.png'), sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
    ],
    shortcuts: [
      {
        name: copy.app.shortcuts.newCustomer,
        url: ROUTES.newCustomer,
        icons: [{ src: icon('/icons/atajo-nuevo-cliente.png'), sizes: '96x96', type: 'image/png' }],
      },
      {
        name: copy.app.shortcuts.collect,
        url: ROUTES.money,
        icons: [{ src: icon('/icons/atajo-cobrar.png'), sizes: '96x96', type: 'image/png' }],
      },
    ],
  };
}
