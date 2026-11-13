/** Minúsculas, sin tildes ni diéresis, espacios recortados y colapsados. Base de la búsqueda y de los duplicados. */
export const normalizeForSearch = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** Orden en español sin distinguir mayúsculas ni tildes (00-REGLAS-COMUNES §7). */
export const compareEs = (a: string, b: string): number => collator.compare(a, b);

/** Desempate determinista por id, comparando por código (no por idioma) (00-REGLAS-COMUNES §7). */
export const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
