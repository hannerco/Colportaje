import { isValidCOP, type COP } from './money';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { compareEs } from './text';

export type TitleCategory = 'cultural' | 'religious' | 'minibook';

/** Orden de las categorías en listas y selectores (minibooks al final, BR-INV-03). */
export const CATEGORY_ORDER: readonly TitleCategory[] = ['cultural', 'religious', 'minibook'];

/** Un libro del catálogo (BR-TIT-02). */
export type Title = {
  readonly id: string;
  readonly name: string;
  readonly author: string | null;
  readonly description: string | null;
  readonly imageUrl: string | null;
  /** Nulo solo en minibooks (BR-TIT-04). */
  readonly publicPrice: COP | null;
  readonly colportorPrice: COP;
  readonly category: TitleCategory;
  readonly isActive: boolean;
};

/**
 * BR-INV-03: precio público vigente; en un minibook sin precio público, su precio colportor.
 * Es una referencia por título, nunca una suma.
 */
export const referencePrice = (title: Pick<Title, 'publicPrice' | 'colportorPrice'>): COP =>
  title.publicPrice ?? title.colportorPrice;

/** Por categoría (CATEGORY_ORDER), luego por nombre en español y, al final, por id (BR-GEN-14). */
export const compareTitles = (a: Title, b: Title): number =>
  CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
  compareEs(a.name, b.name) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Un registro del archivo del catálogo (scripts/load-catalog.ts). */
export type TitleRecord = {
  readonly id: string;
  readonly name: string;
  readonly author: string | null;
  readonly description: string | null;
  readonly imagePath: string | null;
  readonly publicPrice: number | null;
  readonly colportorPrice: number;
  readonly category: TitleCategory;
  readonly isActive: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida las reglas de negocio de un título (BR-TIT-02, BR-TIT-04). */
export const validateTitleRecord = (record: TitleRecord): Result<TitleRecord, AppError> => {
  if (!UUID.test(record.id)) return err(validationError('id'));
  const name = record.name.trim();
  if (!name) return err(validationError('name'));
  if (!isValidCOP(record.colportorPrice)) return err(validationError('colportorPrice'));
  if (record.publicPrice === null) {
    if (record.category !== 'minibook') {
      return err(validationError('publicPrice', { reason: 'required_unless_minibook' }));
    }
  } else if (!isValidCOP(record.publicPrice) || record.publicPrice === 0) {
    return err(validationError('publicPrice'));
  }
  return ok({ ...record, name });
};
