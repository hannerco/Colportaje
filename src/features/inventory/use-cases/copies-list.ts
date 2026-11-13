// Lista de ejemplares (HU-INV-04): lee una vez ejemplares, sus títulos y los clientes; el filtro, el
// orden y la búsqueda se calculan en el teléfono con buildCopiesListView (sin red, funciona sin conexión).
import type { CopiesListCopy, CustomerRef } from '@/domain/copies-list';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { Title } from '@/domain/title';
import type { CopyRepository, CustomerRepository, TitleRepository } from '@/repositories';

export type CopiesListData = {
  readonly copies: CopiesListCopy[];
  readonly titles: Title[];
  readonly customers: CustomerRef[];
};

export type CopiesListDeps = {
  readonly copies: CopyRepository;
  readonly titles: TitleRepository;
  readonly customers: CustomerRepository;
};

export async function loadCopiesListData(deps: CopiesListDeps): Promise<Result<CopiesListData, AppError>> {
  const [copies, customers] = await Promise.all([deps.copies.listAll(), deps.customers.listRefs()]);
  if (!copies.ok) return copies;
  if (!customers.ok) return customers;
  // Títulos de los ejemplares, también los desactivados.
  const titles = await deps.titles.getMany([...new Set(copies.value.map((c) => c.titleId))]);
  if (!titles.ok) return titles;
  return ok({ copies: copies.value, titles: titles.value, customers: customers.value });
}
