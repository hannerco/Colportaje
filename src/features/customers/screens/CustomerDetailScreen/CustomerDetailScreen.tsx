'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import type { ArchivePreview } from '@/domain/customer-archive';
import type { PaymentRow } from '@/domain/customer-detail';
import { formatCOP } from '@/domain/money';
import { formatDate, todayBogota, type LocalDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { StatusPill, type PillStatus } from '@/ui/atoms/StatusPill';
import { Icon } from '@/ui/icons';
import type { BannerProps } from '@/ui/molecules/Banner';
import { DataList, DataRow } from '@/ui/molecules/DataRow';
import { Menu } from '@/ui/molecules/Menu';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { PhotoStrip } from '@/ui/organisms/PhotoStrip';
import { DetailWindow, type DetailWindowProps } from '@/ui/organisms/DetailWindow';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { DetailSkeleton, DetailTemplate } from '@/ui/templates/DetailTemplate';
import { sortByDueDate, type ScheduleDraftRow } from '@/domain/manual-schedule';
import {
  PaymentSchedule,
  type PaymentScheduleProps,
  type ScheduleListRow,
} from '@/features/payments/components/PaymentSchedule';
import { CustomerAccountSummary } from '../../components/CustomerAccountSummary';
import { CustomerLocationBlock } from '../../components/CustomerLocationBlock';
import { EmojiAvatar } from '../../components/EmojiAvatar';
import { EditCustomerDialog } from '../../components/EditCustomerDialog';
import { InvoiceBlock, type InvoiceBlockProps } from '../../components/InvoiceBlock';
import { PendingPhotosNote, type PendingPhotosNoteProps } from '../../components/PendingPhotosNote';
import { ReturnBookDialog, type ReturnReason } from '../../components/ReturnBookDialog';
import type { CustomerPatch } from '@/domain/customer-data';
import { AddBookButton, SoldBookList } from '../../components/SoldBookList';
import type { MapTiles } from '../../map-tiles';
import type { CustomerDetailView } from '../../use-cases/customer-detail';
import styles from './CustomerDetailScreen.module.css';

export type CustomerDetailScreenProps = {
  /** `useCustomerDetail(id).data`; sin valor mientras carga o si falló. */
  detail?: CustomerDetailView;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Título de la ventana mientras carga (el nombre de la fila de la lista). */
  fallbackTitle?: string;
  /** R3: sin conexión, Archivar y Restaurar se ven deshabilitados. */
  isOnline: boolean;
  /** La Ventana de detalle: forma (R1: la recordada), cerrar, anterior / siguiente y ruta de vuelta. */
  window: Pick<DetailWindowProps, 'mode' | 'onModeChange' | 'onClose' | 'onPrev' | 'onNext' | 'breadcrumb'>;
  /** Ruta del detalle de un ejemplar (los libros enlazan a él). */
  copyHref: (copyId: string) => string;
  /** Lo que pasará al archivar (`useArchivePreview`); se pide al abrir el diálogo. */
  archivePreview?: ArchivePreview;
  onOpenArchive: () => void;
  /** Archiva; el diálogo se cierra al terminar. */
  onArchive: () => Promise<void>;
  onRestore: () => Promise<void>;
  /** «Agregar libro del inventario» (HU-PAN-CLI-04); un archivado no puede (CA-3, I-15). Sin función no hay botón. */
  onAddBook?: () => void;
  /** Hoy (calendarios y avisos de fecha). */
  today?: LocalDate;
  /** «Cobrar» en un abono por cobrar (#35; diseño de la ficha): abre el formulario de cobro. */
  onCollect?: (paymentId: string) => void;
  /** Tocar un abono lleva a su detalle (Dinero ▸ abono). */
  paymentHref?: (paymentId: string) => string;
  /**
   * Abonos a mano (ronda 38, lienzo «Propuestas · 11»): «+ Agregar abono» en el encabezado, cambiar la fecha (corregir
   * o aplazar) o el valor, eliminar (pasa a Cancelados) y «Revisar» si lo programado pasa del saldo. Los abonos
   * recién agregados viven en el teléfono (`drafts`) hasta tener fecha y valor. Sin esto, la lista solo se ve.
   */
  schedule?: {
    readonly drafts: readonly ScheduleDraftRow[];
    readonly focusId?: string | null;
    readonly onAdd: () => void;
    readonly onChangeDate: PaymentScheduleProps['onChangeDate'];
    readonly onChangeAmount: PaymentScheduleProps['onChangeAmount'];
    readonly onRemove: PaymentScheduleProps['onRemove'];
    readonly onReview?: () => void;
  };
  /** Elegir o quitar el emoji del cliente tocando su avatar (BR-CUS-15, #34). */
  onAvatarChange?: (emoji: string | null) => void;
  /** Corregir la fecha de venta de un libro (#56). Si falla, que lance. */
  onChangeSoldOn?: (copyId: string, soldOn: LocalDate) => Promise<void>;
  /**
   * Quitar un libro (BR-COPY-09, HU-CLI-10): el «×» del libro pregunta el motivo. Si falla, que lance (el diálogo sigue
   * abierto). Sin función, o con el cliente archivado, no hay «×».
   */
  onReturnBook?: (copyId: string, reason: ReturnReason) => Promise<void>;
  /** HU-PAN-CLI-06: teselas del mapa (SG-09). */
  tiles?: MapTiles | null;
  /** «Elegir en mapa» y «Cambiar» abren el selector. Sin función (archivado) no hay botones de ubicación. */
  onChooseLocation?: () => void;
  onRemoveLocation?: () => void;
  /** «Agregar imagen» (HU-CLI-07). Sin función no hay botón. */
  onAddPhoto?: (file: File) => Promise<void> | void;
  /** Cambiar o quitar una imagen desde el visor (revisión 2026-11-24: como en las facturas). */
  onReplacePhoto?: (photoId: string, file: File) => Promise<void> | void;
  onRemovePhoto?: (photoId: string) => Promise<void> | void;
  /** #99: trae la foto completa (imágenes y facturas) para verla en grande. */
  photoUrl?: (photoId: string) => Promise<string>;
  /**
   * #61: agregar o completar la factura de un cliente ya guardado (la misma isla «Factura» de Nuevo cliente). Sin
   * funciones (archivado), las facturas solo se ven.
   */
  invoiceActions?: Pick<
    InvoiceBlockProps,
    'onCreate' | 'onAddPhoto' | 'onChange' | 'onReplacePhoto' | 'onRemovePhoto'
  >;
  /** #69: «Editar» en Datos (nombre, teléfono, dirección e información). Si falla, que lance. Sin función, no hay. */
  onEditData?: (patch: CustomerPatch) => Promise<void>;
  /** ADR-0054: fotos de este cliente que este teléfono aún no sube. Sin nada pendiente, no se ve. */
  pendingPhotos?: PendingPhotosNoteProps;
};

const t = copy.customers.detail;

/** Estado de un abono en su Pastilla: un por cobrar con la fecha pasada es «Vencido». */
const pillOf = (payment: PaymentRow): PillStatus =>
  payment.status === 'scheduled' && payment.isOverdue ? 'overdue' : payment.status;

const isPaid = (payment: PaymentRow) => payment.status === 'collected' || payment.status === 'delivered';

/** I-24: la fecha real si está cobrado; la acordada si no. */
const dateOf = (payment: PaymentRow): LocalDate | null =>
  isPaid(payment) ? (payment.paidAt ?? payment.dueDate) : payment.dueDate;

const amountOf = (payment: PaymentRow) => (isPaid(payment) ? payment.paidAmount : payment.agreedAmount) ?? 0;

const noop = () => {};

/**
 * Las filas de «Abonos» (ronda 38): primero los pagados (cobrados y entregados, solo se ven), luego los por cobrar y
 * los recién agregados, por fecha. «Abono N de M» cuenta todos (lienzo «Propuestas · 11»).
 */
const scheduleRowsOf = (
  payments: readonly PaymentRow[],
  drafts: readonly ScheduleDraftRow[],
): ScheduleListRow[] => {
  const paid: ScheduleListRow[] = payments
    .filter(isPaid)
    .map((p) => ({
      type: 'paid' as const,
      id: p.paymentId,
      date: dateOf(p),
      amount: amountOf(p),
      status: p.status as 'collected' | 'delivered',
      method: p.method,
      kindLabel: t.payments.kind[p.kind] || undefined,
    }))
    .sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
  const pending = sortByDueDate<ScheduleListRow & { type: 'scheduled' }>([
    ...payments
      .filter((p) => p.status === 'scheduled')
      .map((p) => ({
        type: 'scheduled' as const,
        id: p.paymentId,
        dueDate: p.dueDate,
        amount: p.agreedAmount ?? 0,
        rescheduledFrom: p.originalDueDate,
      })),
    ...drafts.map((d) => ({ type: 'scheduled' as const, ...d, draft: true })),
  ]);
  return [...paid, ...pending];
};

/** El abono vencido más antiguo (para «Abono vencido desde el …»). */
const overdueSinceOf = (payments: readonly PaymentRow[]): LocalDate | null =>
  payments
    .filter((p) => p.status === 'scheduled' && p.isOverdue && p.dueDate)
    .map((p) => p.dueDate!)
    .sort()[0] ?? null;

/** La franja de arriba (`notices` de la ficha): archivado, sobrante programado o prospecto. */
const bannerOf = (detail: CustomerDetailView): BannerProps | undefined => {
  if (detail.archived) return { tone: 'neutral', children: t.notices.archived };
  if (detail.notices.noBook) return { tone: 'neutral', children: t.notices.noBook };
  return undefined;
};

/**
 * Ficha de cliente (HU-PAN-CLI-02): identidad con «Llamar» y «WhatsApp» y la cuenta, libros, abonos (con
 * «Cancelados» plegable) y datos, sobre la Plantilla de detalle. Más acciones: Archivar o Restaurar. Pantalla de
 * presentación: los datos y las acciones llegan por props.
 */
export function CustomerDetailScreen({
  detail,
  loading = false,
  error = false,
  onRetry,
  fallbackTitle = '',
  isOnline,
  window,
  copyHref,
  archivePreview,
  onOpenArchive,
  onArchive,
  onRestore,
  onAddBook,
  today,
  tiles = null,
  onChooseLocation,
  onRemoveLocation,
  onAddPhoto,
  onReplacePhoto,
  onRemovePhoto,
  invoiceActions,
  onEditData,
  pendingPhotos,
  onReturnBook,
  onCollect,
  paymentHref,
  schedule,
  onAvatarChange,
  onChangeSoldOn,
  photoUrl,
}: CustomerDetailScreenProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [canceledOpen, setCanceledOpen] = useState(false);
  const [returning, setReturning] = useState<string | null>(null);

  if (!detail)
    return (
      <DetailWindow {...window} rememberAs="customer" title={fallbackTitle}>
        {error && !loading ? (
          <EmptyState
            kind="error"
            title={copy.customers.list.error.title}
            text={copy.customers.list.error.text}
            action={onRetry ? { label: copy.errors.retry, onClick: onRetry } : undefined}
          />
        ) : (
          <DetailSkeleton
            figure
            actions={2}
            islands={[{ rows: 2, row: 'cover' }, { rows: 4, row: 'payment' }, { rows: 3 }]}
          />
        )}
      </DetailWindow>
    );

  const moreActions = (
    <Menu
      trigger={
        <Button variant="tertiary" iconOnly icon="more">
          {t.moreActions}
        </Button>
      }
      title={t.moreActions}
      items={
        detail.archived
          ? [{ id: 'restore', label: t.archive.restore, icon: 'undo', disabled: !isOnline }]
          : [{ id: 'archive', label: t.archive.action, icon: 'delete', danger: true, disabled: !isOnline }]
      }
      onSelect={(id) => {
        if (id === 'restore') void onRestore();
        if (id === 'archive') {
          onOpenArchive();
          setArchiveOpen(true);
        }
      }}
    />
  );
  const returningBook = detail.books.find((book) => book.copyId === returning);

  return (
    <>
      <DetailTemplate
        window={{ ...window, rememberAs: 'customer', title: detail.name, moreActions }}
        banner={bannerOf(detail)}
        identity={{
          avatar: detail.avatarEmoji ? { kind: 'emoji', emoji: detail.avatarEmoji } : { kind: 'person' },
          avatarSlot: onAvatarChange ? (
            <EmojiAvatar
              emoji={detail.avatarEmoji}
              onChange={onAvatarChange}
              disabledReason={
                detail.archived ? t.archivedNoEdit : !isOnline ? copy.ui.empty.needsConnection : null
              }
              backHref={window.breadcrumb.href}
            />
          ) : undefined,
          title: detail.name,
          status: detail.account.standing ?? undefined,
          // R2: los enlaces de contacto solo con teléfono (I-22).
          subtitle: detail.contact ? (
            <span className={styles.contact}>
              <a className={styles.contactLink} href={detail.contact.telLink}>
                <Icon name="call" size={18} tone="current" />
                {t.call}
              </a>
              <a
                className={styles.contactLink}
                href={detail.contact.whatsappLink}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="whatsapp" size={18} tone="current" />
                {t.whatsapp}
              </a>
            </span>
          ) : undefined,
          details: (
            <CustomerAccountSummary account={detail.account} overdueSince={overdueSinceOf(detail.payments)} />
          ),
          ...(detail.archived
            ? {
                primaryAction: {
                  label: t.archive.restore,
                  icon: 'undo' as const,
                  onClick: () => void onRestore(),
                  disabled: !isOnline,
                },
              }
            : {}),
        }}
      >
        {/* Prospecto sin libros: la isla se ve igual, para poder agregarle uno (HU-PAN-CLI-04). */}
        {(detail.books.length > 0 || onAddBook) && (
          <Island title={t.books.title} icon="books">
            <SoldBookList
              books={detail.books}
              copyHref={copyHref}
              {...(onChangeSoldOn && today && isOnline && !detail.archived ? { onChangeSoldOn, today } : {})}
              {...(onReturnBook && !detail.archived
                ? { onRemove: setReturning, removeDisabled: !isOnline }
                : {})}
            />
            {onAddBook && (
              <AddBookButton
                disabledReason={
                  detail.archived
                    ? copy.customers.addBook.archived
                    : !isOnline
                      ? copy.ui.empty.needsConnection
                      : null
                }
                onClick={onAddBook}
              />
            )}
          </Island>
        )}
        <Island
          title={t.payments.title}
          icon="money"
          divided
          action={
            schedule && !detail.archived && isOnline
              ? { label: `+ ${copy.payments.manual.add}`, onClick: schedule.onAdd }
              : undefined
          }
        >
          <PaymentSchedule
            mode="saved"
            rows={scheduleRowsOf(detail.payments, schedule?.drafts ?? [])}
            pending={detail.account.remaining}
            today={today ?? todayBogota({ now: () => new Date() })}
            disabled={!schedule || detail.archived || !isOnline}
            focusId={schedule?.focusId}
            onChangeDate={schedule?.onChangeDate ?? noop}
            onChangeAmount={schedule?.onChangeAmount ?? noop}
            onRemove={schedule?.onRemove ?? noop}
            onCollect={!detail.archived && isOnline ? onCollect : undefined}
            onReview={!detail.archived && isOnline ? schedule?.onReview : undefined}
            rowHref={paymentHref}
            afterList={
              detail.canceledPayments.length > 0 && (
                <>
                  <button
                    type="button"
                    className={styles.toggle}
                    aria-expanded={canceledOpen}
                    onClick={() => setCanceledOpen((open) => !open)}
                  >
                    <Icon name={canceledOpen ? 'expand' : 'next'} size={16} tone="current" />
                    {t.payments.canceled(detail.canceledPayments.length)}
                  </button>
                  {canceledOpen && <PaymentList payments={detail.canceledPayments} />}
                </>
              )
            }
          />
        </Island>
        <Island
          title={t.data.title}
          icon="person"
          action={
            onEditData && !detail.archived
              ? { label: copy.customers.edit.action, onClick: () => setEditing(true) }
              : undefined
          }
        >
          {(detail.contact || detail.address) && (
            <DataList>
              {detail.contact && (
                <DataRow label={t.data.phone} value={detail.contact.phone} divider={false} />
              )}
              {detail.address && (
                <DataRow
                  label={t.data.address}
                  divider={Boolean(detail.contact)}
                  value={
                    <span className={styles.address}>
                      {detail.address}
                      {/* Con ubicación, «Abrir en Maps» va debajo del mapa. */}
                      {detail.mapsLink && !detail.location && (
                        <a
                          className={styles.mapsLink}
                          href={detail.mapsLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Icon name="location" size={16} tone="current" />
                          {t.data.openMaps}
                        </a>
                      )}
                    </span>
                  }
                />
              )}
            </DataList>
          )}
          {/* HU-PAN-CLI-06: mapa, «Abrir en Maps», «Cambiar» y «Quitar»; sin ubicación, «Elegir en mapa». */}
          <CustomerLocationBlock
            location={
              detail.location ? { lat: detail.location.latitude, lng: detail.location.longitude } : null
            }
            mapsLink={detail.mapsLink}
            tiles={tiles}
            isOnline={isOnline}
            onChoose={detail.archived ? undefined : onChooseLocation}
            onRemove={detail.archived ? undefined : onRemoveLocation}
          />
          <DataList>
            {detail.info && <DataRow label={t.data.info} value={detail.info} divider={false} />}
            {(detail.infoPhotos.length > 0 || (onAddPhoto && !detail.archived)) && (
              <DataRow
                label={t.data.images}
                divider={Boolean(detail.info)}
                value={
                  <PhotoStrip
                    photos={detail.infoPhotos}
                    addLabel={copy.customers.photos.add}
                    onAdd={detail.archived ? undefined : onAddPhoto}
                    onReplace={detail.archived ? undefined : onReplacePhoto}
                    onRemove={detail.archived ? undefined : onRemovePhoto}
                    disabledReason={isOnline ? null : copy.ui.empty.needsConnection}
                    fullUrl={photoUrl}
                  />
                }
              />
            )}
            {pendingPhotos && (pendingPhotos.pending > 0 || pendingPhotos.failed > 0) && (
              <DataRow
                label={copy.customers.pendingPhotos.label}
                layout="stacked"
                divider={Boolean(detail.info || detail.infoPhotos.length || (onAddPhoto && !detail.archived))}
                value={<PendingPhotosNote {...pendingPhotos} />}
              />
            )}
            {invoiceActions && !detail.archived ? (
              <DataRow
                label={t.data.invoice}
                layout="stacked"
                value={
                  <InvoiceBlock
                    invoices={detail.invoices}
                    {...invoiceActions}
                    disabledReason={isOnline ? null : copy.ui.empty.needsConnection}
                    fullUrl={photoUrl}
                  />
                }
              />
            ) : (
              detail.invoices.map((invoice) => (
                <DataRow
                  key={invoice.invoiceId}
                  label={t.data.invoice}
                  value={
                    <span className={styles.invoice}>
                      <span>
                        {[invoice.number, invoice.date && formatDate(invoice.date)]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {invoice.photos.length > 0 && (
                        <PhotoStrip
                          photos={invoice.photos}
                          photoLabel={(n) =>
                            t.data.invoicePhoto(invoice.date ? formatDate(invoice.date) : '', n)
                          }
                          fullUrl={photoUrl}
                        />
                      )}
                    </span>
                  }
                />
              ))
            )}
            <DataRow
              label={t.data.since}
              value={formatDate(detail.customerSince)}
              divider={Boolean(
                detail.info ||
                detail.infoPhotos.length ||
                (onAddPhoto && !detail.archived) ||
                (invoiceActions && !detail.archived) ||
                detail.invoices.length,
              )}
            />
          </DataList>
        </Island>
      </DetailTemplate>
      {onReturnBook && returningBook && (
        <ReturnBookDialog
          open
          onOpenChange={(open) => !open && setReturning(null)}
          bookName={copy.inventory.detail.title(returningBook.titleName, returningBook.number)}
          customerName={detail.name}
          onConfirm={(reason) => onReturnBook(returningBook.copyId, reason)}
        />
      )}
      {onEditData && (
        <EditCustomerDialog
          open={editing}
          onOpenChange={setEditing}
          initial={{
            name: detail.name,
            phone: detail.contact?.phone ?? '',
            address: detail.address ?? '',
            info: detail.info ?? '',
          }}
          onSave={onEditData}
        />
      )}
      <ArchiveDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        preview={archivePreview}
        onArchive={onArchive}
      />
    </>
  );
}

/** Los abonos cancelados (plegables bajo la lista): solo se ven. */
function PaymentList({ payments }: { payments: readonly PaymentRow[] }) {
  return (
    <ul className={`${styles.list} ${styles.paymentList}`}>
      {payments.map((payment) => {
        const date = dateOf(payment);
        const kind = t.payments.kind[payment.kind];
        return (
          <li key={payment.paymentId} className={styles.payment}>
            <span className={styles.paymentWhen}>
              <span className={styles.date}>{date ? formatDate(date) : '—'}</span>
              {kind && <span className={styles.secondary}>{kind}</span>}
            </span>
            <span className={styles.paymentState}>
              <StatusPill status={pillOf(payment)} />
            </span>
            <span className={styles.paymentSide}>
              <span className={styles.amountBlock}>
                <span className={styles.amount}>{formatCOP(amountOf(payment))}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ArchiveDialog({
  open,
  onOpenChange,
  preview,
  onArchive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview?: ArchivePreview;
  onArchive: () => Promise<void>;
}) {
  const a = t.archive;
  // HU-CLI-11 R1: con libros vendidos no se archiva; el diálogo lo explica y solo se cierra.
  if (preview && !preview.canArchive)
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title={a.hasBooksTitle}
        message={a.hasBooks(preview.soldCount)}
        confirmLabel={a.understood}
        cancelLabel={a.cancelLabel}
        onConfirm={() => onOpenChange(false)}
      />
    );
  const count = preview?.scheduledToCancel.length ?? 0;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      title={a.title}
      message={preview ? a.message(count) : copy.ui.empty.loading}
      confirmLabel={a.action}
      cancelLabel={a.cancelLabel}
      onConfirm={preview ? onArchive : () => undefined}
    >
      {count > 0 && (
        <ul className={styles.toCancel}>
          {preview!.scheduledToCancel.map((payment) => (
            <li key={payment.paymentId}>
              <span>{formatDate(payment.dueDate)}</span>
              <span className={styles.amount}>{formatCOP(payment.agreedAmount)}</span>
            </li>
          ))}
        </ul>
      )}
    </ConfirmDialog>
  );
}
