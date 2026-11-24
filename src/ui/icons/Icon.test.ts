import { describe, expect, it } from 'vitest';
import { strokeWidthFor } from './Icon';
import { ICON_MAP, ICON_NAMES } from './icon-map';

describe('Ícono (HU-UI-03)', () => {
  it('R1: trazo 1,8; 2 cuando mide 16 px o menos; automático (18/20 px) es 1,8', () => {
    expect(strokeWidthFor(undefined)).toBe(1.8);
    expect(strokeWidthFor(24)).toBe(1.8);
    expect(strokeWidthFor(17)).toBe(1.8);
    expect(strokeWidthFor(16)).toBe(2);
    expect(strokeWidthFor(12)).toBe(2);
  });

  it('R2: el mapa tiene los 47 nombres, cada uno con un ícono Lucide distinto', () => {
    expect(ICON_NAMES).toHaveLength(47);
    expect(new Set(ICON_NAMES.map((n) => ICON_MAP[n].lucide)).size).toBe(47);
    expect(new Set(ICON_NAMES.map((n) => ICON_MAP[n].icon)).size).toBe(47);
  });
});
