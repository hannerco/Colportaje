'use client';

import { useId, useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import type { CustomerDetail } from '@/domain/customer-detail';
import { formatCOP, type COP } from '@/domain/money';
import type { PayMethod } from '@/domain/payment';
import type { LocalDate } from '@/domain/time';
import type { DiscardSummary } from '@/repositories';
import { Button } from '@/ui/atoms/Button';
import { Choice, ChoiceGroup } from '@/ui/atoms/Choice';
import { Field } from '@/ui/atoms/Field';
import { Banner } from '@/ui/molecules/Banner';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { Island } from '@/ui/organisms/Island';
import { usePlatform } from '@/ui/platform';
import { CustomerAccountSummary } from '../../components/CustomerAccountSummary';
import { PaymentPlanFields, type PaymentPlanValue } from '../../components/PaymentPlanFields';
import { AddBookButton, SoldBookList } from '../../components/SoldBookList';
import type { PlanPreview } from '../../new-customer-form';
import styles from './NewCustomerScreen.module.css';

export type DownPaymentValue = { amount: COP | null; method: PayMethod; paidOn: LocalDate };

export type NewCustomerScreenProps = {
  name: string;
  onNameChange: (name: string) => void;
  /** «Escribe el nombre» si se borró el de un cliente ya creado. */
  nameError?: string;
  phone: string;
  onPhoneChange: (phone: string) => void;
  /** Libros vendidos al cliente (los agrega HU-PAN-CLI-04). */
  books: CustomerDetail['books'];
  copyHref: (copyId: string) => string;
  /** «Agregar libro del inventario» (HU-PAN-CLI-04). */
  onAddBook?: () => void;
  /** «Quitar» un libro durante la creación, sin motivo (HU-CLI-09 R4). */
  onRemoveBook?: (copyId: string) => void;
  /** Deuda total (suma de los libros). */
  debt: COP;
  downPayment: DownPaymentValue;
  onDownPaymentChange: (patch: Partial<DownPaymentValue>) => void;
  /** «La fecha no puede ser futura» (HU-ABO-09). */
  downPaymentDateError?: string;
  plan: PaymentPlanValue;
  onPlanChange: (patch: Partial<PaymentPlanValue>) => void;
  preview: PlanPreview;
  /** HU-PAN-CLI-05: corregir la fecha de un abono del plan en el calendario (solo ese, sin historial). */
  onPlanDateChange?: (index: number, date: LocalDate) => void;
  /** Hoy (calendario y avisos de fecha pasada). */
  today: LocalDate;
  /** BR-PAY-13: lo programado supera el saldo (franja). */
  excess?: COP | null;
  /** Franja de sin conexión. */
  banner?: ReactNode;
  /** CA-5: sin conexión, «Guardar cliente» y «Descartar» se ven deshabilitados. */
  isOnline: boolean;
  /** El cliente ya existe (tiene nombre): sin él no hay nada que guardar ni descartar. */
  created: boolean;
  /** Termina de escribir lo pendiente y lleva a la ficha. */
  onSave: () => Promise<void>;
  /** El diálogo de descartar (también al salir por Volver o por la navegación, BR-CUS-14). */
  discardOpen: boolean;
  onDiscardOpenChange: (open: boolean) => void;
  /** Lo que se perderá (`useDiscardSummary`), cuando el diálogo está abierto. */
  discardSummary?: DiscardSummary;
  onDiscard: () => Promise<void>;
  /** Ruta de vuelta («Clientes»). */
  backHref: string;
  /** «Descartar» cuando aún no hay cliente: volver sin preguntar. */
  onLeave: () => void;
};

const t = copy.customers.create;
const METHODS: PayMethod[] = ['cash', 'transfer'];

/**
 * Nuevo cliente, ficha viva (HU-PAN-CLI-03): el cliente existe desde que tiene nombre y cada dato se guarda solo;
 * «Guardar cliente» muestra el resumen y cierra la creación; «Descartar» (o salir) borra todo con confirmación.
 * Escritorio: barra «Clientes / Nuevo cliente» y dos columnas; móvil: una pantalla desplazable con «Guardar cliente»
 * abajo.
 */
export function NewCustomerScreen(props: NewCustomerScreenProps) {
  const { created, isOnline, preview, books, debt, downPayment, plan } = props;
  const mobile = usePlatform() === 'mobile';
  const [summaryOpen, setSummaryOpen] = useState(false);
  const noteId = useId();

  const paid = downPayment.amount ?? 0;
  const account = {
    balance: Math.max(0, debt - paid),
    paidTotal: paid,
    debt,
    credit: Math.max(0, paid - debt),
    unscheduled: 0,
    paidPct: debt > 0 ? Math.min(100, Math.floor((paid * 100) / debt)) : 0,
    isProspect: false,
  };

  const discard = () => (created ? props.onDiscardOpenChange(true) : props.onLeave());
  const saveDisabled = !created || !isOnline;
  const saveButton = (
    <Button
      variant="primary"
      width={mobile ? 'full' : 'auto'}
      state={saveDisabled ? 'disabled' : 'normal'}
      onClick={() => setSummaryOpen(true)}
      {...(created && !isOnline ? { 'aria-describedby': noteId } : {})}
    >
      {t.save}
    </Button>
  );
  const needsConnection = created && !isOnline && (
    <span id={noteId} className={styles.needsConnection}>
      {copy.ui.empty.needsConnection}
    </span>
  );
  const discardButton = (
    <Button
      variant={mobile ? 'link' : 'secondary'}
      state={created && !isOnline ? 'disabled' : 'normal'}
      onClick={discard}
    >
      {t.discard}
    </Button>
  );

  const info = (
    <Island title={t.info.title} icon="person">
      <Field
        kind="phone"
        label={t.info.phone}
        placeholder={t.info.phonePlaceholder}
        value={props.phone}
        onChange={props.onPhoneChange}
      />
    </Island>
  );

  const bookList = (
    <Island title={t.books.title} icon="books">
      <SoldBookList
        books={books}
        copyHref={props.copyHref}
        onRemove={props.onRemoveBook}
        removeDisabled={!isOnline}
      />
      {props.onAddBook && (
        <AddBookButton
          onClick={props.onAddBook}
          disabledReason={!isOnline ? copy.ui.empty.needsConnection : null}
        />
      )}
      <p className={styles.total}>
        <span>{t.books.total}</span>
        <span className={styles.amount}>{formatCOP(debt)}</span>
      </p>
    </Island>
  );

  const payments = (
    <Island title={t.payments.title} icon="money">
      <div className={styles.downPayment}>
        <p className={styles.subheading}>{t.payments.downPayment}</p>
        <div className={styles.fields}>
          <Field
            kind="money"
            label={t.payments.value}
            placeholder="0"
            value={downPayment.amount}
            onChange={(amount) => props.onDownPaymentChange({ amount })}
          />
          <Field
            kind="date"
            label={t.payments.date}
            placeholder="dd/mm/aaaa"
            value={downPayment.paidOn}
            onChange={(paidOn) => paidOn && props.onDownPaymentChange({ paidOn })}
            error={props.downPaymentDateError}
          />
        </div>
        <ChoiceGroup
          legend={t.payments.method}
          value={downPayment.method}
          onValueChange={(method) => props.onDownPaymentChange({ method: method as PayMethod })}
        >
          {METHODS.map((method) => (
            <Choice
              key={method}
              kind="radio"
              value={method}
              label={copy.customers.detail.payments.method[method]}
            />
          ))}
        </ChoiceGroup>
      </div>
      <div className={styles.divider} />
      <PaymentPlanFields
        value={plan}
        onChange={props.onPlanChange}
        preview={preview}
        today={props.today}
        onChangeDate={props.onPlanDateChange}
      />
    </Island>
  );

  const items = preview.items ?? [];
  return (
    <div className={styles.screen} data-shape={mobile ? 'mobile' : 'desktop'}>
      {mobile ? (
        <header className={styles.mobileBar}>
          {discardButton}
          <h1 className={styles.mobileTitle}>{t.title}</h1>
          <span />
        </header>
      ) : (
        <header className={styles.bar}>
          <nav aria-label={copy.ui.detailWindow.breadcrumb} className={styles.breadcrumb}>
            <a href={props.backHref}>{copy.customers.list.title}</a>
            <span aria-hidden="true">/</span>
            <h1 className={styles.title}>{t.title}</h1>
          </nav>
          <span className={styles.actions}>
            {discardButton}
            <span className={styles.saveWrap}>
              {saveButton}
              {needsConnection}
            </span>
          </span>
        </header>
      )}
      {props.banner}
      {props.excess ? (
        <Banner tone="overdue">{copy.customers.detail.notices.excess(formatCOP(props.excess))}</Banner>
      ) : null}
      <div className={styles.top}>
        <Field
          label={t.name}
          placeholder={t.name}
          value={props.name}
          onChange={props.onNameChange}
          error={props.nameError}
        />
        <Island>
          <CustomerAccountSummary account={account} overdueSince={null} />
        </Island>
      </div>
      {mobile ? (
        <div className={styles.column}>
          {info}
          {bookList}
          {payments}
        </div>
      ) : (
        <div className={styles.columns}>
          <div className={styles.column}>
            {bookList}
            {payments}
          </div>
          <div className={styles.column}>{info}</div>
        </div>
      )}
      {mobile && (
        <div className={styles.mobileSave}>
          {saveButton}
          {needsConnection}
        </div>
      )}
      <ConfirmDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        title={t.summary.title}
        message={
          <dl className={styles.summary}>
            <div>
              <dt>{t.summary.books(books.length)}</dt>
              <dd>{formatCOP(debt)}</dd>
            </div>
            <div>
              <dt>{t.summary.downPayment}</dt>
              <dd>−{formatCOP(paid)}</dd>
            </div>
            <div>
              <dt>{t.summary.balance}</dt>
              <dd>{formatCOP(account.balance)}</dd>
            </div>
            {items.length > 0 && (
              <div>
                <dt>{t.summary.payments}</dt>
                <dd>{t.summary.paymentsValue(items.length, formatCOP(items[items.length - 1]!.amount))}</dd>
              </div>
            )}
          </dl>
        }
        confirmLabel={t.save}
        cancelLabel={t.keepEditing}
        onConfirm={props.onSave}
      />
      <DiscardDialog {...props} />
    </div>
  );
}

function DiscardDialog({
  discardOpen,
  onDiscardOpenChange,
  discardSummary,
  onDiscard,
}: NewCustomerScreenProps) {
  const d = t.discardDialog;
  if (discardSummary?.blockedByDeposit)
    return (
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={onDiscardOpenChange}
        title={d.title}
        message={d.blocked}
        confirmLabel={d.understood}
        cancelLabel={t.keepEditing}
        onConfirm={() => onDiscardOpenChange(false)}
      />
    );
  const hasItems = discardSummary && (discardSummary.books > 0 || discardSummary.payments > 0);
  return (
    <ConfirmDialog
      open={discardOpen}
      onOpenChange={onDiscardOpenChange}
      tone="danger"
      title={d.title}
      message={hasItems ? d.willRemove(discardSummary.books, discardSummary.payments) : d.message}
      confirmLabel={t.discard}
      cancelLabel={t.keepEditing}
      onConfirm={onDiscard}
    />
  );
}
