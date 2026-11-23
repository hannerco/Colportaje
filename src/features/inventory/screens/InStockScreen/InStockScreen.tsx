'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import type { FlaggedCopy, InStockCopiesOfTitle, InStockSummary, InStockTitle } from '@/domain/inventory';
import { formatCOP } from '@/domain/money';
import { formatDate } from '@/domain/time';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import { Field } from '@/ui/atoms/Field';
import { Icon } from '@/ui/icons';
import { Menu } from '@/ui/molecules/Menu';
import { Tabs } from '@/ui/molecules/Tabs';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { DetailWindow } from '@/ui/organisms/DetailWindow';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { PageHeader } from '@/ui/organisms/PageHeader';
import { usePlatform } from '@/ui/platform';
import { RowsSkeleton } from '@/ui/templates/ListTemplate';
import { FlaggedCopiesList } from '../../components/FlaggedCopiesList';
import styles from './InStockScreen.module.css';

/** Cómo se resolvió una novedad desde Por resolver (HU-INV-07). */
export type FlaggedResolution = 'found' | 'lost' | 'removed';

export type InStockScreenProps = {
  /** `useInStockSummary().data`; sin valor mientras carga o si falló. */
  summary?: InStockSummary;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** CA-3: sin conexión, Agregar y Resolver se ven deshabilitados; la lista se consulta. */
  isOnline: boolean;
  /** Franja de sin conexión. */
  banner?: ReactNode;
  /** Ejemplares (la otra sección del módulo, HU-PAN-INV-02): su conteo, si ya se conoce. */
  copiesCount?: number;
  onOpenCopies: () => void;
  /** «Agregar» (HU-PAN-INV-04): la acción principal en escritorio; en móvil, el botón flotante del armazón. */
  onAdd: () => void;
  /** «Devolver al líder» (HU-PAN-INV-05). Sin función no se muestra. */
  onReturnToLeader?: () => void;
  /** El título abierto y sus ejemplares en físico (`useInStockCopiesOfTitle`). */
  openTitle?: { titleId: string; data?: InStockCopiesOfTitle } | null;
  onOpenTitle: (titleId: string | null) => void;
  /** Ruta del Ejemplar (HU-PAN-INV-03). */
  copyHref: (copyId: string) => string;
  /** Por resolver abierto (modal en escritorio, página en móvil) y sus ejemplares (`useFlaggedCopies`). */
  flaggedOpen: boolean;
  onFlaggedOpenChange: (open: boolean) => void;
  flagged?: readonly FlaggedCopy[];
  /** Resuelve una novedad; el Aviso con «Deshacer» lo pone el contenedor. */
  onResolve: (item: FlaggedCopy, resolution: FlaggedResolution, note: string | null) => Promise<void>;
  /** Ruta de Inventario (vuelta de las ventanas en móvil). */
  backHref: string;
};

const t = copy.inventory;

/**
 * Libros en físico y Por resolver (HU-PAN-INV-01, diseño «1 · Libros en físico, Agregar y Por resolver»): lo que hay
 * en la maleta por título (con el precio de referencia y la cantidad; los minibooks al final), un título abierto con
 * sus ejemplares (tocar uno abre el Ejemplar) y Por resolver con Apareció, Perdido (lo asumo yo) y Eliminar.
 */
export function InStockScreen(props: InStockScreenProps) {
  const { summary, isOnline, openTitle, flaggedOpen } = props;
  const mobile = usePlatform() === 'mobile';
  const [noteFor, setNoteFor] = useState<{ item: FlaggedCopy; resolution: 'lost' | 'removed' } | null>(null);
  const [note, setNote] = useState('');

  const flaggedCount = summary?.flaggedCount ?? 0;
  const total = summary ? summary.booksTotal : undefined;
  const allTitles = summary ? [...summary.titles, ...summary.minibooks] : [];
  const opened = openTitle ? allTitles.find((title) => title.titleId === openTitle.titleId) : undefined;

  const row = (title: InStockTitle) => (
    <li key={title.titleId}>
      <button
        type="button"
        className={styles.titleRow}
        aria-current={openTitle?.titleId === title.titleId ? 'true' : undefined}
        onClick={() => props.onOpenTitle(title.titleId)}
      >
        <Avatar kind="cover" coverUrl={title.imageUrl ?? undefined} decorative />
        <span className={styles.titleText}>
          <span className={styles.titleName}>{title.name}</span>
          <span className={styles.price}>{formatCOP(title.referencePrice)}</span>
        </span>
        <span className={styles.count}>
          {title.inStockCount}
          <span className={styles.visuallyHidden}>{t.inStock.inStockSuffix}</span>
        </span>
      </button>
    </li>
  );

  const content = (() => {
    if (!summary)
      return props.error && !props.loading ? (
        <EmptyState
          kind="error"
          title={t.inStock.error.title}
          text={t.inStock.error.text}
          action={props.onRetry ? { label: copy.errors.retry, onClick: props.onRetry } : undefined}
        />
      ) : (
        <RowsSkeleton leading="cover" />
      );
    if (allTitles.length === 0 && flaggedCount === 0)
      return <EmptyState kind="empty" title={t.inStock.empty.title} text={t.inStock.empty.text} />;
    return (
      <Island title={t.inStock.title} icon="books">
        <ul className={styles.titles} aria-label={t.inStock.title}>
          {summary.titles.map(row)}
        </ul>
        {summary.minibooks.length > 0 && (
          <>
            <h3 className={styles.subheading}>{t.inStock.minibooks}</h3>
            <ul className={styles.titles} aria-label={t.inStock.minibooks}>
              {summary.minibooks.map(row)}
            </ul>
          </>
        )}
      </Island>
    );
  })();

  const flaggedButton = flaggedCount > 0 && (
    <Button
      variant="secondary"
      icon="alert"
      width={mobile ? 'full' : 'auto'}
      aria-expanded={flaggedOpen}
      onClick={() => props.onFlaggedOpenChange(true)}
    >
      {t.inStock.flagged(flaggedCount)}
    </Button>
  );

  const returnToLeader =
    props.onReturnToLeader &&
    (mobile ? (
      <Menu
        trigger={
          <Button variant="tertiary" iconOnly icon="more">
            {t.moreActions}
          </Button>
        }
        title={t.title}
        items={[{ id: 'return', label: t.returnToLeader, icon: 'undo' }]}
        onSelect={() => props.onReturnToLeader?.()}
      />
    ) : (
      <Button variant="tertiary" icon="undo" onClick={props.onReturnToLeader}>
        {t.returnToLeader}
      </Button>
    ));

  const closeNote = () => {
    setNoteFor(null);
    setNote('');
  };

  return (
    <div className={styles.screen} data-shape={mobile ? 'mobile' : 'desktop'}>
      {/* #27: encabezado y pestañas con el mismo ritmo que la Plantilla de lista (Ejemplares), para que al cambiar de
          sección nada salte aunque uno tenga «Agregar» y el otro no. */}
      <div className={styles.top}>
        <div className={styles.head}>
          <PageHeader
            kind="root"
            title={t.title}
            primaryAction={{ label: t.add, icon: 'add', onClick: props.onAdd, disabled: !isOnline }}
          />
          {mobile && returnToLeader}
        </div>
        <div className={styles.toolbar}>
          <Tabs
            variant="segmented"
            aria-label={t.sections.label}
            width={mobile ? undefined : 'auto'}
            value="inStock"
            onValueChange={(value) => {
              if (value === 'copies') props.onOpenCopies();
            }}
            items={[
              { id: 'inStock', label: t.sections.inStock, count: total },
              { id: 'copies', label: t.sections.copies, count: props.copiesCount },
            ]}
          />
          {!mobile && flaggedButton}
          {!mobile && <span className={styles.spacer} />}
          {!mobile && returnToLeader}
        </div>
      </div>
      {props.banner}
      {mobile && flaggedButton}
      {content}

      {openTitle && (
        <DetailWindow
          mode={mobile ? 'sheet' : 'center'}
          title={opened?.name ?? ''}
          breadcrumb={{ label: t.title, href: props.backHref }}
          onClose={() => props.onOpenTitle(null)}
        >
          {openTitle.data ? (
            <div className={styles.titleDetail}>
              <p className={styles.titleSummary}>
                {t.openTitle.summary(
                  openTitle.data.title.inStockCount,
                  formatCOP(openTitle.data.title.referencePrice),
                )}
              </p>
              <h3 className={styles.subheading}>{t.openTitle.copies}</h3>
              <ul className={styles.copies} aria-label={t.openTitle.copies}>
                {openTitle.data.copies.map((item) => (
                  <li key={item.copyId}>
                    <a className={styles.copyRow} href={props.copyHref(item.copyId)}>
                      <span className={styles.copyNumber}>{t.openTitle.copy(item.number)}</span>
                      <span className={styles.received}>
                        {t.openTitle.received(formatDate(item.receivedAt))}
                      </span>
                      <Icon name="next" size={16} tone="current" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <RowsSkeleton leading="cover" />
          )}
        </DetailWindow>
      )}

      {flaggedOpen && (
        <DetailWindow
          mode={mobile ? 'page' : 'center'}
          title={t.flagged.title}
          breadcrumb={{ label: t.title, href: props.backHref }}
          onClose={() => props.onFlaggedOpenChange(false)}
          className={mobile ? styles.flaggedPage : undefined}
        >
          {!props.flagged ? (
            <RowsSkeleton leading="cover" />
          ) : props.flagged.length === 0 ? (
            <EmptyState kind="empty" title={t.flagged.empty.title} />
          ) : (
            <FlaggedCopiesList
              items={props.flagged}
              isOnline={isOnline}
              copyHref={props.copyHref}
              onFound={(item) => void props.onResolve(item, 'found', null)}
              onLost={(item) => setNoteFor({ item, resolution: 'lost' })}
              onRemove={(item) => setNoteFor({ item, resolution: 'removed' })}
            />
          )}
        </DetailWindow>
      )}

      {noteFor && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) closeNote();
          }}
          tone={noteFor.resolution === 'removed' ? 'danger' : 'confirm'}
          title={(noteFor.resolution === 'lost' ? t.flagged.note.lostTitle : t.flagged.note.removeTitle)(
            t.flagged.copyName(noteFor.item.titleName, noteFor.item.number),
          )}
          message=""
          confirmLabel={
            noteFor.resolution === 'lost' ? t.flagged.note.confirmLost : t.flagged.note.confirmRemove
          }
          cancelLabel={t.flagged.note.cancel}
          onConfirm={async () => {
            await props.onResolve(noteFor.item, noteFor.resolution, note.trim() || null);
            closeNote();
          }}
        >
          <Field
            kind="textarea"
            label={t.flagged.note.label}
            placeholder={t.flagged.note.placeholder}
            value={note}
            onChange={setNote}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
