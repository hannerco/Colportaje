'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { copy } from '@/copy/es';
import { todayBogota } from '@/domain/time';
import { useCurrentProfile } from '@/features/auth';
import { DepositReceiptScreen, useDeposit } from '@/features/money';
import { ROUTES } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { useToast } from '@/ui/molecules/Toast';

/** Recibo del Abibono entregado (ronda 37): ver, compartir el enlace, imprimir o guardar PDF. */
export default function DepositReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const deposit = useDeposit(id);
  const profile = useCurrentProfile();
  const toast = useToast();
  const [today] = useState(() => todayBogota(systemClock));
  const t = copy.money.depositReceipt;

  return (
    <DepositReceiptScreen
      deposit={deposit.data?.status === 'confirmed' ? deposit.data : undefined}
      error={deposit.isError}
      onRetry={() => void deposit.refetch()}
      colportor={profile.data?.fullName ?? ''}
      today={today}
      backHref={ROUTES.deposit(id)}
      onPrint={() => window.print()}
      onShare={async () => {
        const url = window.location.href;
        const title = `${t.title} · ${deposit.data?.displayTitle ?? ''}`;
        if (navigator.share) {
          await navigator.share({ title, url }).catch(() => undefined);
          return;
        }
        await navigator.clipboard?.writeText(url);
        toast.show({ message: t.copied, tone: 'success' });
      }}
    />
  );
}
