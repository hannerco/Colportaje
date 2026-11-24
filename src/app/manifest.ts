import type { MetadataRoute } from 'next';
import { copy } from '@/copy/es';
import { ROUTES } from '@/features/shell/navigation';

// Manifiesto de la PWA instalable (HU-BASE-06, ARCHITECTURE §6; marca: lienzo «Íconos de instalación», ronda 37).
// Los colores van escritos porque el manifiesto no entiende variables CSS: theme_color = accent (#092E53) y
// background_color = fondo claro de la app (page-mobile, #F4F2EE).
export default function manifest(): MetadataRoute.Manifest {
  return {
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
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-monochrome.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
    ],
    shortcuts: [
      {
        name: copy.app.shortcuts.newCustomer,
        url: ROUTES.newCustomer,
        icons: [{ src: '/icons/atajo-nuevo-cliente.png', sizes: '96x96', type: 'image/png' }],
      },
      {
        name: copy.app.shortcuts.collect,
        url: ROUTES.money,
        icons: [{ src: '/icons/atajo-cobrar.png', sizes: '96x96', type: 'image/png' }],
      },
    ],
  };
}
