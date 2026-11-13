import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_SERVER } from 'next/constants';
import { assertPublicEnv } from './src/lib/env';

export default function config(phase: string): NextConfig {
  // HU-BASE-01: la app no arranca sin sus variables. El build no las exige para que
  // la CI compile sin claves; Vercel las inyecta en su propio build.
  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_SERVER) {
    assertPublicEnv(process.env);
  }
  // Serwist (HU-BASE-06): service worker de la PWA, servido por src/app/serwist/[path]/route.ts.
  return withSerwist({ reactStrictMode: true });
}
