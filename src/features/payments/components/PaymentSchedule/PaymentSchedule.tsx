'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { rowNotes, scheduleTotals, type DateChangeReason, type RowNote } from '@/domain/manual-schedule';
import { formatCOP, type COP } from '@/domain/money';
import { formatDate, type LocalDate } from '@/domain/time';
import { StatusPill } from '@/ui/atoms/StatusPill';
import { Icon } from '@/ui/icons';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { usePlatform } from '@/ui/platform';
import { PaymentAmountDialog } from '../PaymentAmountDialog';
import { PaymentDateDialog } from '../PaymentDateDialog';
import styles from './PaymentSchedule.module.css';

/** Un abono de la lista: ya pagado (solo se ve, en la ficha) o por cobrar (se edita). */
export type ScheduleListRow =
  | {
      readonly type: 'paid';
      readonly id: string;
      readonly date: LocalDate | null;
      readonly amount: COP;
      readonly status: 'collected' | 'delivered';
      readonly method: 'cash' | 'transfer' | null;
      /** «Cuota inicial», «Abono extra». */
      readonly kindLabel?: string;
    }
  | {
      readonly type: 'scheduled';
      readonly id: string;
      readonly dueDate: LocalDate | null;
      readonly amount: COP;
      /** La fecha acordada antes de aplazarlo («Aplazado · antes 05/12»). */
      readonly rescheduledFrom?: LocalDate | null;
      /** Recién agregado en la ficha y aún sin guardar (le falta fecha o valor): se edita como al crear. */
      readonly draft?: boolean;
    };

export type PaymentScheduleProps = {
  /** `create`: Nuevo cliente. `saved`: la ficha (con abonos pagados, «Cobrar» y «Revisar»). */
  mode: 'create' | 'saved';
  /** En el orden en que se muestran (por fecha). */
  rows: readonly ScheduleListRow[];
  /** Saldo pendiente: lo que falta pagar (al crear, total de los libros − cuota inicial). */
  pending: COP;
  today: LocalDate;
  /** Sin conexión (ficha): no se edita. */
  disabled?: boolean;
  /** El abono recién agregado: su valor se resalta para escribirlo. */
  focusId?: string | null;
  /** «+ Agregar abono» al final (al crear; en la ficha va en el encabezado de la isla). */
  onAdd?: () => void;
  onChangeDate: (
    id: string,
    date: LocalDate,
    reason: DateChangeReason,
    note?: string,
  ) => void | Promise<void>;
  onChangeAmount: (id: string, amount: COP) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onCollect?: (id: string) => void;
  /** «Revisar» cuando lo programado pasa del saldo (ficha). */
  onReview?: () => void;
  /** Entre la lista y el totalizador (p. ej. «Cancelados 1»). */
  afterList?: ReactNode;
  /** Ficha: tocar un abono guardado lleva a su detalle (los recién agregados, aún sin guardar, no). */
  rowHref?: (id: string) => string;
};

const t = copy.payments.manual;
const dayMonth = (date: LocalDate) => formatDate(date).slice(0, 5);

const noteText = (
  note: RowNote,
): { text: string; tone: 'bad' | 'neutral' | 'muted'; icon: 'alert' | 'info' | 'calendar' } => {
  switch (note.kind) {
    case 'past':
      return { text: t.rowNotes.past, tone: 'bad', icon: 'alert' };
    case 'overdue':
      return { text: t.rowNotes.overdue(note.days), tone: 'bad', icon: 'alert' };
    case 'farAhead':
      return { text: t.rowNotes.farAhead, tone: 'neutral', icon: 'info' };
    case 'zero':
      return { text: t.rowNotes.zero, tone: 'neutral', icon: 'info' };
    case 'noDate':
      return { text: t.rowNotes.noDate, tone: 'neutral', icon: 'info' };
    case 'rescheduled':
      return { text: t.rowNotes.rescheduled(dayMonth(note.before)), tone: 'muted', icon: 'calendar' };
  }
};

type Editing = { readonly kind: 'date' | 'amount' | 'remove'; readonly id: string } | null;

/**
 * Abonos a mano (ronda 38, lienzo «Propuestas · Abonos a mano, sin plan automático», pieza «AbonosIsla»): la lista por
 * fecha con «Abono N de M», la fecha y el valor que se tocan para cambiarlos, la basura (pide confirmar), los avisos de
 * cada abono y el totalizador (saldo pendiente, programado y si falta o sobra). En el celular cada abono va en dos
 * renglones; en el computador, en una línea. Nada bloquea. Pieza del módulo.
 */
export function PaymentSchedule({
  mode,
  rows,
  pending,
  today,
  disabled = false,
  focusId = null,
  onAdd,
  onChangeDate,
  onChangeAmount,
  onRemove,
  onCollect,
  onReview,
  afterList,
  rowHref,
}: PaymentScheduleProps) {
  const mobile = usePlatform() === 'mobile';
  const saved = mode === 'saved';
  const [editing, setEditing] = useState<Editing>(null);
  const scheduled = rows.filter((row) => row.type === 'scheduled');
  const totals = scheduleTotals(
    pending,
    scheduled.map((row) => row.amount),
  );
  const labelOf = (id: string) => t.label(rows.findIndex((row) => row.id === id) + 1, rows.length);
  const open = editing ? scheduled.find((row) => row.id === editing.id) : undefined;
  const others = (id: string) =>
    scheduled.filter((row) => row.id !== id && row.dueDate !== null).map((row) => row.dueDate!);
  const close = () => setEditing(null);

  return (
    <div className={styles.schedule} data-shape={mobile ? 'mobile' : 'desktop'}>
      {rows.length > 0 && (
        <ul className={styles.list} aria-label={t.heading}>
          {rows.map((row, i) => {
            const label = t.label(i + 1, rows.length);
            if (row.type === 'paid')
              return <PaidRow key={row.id} row={row} label={label} href={rowHref?.(row.id)} />;
            const href = row.draft ? undefined : rowHref?.(row.id);
            const editable = !disabled;
            const asSaved = saved && !row.draft;
            const notes = rowNotes({
              dueDate: row.dueDate,
              amount: row.amount,
              today,
              saved: asSaved,
              rescheduledFrom: row.rescheduledFrom ?? null,
            });
            const late = notes.some((n) => n.kind === 'past' || n.kind === 'overdue');
            const date = (
              <button
                type="button"
                className={[styles.chip, styles.dateChip].join(' ')}
                data-tone={late ? 'bad' : row.dueDate ? undefined : 'empty'}
                aria-label={`${t.changeDate(label)}, ${row.dueDate ? formatDate(row.dueDate) : t.pickDate}`}
                disabled={!editable}
                onClick={() => setEditing({ kind: 'date', id: row.id })}
              >
                <Icon name="calendar" size={18} tone="current" />
                <span>{row.dueDate ? formatDate(row.dueDate) : t.pickDate}</span>
              </button>
            );
            const amount = (
              <button
                type="button"
                className={[styles.chip, styles.amount].join(' ')}
                data-tone={row.amount > 0 ? undefined : 'empty'}
                data-focus={row.id === focusId || undefined}
                aria-label={`${t.changeAmount(label)}, ${formatCOP(row.amount)}`}
                disabled={!editable}
                onClick={() => setEditing({ kind: 'amount', id: row.id })}
              >
                {formatCOP(row.amount)}
              </button>
            );
            const remove = (
              <button
                type="button"
                className={styles.remove}
                aria-label={t.remove(label)}
                disabled={!editable}
                onClick={() => setEditing({ kind: 'remove', id: row.id })}
              >
                <Icon name="delete" size={18} tone="current" />
              </button>
            );
            const collect = asSaved && onCollect && row.amount > 0 && (
              <button
                type="button"
                className={styles.collect}
                disabled={!editable}
                onClick={() => onCollect(row.id)}
              >
                <Icon name="money" size={18} tone="current" />
                <span className={styles.collectLong}>{t.collectAmount(formatCOP(row.amount))}</span>
                <span className={styles.collectShort}>{t.collect}</span>
              </button>
            );
            const noteList = notes.length > 0 && (
              <span className={styles.notes}>
                {notes.map((note) => {
                  const n = noteText(note);
                  return (
                    <span key={note.kind} className={styles.note} data-tone={n.tone}>
                      <Icon name={n.icon} size={15} tone="current" />
                      {n.text}
                    </span>
                  );
                })}
              </span>
            );
            // Una sola estructura: en el celular (o en un panel angosto) dos renglones; con espacio, una línea (CSS).
            return (
              <li
                key={row.id}
                className={[styles.row, styles.scheduled, saved && styles.withCollect].join(' ')}
              >
                <span className={styles.top}>
                  {href ? (
                    <a className={[styles.label, styles.rowLink].join(' ')} href={href}>
                      {label}
                    </a>
                  ) : (
                    <span className={styles.label}>{label}</span>
                  )}
                  {remove}
                </span>
                <span className={styles.chips}>
                  {date}
                  {amount}
                </span>
                {noteList}
                {collect && <span className={styles.collectCell}>{collect}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {scheduled.length === 0 && <p className={styles.empty}>{saved ? t.emptySaved : t.emptyCreate}</p>}
      {onAdd && (
        <button type="button" className={styles.add} disabled={disabled} onClick={onAdd}>
          <Icon name="add" size={18} tone="current" />
          {t.add}
        </button>
      )}
      {afterList}
      <Totals totals={totals} mobile={mobile} onReview={saved ? onReview : undefined} />

      {open && editing?.kind === 'date' && (
        <PaymentDateDialog
          open
          onOpenChange={(next) => !next && close()}
          label={labelOf(open.id)}
          current={open.dueDate}
          today={today}
          otherDates={others(open.id)}
          mode={saved && !open.draft ? 'saved' : 'create'}
          onSave={async (date, reason, note) => {
            await onChangeDate(open.id, date, reason, note);
          }}
        />
      )}
      {open && editing?.kind === 'amount' && (
        <PaymentAmountDialog
          open
          onOpenChange={(next) => !next && close()}
          label={labelOf(open.id)}
          current={open.amount}
          allowZero={!saved || Boolean(open.draft)}
          onSave={async (amount) => {
            await onChangeAmount(open.id, amount);
          }}
        />
      )}
      {open && editing?.kind === 'remove' && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && close()}
          tone="danger"
          title={t.removeDialog.title(labelOf(open.id))}
          message={(saved && !open.draft ? t.removeDialog.whatSaved : t.removeDialog.whatCreate)(
            formatCOP(open.amount),
            open.dueDate ? formatDate(open.dueDate) : null,
          )}
          confirmLabel={t.removeDialog.confirm}
          cancelLabel={t.removeDialog.cancel}
          onConfirm={async () => {
            await onRemove(open.id);
          }}
        />
      )}
    </div>
  );
}

/** Un abono ya cobrado o entregado: solo se ve (fecha, estado, valor y medio de pago). */
function PaidRow({
  row,
  label,
  href,
}: {
  row: Extract<ScheduleListRow, { type: 'paid' }>;
  label: string;
  href?: string;
}) {
  const pill = (
    <span className={styles.pillLine}>
      <StatusPill status={row.status} locked={row.status === 'delivered'} size="sm" />
      {row.kindLabel && <span className={styles.kind}>{row.kindLabel}</span>}
    </span>
  );
  const value = (
    <span className={styles.paidValue}>
      <span className={styles.paidAmount}>{formatCOP(row.amount)}</span>
      {row.method && (
        <span className={styles.method}>
          <Icon name={row.method === 'cash' ? 'money' : 'transfer'} size={15} tone="current" />
          {copy.customers.detail.payments.method[row.method]}
        </span>
      )}
    </span>
  );
  const text = row.date ? formatDate(row.date) : '—';
  // Toda la fila lleva al detalle del abono: el enlace se estira sobre ella (CSS).
  const date = href ? (
    <a className={[styles.paidDate, styles.rowLink].join(' ')} href={href} aria-label={`${label}, ${text}`}>
      {text}
    </a>
  ) : (
    <span className={styles.paidDate}>{text}</span>
  );
  return (
    <li className={[styles.row, styles.paid].join(' ')}>
      <span className={styles.paidLeft}>
        {date}
        {pill}
      </span>
      {value}
    </li>
  );
}

/** El totalizador: solo responde «¿programé de más o de menos?». */
function Totals({
  totals,
  mobile,
  onReview,
}: {
  totals: ReturnType<typeof scheduleTotals>;
  mobile: boolean;
  onReview?: () => void;
}) {
  const r = t.totals;
  const review = totals.state === 'over' && onReview;
  return (
    <div role="group" className={styles.totals} aria-label={r.label}>
      <p className={styles.totalRow}>
        <span>{r.pending}</span>
        <span className={styles.totalValue}>{formatCOP(totals.pending)}</span>
      </p>
      <p className={styles.totalRow}>
        <span>{r.scheduled}</span>
        <span className={styles.totalValue}>{formatCOP(totals.scheduled)}</span>
      </p>
      <div role="status" className={styles.result} data-state={totals.state}>
        <Icon name={totals.state === 'exact' ? 'check' : 'alert'} size={18} tone="current" />
        <span className={styles.resultText}>{r[totals.state]}</span>
        {totals.state !== 'exact' && (
          <span className={styles.resultValue}>{formatCOP(totals.difference)}</span>
        )}
        {review && !mobile && (
          <button type="button" className={styles.review} onClick={onReview}>
            {r.review}
          </button>
        )}
      </div>
      {review && mobile && (
        <div className={styles.reviewRow}>
          <button type="button" className={styles.review} onClick={onReview}>
            {r.reviewLong}
          </button>
        </div>
      )}
    </div>
  );
}
