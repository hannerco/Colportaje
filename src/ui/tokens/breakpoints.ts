// Punto de corte entre móvil y escritorio (I-36, 00-REGLAS-COMUNES-FRONT §4): móvil por debajo de 768 px.
// Lo usan usePlatform() y la app (HU-PAN-BASE-01). En CSS, el mismo valor está en tokens.css.

/** Ancho máximo (px) que todavía es «móvil». */
export const MOBILE_MAX_WIDTH = 767;

/** Media query de «móvil». */
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;
