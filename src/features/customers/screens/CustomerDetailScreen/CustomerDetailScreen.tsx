'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import type { ArchivePreview } from '@/domain/customer-archive';
import type { PaymentRow } from '@/domain/customer-detail';
import { formatCOP } from '@/domain/money';
import { formatDate, type LocalDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { StatusPill, type PillStatus } from '@/ui/atoms/StatusPill';
import { Icon } from '@/ui/icons';
import type { BannerProps } from '@/ui/molecules/Banner';
import { DataList, DataRow } from '@/ui/molecules/DataRow';
import { Menu } from '@/ui/molecules/Menu';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { DetailWindow, type DetailWindowProps } from '@/ui/organisms/DetailWindow';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { DetailTemplate } from '@/ui/templates/DetailTemplate';
import { CustomerAccountSummary } from '../../components/CustomerAccountSummary';
import { AddBookButton, SoldBookList } from '../../components/SoldBookList';
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

/** El abono vencido más antiguo (para «Abono vencido desde el …»). */
const overdueSinceOf = (payments: readonly PaymentRow[]): LocalDate | null =>
  payments
    .filter((p) => p.status === 'scheduled' && p.isOverdue && p.dueDate)
    .map((p) => p.dueDate!)
    .sort()[0] ?? null;

/** La franja de arriba (`notices` de la ficha): archivado, sobrante programado o prospecto. */
const bannerOf = (detail: CustomerDetailView): BannerProps | undefined => {
  if (detail.archived) return { tone: 'neutral', children: t.notices.archived };
  if (detail.notices.excess)
    return { tone: 'overdue', children: t.notices.excess(formatCOP(detail.notices.excess.amount)) };
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
}: CustomerDetailScreenProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [canceledOpen, setCanceledOpen] = useState(false);

  if (!detail)
    return (
      <DetailWindow {...window} title={fallbackTitle}>
        {error && !loading ? (
          <EmptyState
            kind="error"
            title={copy.customers.list.error.title}
            text={copy.customers.list.error.text}
            action={onRetry ? { label: copy.errors.retry, onClick: onRetry } : undefined}
          />
        ) : (
          <EmptyState kind="loading" rows={6} />
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

  return (
    <>
      <DetailTemplate
        window={{ ...window, title: detail.name, moreActions }}
        banner={bannerOf(detail)}
        identity={{
          avatar: detail.avatarEmoji ? { kind: 'emoji', emoji: detail.avatarEmoji } : { kind: 'person' },
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
            <SoldBookList books={detail.books} copyHref={copyHref} />
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
        <Island title={t.payments.title} icon="money">
          {detail.payments.length === 0 ? (
            <p className={styles.empty}>{t.payments.empty}</p>
          ) : (
            <PaymentList payments={detail.payments} />
          )}
          {detail.canceledPayments.length > 0 && (
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
          )}
        </Island>
        <Island title={t.data.title} icon="person">
          <DataList>
            {detail.contact && <DataRow label={t.data.phone} value={detail.contact.phone} divider={false} />}
            {detail.address && (
              <DataRow
                label={t.data.address}
                value={
                  <span className={styles.address}>
                    {detail.address}
                    {detail.mapsLink && (
                      <a className={styles.mapsLink} href={detail.mapsLink} target="_blank" rel="noreferrer">
                        <Icon name="location" size={16} tone="current" />
                        {t.data.openMaps}
                      </a>
                    )}
                  </span>
                }
              />
            )}
            {detail.info && <DataRow label={t.data.info} value={detail.info} />}
            {detail.infoPhotos.length > 0 && (
              <DataRow
                label={t.data.images}
                value={
                  <span className={styles.photos}>
                    {detail.infoPhotos.map((photo, i) => (
                      // eslint-disable-next-line @next/next/no-img-element -- miniatura firmada de Storage, ya en WebP.
                      <img
                        key={photo.photoId}
                        className={styles.photo}
                        src={photo.thumbUrl}
                        alt={t.data.image(i + 1)}
                      />
                    ))}
                  </span>
                }
              />
            )}
            {detail.invoices.map((invoice) => (
              <DataRow
                key={invoice.invoiceId}
                label={t.data.invoice}
                value={
                  <span className={styles.invoice}>
                    <span>
                      {[invoice.number, invoice.date && formatDate(invoice.date)].filter(Boolean).join(' · ')}
                    </span>
                    {invoice.photos.length > 0 && (
                      <span className={styles.photos}>
                        {invoice.photos.map((photo, i) => (
                          // eslint-disable-next-line @next/next/no-img-element -- miniatura firmada de Storage.
                          <img
                            key={photo.photoId}
                            className={styles.photo}
                            src={photo.thumbUrl}
                            alt={t.data.invoicePhoto(invoice.date ? formatDate(invoice.date) : '', i + 1)}
                          />
                        ))}
                      </span>
                    )}
                  </span>
                }
              />
            ))}
            <DataRow
              label={t.data.since}
              value={formatDate(detail.customerSince)}
              divider={Boolean(
                detail.contact ||
                detail.address ||
                detail.info ||
                detail.infoPhotos.length ||
                detail.invoices.length,
              )}
            />
          </DataList>
        </Island>
      </DetailTemplate>
      <ArchiveDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        preview={archivePreview}
        onArchive={onArchive}
      />
    </>
  );
}

function PaymentList({ payments }: { payments: readonly PaymentRow[] }) {
  return (
    <ul className={styles.list}>
      {payments.map((payment) => {
        const date = dateOf(payment);
        const overdue = payment.status === 'scheduled' && payment.isOverdue;
        const kind = t.payments.kind[payment.kind];
        return (
          <li key={payment.paymentId} className={styles.payment}>
            <span className={styles.paymentMain}>
              <span className={overdue ? styles.overdueDate : styles.date}>
                {date ? formatDate(date) : '—'}
              </span>
              {payment.originalDueDate && (
                <s className={styles.muted}>{t.payments.before(formatDate(payment.originalDueDate))}</s>
              )}
              {overdue && (
                <span className={styles.overdueAgo}>{t.payments.overdueAgo(payment.overdueDays)}</span>
              )}
              {kind && <span className={styles.secondary}>{kind}</span>}
              <StatusPill status={pillOf(payment)} />
            </span>
            <span className={styles.paymentSide}>
              <span className={styles.amount}>{formatCOP(amountOf(payment))}</span>
              {isPaid(payment) && payment.method && (
                <span className={styles.secondary}>{t.payments.method[payment.method]}</span>
              )}
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
