import { MOBILE_MEDIA_QUERY } from '../tokens/breakpoints';

/**
 * Script en línea del `<head>` (HU-PAN-BASE-01, I-36): antes del primer pintado pone `data-platform` en `<html>` según
 * el punto de corte y lo actualiza al cambiar el ancho, sin recargar (R1). El tema no necesita script: sin
 * `data-theme`, los tokens siguen a `prefers-color-scheme` desde el CSS (I-38).
 */
export const PLATFORM_SCRIPT = `(function(){try{var q=window.matchMedia(${JSON.stringify(
  MOBILE_MEDIA_QUERY,
)});var s=function(){document.documentElement.setAttribute('data-platform',q.matches?'mobile':'desktop')};s();q.addEventListener('change',s)}catch(e){}})();`;
