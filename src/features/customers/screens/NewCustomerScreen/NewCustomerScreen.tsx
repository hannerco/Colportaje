'use client';

import { useId, useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import type { CustomerDetail } from '@/domain/customer-detail';
import type { MapPoint } from '@/domain/customer-location';
import { formatCOP, type COP } from '@/domain/money';
import type { PayMethod } from '@/domain/payment';
import { scheduleTotals, type ScheduleDraftRow } from '@/domain/manual-schedule';
import type { LocalDate } from '@/domain/time';
import { PaymentSchedule } from '@/features/payments/components/PaymentSchedule';
import type { DiscardSummary } from '@/repositories';
import { Button } from '@/ui/atoms/Button';
import { Field } from '@/ui/atoms/Field';
import { DateField } from '@/ui/organisms/DateField';
import { Banner } from '@/ui/molecules/Banner';
import { SegmentedControl } from '@/ui/molecules/SegmentedControl';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { Island } from '@/ui/organisms/Island';
import { usePlatform } from '@/ui/platform';
import { CustomerAccountSummary } from '../../components/CustomerAccountSummary';
import { CustomerLocationBlock } from '../../components/CustomerLocationBlock';
import { EmojiAvatar } from '../../components/EmojiAvatar';
import { PhotoStrip } from '@/ui/organisms/PhotoStrip';
import { InvoiceBlock, type InvoiceBlockProps } from '../../components/InvoiceBlock';
import { AddBookButton, SoldBookList } from '../../components/SoldBookList';
import type { MapTiles } from '../../map-tiles';
import styles from './NewCustomerScreen.module.css';

export type DownPaymentValue = { amount: COP | null; method: PayMethod; paidOn: LocalDate };

export type NewCustomerScreenProps = {
  name: string;
  onNameChange: (name: string) => void;
  /** «Escribe el nombre» si se borró el de un cliente ya creado. */
  nameError?: string;
  /** Emoji del cliente (BR-CUS-15, #34); `null` = avatar de persona. */
  avatarEmoji: string | null;
  onAvatarChange?: (emoji: string | null) => void;
  /** Por qué aún no se puede elegir emoji (sin nombre o sin conexión). */
  avatarDisabledReason?: string | null;
  /** Isla «Factura» (#32, HU-CLI-08). */
  invoices: InvoiceBlockProps['invoices'];
  onCreateInvoice?: InvoiceBlockProps['onCreate'];
  onAddInvoicePhoto?: InvoiceBlockProps['onAddPhoto'];
  onInvoiceChange?: InvoiceBlockProps['onChange'];
  /** Cambiar o quitar una foto de factura antes de guardar (al quitar la última, la factura se va). */
  onReplaceInvoicePhoto?: InvoiceBlockProps['onReplacePhoto'];
  onRemoveInvoicePhoto?: InvoiceBlockProps['onRemovePhoto'];
  invoiceDisabledReason?: string | null;
  phone: string;
  onPhoneChange: (phone: string) => void;
  /** HU-PAN-CLI-06: dirección e información en texto (se guardan solas, como el teléfono). */
  address: string;
  onAddressChange: (address: string) => void;
  info: string;
  onInfoChange: (info: string) => void;
  /** La ubicación elegida en el mapa; `null` = sin ubicación. */
  location: MapPoint | null;
  /** «Abrir en Maps» (`mapsLinkFor`). */
  mapsLink: string | null;
  /** Teselas del mapa (SG-09). */
  tiles: MapTiles | null;
  /** «Elegir en mapa» y «Cambiar» abren el selector de ubicación. */
  onChooseLocation?: () => void;
  onRemoveLocation?: () => void;
  /** «Imágenes» del cliente (HU-CLI-07). */
  photos: readonly { photoId: string; thumbUrl: string }[];
  onAddPhoto?: (file: File) => Promise<void> | void;
  /** Cambiar o quitar una imagen antes de guardar. */
  onReplacePhoto?: (photoId: string, file: File) => Promise<void> | void;
  onRemovePhoto?: (photoId: string) => Promise<void> | void;
  /** Por qué aún no se puede agregar una imagen (sin nombre o sin conexión). */
  photoDisabledReason?: string | null;
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
  /**
   * Abonos a mano (ronda 38, ADR-0052): los que el colportor arma, por fecha. Sin plan automático; nada bloquea y el
   * totalizador dice si programó de más o de menos.
   */
  schedule: readonly ScheduleDraftRow[];
  /** El abono recién agregado (su valor se resalta). */
  focusPaymentId?: string | null;
  onAddPayment: () => void;
  onPaymentDateChange: (id: string, date: LocalDate) => void;
  onPaymentAmountChange: (id: string, amount: COP) => void;
  onRemovePayment: (id: string) => void;
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
  const { created, isOnline, books, debt, downPayment, schedule } = props;
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
    <Island title={t.info.title} icon="person" divided complete={props.phone.trim() !== ''}>
      <Field
        kind="phone"
        label={t.info.phone}
        placeholder={t.info.phonePlaceholder}
        value={props.phone}
        onChange={props.onPhoneChange}
      />
      <Field
        label={t.info.address}
        placeholder={t.info.addressPlaceholder}
        value={props.address}
        onChange={props.onAddressChange}
      />
      <CustomerLocationBlock
        location={props.location}
        mapsLink={props.mapsLink}
        tiles={props.tiles}
        isOnline={isOnline}
        onChoose={props.onChooseLocation}
        onRemove={props.onRemoveLocation}
      />
      <Field
        kind="textarea"
        label={t.info.info}
        placeholder={t.info.infoPlaceholder}
        value={props.info}
        onChange={props.onInfoChange}
      />
      <div className={styles.images}>
        <p className={styles.imagesLabel}>{t.info.images}</p>
        <PhotoStrip
          photos={props.photos}
          addLabel={copy.customers.photos.add}
          onAdd={props.onAddPhoto}
          onReplace={props.onReplacePhoto}
          onRemove={props.onRemovePhoto}
          disabledReason={props.photoDisabledReason}
        />
      </div>
    </Island>
  );

  const bookList = (
    <Island title={t.books.title} icon="books" divided complete={books.length > 0}>
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

  const invoice = (
    <Island title={t.invoice.title} icon="receipt" divided complete={props.invoices.length > 0}>
      <InvoiceBlock
        invoices={props.invoices}
        onCreate={props.onCreateInvoice}
        onAddPhoto={props.onAddInvoicePhoto}
        onChange={props.onInvoiceChange}
        onReplacePhoto={props.onReplaceInvoicePhoto}
        onRemovePhoto={props.onRemoveInvoicePhoto}
        disabledReason={props.invoiceDisabledReason}
      />
    </Island>
  );

  // #33 / ronda 38: completa cuando la cuota inicial cubre la deuda o los abonos suman justo el saldo.
  const totals = scheduleTotals(
    account.balance,
    schedule.map((row) => row.amount),
  );
  const paymentsComplete = debt > 0 && (paid >= debt || totals.state === 'exact');
  const payments = (
    <Island title={t.payments.title} icon="money" divided complete={paymentsComplete}>
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
          <SegmentedControl
            label={t.payments.method}
            options={METHODS.map((method) => ({
              value: method,
              label: copy.customers.detail.payments.method[method],
            }))}
            value={downPayment.method}
            onValueChange={(method) => props.onDownPaymentChange({ method: method as PayMethod })}
          />
        </div>
        <div className={styles.fields}>
          <DateField
            noFuture
            today={props.today}
            label={t.payments.date}
            placeholder="dd/mm/aaaa"
            value={downPayment.paidOn}
            onChange={(paidOn) => paidOn && props.onDownPaymentChange({ paidOn })}
            error={props.downPaymentDateError}
          />
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.scheduleHead}>
        <p className={styles.subheading}>{copy.payments.manual.heading}</p>
        <span className={styles.byDate}>{copy.payments.manual.byDate}</span>
      </div>
      <PaymentSchedule
        mode="create"
        rows={schedule.map((row) => ({ type: 'scheduled', ...row }))}
        pending={account.balance}
        today={props.today}
        focusId={props.focusPaymentId}
        onAdd={props.onAddPayment}
        onChangeDate={(id, date) => props.onPaymentDateChange(id, date)}
        onChangeAmount={props.onPaymentAmountChange}
        onRemove={props.onRemovePayment}
      />
    </Island>
  );

  const items = schedule.filter((row) => row.dueDate !== null && row.amount > 0);
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
        <div className={styles.identity}>
          <EmojiAvatar
            emoji={props.avatarEmoji}
            onChange={props.onAvatarChange}
            disabledReason={props.avatarDisabledReason}
            backHref={props.backHref}
          />
          <div className={styles.identityName}>
            <Field
              label={t.name}
              placeholder={t.name}
              value={props.name}
              onChange={props.onNameChange}
              error={props.nameError}
            />
          </div>
        </div>
        <Island>
          <CustomerAccountSummary account={account} overdueSince={null} />
        </Island>
      </div>
      {mobile ? (
        <div className={styles.column}>
          {info}
          {bookList}
          {invoice}
          {payments}
        </div>
      ) : (
        <div className={styles.columns}>
          <div className={styles.column}>
            {bookList}
            {invoice}
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
                <dd>
                  {t.summary.paymentsValue(
                    items.length,
                    formatCOP(items.reduce((sum, row) => sum + row.amount, 0)),
                  )}
                </dd>
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
      confirmLabel={d.leave}
      cancelLabel={t.keepEditing}
      onConfirm={onDiscard}
    />
  );
}
