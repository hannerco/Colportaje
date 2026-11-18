// Datos del diseño de cada componente (`parameters.design`) y el enlace «Reportar corrección» (HU-UI-01).

/** Lo que cada story declara en `parameters.design` (00-REGLAS-COMUNES-FRONT §9). */
export type DesignParameters = {
  /** Ficha del lienzo, p. ej. `'Lib-Boton'`. */
  ficha: string;
  /** Versión del diseño con la que se hizo, p. ej. `'v1.1'`. */
  version: string;
  /** Iteración del front (hoy 1). */
  iteration: number;
  /** «Cuándo usarlo», de la ficha. */
  whenToUse?: readonly string[];
  /** «Cuándo no usarlo», de la ficha. */
  whenNotToUse?: readonly string[];
  /** «Se usa en», de la ficha. */
  usedIn?: readonly string[];
};

/** Repositorio donde se abren los *issues* «Corrección de diseño». */
export const ISSUES_REPOSITORY = 'hannerco/Colportaje';
/** Plantilla de `.github/ISSUE_TEMPLATE/`. */
export const CORRECTION_TEMPLATE = 'correccion-de-diseno.yml';

/** Nombre visible del componente: el último tramo del título de la story (`Átomos/Botón` → `Botón`). */
export const componentNameFromTitle = (title: string): string => title.split('/').pop()?.trim() || title;

/** «Iteración 1 · diseño v1.1». */
export const designVersionLabel = (design: Pick<DesignParameters, 'iteration' | 'version'>): string =>
  `Iteración ${design.iteration} · diseño ${design.version}`;

/**
 * Enlace que abre en GitHub un *issue* nuevo con la plantilla «Corrección de diseño», el título `[<Componente>] `
 * ya escrito y, si se conoce, el enlace de la story en su campo.
 */
export const correctionIssueUrl = (input: { title: string; storyUrl?: string }): string => {
  const name = componentNameFromTitle(input.title);
  const params = new URLSearchParams({
    template: CORRECTION_TEMPLATE,
    title: `[${name}] `,
    componente: name,
  });
  if (input.storyUrl) params.set('enlace', input.storyUrl);
  // URLSearchParams codifica el espacio como «+»; %20 se lee como espacio en cualquier parte de la URL.
  return `https://github.com/${ISSUES_REPOSITORY}/issues/new?${params.toString().replaceAll('+', '%20')}`;
};
