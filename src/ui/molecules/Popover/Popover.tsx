'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import { useCallback, useState, type ReactNode } from 'react';
import styles from './Popover.module.css';

export type PopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El elemento que lo abre (un botón). */
  trigger: ReactNode;
  /** Nombre del panel para los lectores de pantalla y título visible. */
  title: string;
  children: ReactNode;
};

/**
 * Panel flotante junto a un botón (escritorio): se abre al tocarlo y se cierra con Esc, tocando afuera o al terminar.
 * Se pinta dentro del ámbito de tema y plataforma más cercano. Lo usa el selector de emoji del cliente (#34) y el
 * resumen de Dinero en escritorio (#39). En móvil, lo mismo va en una hoja (Ventana de detalle).
 */
export function Popover({ open, onOpenChange, trigger, title, children }: PopoverProps) {
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined);
  const scope = useCallback(
    (node: HTMLSpanElement | null) =>
      setContainer(node?.closest<HTMLElement>('[data-ui-scope]') ?? undefined),
    [],
  );
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <span ref={scope} hidden />
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal container={container}>
        <RadixPopover.Content
          className={styles.panel}
          align="start"
          sideOffset={8}
          collisionPadding={8}
          aria-label={title}
        >
          <p className={styles.title}>{title}</p>
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
