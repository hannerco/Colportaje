import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { copy } from '@/copy/es';
import { PLATFORM_SCRIPT } from '@/ui/platform/platform-script';
import '@/ui/tokens/tokens.css';
import './app.css';
import { Providers } from './providers';

const shareTitle = `${copy.app.name} · ${copy.app.tagline}`;

// Marca (ronda 37): favicon (con su variante oscura en el SVG), ícono de iPhone e imagen para compartir de 1200 × 630.
export const metadata: Metadata = {
  metadataBase: new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'colportor-six.vercel.app'}`),
  title: copy.app.name,
  applicationName: copy.app.name,
  description: copy.app.support,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
    other: [{ rel: 'mask-icon', url: '/safari-pinned-tab.svg' }],
  },
  appleWebApp: { capable: true, title: copy.app.name, statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: copy.app.name,
    title: shareTitle,
    description: copy.app.support,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: shareTitle }],
  },
  twitter: {
    card: 'summary_large_image',
    title: shareTitle,
    description: copy.app.support,
    images: ['/og.png'],
  },
};

// CA-3: el navegador pinta su lienzo en el tema del sistema desde el primer cuadro (sin destello claro).
// #25: `cover` deja que la app use toda la pantalla del iPhone; las áreas seguras las respetan los tokens `--safe-*`.
export const viewport: Viewport = { colorScheme: 'light dark', viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `data-platform` lo pone el script antes de hidratar (I-36); `data-theme` no se pone: sigue al sistema (I-38).
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PLATFORM_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
