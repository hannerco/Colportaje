'use client';

import { useId, useState } from 'react';
import { copy } from '@/copy/es';
import { confirmBlockers, depositContributions, type DepositBlocker } from '@/domain/deposit';
import { recalcProposal, type DepositPayment } from '@/domain/deposit-draft';
import { formatCOP, type COP } from '@/domain/money';
import type { LocalDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { Choice } from '@/ui/atoms/Choice';
import { Field } from '@/ui/atoms/Field';
import { StatusPill } from '@/ui/atoms/StatusPill';
import { DateField } from '@/ui/molecules/DateField';
import { Icon } from '@/ui/icons';
import { Menu } from '@/ui/molecules/Menu';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { DetailWindow, type DetailWindowProps } from '@/ui/organisms/DetailWindow';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { DetailSkeleton } from '@/ui/templates/DetailTemplate';
import {
  BalanceLines,
  DepositHeader,
  DepositPaymentsIsland,
  PanelColumns,
  PanelIsland,
  depositCounts,
} from '../../components/DepositPanel';
import { ReceiptPhotos } from '../../components/ReceiptPhotos';
import styles from './DepositEditorScreen.module.css';

/** Lo que el usuario escribió, listo para guardar o confirmar. */
export type DepositEditorValues = {
  title: string | null;
  depositDate: LocalDate;
  paymentIds: string[];
  cash: COP;
  transfer: COP;
  note: string | null;
};

export type DepositEditorScreenProps = {
  /** `new` = la propuesta precargada (no hay nada guardado); `draft` = un borrador abierto. */
  mode: 'new' | 'draft';
  /** Los abonos que se pueden marcar: los libres y, en un borrador, los que ya lleva. */
  payments: readonly DepositPayment[];
  /** Los valores con los que abre (la propuesta o el borrador). La pantalla los edita por su cuenta. */
  initial?: {
    title: string | null;
    displayTitle: string;
    depositDate: LocalDate;
    selectedIds: readonly string[];
    cash: COP;
    transfer: COP;
    note: string | null;
  };
  receipts: readonly { photoId: string; thumbUrl: string }[];
  loading?: boolean;
  error?: boolean;
  notFound?: boolean;
  onRetry?: () => void;
  isOnline: boolean;
  window: Pick<DetailWindowProps, 'mode' | 'onModeChange' | 'onClose' | 'breadcrumb'>;
  /** Solo un borrador que nunca se confirmó se borra (BR-DEP-02, BR-DEP-10). */
  canDelete?: boolean;
  /** Sube un recibo; devuelve si se subió. */
  onAddReceipt: (file: File) => Promise<boolean>;
  onRemoveReceipt: (photoId: string) => void;
  /** Guardan o confirman; si fallan, que lancen para que la pantalla no se dé por terminada (el contenedor ya avisó). */
  onSaveDraft: (values: DepositEditorValues) => Promise<void>;
  onConfirm: (values: DepositEditorValues) => Promise<void>;
  onDelete: () => Promise<void>;
};

const t = copy.money.depositEditor;

/**
 * Nuevo Abibono y borradores (HU-PAN-DIN-04, diseño «4 · Nuevo Abibono», BR-DEP-03 a BR-DEP-10, BR-DEP-13): la entrega
 * al líder llega precargada con lo cobrado; se pueden marcar o desmarcar abonos, ajustar los montos (con «Calculado ·
 * Restaurar»), subir el recibo y explicar una diferencia. «Marcar como entregado» se habilita con recibo y, si hay
 * diferencia, nota. Pantalla de presentación: los valores que escribes viven aquí y salen por `onSaveDraft` y
 * `onConfirm`.
 */
export function DepositEditorScreen(props: DepositEditorScreenProps) {
  const { initial } = props;
  const title = props.mode === 'new' ? t.newTitle : (initial?.displayTitle ?? t.newTitle);

  if (!initial)
    return (
      <DetailWindow {...props.window} title={title}>
        {props.notFound ? (
          <EmptyState kind="empty" title={t.notFound.title} text={t.notFound.text} />
        ) : props.error && !props.loading ? (
          <EmptyState
            kind="error"
            title={t.error.title}
            text={t.error.text}
            action={props.onRetry ? { label: copy.errors.retry, onClick: props.onRetry } : undefined}
          />
        ) : (
          <DetailSkeleton avatar="cover" figure islands={[{ rows: 5, row: 'list' }, { rows: 3 }]} />
        )}
      </DetailWindow>
    );
  return <Editor {...props} initial={initial} title={title} />;
}

function Editor(
  props: DepositEditorScreenProps & {
    initial: NonNullable<DepositEditorScreenProps['initial']>;
    title: string;
  },
) {
  const { initial, payments, isOnline } = props;
  const hintId = useId();
  const [name, setName] = useState(initial.title ?? '');
  const [date, setDate] = useState<LocalDate | null>(initial.depositDate);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(initial.selectedIds));
  const [cash, setCash] = useState<COP | null>(initial.cash);
  const [transfer, setTransfer] = useState<COP | null>(initial.transfer);
  const [note, setNote] = useState(initial.note ?? '');
  const [busy, setBusy] = useState<null | 'save' | 'confirm'>(null);
  const [deleting, setDeleting] = useState(false);

  const chosen = payments.filter((p) => selected.has(p.paymentId));
  const calculated = recalcProposal(chosen);
  const cashValue = cash ?? 0;
  const transferValue = transfer ?? 0;
  const total = cashValue + transferValue;
  const difference = total - calculated.expected;
  const edited = cashValue !== calculated.cash || transferValue !== calculated.transfer;
  const blockers: DepositBlocker[] = confirmBlockers(
    { cashAmount: cashValue, transferAmount: transferValue, note },
    depositContributions(
      chosen.map((p) => ({ id: p.paymentId, paidAmount: p.paidAmount, method: p.method })),
    ),
    props.receipts.length,
  );
  const noteRequired = difference !== 0;
  const online = isOnline;

  // Al marcar o desmarcar abonos, los montos vuelven a calcularse (BR-DEP-04).
  const select = (next: ReadonlySet<string>) => {
    setSelected(next);
    const sums = recalcProposal(payments.filter((p) => next.has(p.paymentId)));
    setCash(sums.cash);
    setTransfer(sums.transfer);
  };
  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    select(next);
  };
  const allSelected = payments.length > 0 && payments.every((p) => selected.has(p.paymentId));

  const values = (): DepositEditorValues => ({
    title: name.trim() === '' ? null : name.trim(),
    depositDate: date!,
    paymentIds: [...selected],
    cash: cashValue,
    transfer: transferValue,
    note: note.trim() === '' ? null : note.trim(),
  });
  const run = async (kind: 'save' | 'confirm') => {
    if (!date) return;
    setBusy(kind);
    try {
      await (kind === 'save' ? props.onSaveDraft(values()) : props.onConfirm(values()));
    } catch {
      // El contenedor ya avisó el motivo; lo escrito sigue aquí para corregir o reintentar.
    } finally {
      setBusy(null);
    }
  };

  const moreActions =
    props.mode === 'draft' && props.canDelete ? (
      <Menu
        trigger={
          <Button variant="tertiary" iconOnly icon="more">
            {t.moreActions}
          </Button>
        }
        title={t.moreActions}
        items={[{ id: 'delete', label: t.delete, icon: 'delete' as const, danger: true, disabled: !online }]}
        onSelect={() => setDeleting(true)}
      />
    ) : undefined;

  const canConfirm = blockers.length === 0 && date !== null && online;
  return (
    <>
      <DetailWindow {...props.window} title={props.title} moreActions={moreActions}>
        <div className={styles.stack}>
          <DepositHeader
            title={
              <div className={styles.head}>
                <Field label={t.name} placeholder={initial.displayTitle} value={name} onChange={setName} />
                <DateField label={t.date} placeholder="dd/mm/aaaa" value={date} onChange={setDate} />
              </div>
            }
            status={props.mode === 'draft' ? <StatusPill status="draft" /> : undefined}
            date={null}
            total={total}
            cash={cashValue}
            transfer={transferValue}
            counts={depositCounts(chosen)}
          />

          {payments.length === 0 ? (
            <Island title={t.payments} icon="collected">
              <p className={styles.muted}>{t.noPayments}</p>
            </Island>
          ) : (
            <DepositPaymentsIsland
              payments={payments}
              caption={copy.money.depositPanel.selected(selected.size, payments.length)}
              leadingLabel={t.include}
              headerEnd={
                <Button
                  variant="link"
                  size="compact"
                  onClick={() => select(allSelected ? new Set() : new Set(payments.map((p) => p.paymentId)))}
                >
                  {allSelected ? t.paymentsNone : t.paymentsAllShort}
                </Button>
              }
              leading={(p) => (
                <Choice
                  hideLabel
                  label={t.includePayment(p.customerName)}
                  checked={selected.has(p.paymentId)}
                  onCheckedChange={(on) => toggle(p.paymentId, on)}
                />
              )}
            />
          )}

          <PanelColumns
            left={
              <>
                <PanelIsland title={copy.money.depositPanel.toDeliver} icon="money">
                  <div className={styles.amounts}>
                    <div className={styles.amount}>
                      <Field kind="money" label={t.cash} value={cash} onChange={setCash} />
                      {cashValue !== calculated.cash && (
                        <span className={styles.calc}>{t.calculated(formatCOP(calculated.cash))}</span>
                      )}
                    </div>
                    <div className={styles.amount}>
                      <Field kind="money" label={t.transfer} value={transfer} onChange={setTransfer} />
                      {transferValue !== calculated.transfer && (
                        <span className={styles.calc}>{t.calculated(formatCOP(calculated.transfer))}</span>
                      )}
                    </div>
                  </div>
                  {edited && (
                    <Button
                      variant="tertiary"
                      size="compact"
                      icon="undo"
                      onClick={() => {
                        setCash(calculated.cash);
                        setTransfer(calculated.transfer);
                      }}
                    >
                      {t.restore}
                    </Button>
                  )}
                </PanelIsland>
                <PanelIsland title={copy.money.depositPanel.receipt} icon="receipt">
                  <ReceiptPhotos
                    photos={props.receipts}
                    onAdd={props.onAddReceipt}
                    onRemove={props.onRemoveReceipt}
                    disabledReason={online ? null : copy.ui.empty.needsConnection}
                  />
                </PanelIsland>
              </>
            }
            right={
              <PanelIsland title={copy.money.depositPanel.balance} icon="info">
                <BalanceLines expected={calculated.expected} difference={difference} />
                <div className={styles.note}>
                  <Field
                    kind="textarea"
                    label={`${t.note}${noteRequired ? ` · ${t.noteRequired}` : ''}`}
                    placeholder={noteRequired ? t.noteDifferencePlaceholder : t.notePlaceholder}
                    value={note}
                    onChange={setNote}
                  />
                </div>
              </PanelIsland>
            }
          />

          <div className={styles.footer}>
            {blockers.length > 0 && (
              <p id={hintId} role="status" className={styles.hint}>
                <Icon name="info" size={16} tone="current" /> {blockers.map((b) => t.blockers[b]).join(' ')}
              </p>
            )}
            <div className={styles.actions}>
              <Button
                variant="secondary"
                state={busy === 'save' ? 'loading' : !online || !date || busy ? 'disabled' : 'normal'}
                onClick={() => void run('save')}
              >
                {t.saveDraft}
              </Button>
              <Button
                variant="primary"
                state={busy === 'confirm' ? 'loading' : !canConfirm || busy ? 'disabled' : 'normal'}
                aria-describedby={blockers.length > 0 ? hintId : undefined}
                onClick={() => void run('confirm')}
              >
                {t.confirm}
              </Button>
            </div>
            {!online && <span className={styles.hint}>{copy.ui.empty.needsConnection}</span>}
          </div>
        </div>
      </DetailWindow>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        tone="danger"
        title={t.deleteTitle}
        message={t.deleteMessage}
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.deleteCancel}
        onConfirm={props.onDelete}
      />
    </>
  );
}
