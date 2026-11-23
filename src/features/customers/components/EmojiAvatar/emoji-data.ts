// Emojis del selector del avatar (BR-CUS-15, #34): viajan con la app (funciona sin conexión) y se buscan por nombre en
// español. Son los del sistema, así que pueden verse un poco distintos en Android y iPhone.

export type EmojiEntry = { readonly emoji: string; readonly name: string };
export type EmojiGroup = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly EmojiEntry[];
};

const e = (emoji: string, name: string): EmojiEntry => ({ emoji, name });

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

/** Los grupos con los emojis cuyo nombre contiene lo buscado (sin tildes ni mayúsculas); vacío = todos. */
export function filterEmojis(query: string, groups: readonly EmojiGroup[] = EMOJI_GROUPS): EmojiGroup[] {
  const q = normalize(query);
  if (!q) return [...groups];
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => normalize(item.name).includes(q)) }))
    .filter((group) => group.items.length > 0);
}
