'use client';

import { useRef, useState } from 'react';
import { copy } from '@/copy/es';
import type { LocalDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { Field } from '@/ui/atoms/Field';
import { DateField } from '@/ui/molecules/DateField';
import { Icon } from '@/ui/icons';
import type { CustomerInvoice } from '../../use-cases/customer-invoices';
import { InfoPhotoStrip } from '../InfoPhotoStrip';
import styles from './InvoiceBlock.module.css';

export type InvoiceBlockProps = {
  invoices: readonly CustomerInvoice[];
  /** Primera foto de una factura nueva: crea la factura con ella (HU-CLI-08 R1; su fecha es hoy). */
  onCreate?: (file: File) => Promise<void> | void;
  /** Otra foto de una factura que ya existe. */
  onAddPhoto?: (invoiceId: string, file: File) => Promise<void> | void;
  /** N.º o fecha de una factura (se guardan solos). */
  onChange?: (invoiceId: string, patch: { number?: string | null; date?: LocalDate | null }) => void;
  /** #68: cambiar o quitar una foto de una factura guardada (al quitar la última, la factura se borra, BR-CUS-17). */
  onReplacePhoto?: (invoiceId: string, photoId: string, file: File) => Promise<void> | void;
  onRemovePhoto?: (photoId: string) => Promise<void> | void;
  /** Por qué todavía no se puede (sin nombre o sin conexión). */
  disabledReason?: string | null;
  /** #99: trae la foto completa para verla en grande. */
  fullUrl?: (photoId: string) => Promise<string>;
};

const t = copy.customers.create.invoice;

/**
 * Factura en la ficha (lienzo CrearV5, isla «Factura», #32; HU-CLI-08): «Foto de la factura» crea la factura con su
 * primera foto; luego se escriben su N.º y su fecha (al crearla es la del día de la foto). «Agregar otra factura» abre
 * otra. Pieza del módulo.
 */
export function InvoiceBlock({
  invoices,
  onCreate,
  onAddPhoto,
  onChange,
  onReplacePhoto,
  onRemovePhoto,
  disabledReason,
  fullUrl,
}: InvoiceBlockProps) {
  const input = useRef<HTMLInputElement>(null);
  // #99: mientras se sube la primera foto de una factura nueva se ve «Subiendo la foto…» (antes no había señal).
  const [creating, setCreating] = useState(false);
  const disabled = !onCreate || Boolean(disabledReason) || creating;
  const picker = (
    <input
      ref={input}
      className={styles.input}
      type="file"
      accept="image/*"
      capture="environment"
      aria-label={t.photo}
      onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !onCreate) return;
        setCreating(true);
        try {
          await onCreate(file);
        } finally {
          setCreating(false);
        }
      }}
    />
  );

  return (
    <div className={styles.block}>
      {invoices.map((invoice, index) => (
        // #99: cada factura es una tarjeta: sus fotos arriba y el N.º y la fecha debajo.
        <section key={invoice.invoiceId} className={styles.invoice} aria-label={t.label(index + 1)}>
          {invoices.length > 1 && <span className={styles.invoiceTitle}>{t.label(index + 1)}</span>}
          <InfoPhotoStrip
            photos={invoice.photos}
            onAdd={onAddPhoto ? (file) => onAddPhoto(invoice.invoiceId, file) : undefined}
            onReplace={
              onReplacePhoto ? (photoId, file) => onReplacePhoto(invoice.invoiceId, photoId, file) : undefined
            }
            onRemove={onRemovePhoto}
            disabledReason={disabledReason}
            fullUrl={fullUrl}
          />
          <div className={styles.fields}>
            <Field
              label={t.number}
              placeholder="0000"
              value={invoice.number ?? ''}
              onChange={(number) => onChange?.(invoice.invoiceId, { number: number || null })}
            />
            <DateField
              label={t.date}
              placeholder="dd/mm/aaaa"
              value={invoice.date}
              onChange={(date) => onChange?.(invoice.invoiceId, { date })}
            />
          </div>
        </section>
      ))}
      {creating && (
        <p className={styles.uploading} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          {t.uploading}
        </p>
      )}
      {invoices.length === 0 && !creating ? (
        <>
          <button
            type="button"
            className={styles.add}
            disabled={disabled}
            title={disabledReason ?? undefined}
            onClick={() => input.current?.click()}
          >
            <Icon name="receipt" tone="current" />
            {t.photo}
          </button>
          {disabledReason && <p className={styles.hint}>{disabledReason}</p>}
        </>
      ) : (
        <div className={styles.another}>
          <Button
            variant="link"
            icon="add"
            state={disabled ? 'disabled' : 'normal'}
            onClick={() => input.current?.click()}
          >
            {t.another}
          </Button>
        </div>
      )}
      {picker}
    </div>
  );
}
