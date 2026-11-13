import { describe, expect, it } from 'vitest';
import { assignableCopies } from './assignable-copies';
import type { CopyStatus } from './copy';
import { localDate } from './time';
import type { Title } from './title';

const TITLES: Pick<Title, 'id' | 'name' | 'category' | 'imageUrl'>[] = [
  { id: 'psico', name: 'Psiconutrición', category: 'cultural', imageUrl: null },
  { id: 'bebidas', name: 'Bebidas saludables', category: 'cultural', imageUrl: 'https://img/b.webp' },
  { id: 'corazon', name: 'Un corazón tranquilo', category: 'religious', imageUrl: null },
  { id: 'mini', name: 'Minibook Paz interior', category: 'minibook', imageUrl: null },
];

const copy = (
  id: string,
  titleId: string,
  number: number,
  receivedAt: string,
  status: CopyStatus = 'in_stock',
  deletedAt: Date | null = null,
) => ({
  id,
  titleId,
  number,
  status,
  publicPriceSnapshot: 98_000,
  receivedAt: localDate(receivedAt),
  deletedAt,
});

/** CA-1: Bebidas #9 (30/10) y #10 (02/11), Psiconutrición #7. */
const CA1 = [
  copy('p7', 'psico', 7, '2026-10-15'),
  copy('b10', 'bebidas', 10, '2026-11-02'),
  copy('b9', 'bebidas', 9, '2026-10-30'),
];

describe('assignable-copies (HU-CLI-09, ADR-0044)', () => {
  it('CA-1: orden por título y recibido más antiguo → Bebidas #9, Bebidas #10, Psiconutrición #7', () => {
    expect(assignableCopies(CA1, TITLES).map((c) => [c.titleName, c.number])).toEqual([
      ['Bebidas saludables', 9],
      ['Bebidas saludables', 10],
      ['Psiconutrición', 7],
    ]);
  });

  it('cada fila trae su precio público copiado y la imagen del título', () => {
    expect(assignableCopies(CA1, TITLES)[0]).toEqual({
      copyId: 'b9',
      titleName: 'Bebidas saludables',
      number: 9,
      price: 98_000,
      imageUrl: 'https://img/b.webp',
    });
  });

  it('CA-2: "#10" trae solo Bebidas saludables #10; "7" solo el número 7', () => {
    expect(assignableCopies(CA1, TITLES, '#10').map((c) => c.copyId)).toEqual(['b10']);
    expect(assignableCopies(CA1, TITLES, '7').map((c) => c.copyId)).toEqual(['p7']);
  });

  it('busca por título sin tildes ni mayúsculas', () => {
    expect(assignableCopies(CA1, TITLES, 'PSICONUTRICION').map((c) => c.copyId)).toEqual(['p7']);
    expect(assignableCopies(CA1, TITLES, 'bebidas').map((c) => c.copyId)).toEqual(['b9', 'b10']);
    expect(assignableCopies(CA1, TITLES, '   ')).toHaveLength(3);
  });

  it('R1: solo en físico, sin minibooks, eliminados ni títulos desconocidos', () => {
    const copies = [
      ...CA1,
      copy('vendido', 'corazon', 1, '2026-10-01', 'sold'),
      copy('novedad', 'corazon', 2, '2026-10-01', 'flagged'),
      copy('mini', 'mini', 1, '2026-10-01'),
      copy('borrado', 'corazon', 3, '2026-10-01', 'in_stock', new Date()),
      copy('huerfano', 'otro', 1, '2026-10-01'),
    ];
    expect(assignableCopies(copies, TITLES).map((c) => c.copyId)).toEqual(['b9', 'b10', 'p7']);
  });

  it('misma fecha: por número; mismo número (datos que la base no permite): por id', () => {
    const copies = [
      copy('b', 'bebidas', 3, '2026-10-01'),
      copy('a', 'bebidas', 3, '2026-10-01'),
      copy('c', 'bebidas', 1, '2026-10-01'),
    ];
    expect(assignableCopies(copies, TITLES).map((c) => c.copyId)).toEqual(['c', 'a', 'b']);
  });
});
