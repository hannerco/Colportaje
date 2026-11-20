'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import type { MoneySummary as MoneySummaryData } from '@/domain/money-summary';
import { Tabs } from '@/ui/molecules/Tabs';
import { DetailWindow } from '@/ui/organisms/DetailWindow';
import type { PageHeaderRootProps } from '@/ui/organisms/PageHeader';
import { usePlatform } from '@/ui/platform';
import { MoneySummary } from '../MoneySummary/MoneySummary';
import styles from './MoneyChrome.module.css';

export type MoneyChromeOptions = {
  summary?: MoneySummaryData;
  /** «Entregar al líder»: abre Nuevo Abibono precargado (HU-PAN-DIN-04). */
  onDeliver: () => void;
  /** Ruta de Dinero (vuelta de la hoja de resumen en móvil). */
  backHref: string;
  /** La parte del módulo abierta y los conteos de cada una. */
  active: 'payments' | 'deposits';
  paymentsCount?: number;
  depositsCount?: number;
  onOpenPayments: () => void;
  onOpenDeposits: () => void;
};

const t = copy.money.list;

/**
 * Lo que comparten las dos partes de Dinero (Abonos de clientes y Abibonos, HU-PAN-DIN-01 y 03): el botón del
 * Encabezado y la hoja de resumen en móvil, el segmento «Abonos de clientes | Abibonos» y, en escritorio, el resumen
 * arriba de la lista con el ⓘ de «Por entregar».
 */
export function useMoneyChrome(options: MoneyChromeOptions): {
  header: Pick<PageHeaderRootProps, 'summary'>;
  sections: ReactNode;
  aboveList: ReactNode;
  sheet: ReactNode;
} {
  const { summary } = options;
  const mobile = usePlatform() === 'mobile';
  const [sheetOpen, setSheetOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const block = summary && (
    <MoneySummary
      summary={summary}
      onDeliver={() => {
        setSheetOpen(false);
        options.onDeliver();
      }}
      onInfo={mobile ? undefined : () => setInfoOpen((open) => !open)}
    />
  );

  return {
    header:
      mobile && summary
        ? {
            summary: {
              label: t.summaryLabel,
              amount: summary.toDeliver.total,
              onOpen: () => setSheetOpen(true),
            },
          }
        : {},
    sections: (
      <div className={styles.sections}>
        <Tabs
          variant="segmented"
          aria-label={t.sectionsLabel}
          width="auto"
          value={options.active}
          onValueChange={(value) => {
            if (value === options.active) return;
            if (value === 'deposits') options.onOpenDeposits();
            else options.onOpenPayments();
          }}
          items={[
            { id: 'payments', label: t.payments, count: options.paymentsCount },
            { id: 'deposits', label: t.deposits, count: options.depositsCount },
          ]}
        />
      </div>
    ),
    aboveList: !mobile && (
      <>
        {block}
        {infoOpen && (
          <p role="status" className={styles.tip}>
            {t.toDeliverTip}
          </p>
        )}
      </>
    ),
    sheet: mobile && sheetOpen && summary && (
      <DetailWindow
        mode="sheet"
        title={t.summaryTitle}
        breadcrumb={{ label: t.title, href: options.backHref }}
        onClose={() => setSheetOpen(false)}
      >
        <div className={styles.sheet}>{block}</div>
      </DetailWindow>
    ),
  };
}
