'use client';

import { useRef } from 'react';
import { copy } from '@/copy/es';
import type { LocalDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { Field } from '@/ui/atoms/Field';
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
  /** Por qué todavía no se puede (sin nombre o sin conexión). */
  disabledReason?: string | null;
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
  disabledReason,
}: InvoiceBlockProps) {
  const input = useRef<HTMLInputElement>(null);
  const disabled = !onCreate || Boolean(disabledReason);
  const picker = (
    <input
      ref={input}
      className={styles.input}
      type="file"
      accept="image/*"
      capture="environment"
      aria-label={t.photo}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void onCreate?.(file);
      }}
    />
  );

  return (
    <div className={styles.block}>
      {invoices.map((invoice, index) => (
        <div key={invoice.invoiceId} className={styles.invoice} aria-label={t.label(index + 1)} role="group">
          <InfoPhotoStrip
            photos={invoice.photos}
            onAdd={onAddPhoto ? (file) => onAddPhoto(invoice.invoiceId, file) : undefined}
            disabledReason={disabledReason}
          />
          <div className={styles.fields}>
            <Field
              label={t.number}
              placeholder="0000"
              value={invoice.number ?? ''}
              onChange={(number) => onChange?.(invoice.invoiceId, { number: number || null })}
            />
            <Field
              kind="date"
              label={t.date}
              placeholder="dd/mm/aaaa"
              value={invoice.date}
              onChange={(date) => onChange?.(invoice.invoiceId, { date })}
            />
          </div>
        </div>
      ))}
      {invoices.length === 0 ? (
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
          <p className={styles.hint}>{disabledReason ?? t.hint}</p>
        </>
      ) : (
        <Button
          variant="link"
          icon="add"
          state={disabled ? 'disabled' : 'normal'}
          onClick={() => input.current?.click()}
        >
          {t.another}
        </Button>
      )}
      {picker}
    </div>
  );
}
