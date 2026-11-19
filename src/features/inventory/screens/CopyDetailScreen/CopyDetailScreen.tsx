'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { receivedDateOptions } from '@/domain/add-batch';
import type { CopyEvent } from '@/domain/copy';
import type { CopyDetail, HistoryItem as DomainHistoryItem } from '@/domain/copy-detail';
import { formatCOP } from '@/domain/money';
import { formatDate, toBogotaDate, type LocalDate } from '@/domain/time';
import { DatePickerCalendar } from '@/features/payments';
import { Button } from '@/ui/atoms/Button';
import { Choice, ChoiceGroup } from '@/ui/atoms/Choice';
import { Field } from '@/ui/atoms/Field';
import { DataList, DataRow } from '@/ui/molecules/DataRow';
import { HistoryTimeline } from '@/ui/molecules/HistoryTimeline';
import { Menu } from '@/ui/molecules/Menu';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { DetailWindow, type DetailWindowProps } from '@/ui/organisms/DetailWindow';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { DetailTemplate } from '@/ui/templates/DetailTemplate';
import styles from './CopyDetailScreen.module.css';

export type CopyDetailScreenProps = {
  /** `useCopyDetail(id).data`; sin valor mientras carga o si falló. */
  detail?: CopyDetail;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Título de la ventana mientras carga. */
  fallbackTitle?: string;
  /** Sin conexión, las acciones que escriben se ven deshabilitadas (BR-GEN-08). */
  isOnline: boolean;
  window: Pick<DetailWindowProps, 'mode' | 'onModeChange' | 'onClose' | 'onPrev' | 'onNext' | 'breadcrumb'>;
  /** Hoy (la fecha de recibido no es futura). */
  today: LocalDate;
  /** Ruta de la ficha del cliente del ejemplar. */
  customerHref: (customerId: string) => string;
  /** Precio acordado (entero ≥ 0) y restaurar el público (HU-INV-06). */
  onChangePrice: (price: number) => Promise<void>;
  onRestorePrice: () => Promise<void>;
  /** Fecha de recibido (HU-INV-05, FI-05). */
  onChangeReceived: (date: LocalDate) => Promise<void>;
  /** Marcar con novedad (nota obligatoria, HU-INV-07) y eliminar (nota, HU-INV-08). */
  onFlag: (note: string) => Promise<void>;
  onDelete: (note: string | null) => Promise<void>;
  /** Deshacer la última resolución (Apareció o Perdido) y la devolución al líder (con nota, BR-COPY-16). */
  onUndoResolution: () => Promise<void>;
  onUndoReturn: (note: string) => Promise<void>;
};

const t = copy.inventory.detail;

/** El texto de una entrada del historial, armado desde `copy/es.ts`. */
export function historyText(item: DomainHistoryItem): string {
  const e = t.event;
  const data = item.data;
  switch (item.type as CopyEvent['type']) {
    case 'received':
      return e.received;
    case 'sold':
      return e.sold(data.customerName);
    case 'returned':
      return e.returned;
    case 'flagged':
      return e.flagged;
    case 'resolved':
      return data.resolution === 'lost'
        ? e.resolvedLost
        : data.resolution === 'removed'
          ? e.resolvedRemoved
          : e.resolvedFound;
    case 'undo_resolved':
      return e.undoResolved;
    case 'deleted':
      return e.deleted;
    case 'undo_deleted':
      return e.undoDeleted;
    case 'price_changed':
      return e.priceChanged(
        data.newPrice === null || data.newPrice === undefined ? null : formatCOP(data.newPrice),
      );
    case 'received_date_changed':
      return e.receivedDateChanged(data.newDate ? formatDate(data.newDate) : '');
    case 'sold_at_changed':
      return e.soldAtChanged(data.newDate ? formatDate(data.newDate) : '');
    case 'minibook_sold':
      return e.minibookSold;
    case 'returned_to_leader':
      return e.returnedToLeader;
    case 'undo_returned_to_leader':
      return e.undoReturnedToLeader;
  }
}

type Dialog = null | 'flag' | 'delete' | 'undoReturn' | 'price' | 'received';

/**
 * Detalle de un ejemplar (HU-PAN-INV-03, diseño «3 · Ejemplar»): identidad con su estado, datos (cliente, precio
 * acordado con el público tachado, diferencia, vendido y recibido) e historial con «Deshacer». Más acciones según lo
 * que permite el ejemplar: marcar con novedad y eliminar. Pantalla de presentación: datos y acciones por props.
 */
export function CopyDetailScreen(props: CopyDetailScreenProps) {
  const { detail, isOnline, today } = props;
  const [dialog, setDialog] = useState<Dialog>(null);

  if (!detail)
    return (
      <DetailWindow {...props.window} title={props.fallbackTitle || copy.inventory.title}>
        {props.error && !props.loading ? (
          <EmptyState
            kind="error"
            title={t.error.title}
            text={t.error.text}
            action={props.onRetry ? { label: copy.errors.retry, onClick: props.onRetry } : undefined}
          />
        ) : (
          <EmptyState kind="loading" rows={6} />
        )}
      </DetailWindow>
    );

  const copyName = t.title(detail.titleName, detail.number);
  const sold = detail.status === 'sold';
  const undoItem = detail.history.find((item) => item.undo !== 'none');

  const actions = [
    ...(detail.can.flag ? [{ id: 'flag', label: t.flag, icon: 'alert' as const, disabled: !isOnline }] : []),
    ...(detail.can.delete
      ? [{ id: 'delete', label: t.delete, icon: 'delete' as const, danger: true, disabled: !isOnline }]
      : []),
  ];
  const moreActions =
    actions.length > 0 ? (
      <Menu
        trigger={
          <Button variant="tertiary" iconOnly icon="more">
            {t.moreActions}
          </Button>
        }
        title={t.moreActions}
        items={actions}
        onSelect={(id) => setDialog(id as 'flag' | 'delete')}
      />
    ) : undefined;

  const delta = detail.priceDelta;
  return (
    <>
      <DetailTemplate
        window={{ ...props.window, title: copyName, moreActions }}
        identity={{
          avatar: { kind: 'cover', coverUrl: detail.imageUrl ?? undefined },
          title: detail.titleName,
          number: detail.number,
          status: detail.status,
        }}
      >
        <Island>
          <DataList>
            {sold && detail.customer && (
              <DataRow
                kind="link"
                label={t.customer}
                icon="person"
                divider={false}
                href={props.customerHref(detail.customer.id)}
                value={detail.customer.name}
              />
            )}
            {sold && detail.agreedPrice !== null && (
              <DataRow
                {...(detail.can.editAgreedPrice && isOnline
                  ? { kind: 'editable' as const, onEdit: () => setDialog('price') }
                  : { kind: 'amount' as const })}
                label={t.agreedPrice}
                divider={Boolean(detail.customer)}
                value={formatCOP(detail.agreedPrice)}
                previous={delta ? formatCOP(detail.publicPriceSnapshot ?? 0) : undefined}
              />
            )}
            {sold && delta ? (
              <DataRow
                label={t.delta}
                value={
                  <span>
                    {copy.ui.listRow.delta(delta > 0 ? '+' : '−', formatCOP(Math.abs(delta)))}
                    <span className={styles.muted}> · {delta > 0 ? t.increase : t.discount}</span>
                  </span>
                }
              />
            ) : null}
            {sold && detail.soldAt && (
              <DataRow label={t.soldOn} value={formatDate(toBogotaDate(detail.soldAt))} />
            )}
            {!sold && detail.publicPriceSnapshot !== null && (
              <DataRow
                label={t.price}
                kind="amount"
                divider={false}
                value={formatCOP(detail.publicPriceSnapshot)}
              />
            )}
            <DataRow
              label={t.receivedOn}
              {...(detail.can.editReceivedAt && isOnline
                ? { kind: 'editable' as const, onEdit: () => setDialog('received') }
                : { kind: 'text' as const })}
              divider={sold || detail.publicPriceSnapshot !== null}
              value={formatDate(detail.receivedAt)}
            />
          </DataList>
        </Island>
        <Island title={t.history} icon="note">
          <HistoryTimeline
            items={detail.history.map((item) => ({
              id: item.eventId,
              text: historyText(item),
              note: item.note ?? undefined,
              date: toBogotaDate(item.at),
            }))}
            undo={
              undoItem && isOnline
                ? {
                    label: t.undo,
                    onUndo: () =>
                      undoItem.undo === 'returned_to_leader'
                        ? setDialog('undoReturn')
                        : void props.onUndoResolution(),
                  }
                : undefined
            }
          />
        </Island>
      </DetailTemplate>

      <NoteDialog
        open={dialog === 'flag'}
        onClose={() => setDialog(null)}
        title={t.flagDialog.title}
        label={t.flagDialog.label}
        placeholder={t.flagDialog.placeholder}
        confirmLabel={t.flagDialog.confirm}
        cancelLabel={t.flagDialog.cancel}
        required
        onConfirm={(note) => props.onFlag(note ?? '')}
      />
      <NoteDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        tone="danger"
        title={t.deleteDialog.title(copyName)}
        label={t.deleteDialog.label}
        placeholder={t.deleteDialog.placeholder}
        confirmLabel={t.deleteDialog.confirm}
        cancelLabel={t.deleteDialog.cancel}
        onConfirm={(note) => props.onDelete(note)}
      />
      <NoteDialog
        open={dialog === 'undoReturn'}
        onClose={() => setDialog(null)}
        title={t.undoReturnDialog.title(copyName)}
        label={t.undoReturnDialog.label}
        placeholder={t.undoReturnDialog.placeholder}
        confirmLabel={t.undoReturnDialog.confirm}
        cancelLabel={t.undoReturnDialog.cancel}
        required
        onConfirm={(note) => props.onUndoReturn(note ?? '')}
      />
      {dialog === 'price' && detail.agreedPrice !== null && (
        <PriceDialog
          current={detail.agreedPrice}
          publicPrice={detail.can.restorePublicPrice ? detail.publicPriceSnapshot : null}
          onClose={() => setDialog(null)}
          onSave={props.onChangePrice}
          onRestore={props.onRestorePrice}
        />
      )}
      {dialog === 'received' && (
        <ReceivedDateDialog
          current={detail.receivedAt}
          today={today}
          soldOn={detail.soldAt ? toBogotaDate(detail.soldAt) : null}
          onClose={() => setDialog(null)}
          onSave={props.onChangeReceived}
        />
      )}
    </>
  );
}

/** Diálogo con una nota (obligatoria o no); «Confirmar» no se activa sin nota cuando es obligatoria. */
function NoteDialog({
  open,
  onClose,
  tone,
  title,
  label,
  placeholder,
  confirmLabel,
  cancelLabel,
  required = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  tone?: 'confirm' | 'danger';
  title: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  required?: boolean;
  onConfirm: (note: string | null) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState(false);
  const trimmed = note.trim();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setNote('');
          setMissing(false);
          onClose();
        }
      }}
      tone={tone}
      title={title}
      message=""
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={async () => {
        if (required && !trimmed) {
          // La nota es obligatoria: el diálogo sigue abierto (el diálogo no se cierra si la acción falla).
          setMissing(true);
          throw new Error('note-required');
        }
        await onConfirm(trimmed || null);
        setNote('');
      }}
    >
      <Field
        kind="textarea"
        label={label}
        placeholder={placeholder}
        value={note}
        onChange={(value) => {
          setNote(value);
          setMissing(false);
        }}
        error={missing ? t.noteRequired : undefined}
      />
    </ConfirmDialog>
  );
}

/** Precio acordado: un campo de dinero y, si el precio cambió, «Restaurar precio de inventario $…». */
function PriceDialog({
  current,
  publicPrice,
  onClose,
  onSave,
  onRestore,
}: {
  current: number;
  publicPrice: number | null;
  onClose: () => void;
  onSave: (price: number) => Promise<void>;
  onRestore: () => Promise<void>;
}) {
  const [price, setPrice] = useState<number | null>(current);
  return (
    <ConfirmDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t.agreedPrice}
      message=""
      confirmLabel={copy.inventory.detail.receivedMenu.save}
      cancelLabel={copy.inventory.detail.receivedMenu.cancel}
      onConfirm={async () => {
        if (price === null || price === current) return;
        await onSave(price);
      }}
    >
      <Field kind="money" label={t.agreedPrice} value={price} onChange={setPrice} />
      {publicPrice !== null && (
        <Button
          variant="link"
          onClick={async () => {
            await onRestore();
            onClose();
          }}
        >
          {t.restorePrice(formatCOP(publicPrice))}
        </Button>
      )}
    </ConfirmDialog>
  );
}

/** Fecha de recibido: Hoy, Ayer, Anteayer u otra fecha en el calendario; nunca futura ni posterior a la venta. */
function ReceivedDateDialog({
  current,
  today,
  soldOn,
  onClose,
  onSave,
}: {
  current: LocalDate;
  today: LocalDate;
  soldOn: LocalDate | null;
  onClose: () => void;
  onSave: (date: LocalDate) => Promise<void>;
}) {
  const m = t.receivedMenu;
  const options = receivedDateOptions(today);
  const presetOf = (date: LocalDate) => options.find((o) => o.date === date)?.key;
  const [choice, setChoice] = useState<string>(presetOf(current) ?? 'other');
  const [other, setOther] = useState<LocalDate>(current);
  const chosen = choice === 'other' ? other : (options.find((o) => o.key === choice)?.date ?? current);
  return (
    <ConfirmDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={m.title}
      message=""
      confirmLabel={m.save}
      cancelLabel={m.cancel}
      onConfirm={async () => {
        if (chosen === current) return;
        await onSave(chosen);
      }}
    >
      <ChoiceGroup legend={m.title} value={choice} onValueChange={setChoice}>
        {options.map((option) => (
          <Choice
            key={option.key}
            kind="radio"
            value={option.key}
            label={`${m[option.key]} · ${formatDate(option.date)}`}
          />
        ))}
        <Choice kind="radio" value="other" label={m.other} />
      </ChoiceGroup>
      {choice === 'other' && (
        <DatePickerCalendar
          label={m.pick}
          value={other}
          onChange={setOther}
          today={today}
          isDisabled={(date) => date > today || (soldOn !== null && date > soldOn)}
        />
      )}
    </ConfirmDialog>
  );
}
