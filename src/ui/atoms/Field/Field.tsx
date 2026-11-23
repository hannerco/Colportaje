'use client';

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { copy } from '@/copy/es';
import { groupCOP, parseTypedCOP, type COP } from '@/domain/money';
import { formatDate, parseDisplayDate, type LocalDate } from '@/domain/time';
import { Icon } from '../../icons';
import styles from './Field.module.css';

export type FieldKind = 'text' | 'money' | 'date' | 'phone' | 'email' | 'password' | 'select' | 'textarea';

/** El valor según el tipo (`valor`): el campo es controlado. */
type FieldValue =
  | {
      kind?: 'text' | 'phone' | 'email' | 'password' | 'textarea';
      value: string;
      onChange?: (value: string) => void;
    }
  | { kind: 'money'; value: COP | null; onChange?: (value: COP | null) => void }
  | {
      kind: 'date';
      value: LocalDate | null;
      onChange?: (value: LocalDate | null) => void;
      /** #62: lo que va en lugar del ícono del calendario (el botón que abre el calendario, `DateField`). */
      calendarTrigger?: ReactNode;
    }
  | { kind: 'select'; value: string; onChange?: never };

export type FieldProps = FieldValue & {
  /** Etiqueta siempre visible (`etiqueta`). */
  label: string;
  /** Ejemplo de formato, no instrucción (`placeholder`). */
  placeholder?: string;
  /** Pista corta debajo (`ayuda`). */
  help?: string;
  /** Mensaje de error (`estado = error`): si llega, el campo está en error (R5: quien lo usa decide cuándo). */
  error?: string;
  /** `estado = deshabilitado`. */
  disabled?: boolean;
  /** Ancho (`ancho`): 160–720 px o todo el disponible. */
  width?: number | 'full';
  /** Solo `select`: abre la lista de opciones (R6; la dibuja `SelectField`). */
  onOpen?: () => void;
  /** Solo `select`: si la lista está abierta (`aria-expanded`). */
  expanded?: boolean;
  /**
   * Solo `select`: envuelve el botón de la caja, p. ej. en el disparador del Menú (`SelectField`, HU-UI-20). Entonces
   * es el disparador quien pone `aria-haspopup` y `aria-expanded`.
   */
  renderSelect?: (control: ReactElement) => ReactNode;
  className?: string;
};

const clampWidth = (width: number) => Math.min(720, Math.max(160, width));

/**
 * Campo de formulario (HU-UI-09, ficha Lib-Campo): etiqueta arriba, caja, ayuda opcional y mensaje de error. El tipo
 * decide el ícono, el teclado del celular y el formato (dinero con «$» y miles con punto, fechas dd/mm/aaaa).
 */
export function Field(props: FieldProps) {
  const { label, help, error, disabled = false, width = 'full', className } = props;
  const kind = props.kind ?? 'text';
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  // El error reemplaza a la ayuda: debajo de la caja hay un solo mensaje.
  const describedBy = error ? errorId : help ? helpId : undefined;
  const control = {
    id,
    disabled,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  } as const;

  return (
    <div
      className={[styles.field, className].filter(Boolean).join(' ')}
      data-kind={kind}
      style={{ '--field-width': width === 'full' ? '100%' : `${clampWidth(width)}px` } as CSSProperties}
    >
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div
        className={styles.box}
        data-invalid={error ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
      >
        <Control {...props} control={control} />
      </div>
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          <Icon name="alert" size={14} tone="current" />
          {error}
        </p>
      ) : (
        help && (
          <p id={helpId} className={styles.help}>
            {help}
          </p>
        )
      )}
    </div>
  );
}

type ControlAttributes = {
  id: string;
  disabled: boolean;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
};

function Control(props: FieldProps & { control: ControlAttributes }) {
  const { control, placeholder } = props;
  switch (props.kind) {
    case 'money':
      return (
        <>
          <span className={styles.adornment} aria-hidden="true">
            $
          </span>
          <input
            {...control}
            className={styles.input}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={placeholder}
            value={props.value === null ? '' : groupCOP(props.value)}
            onChange={(e) => props.onChange?.(parseTypedCOP(e.target.value))}
          />
        </>
      );
    case 'date':
      return <DateInput {...props} control={control} />;
    case 'phone':
      return (
        <>
          <Icon name="call" tone="tertiary" className={styles.adornment} />
          <input
            {...control}
            className={styles.input}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={placeholder}
            value={props.value}
            onChange={(e) => props.onChange?.(e.target.value)}
          />
        </>
      );
    case 'email':
      return (
        <input
          {...control}
          className={styles.input}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
      );
    case 'password':
      return (
        <PasswordInput
          control={control}
          placeholder={placeholder}
          value={props.value}
          onChange={props.onChange}
        />
      );
    case 'select': {
      const wrapped = props.renderSelect !== undefined;
      const button = (
        <button
          {...control}
          type="button"
          className={styles.select}
          // Envuelto, sin estas claves: el Slot de Radix dejaría que un `undefined` pisara las suyas.
          {...(wrapped
            ? {}
            : {
                'aria-haspopup': 'listbox' as const,
                'aria-expanded': props.expanded ?? false,
                onClick: props.onOpen,
              })}
        >
          <span className={props.value ? styles.selectValue : styles.placeholder}>
            {props.value || placeholder}
          </span>
          <Icon name="expand" tone="tertiary" />
        </button>
      );
      return wrapped ? props.renderSelect!(button) : button;
    }
    case 'textarea':
      return (
        <AutoGrowTextarea
          {...control}
          className={styles.input}
          placeholder={placeholder}
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
      );
    default:
      return (
        <input
          {...control}
          className={styles.input}
          type="text"
          placeholder={placeholder}
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
      );
  }
}

/** Contraseña: oculta, con «Mostrar» / «Ocultar» (texto, sin ícono nuevo) para revisarla en el celular. */
function PasswordInput({
  control,
  placeholder,
  value,
  onChange,
}: {
  control: ControlAttributes;
  placeholder?: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <input
        {...control}
        className={styles.input}
        type={shown ? 'text' : 'password'}
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
      <button
        type="button"
        className={styles.reveal}
        disabled={control.disabled}
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
      >
        {shown ? copy.ui.field.hidePassword : copy.ui.field.showPassword}
      </button>
    </>
  );
}

/**
 * Fecha escrita `dd/mm/aaaa`: guarda lo que se escribe (una fecha a medias o que no existe sigue a la vista) y entrega
 * la fecha o `null`. Si el valor cambia desde fuera, muestra el nuevo.
 */
function DateInput({
  control,
  placeholder,
  value,
  onChange,
  calendarTrigger,
}: Extract<FieldProps, { kind: 'date' }> & { control: ControlAttributes }) {
  const [text, setText] = useState(value === null ? '' : formatDate(value));
  const parsed = parseDisplayDate(text);
  const shown = parsed.ok ? parsed.value : null;
  // Ajuste durante el render (sin efecto): el texto sigue al valor solo cuando este no sale de lo escrito.
  if (value !== shown) setText(value === null ? '' : formatDate(value));
  return (
    <>
      {calendarTrigger ?? <Icon name="calendar" tone="tertiary" className={styles.adornment} />}
      <input
        {...control}
        className={styles.input}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          const result = parseDisplayDate(next);
          setText(next);
          onChange?.(result.ok ? result.value : null);
        }}
      />
    </>
  );
}

/**
 * #54: el texto largo crece con lo que se escribe, desde el alto mínimo del campo hasta su alto máximo (tokens
 * `--size-textarea` y `--size-textarea-max`); desde ahí se desplaza por dentro.
 */
function AutoGrowTextarea(props: ComponentProps<'textarea'>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  }, [props.value]);
  return <textarea ref={ref} {...props} />;
}
