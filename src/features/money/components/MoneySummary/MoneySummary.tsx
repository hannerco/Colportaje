'use client';

import { useId } from 'react';
import { copy } from '@/copy/es';
import { formatCOP } from '@/domain/money';
import type { MoneySummary as MoneySummaryData } from '@/domain/money-summary';
import { Button } from '@/ui/atoms/Button';
import { Icon } from '@/ui/icons';
import { Gauge } from '@/ui/molecules/Gauge';
import { MetricCard } from '@/ui/molecules/MetricCard';
import { usePlatform } from '@/ui/platform';
import styles from './MoneySummary.module.css';

export type MoneySummaryProps = {
  /** El resumen ya calculado (HU-DIN-02, `useMoneySummary`): montos y porcentajes enteros que suman 100 (I-11). */
  summary: MoneySummaryData;
  /** «Entregar al líder»: abre Nuevo Abibono precargado (BR-DEP-13). */
  onDeliver: () => void;
  /** Ícono ⓘ de «Por entregar»: la pantalla pone el tooltip. Sin él no se muestra. */
  onInfo?: () => void;
  className?: string;
};

/**
 * Resumen de dinero (HU-UI-25, ficha Lib-ResumenDinero): primero cuánto hay que entregar al líder, con su botón;
 * debajo, cómo va todo el dinero (medidor, tres tarjetas y el Dinero total). En móvil va dentro de la hoja que abre
 * el botón del Encabezado.
 */
export function MoneySummary({ summary, onDeliver, onInfo, className }: MoneySummaryProps) {
  const mobile = usePlatform() === 'mobile';
  const noteId = useId();
  const text = copy.money.summary;
  // R3: sin pendiente, el botón queda deshabilitado con su explicación al lado.
  const nothing = summary.toDeliver.total === 0;
  const shape = mobile ? 'legend' : 'card';

  return (
    <div
      className={[styles.summary, className].filter(Boolean).join(' ')}
      data-platform-shape={mobile ? 'column' : 'panel'}
    >
      <div className={styles.top}>
        <div className={styles.toDeliver}>
          <span className={styles.label}>
            {text.toDeliver}
            {onInfo && (
              <button type="button" className={styles.info} aria-label={text.toDeliverInfo} onClick={onInfo}>
                <Icon name="info" size={16} tone="current" />
              </button>
            )}
          </span>
          <span className={styles.figure}>{formatCOP(summary.toDeliver.total)}</span>
          <span className={styles.methods}>
            <span className={styles.method}>
              <Icon name="money" tone="current" />
              {text.cash} <strong>{formatCOP(summary.toDeliver.cash)}</strong>
            </span>
            <span className={styles.method}>
              <Icon name="transfer" tone="current" />
              {text.transfer} <strong>{formatCOP(summary.toDeliver.transfer)}</strong>
            </span>
          </span>
        </div>
        <div className={styles.deliver}>
          <Button
            icon="money"
            width={mobile ? 'full' : 'auto'}
            state={nothing ? 'disabled' : 'normal'}
            onClick={onDeliver}
            {...(nothing ? { 'aria-describedby': noteId } : {})}
          >
            {text.deliver}
          </Button>
          {nothing && (
            <span id={noteId} className={styles.note}>
              {text.nothingToDeliver}
            </span>
          )}
        </div>
      </div>
      <div className={styles.breakdown}>
        <Gauge
          delivered={summary.delivered.pct}
          collected={summary.collected.pct}
          pending={summary.toCollect.pct}
        />
        <div className={styles.cards}>
          <MetricCard
            label={text.delivered}
            amount={summary.delivered.amount}
            percent={summary.delivered.pct}
            tone="delivered"
            shape={shape}
          />
          <MetricCard
            label={text.toDeliver}
            amount={summary.collected.amount}
            percent={summary.collected.pct}
            tone="collected"
            shape={shape}
          />
          <MetricCard
            label={text.toCollect}
            amount={summary.toCollect.amount}
            percent={summary.toCollect.pct}
            tone="pending"
            shape={shape}
          />
        </div>
      </div>
      <MetricCard
        label={text.total}
        amount={summary.moneyTotal}
        percent={summary.moneyTotal > 0 ? 100 : 0}
        tone="total"
        shape="featured"
      />
    </div>
  );
}
