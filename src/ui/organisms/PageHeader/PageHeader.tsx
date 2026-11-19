'use client';

import type { MouseEvent, ReactElement } from 'react';
import { copy } from '@/copy/es';
import { formatCOP, type COP } from '@/domain/money';
import { Button } from '../../atoms/Button';
import { Icon, type IconName } from '../../icons';
import { usePlatform } from '../../platform';
import styles from './PageHeader.module.css';

type HeaderCommon = {
  /** Título (`titulo`): el único `<h1>` de la pantalla. */
  title: string;
  className?: string;
};

export type PageHeaderRootProps = HeaderCommon & {
  kind: 'root';
  /** Conteo en gris junto al título (`conteo`). */
  count?: number;
  /** Acción principal (`accion` + `accionIcono`), solo en escritorio: en móvil la cubre el botón flotante. */
  primaryAction?: { label: string; icon?: IconName; onClick: () => void; disabled?: boolean };
  /** Botón que abre la hoja de resumen (`resumen`), p. ej. «Por entregar $385.000». Reemplaza a la acción principal. */
  summary?: { label: string; amount: COP; onOpen: () => void };
};

export type PageHeaderDetailProps = HeaderCommon & {
  kind: 'detail';
  /** A dónde vuelve (`anterior`): el botón se llama «Volver a {label}». */
  back: {
    label: string;
    href?: string;
    onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  };
  /** «Más acciones»: un `Menu` con disparador `more`. */
  moreActions?: ReactElement;
};

export type PageHeaderProps = PageHeaderRootProps | PageHeaderDetailProps;

/**
 * Encabezado (HU-UI-21, ficha Lib-Encabezado): la parte superior de una pantalla. Raíz: título grande con conteo y la
 * acción principal (o el botón de resumen). Detalle: volver, título y más acciones.
 */
export function PageHeader(props: PageHeaderProps) {
  const platform = usePlatform();
  const className = [styles.header, props.className].filter(Boolean).join(' ');
  return props.kind === 'root' ? (
    <RootHeader {...props} className={className} mobile={platform === 'mobile'} />
  ) : (
    <DetailHeader {...props} className={className} mobile={platform === 'mobile'} />
  );
}

function RootHeader({
  title,
  count,
  primaryAction,
  summary,
  className,
  mobile,
}: PageHeaderRootProps & { mobile: boolean }) {
  return (
    <header className={className} data-kind="root">
      <h1 className={styles.title}>
        {title}
        {count !== undefined && <span className={styles.count}> {count}</span>}
      </h1>
      {summary ? (
        // R2: con resumen no hay acción principal.
        <button type="button" className={styles.summary} onClick={summary.onOpen}>
          <span className={styles.summaryLabel}>{summary.label}</span>
          <span className={styles.summaryAmount}>{formatCOP(summary.amount)}</span>
          <Icon name="expand" tone="current" className={styles.summaryIcon} />
        </button>
      ) : (
        // CA-1: en móvil la acción principal va en el botón flotante de la Navegación.
        primaryAction &&
        !mobile && (
          <Button
            icon={primaryAction.icon}
            onClick={primaryAction.onClick}
            state={primaryAction.disabled ? 'disabled' : 'normal'}
          >
            {primaryAction.label}
          </Button>
        )
      )}
    </header>
  );
}

function DetailHeader({
  title,
  back,
  moreActions,
  className,
  mobile,
}: PageHeaderDetailProps & { mobile: boolean }) {
  const backName = copy.ui.header.back(back.label);
  return (
    <header className={className} data-kind="detail">
      <span className={styles.start}>
        {/* R3: solo ícono en móvil; con texto en escritorio. */}
        {mobile ? (
          <Button variant="tertiary" iconOnly icon="back" href={back.href} onClick={back.onClick}>
            {backName}
          </Button>
        ) : (
          <Button
            variant="tertiary"
            size="compact"
            icon="back"
            href={back.href}
            onClick={back.onClick}
            aria-label={backName}
          >
            {back.label}
          </Button>
        )}
      </span>
      <h1 className={styles.detailTitle}>{title}</h1>
      <span className={styles.end}>{moreActions}</span>
    </header>
  );
}
