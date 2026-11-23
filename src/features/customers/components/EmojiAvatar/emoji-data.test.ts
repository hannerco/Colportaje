import { describe, expect, it } from 'vitest';
import catalog from './emoji-catalog.json';
import {
  EMOJI_GROUPS,
  buildEmojiGroups,
  filterEmojis,
  pushRecent,
  type CatalogEntry,
  type EmojiCategory,
} from './emoji-data';

const labels = Object.fromEntries(
  [
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
  ].map((id) => [id, id]),
) as Record<EmojiCategory, string>;
const groups = buildEmojiGroups(catalog as unknown as CatalogEntry[], [], labels);

describe('selector de emoji (#34, #63)', () => {
  it('trae el catálogo completo por categorías (más de 1.500 emojis, sin componentes sueltos)', () => {
    expect(groups.map((g) => g.id)).toEqual([
      'smileys',
      'people',
      'animals',
      'food',
      'travel',
      'activities',
      'objects',
      'symbols',
      'flags',
    ]);
    expect(groups.reduce((sum, g) => sum + g.items.length, 0)).toBeGreaterThan(1500);
  });

  it('busca en español, sin tildes ni mayúsculas, también con las palabras propias', () => {
    const found = filterEmojis('PANADERIA', groups).flatMap((g) => g.items.map((i) => i.emoji));
    expect(found).toContain('🍞');
    expect(filterEmojis('perro', groups).flatMap((g) => g.items.map((i) => i.emoji))).toContain('🐶');
  });

  it('sin resultados devuelve una lista vacía', () => {
    expect(filterEmojis('zzzqqq', groups)).toEqual([]);
  });

  it('cada emoji es uno solo (BR-CUS-15) y no se repite', () => {
    const all = groups.flatMap((g) => g.items.map((i) => i.emoji));
    expect(new Set(all).size).toBe(all.length);
    const curated = EMOJI_GROUPS.flatMap((g) => g.items.map((i) => i.emoji));
    expect(new Set(curated).size).toBe(curated.length);
  });

  it('Recientes va primero, con el último elegido adelante y sin repetir', () => {
    const recent = pushRecent(pushRecent(pushRecent([], '🍞'), '🐶'), '🍞');
    expect(recent).toEqual(['🍞', '🐶']);
    const withRecent = buildEmojiGroups(catalog as unknown as CatalogEntry[], recent, labels);
    expect(withRecent[0]!.id).toBe('recent');
    expect(withRecent[0]!.items.map((i) => i.emoji)).toEqual(['🍞', '🐶']);
  });
});
