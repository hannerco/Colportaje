'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useId, useRef, useState, type MouseEvent, type ReactElement } from 'react';
import { copy } from '@/copy/es';
import { Avatar } from '../../atoms/Avatar';
import { Button } from '../../atoms/Button';
import { Icon, type IconName } from '../../icons';
import { usePlatform, useSlidingIndicator } from '../../platform';
import styles from './AppNav.module.css';

export type NavId =
  | 'today'
  | 'customers'
  | 'inventory'
  | 'minibooks'
  | 'calendar'
  | 'money'
  | 'stocktake'
  | 'settings'
  | 'admin';

export const ALL_NAV_IDS: NavId[] = [
  'today',
  'customers',
  'inventory',
  'minibooks',
  'calendar',
  'money',
  'stocktake',
  'settings',
  'admin',
];

/** Ícono de cada módulo (mismo nombre que en el mapa de íconos). */
const NAV_ICON: Record<NavId, IconName> = {
  today: 'today',
  customers: 'customers',
  inventory: 'inventory',
  minibooks: 'minibooks',
  calendar: 'calendar',
  money: 'money',
  stocktake: 'stocktake',
  settings: 'settings',
  admin: 'admin',
};

type GroupId = keyof typeof copy.ui.nav.groups;

/** R1 y R4: grupos del diseño; cada uno con 4 como máximo (BR-GEN-11). */
const GROUPS: Record<GroupId, NavId[]> = {
  work: ['customers', 'inventory', 'minibooks', 'calendar'],
  money: ['money', 'stocktake'],
  account: ['settings', 'admin'],
};

/** R2: destinos de la barra inferior antes de «Más». */
const BAR: NavId[] = ['today', 'customers', 'inventory'];

export type AppNavProps = {
  /** Módulo activo (`activa`). */
  active: NavId;
  /** Módulos que se muestran: la app pasa solo los que tienen pantalla (I-37); Admin solo si el perfil es admin. */
  items?: NavId[];
  /** Rutas del glosario (`/clientes`, `/inventario`, `/dinero`…). */
  hrefs: Record<NavId, string>;
  /** Botón flotante en móvil (`fab`). Sin él no se pinta (R3). */
  fab?: {
    icon: IconName;
    label: string;
    onClick: () => void;
    /** Deshabilitado (p. ej. «Nuevo cliente» sin conexión): el lector oye «Necesita conexión» (BR-GEN-08). */
    disabled?: boolean;
  };
  /** Cuenta en la cabecera de la barra lateral. */
  account: { name: string };
  /** Acceso «Nuevo cliente» de la barra lateral. Sin él no se muestra. */
  onNewCustomer?: () => void;
  /** «Nuevo cliente» deshabilitado, con «Necesita conexión» debajo (sin conexión, BR-GEN-08). */
  newCustomerDisabled?: boolean;
  /**
   * Navegación sin recargar (la app pasa la del enrutador). Con ella, un clic normal en un destino llama
   * `onNavigate(href)` en vez de seguir el enlace; con Ctrl, Cmd o Mayús el enlace se abre como siempre.
   */
  onNavigate?: (href: string) => void;
  /** «Buscar ⌘K» de la barra lateral: la app no lo pasa (FT-01). */
  search?: { onOpen: () => void };
  className?: string;
};

/**
 * Navegación (HU-UI-23, ficha Lib-Navegacion): barra lateral en escritorio; barra inferior flotante con «Más» y el
 * botón flotante de crear en móvil. Va en las pantallas raíz.
 */
export function AppNav(props: AppNavProps) {
  return usePlatform() === 'mobile' ? <BottomBar {...props} /> : <Sidebar {...props} />;
}

const shown = (items: NavId[] | undefined) => new Set(items ?? ALL_NAV_IDS);

/** Un clic «normal» (botón principal, sin teclas que abren en otra pestaña o ventana). */
const plainClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

function NavLink({
  id,
  active,
  href,
  className,
  onClick,
  onNavigate,
}: {
  id: NavId;
  active: boolean;
  href: string;
  className: string | undefined;
  onClick?: () => void;
  onNavigate?: (href: string) => void;
}) {
  return (
    <a
      className={className}
      href={href}
      aria-current={active ? 'page' : undefined}
      data-active={active || undefined}
      onClick={(event) => {
        onClick?.();
        if (onNavigate && plainClick(event)) {
          event.preventDefault();
          onNavigate(href);
        }
      }}
    >
      <Icon name={NAV_ICON[id]} tone="current" />
      <span className={styles.text}>{copy.ui.nav.items[id]}</span>
    </a>
  );
}

// ─── Escritorio: barra lateral ───

export function Sidebar({
  active,
  items,
  hrefs,
  account,
  onNewCustomer,
  newCustomerDisabled = false,
  onNavigate,
  search,
  className,
}: AppNavProps) {
  const visible = shown(items);
  const uid = useId();
  const [collapsed, setCollapsed] = useState<Partial<Record<GroupId, boolean>>>({});
  // #38: el fondo del módulo activo se desliza al nuevo (también entre páginas: sale de donde estaba).
  const navRef = useRef<HTMLElement>(null);
  useSlidingIndicator(navRef, '[data-active]', `${active}-${JSON.stringify(collapsed)}`, 'sidebar');
  const link = (id: NavId) => (
    <li key={id}>
      <NavLink
        id={id}
        active={id === active}
        href={hrefs[id]}
        className={styles.item}
        onNavigate={onNavigate}
      />
    </li>
  );
  const group = (id: GroupId) => {
    const ids = GROUPS[id].filter((navId) => visible.has(navId));
    if (ids.length === 0) return null;
    const open = !collapsed[id];
    const listId = `${uid}-${id}`;
    return (
      <div key={id} className={styles.group}>
        <button
          type="button"
          className={styles.groupToggle}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setCollapsed((state) => ({ ...state, [id]: open }))}
        >
          {copy.ui.nav.groups[id]}
          <Icon name="expand" size={14} tone="current" className={styles.chevron} />
        </button>
        {open && (
          <ul id={listId} className={styles.list}>
            {ids.map(link)}
          </ul>
        )}
      </div>
    );
  };
  const footer = GROUPS.account.filter((id) => visible.has(id));

  return (
    <nav
      ref={navRef}
      aria-label={copy.ui.nav.label}
      className={[styles.sidebar, className].filter(Boolean).join(' ')}
    >
      <span aria-hidden="true" className={styles.indicator} />
      {/* R6: sin «Cambiar de cuenta» (FT-02). */}
      <div className={styles.account}>
        <Avatar kind="brand" decorative />
        <span className={styles.accountName}>{account.name}</span>
      </div>
      <ul className={styles.list}>
        {search && (
          <li>
            <button type="button" className={styles.item} onClick={search.onOpen}>
              <Icon name="search" tone="current" />
              <span className={styles.text}>{copy.ui.nav.search}</span>
              <kbd className={styles.kbd}>{copy.ui.search.shortcut}</kbd>
            </button>
          </li>
        )}
        {visible.has('today') && link('today')}
        {onNewCustomer && (
          <li>
            <button
              type="button"
              className={[styles.item, styles.create].join(' ')}
              onClick={onNewCustomer}
              disabled={newCustomerDisabled}
              {...(newCustomerDisabled ? { 'aria-describedby': `${uid}-needs-connection` } : {})}
            >
              <span className={styles.square}>
                <Icon name="new-customer" size={14} tone="current" />
              </span>
              <span className={styles.text}>{copy.ui.nav.newCustomer}</span>
            </button>
            {newCustomerDisabled && (
              <span id={`${uid}-needs-connection`} className={styles.needsConnection}>
                {copy.ui.empty.needsConnection}
              </span>
            )}
          </li>
        )}
      </ul>
      {group('work')}
      {group('money')}
      {footer.length > 0 && <ul className={[styles.list, styles.footer].join(' ')}>{footer.map(link)}</ul>}
    </nav>
  );
}

// ─── Móvil: barra inferior, botón flotante y hoja «Más» ───

export function BottomBar({ active, items, hrefs, fab, onNavigate, className }: AppNavProps) {
  const visible = shown(items);
  const [moreOpen, setMoreOpen] = useState(false);
  const fabNoteId = useId();
  const inBar = BAR.filter((id) => visible.has(id));
  const inMore = ALL_NAV_IDS.filter((id) => visible.has(id) && !BAR.includes(id));
  // CA-2: lo que no está en la barra marca «Más».
  const moreActive = !inBar.includes(active);
  const barRef = useRef<HTMLElement>(null);
  useSlidingIndicator(barRef, '[data-active]', active, 'bottom-bar');

  return (
    <>
      <nav
        ref={barRef}
        aria-label={copy.ui.nav.label}
        className={[styles.bar, className].filter(Boolean).join(' ')}
      >
        <span aria-hidden="true" className={styles.barIndicator} />
        <ul className={styles.barList}>
          {inBar.map((id) => (
            <li key={id} className={styles.barCell}>
              <NavLink
                id={id}
                active={id === active}
                href={hrefs[id]}
                className={styles.barItem}
                onNavigate={onNavigate}
              />
            </li>
          ))}
          {inMore.length > 0 && (
            <li className={styles.barCell}>
              <MoreSheet
                active={active}
                ids={inMore}
                hrefs={hrefs}
                onNavigate={onNavigate}
                open={moreOpen}
                onOpenChange={setMoreOpen}
                trigger={
                  <button
                    type="button"
                    className={styles.barItem}
                    data-active={moreActive || undefined}
                    aria-current={moreActive ? 'page' : undefined}
                  >
                    <Icon name="more" tone="current" />
                    <span className={styles.text}>{copy.ui.nav.more}</span>
                  </button>
                }
              />
            </li>
          )}
        </ul>
      </nav>
      {/* R3: encima de la barra, a la derecha; sin `fab` no se pinta. */}
      {fab && (
        // `data-app-fab`: el Aviso sube por encima del botón para no taparlo (#89).
        <span className={styles.fab} data-app-fab="">
          <Button
            variant="fab"
            icon={fab.icon}
            onClick={fab.onClick}
            state={fab.disabled ? 'disabled' : 'normal'}
            {...(fab.disabled ? { 'aria-describedby': fabNoteId } : {})}
          >
            {fab.label}
          </Button>
          {fab.disabled && (
            <span id={fabNoteId} className={styles.visuallyHidden}>
              {copy.ui.empty.needsConnection}
            </span>
          )}
        </span>
      )}
    </>
  );
}

export type MoreSheetProps = {
  active: NavId;
  /** Módulos que van en la hoja (los que no caben en la barra). */
  ids: NavId[];
  hrefs: Record<NavId, string>;
  onNavigate?: (href: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
};

/** R4: la hoja de «Más», con los grupos Trabajo, Dinero y Cuenta (4 como máximo cada uno). */
export function MoreSheet({ active, ids, hrefs, onNavigate, open, onOpenChange, trigger }: MoreSheetProps) {
  const uid = useId();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // La hoja se pinta en el ámbito de tema y plataforma más cercano (un marco del Storybook) o en el `<body>`.
  const findScope = useCallback(
    (node: HTMLSpanElement | null) => setContainer(node?.closest<HTMLElement>('[data-ui-scope]') ?? null),
    [],
  );
  const groups = (Object.keys(GROUPS) as GroupId[])
    .map((id) => ({ id, ids: GROUPS[id].filter((navId) => ids.includes(navId)) }))
    .filter((group) => group.ids.length > 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <span ref={findScope} hidden />
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className={styles.scrim} />
        <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
          <span className={styles.handle} aria-hidden="true" />
          <Dialog.Title className={styles.sheetTitle}>{copy.ui.nav.more}</Dialog.Title>
          {groups.map((group) => (
            <section key={group.id} className={styles.sheetGroup} aria-labelledby={`${uid}-${group.id}`}>
              <h3 id={`${uid}-${group.id}`} className={styles.sheetGroupTitle}>
                {copy.ui.nav.groups[group.id]}
              </h3>
              <ul className={styles.list}>
                {group.ids.map((id) => (
                  <li key={id}>
                    <NavLink
                      id={id}
                      active={id === active}
                      href={hrefs[id]}
                      className={styles.sheetItem}
                      onClick={() => onOpenChange(false)}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
