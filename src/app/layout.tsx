import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { copy } from '@/copy/es';
import { PLATFORM_SCRIPT } from '@/ui/platform/platform-script';
import '@/ui/tokens/tokens.css';
import './app.css';
import { Providers } from './providers';

export const metadata: Metadata = { title: copy.app.name, applicationName: copy.app.name };

// CA-3: el navegador pinta su lienzo en el tema del sistema desde el primer cuadro (sin destello claro).
export const viewport: Viewport = { colorScheme: 'light dark' };

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
