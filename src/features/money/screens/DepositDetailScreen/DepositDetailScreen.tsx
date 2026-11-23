'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import type { DepositView } from '@/domain/deposit-draft';
import { formatCOP, type COP } from '@/domain/money';
import { formatDate, toBogotaDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { Field } from '@/ui/atoms/Field';
import { DataList, DataRow } from '@/ui/molecules/DataRow';
import { HistoryTimeline } from '@/ui/molecules/HistoryTimeline';
import { Menu } from '@/ui/molecules/Menu';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { DetailWindow, type DetailWindowProps } from '@/ui/organisms/DetailWindow';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { DetailSkeleton, DetailTemplate } from '@/ui/templates/DetailTemplate';
import { ReceiptPhotos } from '../../components/ReceiptPhotos';
import styles from './DepositDetailScreen.module.css';

export type DepositDetailScreenProps = {
  /** El Abibono entregado (de `useDeposit`); sin valor mientras carga o si falló. */
  deposit?: DepositView;
  loading?: boolean;
  error?: boolean;
  notFound?: boolean;
  onRetry?: () => void;
  isOnline: boolean;
  window: Pick<DetailWindowProps, 'mode' | 'onModeChange' | 'onClose' | 'breadcrumb'>;
  paymentHref: (paymentId: string) => string;
  /** Sube otro recibo (se pueden añadir, no quitar: BR-DEP-12, BR-PHO-03); devuelve si se subió. */
  onAddReceipt: (file: File) => Promise<boolean>;
  /** Guarda la nota (`null` = sin nota); si falla, que lance (el contenedor ya avisó). */
  onSaveNote: (note: string | null) => Promise<void>;
  /** Reabre con el motivo; si falla, que lance para que el diálogo siga abierto (el contenedor ya avisó). */
  onReopen: (reason: string) => Promise<void>;
};

const t = copy.money.depositDetail;
const signed = (amount: COP) =>
  amount === 0 ? formatCOP(0) : `${amount < 0 ? '−' : '+'}${formatCOP(Math.abs(amount))}`;

/**
 * Abibono entregado y reabrir (HU-PAN-DIN-05, diseño «3 · Abibonos»: Dinero-d-confirmado y -reabrir): el Abibono tal
 * como quedó, solo lectura (título, fecha, montos y abonos bloqueados, BR-DEP-02) salvo la nota y los recibos nuevos
 * (BR-DEP-12). La nota no puede quedar vacía si hay diferencia (I-27). «Reabrir» está en Más acciones y pide un motivo
 * obligatorio; devuelve el Abibono a borrador con su número (I-31) y sus abonos a Cobrado. Pantalla de presentación.
 */
export function DepositDetailScreen(props: DepositDetailScreenProps) {
  const { deposit, isOnline } = props;

  if (!deposit)
    return (
      <DetailWindow {...props.window} title={copy.ui.nav.items.money}>
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
  return <Detail {...props} deposit={deposit} isOnline={isOnline} />;
}

function Detail(props: DepositDetailScreenProps & { deposit: DepositView }) {
  const { deposit, isOnline } = props;
  const [reopening, setReopening] = useState(false);
  const { difference } = deposit.summary;

  const moreActions = deposit.can.reopen ? (
    <Menu
      trigger={
        <Button variant="tertiary" iconOnly icon="more">
          {t.moreActions}
        </Button>
      }
      title={t.moreActions}
      items={[{ id: 'reopen', label: t.reopen, icon: 'undo' as const, disabled: !isOnline }]}
      onSelect={() => setReopening(true)}
    />
  ) : undefined;

  // Del más reciente al más antiguo (el back los entrega al revés).
  const history = [...deposit.history].reverse().map((event, i) => ({
    id: `${event.type}-${i}`,
    text: event.type === 'confirmed' ? t.historyConfirmed : t.historyReopened,
    note: event.reason ?? undefined,
    date: toBogotaDate(event.at),
  }));

  return (
    <>
      <DetailTemplate
        window={{ ...props.window, title: deposit.displayTitle, moreActions }}
        identity={{
          avatar: { kind: 'emoji', emoji: '\u{1F4B5}' },
          title: deposit.displayTitle,
          status: 'delivered',
          statusLocked: true,
        }}
      >
        <Island title={t.data} icon="money">
          <DataList>
            <DataRow label={t.date} value={formatDate(deposit.depositDate)} divider={false} />
            <DataRow kind="amount" label={t.cash} value={formatCOP(deposit.cash)} />
            <DataRow kind="amount" label={t.transfer} value={formatCOP(deposit.transfer)} />
            <DataRow kind="amount" label={t.total} value={formatCOP(deposit.summary.total)} />
            <DataRow kind="amount" label={t.expected} value={formatCOP(deposit.summary.expected)} />
            <DataRow
              kind="amount"
              label={t.difference}
              value={`${signed(difference)}${difference === 0 ? '' : ` · ${difference < 0 ? t.shortfall : t.surplus}`}`}
            />
          </DataList>
          {/* Si la nota guardada cambia, el editor vuelve a empezar desde ella. */}
          <NoteEditor
            key={deposit.note ?? ''}
            saved={deposit.note}
            required={difference !== 0}
            isOnline={isOnline}
            onSave={props.onSaveNote}
          />
          <div className={styles.receipt}>
            <span className={styles.label}>{t.receipt}</span>
            <ReceiptPhotos
              photos={deposit.receipts}
              onAdd={props.onAddReceipt}
              disabledReason={isOnline ? null : copy.ui.empty.needsConnection}
            />
          </div>
        </Island>

        <Island title={t.payments} icon="collected">
          <ul className={styles.payments} aria-label={t.payments}>
            {deposit.payments.map((p) => (
              <li key={p.paymentId}>
                <a className={styles.payment} href={props.paymentHref(p.paymentId)}>
                  <span className={styles.customer}>{p.customerName}</span>
                  <span className={styles.number}>{formatDate(p.paidAt)}</span>
                  <span className={styles.method}>{copy.money.depositEditor.methods[p.method]}</span>
                  <span className={`${styles.number} ${styles.end}`}>{formatCOP(p.paidAmount)}</span>
                </a>
              </li>
            ))}
          </ul>
        </Island>

        {history.length > 0 && (
          <Island title={t.history} icon="note">
            <HistoryTimeline items={history} />
          </Island>
        )}
      </DetailTemplate>
      <ReopenDialog
        open={reopening}
        onOpenChange={setReopening}
        name={deposit.displayTitle}
        onReopen={props.onReopen}
      />
    </>
  );
}

/** La nota: editable, pero no puede quedar vacía si hay diferencia (I-27, CA-3). */
function NoteEditor({
  saved,
  required,
  isOnline,
  onSave,
}: {
  saved: string | null;
  required: boolean;
  isOnline: boolean;
  onSave: (note: string | null) => Promise<void>;
}) {
  const [note, setNote] = useState(saved ?? '');
  const [busy, setBusy] = useState(false);
  const trimmed = note.trim();
  const missing = required && trimmed === '';
  const changed = trimmed !== (saved ?? '');

  const save = async () => {
    setBusy(true);
    try {
      await onSave(trimmed === '' ? null : trimmed);
    } catch {
      // El contenedor ya avisó el motivo; lo escrito sigue aquí.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.note}>
      <Field
        kind="textarea"
        label={`${t.note}${required ? ` · ${t.noteRequired}` : ''}`}
        placeholder={required ? t.noteDifferencePlaceholder : t.notePlaceholder}
        value={note}
        onChange={setNote}
        error={missing ? t.noteRequiredHint : undefined}
      />
      {changed && (
        <Button
          variant="secondary"
          size="compact"
          state={busy ? 'loading' : missing || !isOnline ? 'disabled' : 'normal'}
          onClick={() => void save()}
        >
          {t.saveNote}
        </Button>
      )}
    </div>
  );
}

/** Reabrir con un motivo obligatorio (BR-DEP-12): sin motivo no se confirma. */
function ReopenDialog({
  open,
  onOpenChange,
  name,
  onReopen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onReopen: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason('');
          setMissing(false);
        }
        onOpenChange(next);
      }}
      title={t.reopenTitle(name)}
      message={t.reopenMessage}
      confirmLabel={t.reopenConfirm}
      cancelLabel={t.reopenCancel}
      onConfirm={async () => {
        if (reason.trim() === '') {
          setMissing(true);
          // Que el diálogo no se cierre: falta el motivo.
          throw new Error('REASON_REQUIRED');
        }
        await onReopen(reason.trim());
      }}
    >
      <Field
        kind="textarea"
        label={t.reason}
        placeholder={t.reasonPlaceholder}
        value={reason}
        onChange={(next) => {
          setReason(next);
          if (next.trim() !== '') setMissing(false);
        }}
        error={missing ? t.reasonRequired : undefined}
      />
    </ConfirmDialog>
  );
}
