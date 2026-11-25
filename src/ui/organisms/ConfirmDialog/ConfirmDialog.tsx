'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../atoms/Button';
import { usePlatform } from '../../platform';
import styles from './ConfirmDialog.module.css';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tipo (`tipo`): peligro pinta la acción en rojo. */
  tone?: 'confirm' | 'danger';
  /** La pregunta (`titulo`), p. ej. «¿Descartar el cliente?». */
  title: string;
  /** Qué pasa si confirma, en una o dos líneas (`mensaje`). */
  message: ReactNode;
  /** Acción (`primario`): repite el verbo del título, p. ej. «Descartar». */
  confirmLabel: string;
  /** Salida segura (`secundario`), p. ej. «Seguir editando». */
  cancelLabel: string;
  /** Si devuelve una promesa, el botón queda cargando y el diálogo no se cierra hasta que termine bien (R3). */
  onConfirm: () => void | Promise<void>;
  /** Contenido opcional entre el mensaje y los botones (p. ej. un Campo de nota obligatoria). */
  children?: ReactNode;
  /** La acción se ve apagada (p. ej. «Guardar corrección» hasta que algo cambie). */
  confirmDisabled?: boolean;
};

/**
 * Diálogo (HU-UI-24, ficha Lib-Dialogo): pide una decisión antes de algo que no se puede deshacer. Ventana centrada
 * de 440 en escritorio; hoja inferior con los botones a todo el ancho en móvil. Radix AlertDialog: foco atrapado,
 * Esc cierra y el foco inicial va a la salida segura.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  tone = 'confirm',
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  children,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const mobile = usePlatform() === 'mobile';
  const [pending, setPending] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // Se pinta en el ámbito de tema y plataforma más cercano (un marco del Storybook) o en el `<body>`.
  const findScope = useCallback(
    (node: HTMLSpanElement | null) => setContainer(node?.closest<HTMLElement>('[data-ui-scope]') ?? null),
    [],
  );

  // No tiene disparador propio: recuerda quién tenía el foco al abrirse para devolvérselo al cerrar.
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);

  // R3: mientras espera, no se cierra (ni con Esc ni con la salida segura).
  const requestOpenChange = (next: boolean) => {
    if (!next && pending) return;
    onOpenChange(next);
  };

  const confirm = async () => {
    if (pending || confirmDisabled) return;
    const result = onConfirm();
    if (!(result instanceof Promise)) {
      onOpenChange(false);
      return;
    }
    setPending(true);
    try {
      await result;
      setPending(false);
      onOpenChange(false);
    } catch {
      // Falló: queda abierto y quien lo usa muestra el error.
      setPending(false);
    }
  };

  const width = mobile ? 'full' : 'auto';
  const cancel = (
    <AlertDialog.Cancel asChild key="cancel">
      <Button variant="tertiary" width={width} state={pending ? 'disabled' : 'normal'}>
        {cancelLabel}
      </Button>
    </AlertDialog.Cancel>
  );
  const action = (
    <Button
      key="confirm"
      variant={tone === 'danger' ? 'danger' : 'primary'}
      width={width}
      state={pending ? 'loading' : confirmDisabled ? 'disabled' : 'normal'}
      loadingText={confirmLabel}
      onClick={() => void confirm()}
    >
      {confirmLabel}
    </Button>
  );

  return (
    <AlertDialog.Root open={open} onOpenChange={requestOpenChange}>
      <span ref={findScope} hidden />
      <AlertDialog.Portal container={container ?? undefined}>
        <AlertDialog.Overlay className={styles.scrim} />
        <AlertDialog.Content
          className={styles.dialog}
          data-shape={mobile ? 'sheet' : 'window'}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
        >
          {mobile && <span className={styles.handle} aria-hidden="true" />}
          <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className={styles.message}>{message}</div>
          </AlertDialog.Description>
          {children}
          {/* R1: en fila, salida segura y acción; R2: en columna, con la acción arriba. */}
          <div className={styles.actions}>{mobile ? [action, cancel] : [cancel, action]}</div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
