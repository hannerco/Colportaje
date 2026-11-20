'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import type { ReturnCandidates, ReturnSummary } from '@/domain/return-to-leader';
import { formatDate } from '@/domain/time';
import type { TitleCategory } from '@/domain/title';
import { Button } from '@/ui/atoms/Button';
import { Choice } from '@/ui/atoms/Choice';
import { Field } from '@/ui/atoms/Field';
import { Icon } from '@/ui/icons';
import { SearchBox } from '@/ui/molecules/SearchBox';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { usePlatform } from '@/ui/platform';
import styles from './ReturnToLeaderScreen.module.css';

export type ReturnToLeaderScreenProps = {
  /** Los ejemplares en físico (con la búsqueda aplicada); sin datos, cargando. */
  candidates?: ReturnCandidates;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  /** Los libros marcados (ids de ejemplar) y cuántos minibooks se devuelven de cada título. */
  selectedCopyIds: ReadonlySet<string>;
  onToggleCopy: (copyId: string, selected: boolean) => void;
  minibookQuantityOf: (titleId: string) => number;
  onMinibookQuantityChange: (titleId: string, quantity: number) => void;
  /** Lo elegido, ya resumido (`returnSelectionSummary`), para la barra y el resumen. */
  summary: ReturnSummary;
  /** La nota del historial (obligatoria). */
  note: string;
  onNoteChange: (note: string) => void;
  /** «Listo» / «Devolver N»: sin conexión se ven deshabilitados. */
  isOnline: boolean;
  /** Franja de sin conexión. */
  banner?: ReactNode;
  /** El resumen abierto; «Devolver N» confirma todo o nada (si falla, el resumen sigue abierto). */
  summaryOpen: boolean;
  onSummaryOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

const t = copy.inventory.returnLeader;
const CATEGORIES: TitleCategory[] = ['cultural', 'religious', 'minibook'];

/** Cuántos minibooks y cuántos libros lleva lo elegido. */
const counts = (summary: ReturnSummary) => ({
  books: summary.byCategory.cultural + summary.byCategory.religious,
  minibooks: summary.byCategory.minibook,
});

/**
 * Devolver al líder (HU-PAN-INV-05, diseño «5 · Devolver al líder», BR-COPY-16): se eligen ejemplares en físico (y
 * minibooks por cantidad), se escribe la nota del historial y el resumen confirma todo o nada. Escritorio: una sola
 * hoja con la lista, la nota y «Listo»; móvil: dos pasos (elegir → nota) y «Listo» abre el resumen.
 */
export function ReturnToLeaderScreen(props: ReturnToLeaderScreenProps) {
  const { summary, isOnline } = props;
  const mobile = usePlatform() === 'mobile';
  const [step, setStep] = useState<1 | 2>(1);
  const [minibooksOpen, setMinibooksOpen] = useState(false);
  const { books, minibooks } = counts(summary);
  const noSelection = summary.total === 0;
  const noNote = props.note.trim() === '';

  const picker = (
    <>
      <SearchBox
        placeholder={t.search}
        value={props.search}
        onValueChange={props.onSearchChange}
        width="auto"
        filters="hide"
      />
      <Candidates {...props} minibooksOpen={minibooksOpen} onMinibooksOpenChange={setMinibooksOpen} />
    </>
  );
  const noteField = (
    <Field
      kind="textarea"
      label={t.note}
      placeholder={t.notePlaceholder}
      value={props.note}
      onChange={props.onNoteChange}
    />
  );

  if (mobile)
    return (
      <div className={styles.screen} data-shape="mobile">
        <header className={styles.mobileBar}>
          {step === 1 ? (
            <Button variant="link" onClick={props.onCancel}>
              {t.cancel}
            </Button>
          ) : (
            <Button variant="link" icon="back" onClick={() => setStep(1)}>
              {t.back}
            </Button>
          )}
          <h1 className={styles.mobileTitle}>{t.title}</h1>
          <span className={styles.end}>
            {step === 1 ? (
              <Button variant="link" state={noSelection ? 'disabled' : 'normal'} onClick={() => setStep(2)}>
                {t.next}
              </Button>
            ) : (
              <Button
                variant="link"
                state={noSelection || noNote || !isOnline ? 'disabled' : 'normal'}
                onClick={() => props.onSummaryOpenChange(true)}
              >
                {t.done}
              </Button>
            )}
          </span>
        </header>
        {props.banner}
        <div
          role="progressbar"
          aria-label={t.step(step)}
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={step}
        >
          <div className={styles.progress} aria-hidden="true">
            <span className={styles.segment} data-on="" />
            <span className={styles.segment} data-on={step === 2 ? '' : undefined} />
          </div>
        </div>
        {step === 1 ? picker : noteField}
        <SummaryDialog {...props} />
      </div>
    );

  return (
    <div className={styles.screen} data-shape="desktop">
      {props.banner}
      <Island title={t.title} icon="undo">
        {picker}
        {noteField}
        <div className={styles.bar}>
          <span className={styles.pending}>{t.selected(books, minibooks)}</span>
          <Button variant="tertiary" onClick={props.onCancel}>
            {t.cancel}
          </Button>
          <Button
            variant="primary"
            state={noSelection || noNote || !isOnline ? 'disabled' : 'normal'}
            onClick={() => props.onSummaryOpenChange(true)}
          >
            {t.done}
          </Button>
          {!isOnline && <span className={styles.needsConnection}>{copy.ui.empty.needsConnection}</span>}
        </div>
      </Island>
      <SummaryDialog {...props} />
    </div>
  );
}

/** La lista de ejemplares con casilla y los minibooks por cantidad. */
function Candidates({
  candidates,
  loading,
  error,
  onRetry,
  search,
  selectedCopyIds,
  onToggleCopy,
  minibookQuantityOf,
  onMinibookQuantityChange,
  minibooksOpen,
  onMinibooksOpenChange,
}: ReturnToLeaderScreenProps & { minibooksOpen: boolean; onMinibooksOpenChange: (open: boolean) => void }) {
  if (loading) return <EmptyState kind="loading" title={copy.ui.empty.loading} />;
  if (error)
    return (
      <EmptyState
        kind="error"
        title={t.error.title}
        text={t.error.text}
        action={{ label: copy.errors.retry, onClick: () => onRetry?.() }}
      />
    );
  if (!candidates || (candidates.books.length === 0 && candidates.minibooks.length === 0))
    return search ? (
      <EmptyState kind="no-results" title={t.noResults(search)} />
    ) : (
      <EmptyState kind="empty" title={t.empty.title} text={t.empty.text} />
    );
  return (
    <div className={styles.candidates}>
      {candidates.books.length > 0 && (
        <ul className={styles.rows} aria-label={t.booksLabel}>
          {candidates.books.map((book) => (
            <li key={book.copyId} className={styles.row}>
              <Choice
                className={styles.choice}
                label={t.bookName(book.titleName, book.number)}
                checked={selectedCopyIds.has(book.copyId)}
                onCheckedChange={(checked) => onToggleCopy(book.copyId, checked)}
              />
              <span className={styles.received}>{t.received(formatDate(book.receivedAt))}</span>
            </li>
          ))}
        </ul>
      )}
      {candidates.minibooks.length > 0 && (
        <div className={styles.minibooks}>
          <button
            type="button"
            className={styles.minibooksToggle}
            aria-expanded={minibooksOpen}
            onClick={() => onMinibooksOpenChange(!minibooksOpen)}
          >
            <Icon name={minibooksOpen ? 'expand' : 'next'} size={16} tone="current" />
            {t.minibooks}
          </button>
          {minibooksOpen &&
            candidates.minibooks.map((minibook) => (
              <div key={minibook.titleId} className={styles.minibookRow}>
                <span className={styles.minibookName}>{minibook.name}</span>
                <input
                  className={styles.quantity}
                  type="text"
                  inputMode="numeric"
                  aria-label={t.minibookQuantity(minibook.name)}
                  value={String(minibookQuantityOf(minibook.titleId))}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '');
                    const quantity = digits === '' ? 0 : Math.min(Number(digits), minibook.inStockCount);
                    onMinibookQuantityChange(minibook.titleId, quantity);
                  }}
                />
                <span className={styles.of}>{t.minibookOf(minibook.inStockCount)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/** El resumen: cuánto de cada categoría, cada título y la nota; tocar una caja resalta esa categoría. */
function SummaryDialog({
  summary,
  summaryOpen,
  onSummaryOpenChange,
  onConfirm,
  note,
}: ReturnToLeaderScreenProps) {
  const s = t.summary;
  const [selected, setSelected] = useState<TitleCategory | null>(null);
  return (
    <ConfirmDialog
      open={summaryOpen}
      onOpenChange={(open) => {
        if (!open) setSelected(null);
        onSummaryOpenChange(open);
      }}
      title={s.title(summary.total)}
      message={
        <div className={styles.summary}>
          <p className={styles.summaryNote} aria-label={s.note}>
            <Icon name="edit" size={16} tone="tertiary" />
            <span>{note.trim()}</span>
          </p>
          <div role="group" aria-label={s.categories} className={styles.cats}>
            {CATEGORIES.map((id) => (
              <button
                key={id}
                type="button"
                className={styles.cat}
                aria-pressed={selected === id}
                disabled={summary.byCategory[id] === 0}
                onClick={() => setSelected((current) => (current === id ? null : id))}
              >
                <span className={styles.catCount}>{summary.byCategory[id]}</span>
                <span>{copy.inventory.addCopies.categories[id]}</span>
              </button>
            ))}
          </div>
          <ul className={styles.lines}>
            {summary.lines.map((line) => (
              <li
                key={line.titleId}
                className={styles.line}
                data-dim={selected !== null && selected !== line.category ? '' : undefined}
              >
                <span>{line.name}</span>
                <span className={styles.lineQty}>({line.count})</span>
              </li>
            ))}
            <li className={`${styles.line} ${styles.total}`}>
              <span>{s.total}</span>
              <span className={styles.lineQty}>({summary.total})</span>
            </li>
          </ul>
        </div>
      }
      confirmLabel={s.confirm(summary.total)}
      cancelLabel={s.back}
      onConfirm={onConfirm}
    />
  );
}
