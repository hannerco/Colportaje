'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { receivedDateOptions, type AddBatchSummary, type AddCatalogGroup } from '@/domain/add-batch';
import { formatDate, type LocalDate } from '@/domain/time';
import type { TitleCategory } from '@/domain/title';
import { DatePickerCalendar } from '@/ui/molecules/DatePickerCalendar';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import { Menu } from '@/ui/molecules/Menu';
import { SearchBox } from '@/ui/molecules/SearchBox';
import { Tabs } from '@/ui/molecules/Tabs';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { usePlatform } from '@/ui/platform';
import { QuantityControl } from '../../components/QuantityControl';
import { TitleTile } from '../../components/TitleTile';
import styles from './AddCopiesScreen.module.css';

export type AddCopiesScreenProps = {
  /** El catálogo activo (con la búsqueda aplicada), por categoría. */
  groups: readonly AddCatalogGroup[];
  loading?: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  quantityOf: (titleId: string) => number;
  onAdd: (titleId: string) => void;
  onRemove: (titleId: string) => void;
  onSetQuantity: (titleId: string, quantity: number) => void;
  /** Lo que lleva el lote (para el resumen y la barra de abajo). */
  summary: AddBatchSummary;
  /** Fecha de recibido (hoy por defecto, nunca futura) y hoy. */
  receivedAt: LocalDate;
  onReceivedAtChange: (date: LocalDate) => void;
  today: LocalDate;
  /** «Agregar N» / «Listo»: sin conexión se ven deshabilitados. */
  isOnline: boolean;
  /** Franja de sin conexión. */
  banner?: ReactNode;
  /** El resumen abierto; «Agregar N» confirma todo o nada (si falla, el resumen sigue abierto). */
  summaryOpen: boolean;
  onSummaryOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  /** «Descartar»: vacía el lote. «Cancelar» (móvil) sale sin agregar. */
  onDiscard: () => void;
  onCancel: () => void;
};

const t = copy.inventory.addCopies;
const CATEGORIES: TitleCategory[] = ['cultural', 'religious', 'minibook'];

/**
 * Agregar al inventario (HU-PAN-INV-04, diseño «4 · Agregar al inventario», BR-COPY-02): el catálogo por categoría con
 * un botón por título (cada toque suma uno; en móvil la cantidad también se escribe), la fecha de recibido (hoy por
 * defecto, nunca futura) y el resumen que confirma todo el lote o nada. El lote es local hasta «Agregar N».
 */
export function AddCopiesScreen(props: AddCopiesScreenProps) {
  const { summary, isOnline } = props;
  const mobile = usePlatform() === 'mobile';
  const [category, setCategory] = useState<TitleCategory>('cultural');
  const empty = summary.total === 0;
  const blocked = empty || !isOnline;

  const options = receivedDateOptions(props.today);
  const preset = options.find((option) => option.date === props.receivedAt);
  const dateLabel = preset ? t.date[preset.key] : formatDate(props.receivedAt);
  const [pickingDate, setPickingDate] = useState(false);

  const dateMenu = (
    <Menu
      trigger={
        <Button variant="secondary" size="compact" icon="calendar" aria-label={t.date.label(dateLabel)}>
          {dateLabel}
        </Button>
      }
      title={t.date.title}
      selectable
      value={preset?.key ?? 'other'}
      items={[
        ...options.map((option) => ({
          id: option.key,
          label: `${t.date[option.key]} · ${formatDate(option.date)}`,
        })),
        { id: 'other', label: t.date.other, icon: 'calendar' as const },
      ]}
      onSelect={(id) => {
        if (id === 'other') setPickingDate(true);
        else props.onReceivedAtChange(options.find((option) => option.key === id)!.date);
      }}
    />
  );

  const visibleGroups = mobile ? props.groups.filter((group) => group.category === category) : props.groups;
  const catalog = props.loading ? (
    <EmptyState kind="loading" title={copy.ui.empty.loading} />
  ) : props.groups.length === 0 ? (
    props.search ? (
      <EmptyState kind="no-results" title={t.noResults(props.search)} />
    ) : (
      <EmptyState kind="empty" title={t.empty.title} text={t.empty.text} />
    )
  ) : (
    visibleGroups.map((group) => (
      <section key={group.category} className={styles.group} aria-label={t.categories[group.category]}>
        {!mobile && <h3 className={styles.groupName}>{t.categories[group.category]}</h3>}
        {mobile ? (
          <ul className={styles.rows} aria-label={t.categories[group.category]}>
            {group.titles.map((title) => (
              <li key={title.id} className={styles.row}>
                <Avatar kind="cover" coverUrl={title.imageUrl ?? undefined} decorative />
                <span className={styles.rowName}>{title.name}</span>
                <QuantityControl
                  name={title.name}
                  quantity={props.quantityOf(title.id)}
                  onAdd={() => props.onAdd(title.id)}
                  onRemove={() => props.onRemove(title.id)}
                  onSetQuantity={(quantity) => props.onSetQuantity(title.id, quantity)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.tiles}>
            {group.titles.map((title) => (
              <TitleTile
                key={title.id}
                name={title.name}
                imageUrl={title.imageUrl}
                quantity={props.quantityOf(title.id)}
                onAdd={() => props.onAdd(title.id)}
                onRemove={() => props.onRemove(title.id)}
              />
            ))}
          </div>
        )}
      </section>
    ))
  );

  const tools = (
    <div className={styles.tools}>
      <SearchBox
        placeholder={t.search}
        value={props.search}
        onValueChange={props.onSearchChange}
        width="auto"
        filters="hide"
      />
      {dateMenu}
    </div>
  );

  return (
    <div className={styles.screen} data-shape={mobile ? 'mobile' : 'desktop'}>
      {mobile && (
        <header className={styles.mobileBar}>
          <Button variant="link" onClick={props.onCancel}>
            {t.cancel}
          </Button>
          <h1 className={styles.mobileTitle}>{t.title}</h1>
          <span className={styles.end}>
            <Button
              variant="link"
              state={blocked ? 'disabled' : 'normal'}
              onClick={() => props.onSummaryOpenChange(true)}
            >
              {t.done}
            </Button>
          </span>
        </header>
      )}
      {props.banner}
      {mobile ? (
        <>
          {tools}
          <Tabs
            aria-label={t.categoriesLabel}
            value={category}
            onValueChange={(value) => setCategory(value as TitleCategory)}
            items={CATEGORIES.map((id) => ({ id, label: t.categories[id] }))}
          />
          {catalog}
        </>
      ) : (
        <Island title={t.title} icon="add">
          {tools}
          {catalog}
          {!empty && (
            <div className={styles.bar}>
              <span className={styles.pending}>
                <b>{summary.total}</b> {t.pending} · {t.receivedWhen(dateLabel.toLowerCase())}
              </span>
              <Button variant="tertiary" icon="delete" onClick={props.onDiscard}>
                {t.discard}
              </Button>
              <Button
                variant="primary"
                state={blocked ? 'disabled' : 'normal'}
                onClick={() => props.onSummaryOpenChange(true)}
              >
                {t.addN(summary.total)}
              </Button>
              {!isOnline && <span className={styles.needsConnection}>{copy.ui.empty.needsConnection}</span>}
            </div>
          )}
        </Island>
      )}

      <SummaryDialog {...props} dateLabel={dateLabel} />
      {pickingDate && (
        <OtherDateDialog
          current={props.receivedAt}
          today={props.today}
          onClose={() => setPickingDate(false)}
          onSave={props.onReceivedAtChange}
        />
      )}
    </div>
  );
}

/** El resumen: cuánto de cada categoría y cada título; tocar una caja resalta esa categoría. */
function SummaryDialog({
  summary,
  summaryOpen,
  onSummaryOpenChange,
  onConfirm,
  receivedAt,
  dateLabel,
}: AddCopiesScreenProps & { dateLabel: string }) {
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
          <p className={styles.summaryDate}>
            {s.received(`${dateLabel.toLowerCase()}, ${formatDate(receivedAt)}`)}
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
                <span>{t.categories[id]}</span>
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
                <span className={styles.lineQty}>({line.quantity})</span>
              </li>
            ))}
            <li className={`${styles.line} ${styles.total}`}>
              <span>{s.total}</span>
              <span className={styles.lineQty}>({summary.total})</span>
            </li>
          </ul>
        </div>
      }
      confirmLabel={t.addN(summary.total)}
      cancelLabel={s.keepAdding}
      onConfirm={onConfirm}
    />
  );
}

/** «Otra fecha…»: el calendario; nunca una fecha futura (BR-COPY-04). */
function OtherDateDialog({
  current,
  today,
  onClose,
  onSave,
}: {
  current: LocalDate;
  today: LocalDate;
  onClose: () => void;
  onSave: (date: LocalDate) => void;
}) {
  const [picked, setPicked] = useState<LocalDate>(current);
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t.date.title}
      message={formatDate(picked)}
      confirmLabel={t.date.save}
      cancelLabel={t.date.cancel}
      onConfirm={() => onSave(picked)}
    >
      <DatePickerCalendar
        label={t.date.pick}
        value={picked}
        onChange={setPicked}
        today={today}
        isDisabled={(date) => date > today}
      />
    </ConfirmDialog>
  );
}
