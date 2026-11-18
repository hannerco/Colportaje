'use client';

import type { MouseEvent, ReactNode } from 'react';
import { copy } from '@/copy/es';
import { formatCOP, type COP } from '@/domain/money';
import { formatDate, type LocalDate } from '@/domain/time';
import { Avatar } from '../../atoms/Avatar';
import { Chip } from '../../atoms/Chip';
import { DataTag } from '../../atoms/DataTag';
import { StatusPill, type PillStatus } from '../../atoms/StatusPill';
import { usePlatform } from '../../platform';
import styles from './ListRow.module.css';

export type ListRowKind = 'customer' | 'payment' | 'copy';

export type ListRowAvatar =
  { kind: 'person' } | { kind: 'emoji'; emoji: string } | { kind: 'cover'; coverUrl?: string };

type RowCommon = {
  variant?: 'row';
  /** Fila abierta en la Ventana de detalle (`seleccionada`): fondo `row-selected` y `aria-current`. */
  selected?: boolean;
  /** Nombre del cliente o del libro (`titulo`). */
  title: string;
  /** Avatar (`emoji`). Por defecto, persona; `copy` siempre usa portada. */
  avatar?: ListRowAvatar;
  /** Saldo pendiente, monto del abono o precio (`monto`), en COP enteros. Sin valor se ve «—». */
  amount?: COP;
  /** Último abono, fecha acordada o recibido el (`fecha`). Sin valor se ve «—». */
  date?: LocalDate;
  /** Estado (`estado`), tal cual a la Pastilla. Un prospecto no tiene estado (BR-CUS-13). */
  status?: PillStatus;
  /** Abre el detalle: enlace si hay `href`; si no, botón con `onOpen`. */
  href?: string;
  onOpen?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  className?: string;
};

export type ListRowRowProps = RowCommon &
  (
    | {
        kind: 'customer';
        /** Libro más reciente y cuántos más (`detalle` + `extra`, I-10). Sin libros, el cliente es prospecto. */
        books?: { first: string; more: number };
        /** Teléfono (`telefono`). */
        phone?: string;
      }
    | {
        kind: 'payment';
        /** Cuota «2/4» (`detalle`). */
        installment: { index: number; total: number };
      }
    | {
        kind: 'copy';
        /** Número del ejemplar «#6» (`detalle`). */
        copyNumber: number;
        /** Cliente del ejemplar vendido. */
        customerName?: string;
      }
  );

export type ListRowHeaderProps = {
  variant: 'header';
  kind: ListRowKind;
  /** Título del grupo en móvil (p. ej. «Deudores»). En escritorio la cabecera muestra los títulos de columna. */
  groupLabel?: string;
  /** Conteo del grupo en móvil. */
  groupCount?: number;
  className?: string;
};

export type ListRowProps = ListRowRowProps | ListRowHeaderProps;

/** Índice de la columna del monto, alineada a la derecha (R1). */
const AMOUNT_COLUMN: Record<ListRowKind, number> = { customer: 3, payment: 3, copy: 2 };

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

/**
 * Fila de lista (HU-UI-14, ficha Lib-FilaLista): en escritorio, una fila de tabla con columnas; en móvil, una fila de
 * dos líneas con el monto a la derecha. Va dentro de `ListTable`, que pone la tabla (escritorio) o la lista (móvil).
 */
export function ListRow(props: ListRowProps) {
  const platform = usePlatform();
  if (props.variant === 'header')
    return platform === 'mobile' ? <MobileHeader {...props} /> : <DesktopHeader {...props} />;
  return platform === 'mobile' ? <MobileRow {...props} /> : <DesktopRow {...props} />;
}

// ─── Escritorio ───

function DesktopHeader({ kind, className }: ListRowHeaderProps) {
  return (
    <div role="row" className={cx(styles.row, styles.header, className)}>
      {copy.ui.listRow.columns[kind].map((label, i) => (
        <span
          key={label}
          role="columnheader"
          className={cx(styles.cell, i === AMOUNT_COLUMN[kind] && styles.end)}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function DesktopRow(props: ListRowRowProps) {
  const { selected = false, className } = props;
  return (
    <div
      role="row"
      className={cx(styles.row, className)}
      aria-current={selected ? 'true' : undefined}
      data-selected={selected || undefined}
    >
      {desktopCells(props).map((cell, i) => (
        <span
          key={i}
          role="cell"
          className={cx(styles.cell, i === AMOUNT_COLUMN[props.kind] && cx(styles.end, styles.amount))}
        >
          {cell}
        </span>
      ))}
    </div>
  );
}

function desktopCells(props: ListRowRowProps): ReactNode[] {
  const empty = copy.ui.listRow.empty;
  const date = props.date ? formatDate(props.date) : empty;
  const amount = props.amount !== undefined ? formatCOP(props.amount) : empty;
  const status = props.status ? <StatusPill status={props.status} /> : empty;
  const name = (
    <span className={styles.name}>
      <RowAvatar {...props} />
      <OpenLink {...props} className={styles.titleLink}>
        <span className={styles.ellipsis}>{props.title}</span>
      </OpenLink>
    </span>
  );
  switch (props.kind) {
    case 'customer':
      return [
        name,
        props.phone ?? empty,
        props.books ? (
          <span className={styles.books}>
            <Chip kind="book" maxWidth={170}>
              {props.books.first}
            </Chip>
            {props.books.more > 0 && <Chip kind="count">{copy.ui.listRow.more(props.books.more)}</Chip>}
          </span>
        ) : (
          <span className={styles.muted}>{copy.ui.listRow.prospect}</span>
        ),
        amount,
        date,
        status,
      ];
    case 'payment':
      return [name, <DataTag key="tag" kind="fraction" value={props.installment} />, date, amount, status];
    case 'copy':
      return [
        <span key="name" className={styles.name}>
          {name}
          <DataTag kind="number" value={props.copyNumber} />
        </span>,
        date,
        amount,
        <span key="customer" className={styles.ellipsis}>
          {props.customerName ?? empty}
        </span>,
        status,
      ];
  }
}

/** El nombre es el enlace al detalle (escritorio); sin `href` ni `onOpen`, texto. */
function OpenLink({
  href,
  onOpen,
  className,
  children,
}: Pick<RowCommon, 'href' | 'onOpen'> & { className?: string; children: ReactNode }) {
  if (href)
    return (
      <a className={className} href={href} onClick={onOpen}>
        {children}
      </a>
    );
  if (onOpen)
    return (
      <button type="button" className={className} onClick={onOpen}>
        {children}
      </button>
    );
  return <span className={styles.ellipsis}>{children}</span>;
}

function RowAvatar(props: ListRowRowProps) {
  const avatar: ListRowAvatar =
    props.kind === 'copy'
      ? { kind: 'cover', ...(props.avatar?.kind === 'cover' ? props.avatar : {}) }
      : (props.avatar ?? { kind: 'person' });
  return (
    <Avatar
      decorative
      kind={avatar.kind}
      emoji={avatar.kind === 'emoji' ? avatar.emoji : undefined}
      coverUrl={avatar.kind === 'cover' ? avatar.coverUrl : undefined}
    />
  );
}

// ─── Móvil ───

function MobileHeader({ groupLabel, groupCount, className }: ListRowHeaderProps) {
  return (
    <li className={cx(styles.group, className)}>
      <span>{groupLabel}</span>
      {groupCount !== undefined && <span className={styles.groupCount}>{groupCount}</span>}
    </li>
  );
}

function MobileRow(props: ListRowRowProps) {
  const { selected = false, href, onOpen, className } = props;
  const body = (
    <>
      <RowAvatar {...props} />
      <span className={styles.lines}>
        <span className={cx(styles.ellipsis, styles.mobileTitle)}>{props.title}</span>
        <span className={styles.secondary}>{secondLine(props)}</span>
      </span>
      <span className={styles.side}>{sideOf(props)}</span>
    </>
  );
  const common = {
    className: cx(styles.mobileRow, className),
    'aria-current': selected ? ('true' as const) : undefined,
    'data-selected': selected || undefined,
  };
  return (
    <li className={styles.item}>
      {href ? (
        <a {...common} href={href} onClick={onOpen}>
          {body}
        </a>
      ) : onOpen ? (
        <button type="button" {...common} onClick={onOpen}>
          {body}
        </button>
      ) : (
        <span {...common}>{body}</span>
      )}
    </li>
  );
}

function secondLine(props: ListRowRowProps): ReactNode {
  switch (props.kind) {
    case 'customer':
      return props.books ? (
        <>
          <span className={styles.ellipsis}>{props.books.first}</span>
          {props.books.more > 0 && <span>{copy.ui.listRow.more(props.books.more)}</span>}
        </>
      ) : (
        copy.ui.listRow.prospect
      );
    case 'payment':
      return props.date ? formatDate(props.date) : copy.ui.listRow.empty;
    case 'copy':
      return props.date ? copy.ui.listRow.received(formatDate(props.date)) : copy.ui.listRow.empty;
  }
}

/** R2: el monto a la derecha y la Pastilla en forma texto; en clientes, «Debe» sobre el saldo (BR-CUS-13). */
function sideOf(props: ListRowRowProps): ReactNode {
  const amount =
    props.amount !== undefined ? (
      <span className={cx(styles.amount, props.kind === 'customer' && props.amount === 0 && styles.zero)}>
        {formatCOP(props.amount)}
      </span>
    ) : (
      <span className={styles.amount}>{copy.ui.listRow.empty}</span>
    );
  if (props.kind === 'customer') {
    if (!props.status) return <span className={styles.amount}>{copy.ui.listRow.empty}</span>;
    return (
      <>
        <StatusPill status={props.status} shape="text" label={copy.ui.listRow.owes} />
        {amount}
      </>
    );
  }
  return (
    <>
      {amount}
      {props.status && <StatusPill status={props.status} shape="text" />}
    </>
  );
}

// ─── Contenedor ───

export type ListTableProps = {
  /** Tipo de las filas: define la plantilla de columnas en escritorio. */
  kind: ListRowKind;
  /** Nombre de la tabla o lista, p. ej. «Clientes». */
  'aria-label': string;
  children: ReactNode;
  className?: string;
};

/**
 * Contenedor de las filas (R5): en escritorio, una tabla (`role="table"`) con la plantilla de columnas de su tipo; en
 * móvil, una lista (`<ul>`).
 */
export function ListTable({ kind, 'aria-label': ariaLabel, children, className }: ListTableProps) {
  const platform = usePlatform();
  if (platform === 'mobile')
    return (
      <ul className={cx(styles.list, className)} aria-label={ariaLabel} data-kind={kind}>
        {children}
      </ul>
    );
  return (
    <div role="table" className={cx(styles.table, className)} aria-label={ariaLabel} data-kind={kind}>
      {children}
    </div>
  );
}
