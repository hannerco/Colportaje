// Datos del cliente: validaciones y posibles duplicados (HU-CLI-02, BR-CUS-01/11/15, ADR-0037).
import { businessConfig } from './config/business-config';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { compareEs, compareIds, normalizeForSearch } from './text';

export const CUSTOMER_ERROR_CODES = {
  CUSTOMER_ARCHIVED: 'CUSTOMER_ARCHIVED',
  /** Descartar se rechaza: un abono del cliente ya está en un Abibono (HU-CLI-03 R1). */
  CUSTOMER_DISCARD_BLOCKED: 'CUSTOMER_DISCARD_BLOCKED',
} as const;

// ─── Avatar (R2, BR-CUS-15) ────────────────────────────────────────────────────────────────────────
const graphemes = new Intl.Segmenter('es', { granularity: 'grapheme' });

/** Un emoji: pictograma (con tono de piel, variación o unión ZWJ), bandera o tecla (1️⃣). */
const EMOJI_GRAPHEME = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}$|[#*0-9]️?⃣$)/u;

/** Exactamente UN emoji: un solo grafema que es un emoji. Rechaza texto, varios emojis y emoji + texto. */
export const isValidAvatarEmoji = (text: string): boolean => {
  const parts = [...graphemes.segment(text)];
  if (parts.length !== 1) return false;
  const [only] = parts;
  return EMOJI_GRAPHEME.test(only!.segment) && !/\p{L}/u.test(only!.segment);
};

// ─── Enlace de Maps (R3, SECURITY.md) ──────────────────────────────────────────────────────────────
/** Hosts permitidos; en google.com el camino debe empezar por /maps. */
const MAPS_HOSTS: Readonly<Record<string, string>> = {
  'google.com': '/maps',
  'www.google.com': '/maps',
  'maps.google.com': '/',
  'maps.app.goo.gl': '/',
};

/** `https` a google.com/maps, maps.google.com o maps.app.goo.gl; sin usuario, puerto ni espacios. */
export const isValidMapsUrl = (text: string): boolean => {
  if (/\s/.test(text)) return false;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  const requiredPath = MAPS_HOSTS[url.hostname];
  return (
    url.protocol === 'https:' &&
    requiredPath !== undefined &&
    url.username === '' &&
    url.password === '' &&
    url.port === '' &&
    (requiredPath === '/' || url.pathname === requiredPath || url.pathname.startsWith(`${requiredPath}/`))
  );
};

// ─── Teléfono (R5) ─────────────────────────────────────────────────────────────────────────────────
/** Solo dígitos, sin el prefijo de Colombia (57) delante de un número de 10 dígitos. */
export const normalizePhone = (phone: string | null | undefined): string => {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('57') ? digits.slice(2) : digits;
};

// ─── Nombre parecido (R5) ──────────────────────────────────────────────────────────────────────────
const levenshtein = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length]!;
};

const ratio = (a: string, b: string): number =>
  a.length === 0 && b.length === 0 ? 1 : 1 - levenshtein(a, b) / Math.max(a.length, b.length);

const sortedWords = (name: string) => name.split(' ').sort().join(' ');

/**
 * Similitud de 0 a 1 entre dos nombres normalizados (sin tildes ni mayúsculas): 1 − distancia de edición
 * relativa, tomando el mejor de "tal cual" y "con las palabras ordenadas" (Gómez María = María Gómez).
 */
export const nameSimilarity = (a: string, b: string): number => {
  const x = normalizeForSearch(a);
  const y = normalizeForSearch(b);
  return Math.max(ratio(x, y), ratio(sortedWords(x), sortedWords(y)));
};

/** Umbral de "nombre casi idéntico" (BR-CUS-11). Fijado en HU-CLI-02 con su prueba de aceptación. */
export const DUPLICATE_NAME_THRESHOLD = businessConfig.duplicates.nameThreshold;

export type DuplicateCandidate = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly archived: boolean;
};

export type PossibleDuplicate = DuplicateCandidate & { readonly reason: 'phone' | 'name' };

/**
 * Posibles duplicados (R5, BR-CUS-11, AF-70): mismo teléfono (solo dígitos, sin prefijo 57) o nombre
 * igual normalizado o por encima del umbral. Incluye archivados (marcados). Informativo, nunca bloquea.
 * Primero los de teléfono; luego los de nombre, del más parecido al menos; empates por nombre e id.
 */
export const findPossibleDuplicates = (
  candidates: readonly DuplicateCandidate[],
  query: {
    readonly name?: string | null;
    readonly phone?: string | null;
    readonly excludeId?: string | null;
  },
): PossibleDuplicate[] => {
  const phone = normalizePhone(query.phone);
  const name = normalizeForSearch(query.name ?? '');
  const found: (PossibleDuplicate & { score: number })[] = [];
  for (const candidate of candidates) {
    if (candidate.id === query.excludeId) continue;
    if (phone && normalizePhone(candidate.phone) === phone) {
      found.push({ ...candidate, reason: 'phone', score: 2 });
      continue;
    }
    const score = name ? nameSimilarity(name, candidate.name) : 0;
    if (name && score >= DUPLICATE_NAME_THRESHOLD) found.push({ ...candidate, reason: 'name', score });
  }
  return found
    .sort((a, b) => b.score - a.score || compareEs(a.name, b.name) || compareIds(a.id, b.id))
    .map((d) => ({ id: d.id, name: d.name, phone: d.phone, archived: d.archived, reason: d.reason }));
};

// ─── Crear y editar (R1–R3) ────────────────────────────────────────────────────────────────────────
export type CustomerPatch = {
  readonly name?: string;
  readonly phone?: string | null;
  readonly info?: string | null;
  readonly address?: string | null;
  readonly avatarEmoji?: string | null;
  readonly mapsUrl?: string | null;
};

/** R1: el nombre tiene texto; se guarda sin espacios a los lados. */
export const validateCustomerName = (name: string): Result<string, AppError> => {
  const trimmed = name.trim();
  return trimmed ? ok(trimmed) : err(validationError('name'));
};

const optionalText = (value: string | null): string | null =>
  value === null || value.trim() === '' ? null : value;

/**
 * Valida y limpia un cambio parcial: nombre recortado; textos opcionales vacíos = `null` (los demás se
 * guardan tal cual, CA-3); emoji y enlace de Maps validados (vacío = `null`).
 */
export const validateCustomerPatch = (patch: CustomerPatch): Result<CustomerPatch, AppError> => {
  const clean: { -readonly [K in keyof CustomerPatch]: CustomerPatch[K] } = {};
  if (patch.name !== undefined) {
    const name = validateCustomerName(patch.name);
    if (!name.ok) return name;
    clean.name = name.value;
  }
  for (const key of ['phone', 'info', 'address'] as const) {
    if (patch[key] !== undefined) clean[key] = optionalText(patch[key]);
  }
  if (patch.avatarEmoji !== undefined) {
    const emoji = optionalText(patch.avatarEmoji);
    if (emoji !== null && !isValidAvatarEmoji(emoji)) return err(validationError('avatarEmoji'));
    clean.avatarEmoji = emoji;
  }
  if (patch.mapsUrl !== undefined) {
    const url = optionalText(patch.mapsUrl);
    if (url !== null && !isValidMapsUrl(url)) return err(validationError('mapsUrl'));
    clean.mapsUrl = url;
  }
  return ok(clean);
};
