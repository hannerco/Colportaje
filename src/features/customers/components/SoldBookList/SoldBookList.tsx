'use client';

import { useId } from 'react';
import { copy } from '@/copy/es';
import type { CustomerDetail } from '@/domain/customer-detail';
import { formatCOP } from '@/domain/money';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import styles from './SoldBookList.module.css';

export type SoldBook = Pick<
  CustomerDetail['books'][number],
  'copyId' | 'titleName' | 'number' | 'agreedPrice' | 'publicPriceSnapshot' | 'priceDelta'
>;

export type SoldBookListProps = {
  books: readonly SoldBook[];
  /** Ruta del detalle de cada ejemplar. */
  copyHref: (copyId: string) => string;
  /** «Quitar» (durante la creación, HU-CLI-09 R4). Sin función no hay botón. */
  onRemove?: (copyId: string) => void;
  /** Quitar deshabilitado (p. ej. sin conexión). */
  removeDisabled?: boolean;
};

const t = copy.customers.addBook;

/**
 * Libros vendidos a un cliente (HU-PAN-CLI-02/03/04; diseño «Libros vendidos»): portada, título y número, el precio
 * acordado y, si cambió, el público tachado (CA-2 de HU-PAN-CLI-04). Pieza del módulo, la usan la ficha y la ficha nueva.
 */
export function SoldBookList({ books, copyHref, onRemove, removeDisabled = false }: SoldBookListProps) {
  if (books.length === 0) return null;
  return (
    <ul className={styles.list}>
      {books.map((book) => (
        <li key={book.copyId} className={styles.row}>
          <a className={styles.book} href={copyHref(book.copyId)}>
            <Avatar kind="cover" size="sm" decorative />
            <span className={styles.text}>
              <span className={styles.title}>
                <span className={styles.ellipsis}>{book.titleName}</span>
                <span className={styles.muted}>#{book.number}</span>
              </span>
              <span className={styles.price}>
                {formatCOP(book.agreedPrice)}
                {book.priceDelta !== null && book.publicPriceSnapshot !== null && (
                  <s className={styles.before}>{t.publicPrice(formatCOP(book.publicPriceSnapshot))}</s>
                )}
              </span>
            </span>
          </a>
          {onRemove && (
            <Button
              variant="secondary"
              size="compact"
              iconOnly
              icon="close"
              state={removeDisabled ? 'disabled' : 'normal'}
              onClick={() => onRemove(book.copyId)}
            >
              {t.remove(book.titleName, book.number)}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

export type AddBookButtonProps = {
  onClick: () => void;
  /** Por qué no se puede agregar (cliente archivado, sin conexión): el botón queda deshabilitado con ese texto. */
  disabledReason?: string | null;
};

/** «Agregar libro del inventario» (HU-PAN-CLI-04): abre «Ejemplares en físico». */
export function AddBookButton({ onClick, disabledReason }: AddBookButtonProps) {
  const noteId = useId();
  return (
    <div className={styles.add}>
      <Button
        variant="secondary"
        icon="add"
        width="full"
        state={disabledReason ? 'disabled' : 'normal'}
        onClick={onClick}
        {...(disabledReason ? { 'aria-describedby': noteId } : {})}
      >
        {t.open}
      </Button>
      {disabledReason && (
        <span id={noteId} className={styles.note}>
          {disabledReason}
        </span>
      )}
    </div>
  );
}
