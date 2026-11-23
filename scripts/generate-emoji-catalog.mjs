// #63 · Genera el catálogo de emojis del selector del avatar desde emojibase-data (español). Se corre a mano cuando
// cambie la versión: `node scripts/generate-emoji-catalog.mjs`. El resultado va en el código (funciona sin conexión).
import { readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('node_modules/emojibase-data/es/data.json', 'utf8'));
// Grupos de emojibase → categorías del selector (sin «componentes»: tonos de piel y pelo sueltos).
const GROUPS = {
  0: 'smileys',
  1: 'people',
  3: 'animals',
  4: 'food',
  5: 'travel',
  6: 'activities',
  7: 'objects',
  8: 'symbols',
  9: 'flags',
};
// Hasta Unicode 14 (iOS 15.4+ y Android 12+): lo más nuevo puede no verse en teléfonos viejos.
const MAX_VERSION = 14;

const catalog = data
  .filter((e) => e.group in GROUPS && e.version <= MAX_VERSION && e.order !== undefined)
  .sort((a, b) => a.order - b.order)
  .map((e) => [e.emoji, GROUPS[e.group], e.label, (e.tags ?? []).join(' ')]);

writeFileSync('src/features/customers/components/EmojiAvatar/emoji-catalog.json', JSON.stringify(catalog));
// eslint-disable-next-line no-console -- script de línea de comandos: dice cuántos emojis generó.
console.log(`${catalog.length} emojis`);
