'use client';

import { useParams } from 'next/navigation';
import { useDeposit } from '@/features/money';
import { DepositEditorContainer } from '../deposit-editor-container';
import { DepositDetailContainer } from './deposit-detail-container';

/**
 * Un Abibono (HU-PAN-DIN-04 y 05): el borrador se abre en el editor; el entregado, en su detalle de solo lectura. Al
 * reabrir un entregado, la lectura cambia a borrador y la misma ruta pasa a mostrar el editor.
 */
export default function DepositPage() {
  const { id } = useParams<{ id: string }>();
  const deposit = useDeposit(id);
  if (deposit.data?.status === 'confirmed') return <DepositDetailContainer depositId={id} />;
  return <DepositEditorContainer depositId={id} />;
}
