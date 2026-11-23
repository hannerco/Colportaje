'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import type { CustomerPatch } from '@/domain/customer-data';
import { Field } from '@/ui/atoms/Field';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import styles from './EditCustomerDialog.module.css';

export type EditCustomerValues = { name: string; phone: string; address: string; info: string };

export type EditCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lo que tiene hoy el cliente (los campos empiezan con esto cada vez que se abre). */
  initial: EditCustomerValues;
  /** Guarda solo lo que cambió; si falla, que lance para que el diálogo siga abierto (el contenedor ya avisó). */
  onSave: (patch: CustomerPatch) => Promise<void>;
};

const t = copy.customers.edit;

/** Lo que cambió, listo para guardar: texto vacío = sin dato (`null`); el nombre, sin espacios a los lados. */
export function customerPatchOf(initial: EditCustomerValues, values: EditCustomerValues): CustomerPatch {
  const patch: { -readonly [K in keyof CustomerPatch]: CustomerPatch[K] } = {};
  if (values.name.trim() !== initial.name.trim()) patch.name = values.name.trim();
  for (const key of ['phone', 'address', 'info'] as const)
    if (values[key].trim() !== initial[key].trim())
      patch[key] = values[key].trim() === '' ? null : values[key].trim();
  return patch;
}

/**
 * Editar los datos de un cliente guardado (#69): nombre, teléfono, dirección e información. El nombre no puede quedar
 * vacío (BR-CUS-14). Pieza del módulo; la ubicación, el emoji y las fotos se cambian en la ficha.
 */
export function EditCustomerDialog({ open, onOpenChange, initial, onSave }: EditCustomerDialogProps) {
  const [values, setValues] = useState(initial);
  const [nameMissing, setNameMissing] = useState(false);
  const set = (key: keyof EditCustomerValues) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === 'name' && value.trim() !== '') setNameMissing(false);
  };
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setValues(initial);
        setNameMissing(false);
        onOpenChange(next);
      }}
      title={t.title}
      message={t.message}
      confirmLabel={t.save}
      cancelLabel={t.cancel}
      onConfirm={async () => {
        if (values.name.trim() === '') {
          setNameMissing(true);
          throw new Error('NAME_REQUIRED');
        }
        const patch = customerPatchOf(initial, values);
        if (Object.keys(patch).length > 0) await onSave(patch);
      }}
    >
      <div className={styles.fields}>
        <Field
          label={t.name}
          value={values.name}
          onChange={set('name')}
          error={nameMissing ? t.nameRequired : undefined}
        />
        <Field
          kind="phone"
          label={t.phone}
          placeholder="300 000 0000"
          value={values.phone}
          onChange={set('phone')}
        />
        <Field label={t.address} value={values.address} onChange={set('address')} />
        <Field kind="textarea" label={t.info} value={values.info} onChange={set('info')} />
      </div>
    </ConfirmDialog>
  );
}
