// Sirve el service worker compilado por Serwist (Turbopack) en /serwist/sw.js (HU-BASE-06).
import { createSerwistRoute } from '@serwist/turbopack';

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'src/app/sw.ts',
  // esbuild nativo en todos los sistemas (es dependencia del proyecto; no hace falta esbuild-wasm).
  useNativeEsbuild: true,
});
