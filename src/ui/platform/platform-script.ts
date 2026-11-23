import { MOBILE_MEDIA_QUERY } from '../tokens/breakpoints';
import { THEME_STORAGE_KEY } from './theme-preference';

/**
 * Script en línea del `<head>` (HU-PAN-BASE-01, I-36): antes del primer pintado pone `data-platform` en `<html>` según
 * el punto de corte y lo actualiza al cambiar el ancho, sin recargar (R1). Si en Ajustes se eligió Claro u Oscuro en
 * este dispositivo (#42), pone también `data-theme` antes del primer pintado (sin destello); sin elección, los tokens
 * siguen a `prefers-color-scheme` desde el CSS (I-38).
 */
export const PLATFORM_SCRIPT = `(function(){try{var m=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(m==='light'||m==='dark')document.documentElement.setAttribute('data-theme',m)}catch(e){}try{var q=window.matchMedia(${JSON.stringify(
  MOBILE_MEDIA_QUERY,
)});var s=function(){document.documentElement.setAttribute('data-platform',q.matches?'mobile':'desktop')};s();q.addEventListener('change',s)}catch(e){}})();`;
