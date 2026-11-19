'use client';

import { Children, type ReactNode } from 'react';
import { Avatar, type AvatarKind } from '../../atoms/Avatar';
import { Button } from '../../atoms/Button';
import { StatusPill, type PillStatus } from '../../atoms/StatusPill';
import type { IconName } from '../../icons';
import { Banner, type BannerProps } from '../../molecules/Banner';
import { DetailWindow, useDetailWindow, type DetailWindowProps } from '../../organisms/DetailWindow';
import { Island } from '../../organisms/Island';
import { usePlatform } from '../../platform';
import styles from './DetailTemplate.module.css';

export type DetailIdentity = {
  /** Portada del libro o persona (con su emoji). */
  avatar: { kind: Exclude<AvatarKind, 'brand'>; emoji?: string; coverUrl?: string };
  /** Nombre del libro o del cliente. */
  title: string;
  /** Número del ejemplar («#6»). */
  number?: number;
  /** Estado. Sin valor no se pinta Pastilla (p. ej. un prospecto, que no tiene estado, BR-CUS-13). */
  status?: PillStatus;
  /** Debajo del título, p. ej. el cliente del ejemplar o la cuota del abono. */
  subtitle?: ReactNode;
  /** Contenido a todo el ancho debajo del nombre (p. ej. la cuenta del cliente: saldo y abonado). */
  details?: ReactNode;
  /** Acción principal del registro (p. ej. Cobrar): va aquí y no en la barra (R7 de la Ventana). */
  primaryAction?: { label: string; icon?: IconName; onClick: () => void; disabled?: boolean };
};

export type DetailTemplateProps = {
  /** La Ventana de detalle que lo contiene (forma, título, cerrar, anterior / siguiente, más acciones). */
  window: Omit<DetailWindowProps, 'children' | 'headingInContent'>;
  /** Resumen de la situación, arriba (p. ej. «Vencido hace 3 días»). */
  banner?: BannerProps;
  /** Isla 1: quién es. */
  identity: DetailIdentity;
  /** Islas 2 y siguientes: datos (con `DataRow`) e historial (con `HistoryTimeline`). */
  children: ReactNode;
};

/** R5: no más de 4 islas por detalle. */
const MAX_ISLANDS = 4;

/**
 * Plantilla de detalle en islas (HU-UI-29, ficha Lib-Plantilla-Detalle): el esqueleto de cualquier detalle. Dentro de
 * la Ventana de detalle se apilan, en orden fijo, la Franja, la isla de identidad y las demás (datos, historial).
 */
export function DetailTemplate({ window, banner, identity, children }: DetailTemplateProps) {
  const islands = Children.count(children) + 1;
  if (process.env.NODE_ENV !== 'production' && islands > MAX_ISLANDS)
    // eslint-disable-next-line no-console -- R5: aviso de error de uso solo en desarrollo.
    console.warn(`DetailTemplate: ${islands} islands; at most ${MAX_ISLANDS}.`);
  return (
    <DetailWindow {...window} headingInContent>
      <div className={styles.stack}>
        {banner && <Banner {...banner} />}
        <IdentityIsland {...identity} />
        {children}
      </div>
    </DetailWindow>
  );
}

/** R4: avatar `xl` / `lg`, título grande y la acción principal (a todo el ancho en móvil). */
function IdentityIsland({ avatar, title, number, status, subtitle, details, primaryAction }: DetailIdentity) {
  const mobile = usePlatform() === 'mobile';
  // El título es el encabezado del detalle: `<h1>` en la página de escritorio, `<h2>` en la ventana o en móvil.
  const Heading = useDetailWindow()?.heading ?? 'h1';
  return (
    <Island>
      <div className={styles.identity}>
        <Avatar
          kind={avatar.kind}
          emoji={avatar.emoji}
          coverUrl={avatar.coverUrl}
          size={mobile ? 'lg' : 'xl'}
          decorative
        />
        <div className={styles.who}>
          <Heading className={styles.title}>
            {title}
            {number !== undefined && <span className={styles.number}> #{number}</span>}
          </Heading>
          {status && <StatusPill status={status} />}
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      </div>
      {details && <div className={styles.details}>{details}</div>}
      {primaryAction && (
        <div className={styles.action}>
          <Button
            icon={primaryAction.icon}
            width={mobile ? 'full' : 'auto'}
            state={primaryAction.disabled ? 'disabled' : 'normal'}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button>
        </div>
      )}
    </Island>
  );
}
