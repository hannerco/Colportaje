// Emojis del selector del avatar (BR-CUS-15, #34; #63): el catálogo completo de Unicode con nombres y palabras en
// español (emoji-catalog.json, de scripts/generate-emoji-catalog.mjs) viaja con la app y funciona sin conexión. La lista
// de abajo agrega palabras propias (p. ej. «panadería», «tienda») para encontrar rápido el oficio de un cliente. Son los
// emojis del sistema, así que pueden verse un poco distintos en Android y iPhone.

/** `name`: lo que se busca (nombre y palabras); `label`: lo que oye el lector (el nombre solo). */
export type EmojiEntry = { readonly emoji: string; readonly name: string; readonly label?: string };
export type EmojiGroup = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly EmojiEntry[];
};

const e = (emoji: string, name: string): EmojiEntry => ({ emoji, name });

/** Palabras propias por emoji (se suman a las del catálogo). */
export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  {
    id: 'people',
    label: 'Personas',
    items: [
      e('👩', 'mujer'),
      e('👨', 'hombre'),
      e('👵', 'abuela señora mayor'),
      e('👴', 'abuelo señor mayor'),
      e('👧', 'niña'),
      e('👦', 'niño'),
      e('👶', 'bebé'),
      e('👩‍🦱', 'mujer pelo rizado'),
      e('👨‍🦳', 'hombre canas'),
      e('👩‍🦰', 'mujer pelirroja'),
      e('🧔', 'hombre barba'),
      e('👱‍♀️', 'mujer rubia'),
      e('👩‍🍳', 'cocinera'),
      e('👨‍🔧', 'mecánico'),
      e('👩‍🏫', 'profesora maestra'),
      e('👨‍🌾', 'campesino agricultor'),
      e('👩‍⚕️', 'enfermera médica'),
      e('👮', 'policía'),
      e('💇‍♀️', 'peluquería'),
      e('🙏', 'oración manos'),
      e('👪', 'familia'),
      e('💑', 'pareja'),
      e('🤝', 'acuerdo saludo'),
      e('😊', 'feliz sonrisa'),
    ],
  },
  {
    id: 'nature',
    label: 'Naturaleza',
    items: [
      e('🌻', 'girasol flor'),
      e('🌷', 'tulipán flor'),
      e('🌹', 'rosa flor'),
      e('🌺', 'flor hibisco'),
      e('🌳', 'árbol'),
      e('🌴', 'palmera'),
      e('🌵', 'cactus'),
      e('🍀', 'trébol suerte'),
      e('🌙', 'luna'),
      e('⭐', 'estrella'),
      e('☀️', 'sol'),
      e('🌈', 'arcoíris'),
      e('🐶', 'perro'),
      e('🐱', 'gato'),
      e('🐦', 'pájaro'),
      e('🐟', 'pez'),
      e('🐔', 'gallina'),
      e('🐄', 'vaca'),
      e('🐴', 'caballo'),
      e('🦋', 'mariposa'),
    ],
  },
  {
    id: 'food',
    label: 'Comida',
    items: [
      e('🍞', 'pan panadería'),
      e('☕', 'café tinto'),
      e('🍎', 'manzana'),
      e('🍌', 'banano'),
      e('🥑', 'aguacate'),
      e('🍋', 'limón'),
      e('🌽', 'maíz mazorca'),
      e('🍇', 'uvas'),
      e('🧀', 'queso'),
      e('🍰', 'torta pastel'),
      e('🥚', 'huevo'),
      e('🍗', 'pollo'),
      e('🍲', 'sopa'),
      e('🥤', 'jugo bebida'),
      e('🍓', 'fresa'),
      e('🍊', 'naranja mandarina'),
    ],
  },
  {
    id: 'objects',
    label: 'Objetos',
    items: [
      e('📚', 'libros'),
      e('📖', 'libro abierto biblia'),
      e('⛪', 'iglesia'),
      e('🏠', 'casa'),
      e('🏪', 'tienda negocio'),
      e('🏫', 'colegio escuela'),
      e('🏥', 'hospital'),
      e('🚗', 'carro'),
      e('🏍️', 'moto'),
      e('🚲', 'bicicleta'),
      e('🎸', 'guitarra música'),
      e('⚽', 'fútbol balón'),
      e('✂️', 'tijeras costura'),
      e('🔧', 'herramienta'),
      e('💼', 'oficina trabajo'),
      e('📱', 'celular'),
    ],
  },
  {
    id: 'symbols',
    label: 'Símbolos',
    items: [
      e('❤️', 'corazón rojo'),
      e('💙', 'corazón azul'),
      e('💚', 'corazón verde'),
      e('💛', 'corazón amarillo'),
      e('✨', 'brillo'),
      e('🔥', 'fuego'),
      e('💎', 'diamante'),
      e('🎁', 'regalo'),
      e('🎉', 'fiesta'),
      e('👑', 'corona'),
      e('🕊️', 'paloma paz'),
      e('✝️', 'cruz'),
    ],
  },
];

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Una fila del catálogo: el emoji, su categoría y sus nombres en español. */
export type CatalogEntry = readonly [emoji: string, category: string, label: string, keywords: string];

/** Las categorías del selector, en orden; «recent» son los últimos elegidos en este dispositivo. */
export const EMOJI_CATEGORIES = [
  'recent',
  'smileys',
  'people',
  'animals',
  'food',
  'travel',
  'activities',
  'objects',
  'symbols',
  'flags',
] as const;
export type EmojiCategory = (typeof EMOJI_CATEGORIES)[number];

/** El emoji que representa cada categoría en su pestaña. */
export const CATEGORY_ICON: Record<EmojiCategory, string> = {
  recent: '🕘',
  smileys: '😀',
  people: '👋',
  animals: '🐻',
  food: '🍔',
  travel: '✈️',
  activities: '⚽',
  objects: '💡',
  symbols: '🔣',
  flags: '🏁',
};

/**
 * Los grupos del selector (#63): Recientes (si hay) y cada categoría con sus emojis; el nombre de cada uno junta el
 * del catálogo y las palabras propias.
 */
export function buildEmojiGroups(
  catalog: readonly CatalogEntry[],
  recent: readonly string[],
  labels: Record<EmojiCategory, string>,
): EmojiGroup[] {
  const extra = new Map(EMOJI_GROUPS.flatMap((g) => g.items.map((i) => [i.emoji, i.name] as const)));
  const byEmoji = new Map<string, EmojiEntry>();
  const groups = new Map<string, EmojiEntry[]>();
  for (const [emoji, category, label, keywords] of catalog) {
    const entry = { emoji, label, name: [label, keywords, extra.get(emoji)].filter(Boolean).join(' ') };
    byEmoji.set(emoji, entry);
    groups.set(category, [...(groups.get(category) ?? []), entry]);
  }
  const recentItems = recent.map((emoji) => byEmoji.get(emoji) ?? e(emoji, extra.get(emoji) ?? ''));
  return EMOJI_CATEGORIES.map((id) => ({
    id,
    label: labels[id],
    items: id === 'recent' ? recentItems : (groups.get(id) ?? []),
  })).filter((group) => group.items.length > 0);
}

/** Los últimos emojis elegidos, primero el más reciente, sin repetir (como mucho `max`). */
export const pushRecent = (recent: readonly string[], emoji: string, max = 24): string[] =>
  [emoji, ...recent.filter((r) => r !== emoji)].slice(0, max);

/** Los grupos con los emojis cuyo nombre contiene lo buscado (sin tildes ni mayúsculas); vacío = todos. */
export function filterEmojis(query: string, groups: readonly EmojiGroup[] = EMOJI_GROUPS): EmojiGroup[] {
  const q = normalize(query);
  if (!q) return [...groups];
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => normalize(item.name).includes(q)) }))
    .filter((group) => group.items.length > 0);
}
