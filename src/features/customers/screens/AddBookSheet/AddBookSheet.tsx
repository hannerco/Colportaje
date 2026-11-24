'use client';

import { copy } from '@/copy/es';
import type { AssignableCopy } from '@/domain/assignable-copies';
import { formatCOP, type COP } from '@/domain/money';
import type { LocalDate } from '@/domain/time';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import { Field } from '@/ui/atoms/Field';
import { DateField } from '@/ui/organisms/DateField';
import { SearchBox } from '@/ui/molecules/SearchBox';
import { DetailWindow } from '@/ui/organisms/DetailWindow';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { usePlatform } from '@/ui/platform';
import { RowsSkeleton } from '@/ui/templates/ListTemplate';
import styles from './AddBookSheet.module.css';

/** Un ejemplar ya agregado en esta hoja: se puede ajustar su precio y su fecha de venta, o quitar. */
export type ChosenBook = {
  copyId: string;
  titleName: string;
  /** Portada del título (#53). */
  imageUrl?: string | null;
  number: number;
  agreedPrice: COP | null;
  /** Precio público copiado: se ve tachado si el acordado es otro. */
  publicPrice: COP | null;
  soldOn: LocalDate | null;
  /** Error del precio o de la fecha (p. ej. «La fecha de venta no puede ser futura»). */
  error?: string;
};

export type AddBookSheetProps = {
  onClose: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  /** Ejemplares en físico (`useAssignableCopies`), sin los ya agregados; sin valor mientras carga. */
  available?: readonly AssignableCopy[];
  /** Agregados en esta hoja. */
  chosen: readonly ChosenBook[];
  onSelect: (copyId: string) => void;
  onRemove: (copyId: string) => void;
  onPriceChange: (copyId: string, price: COP | null) => void;
  onSoldOnChange: (copyId: string, soldOn: LocalDate | null) => void;
  /** Sin conexión no se agrega ni se quita (BR-GEN-08). */
  isOnline: boolean;
  /** Sin ejemplares en físico: ir a «Agregar al inventario». */
  onAddToInventory: () => void;
  backHref: string;
};

const t = copy.customers.addBook;

/**
 * Agregar libro (HU-PAN-CLI-04, diseño «5 · Agregar libro»): «Ejemplares en físico» con buscador, los seleccionados
 * (precio acordado, fecha de venta y Quitar) y los que quedan «Para seleccionar». Tocar uno lo vende al cliente de una
 * vez (ficha viva). Escritorio: Ventana de detalle centrada; móvil: hoja inferior.
 */
export function AddBookSheet({
  onClose,
  search,
  onSearchChange,
  available,
  chosen,
  onSelect,
  onRemove,
  onPriceChange,
  onSoldOnChange,
  isOnline,
  onAddToInventory,
  backHref,
}: AddBookSheetProps) {
  const mobile = usePlatform() === 'mobile';
  const query = search.trim();
  const list = available ?? [];
  return (
    <DetailWindow
      mode={mobile ? 'sheet' : 'center'}
      title={t.title}
      breadcrumb={{ label: copy.customers.list.title, href: backHref }}
      onClose={onClose}
    >
      <div className={styles.body}>
        <SearchBox placeholder={t.search} value={search} onValueChange={onSearchChange} width="auto" />
        {chosen.length > 0 && (
          <section className={styles.section} aria-label={t.selected(chosen.length)}>
            <div className={styles.headingRow}>
              <h3 className={styles.heading}>{t.selected(chosen.length)}</h3>
              <span className={styles.total}>
                {t.total}{' '}
                <strong>{formatCOP(chosen.reduce((sum, b) => sum + (b.agreedPrice ?? 0), 0))}</strong>
              </span>
            </div>
            <ul className={styles.chosenList}>
              {chosen.map((book) => (
                <li key={book.copyId} className={styles.chosen}>
                  <div className={styles.row}>
                    <Avatar kind="cover" size="sm" coverUrl={book.imageUrl ?? undefined} decorative />
                    <span className={styles.text}>
                      <span className={styles.chosenName}>
                        <span className={styles.ellipsis}>{book.titleName}</span>
                        <span className={styles.muted}>#{book.number}</span>
                      </span>
                      {book.publicPrice !== null && (
                        <span className={styles.price}>{t.reference(formatCOP(book.publicPrice))}</span>
                      )}
                    </span>
                    <Button
                      variant="secondary"
                      size="compact"
                      iconOnly
                      icon="close"
                      state={isOnline ? 'normal' : 'disabled'}
                      onClick={() => onRemove(book.copyId)}
                    >
                      {t.remove(book.titleName, book.number)}
                    </Button>
                  </div>
                  <div className={styles.fields}>
                    <Field
                      kind="money"
                      label={t.price}
                      value={book.agreedPrice}
                      onChange={(price) => onPriceChange(book.copyId, price)}
                      help={
                        book.publicPrice !== null && book.agreedPrice !== book.publicPrice
                          ? t.publicPrice(formatCOP(book.publicPrice))
                          : undefined
                      }
                      disabled={!isOnline}
                    />
                    <DateField
                      noFuture
                      label={t.soldOn}
                      placeholder="dd/mm/aaaa"
                      value={book.soldOn}
                      onChange={(soldOn) => onSoldOnChange(book.copyId, soldOn)}
                      error={book.error}
                      disabled={!isOnline}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className={styles.section} aria-label={t.available}>
          <h3 className={styles.heading}>{t.available}</h3>
          {!available ? (
            <RowsSkeleton leading="cover" rows={4} />
          ) : list.length === 0 ? (
            query ? (
              <EmptyState kind="no-results" title={t.noResults(query)} />
            ) : (
              <EmptyState
                kind="empty"
                icon="inventory"
                title={t.empty.title}
                text={t.empty.text}
                action={{ label: t.empty.action, icon: 'add', onClick: onAddToInventory }}
              />
            )
          ) : (
            <ul className={styles.list}>
              {list.map((item) => (
                <li key={item.copyId} className={styles.row}>
                  <Avatar kind="cover" size="sm" coverUrl={item.imageUrl ?? undefined} decorative />
                  <span className={styles.text}>
                    <span className={styles.name}>
                      <span className={styles.ellipsis}>{item.titleName}</span>
                      <span className={styles.muted}>#{item.number}</span>
                    </span>
                    {item.price !== null && <span className={styles.price}>{formatCOP(item.price)}</span>}
                  </span>
                  <Button
                    variant="secondary"
                    size="compact"
                    iconOnly
                    icon="add"
                    state={isOnline ? 'normal' : 'disabled'}
                    onClick={() => onSelect(item.copyId)}
                  >
                    {t.select(item.titleName, item.number)}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DetailWindow>
  );
}
