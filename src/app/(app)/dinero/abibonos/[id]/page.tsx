'use client';

import { useParams } from 'next/navigation';
import { copy } from '@/copy/es';
import { useDeposit } from '@/features/money';
import { ShellRoute } from '@/features/shell';
import { DepositEditorContainer } from '../deposit-editor-container';

/**
 * Un Abibono (HU-PAN-DIN-04 y 05): el borrador se abre en el editor; el entregado espera a su pantalla (HU-PAN-DIN-05) y
 * mientras tanto se ve el armazón.
 */
export default function DepositPage() {
  const { id } = useParams<{ id: string }>();
  const deposit = useDeposit(id);
  if (deposit.data?.status === 'confirmed') return <ShellRoute title={copy.ui.nav.items.money} />;
  return <DepositEditorContainer depositId={id} />;
}
