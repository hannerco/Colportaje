'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { copy } from '@/copy/es';
import { Field } from '../../atoms/Field';
import { Icon, type IconName } from '../../icons';
import { usePlatform } from '../../platform';
import styles from './Menu.module.css';

export type MenuItem = {
  id: string;
  label: string;
  icon?: IconName;
  /** Destructiva: va en rojo y al final (R3). */
  danger?: boolean;
  disabled?: boolean;
};

export type MenuProps = {
  /** El botón que abre el menú, normalmente un `Button`. Recibe el `ref` y los atributos del disparador. */
  trigger: ReactElement;
  /** Opciones (`conjunto`): 7 como máximo (BR-GEN-11), sin submenús. */
  items: MenuItem[];
  /** Para el orden: una opción marcada con ✓ (`menuitemradio`). */
  selectable?: boolean;
  /** Opción marcada (`seleccion`), por id. Solo con `selectable`. */
  value?: string;
  /** Al elegir una opción: se ejecuta y el menú se cierra (R4). */
  onSelect: (id: string) => void;
  /** Título de la hoja en móvil (`titulo`). */
  title?: string;
  /** Abierto, si quien lo usa lo controla. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const MAX_ITEMS = 7;

/** R3: las destructivas al final, sin cambiar el orden de las demás. */
const ordered = (items: MenuItem[]) => [
  ...items.filter((item) => !item.danger),
  ...items.filter((item) => item.danger),
];

/**
 * Menú (HU-UI-20, ficha Lib-Menu): lista de opciones que se abre desde un botón (el orden de una lista, las acciones
 * de un registro). En escritorio es un menú flotante de 260 (Radix DropdownMenu); en móvil sube como hoja inferior
 * (Radix Dialog). Elegir una opción la ejecuta, cierra el menú y devuelve el foco al botón.
 */
export function Menu(props: MenuProps) {
  const platform = usePlatform();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = props.open ?? ownOpen;
  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    props.onOpenChange?.(next);
  };

  if (process.env.NODE_ENV !== 'production' && props.items.length > MAX_ITEMS)
    // eslint-disable-next-line no-console -- R5: aviso de error de uso solo en desarrollo.
    console.warn(`Menu: ${props.items.length} items; BR-GEN-11 allows at most ${MAX_ITEMS}.`);

  // El menú se pinta en un portal: dentro del ámbito de tema y plataforma más cercano (un marco del Storybook) o,
  // en la app, en el `<body>`, que ya hereda los de `<html>`.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const findScope = (node: HTMLSpanElement | null) =>
    setContainer(node?.closest<HTMLElement>('[data-ui-scope]') ?? null);

  const items = ordered(props.items);
  const resolved = { ...props, items, open, onOpenChange: setOpen, container };
  return (
    <>
      <span ref={findScope} hidden />
      {platform === 'mobile' ? <SheetMenu {...resolved} /> : <FloatingMenu {...resolved} />}
    </>
  );
}

type ResolvedProps = MenuProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: HTMLElement | null;
};

// ─── Escritorio: menú flotante ───

function FloatingMenu({
  trigger,
  items,
  selectable,
  value,
  onSelect,
  open,
  onOpenChange,
  container,
}: ResolvedProps) {
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal container={container ?? undefined}>
        <DropdownMenu.Content className={styles.menu} align="start" sideOffset={6} collisionPadding={8}>
          {selectable ? (
            <DropdownMenu.RadioGroup value={value}>
              {items.map((item) => (
                <DropdownMenu.RadioItem
                  key={item.id}
                  value={item.id}
                  disabled={item.disabled}
                  className={styles.item}
                  data-danger={item.danger || undefined}
                  // Elegir la ya marcada también avisa (y cierra), igual que en la hoja móvil.
                  onSelect={() => onSelect(item.id)}
                >
                  <ItemBody item={item} />
                  <DropdownMenu.ItemIndicator className={styles.check}>
                    <Icon name="check" tone="current" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          ) : (
            items.map((item) => (
              <DropdownMenu.Item
                key={item.id}
                disabled={item.disabled}
                className={styles.item}
                data-danger={item.danger || undefined}
                onSelect={() => onSelect(item.id)}
              >
                <ItemBody item={item} />
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ItemBody({ item }: { item: MenuItem }) {
  return (
    <>
      {item.icon && <Icon name={item.icon} tone="current" className={styles.icon} />}
      <span className={styles.label}>{item.label}</span>
    </>
  );
}

// ─── Móvil: hoja inferior ───

function SheetMenu({
  trigger,
  items,
  selectable,
  value,
  onSelect,
  title,
  open,
  onOpenChange,
  container,
}: ResolvedProps) {
  const list = useRef<HTMLDivElement>(null);
  const enabled = () => [
    ...(list.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
  ];

  // Las flechas mueven entre opciones (como en el menú de escritorio); Inicio y Fin van a los extremos.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = enabled();
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? (at + 1) % buttons.length
        : event.key === 'ArrowUp'
          ? (at - 1 + buttons.length) % buttons.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : undefined;
    if (next === undefined || buttons.length === 0) return;
    event.preventDefault();
    buttons[next]!.focus();
  };

  const choose = (id: string) => {
    onSelect(id);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className={styles.scrim} />
        <Dialog.Content
          className={styles.sheet}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            // Al abrir, el foco va a la opción marcada o, si no hay, a la primera.
            event.preventDefault();
            const marked = list.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
            (marked ?? enabled()[0])?.focus();
          }}
        >
          <span className={styles.handle} aria-hidden="true" />
          <Dialog.Title className={styles.title}>{title ?? copy.ui.menu.title}</Dialog.Title>
          <div role="menu" aria-label={title ?? copy.ui.menu.title} ref={list} onKeyDown={handleKeyDown}>
            {items.map((item) => {
              const checked = selectable && item.id === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  role={selectable ? 'menuitemradio' : 'menuitem'}
                  aria-checked={selectable ? checked : undefined}
                  disabled={item.disabled}
                  tabIndex={-1}
                  className={styles.item}
                  data-danger={item.danger || undefined}
                  data-state={checked ? 'checked' : undefined}
                  onClick={() => choose(item.id)}
                >
                  <ItemBody item={item} />
                  {checked && (
                    <span className={styles.check}>
                      <Icon name="check" tone="current" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Campo de selección ───

export type SelectFieldProps = {
  /** Etiqueta del campo; también es el título de la hoja en móvil. */
  label: string;
  /** Opciones; el campo muestra la etiqueta de la elegida. */
  options: { id: string; label: string }[];
  /** Opción elegida, por id. */
  value?: string;
  onChange: (id: string) => void;
  placeholder?: string;
  help?: string;
  error?: string;
  disabled?: boolean;
  width?: number | 'full';
  className?: string;
};

/** Campo de selección (HU-UI-09 R6 + HU-UI-20): la caja del Campo abre un Menú con las opciones y la elegida con ✓. */
export function SelectField({ label, options, value, onChange, ...field }: SelectFieldProps) {
  const selected = options.find((option) => option.id === value);
  return (
    <Field
      {...field}
      kind="select"
      label={label}
      value={selected?.label ?? ''}
      renderSelect={(control) => (
        <Menu trigger={control} items={options} selectable value={value} onSelect={onChange} title={label} />
      )}
    />
  );
}
