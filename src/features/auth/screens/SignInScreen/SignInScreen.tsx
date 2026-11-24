'use client';

import { useState, type FormEvent } from 'react';
import { copy } from '@/copy/es';
import { Button } from '@/ui/atoms/Button';
import { Field } from '@/ui/atoms/Field';
import { Logo } from '@/ui/atoms/Logo';
import { Icon } from '@/ui/icons';
import { Banner } from '@/ui/molecules/Banner';
import styles from './SignInScreen.module.css';

export type SignInScreenProps = {
  isOnline: boolean;
  /** Mientras la sesión se abre. */
  pending?: boolean;
  /** Por qué no se pudo entrar. `credentials` se muestra en el campo de la contraseña; lo demás, en una Franja. */
  error?: { kind: 'credentials' | 'other'; message: string } | null;
  /** Se llama con lo escrito (el correo sin espacios sobrantes). */
  onSubmit: (credentials: { email: string; password: string }) => void | Promise<void>;
  /** El usuario volvió a escribir: quien la usa limpia el error. */
  onEdit?: () => void;
  /**
   * Entrar con Google (ronda 34, #41). Con él, la pantalla muestra solo «Continuar con Google» (no hay contraseñas);
   * sin él, el formulario de correo y contraseña de siempre (transición mientras se configura Google).
   */
  google?: { onClick: () => void; pending?: boolean };
};

const t = copy.auth.signIn;
const [taglineStart, taglineEnd] = copy.app.tagline.split(', ');

/**
 * Entrar (HU-PAN-BASE-02, BR-USR-02; diseño: Propuesta 9 del lienzo, Login.dc.html). Escritorio: a la izquierda el
 * panel marino de la marca con la puerta grande, la frase y la cita; a la derecha, solo lo necesario para entrar.
 * Móvil: el panel arriba y una hoja que sube con la acción, al alcance del pulgar. Sin conexión avisa y no deja entrar.
 */
export function SignInScreen({
  isOnline,
  pending = false,
  error = null,
  onSubmit,
  onEdit,
  google,
}: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const ready = email.trim() !== '' && password !== '';
  const canSubmit = ready && isOnline && !pending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) void onSubmit({ email: email.trim(), password });
  };

  return (
    <div className={styles.page}>
      <section className={styles.brand} aria-label={copy.app.name}>
        <Logo variant="logotype" size={28} onBrand />
        <div className={styles.door}>
          <Logo variant="mark" size={300} onBrand decorative />
        </div>
        <div className={styles.motto}>
          <p className={styles.tagline}>
            {taglineStart},<br />
            {taglineEnd}
          </p>
          <p className={styles.quote}>
            {t.quote}
            <span className={styles.source}>{t.quoteSource}</span>
          </p>
        </div>
      </section>

      <main className={styles.main}>
        {google ? (
          <div className={styles.column}>
            <header className={styles.header}>
              <h1 className={styles.title}>{t.heading}</h1>
              <p className={styles.subtitle}>{t.googleSubtitle}</p>
            </header>
            <Button
              variant="secondary"
              width="full"
              state={google.pending || pending ? 'loading' : isOnline ? 'normal' : 'disabled'}
              loadingText={t.googleOpening}
              onClick={google.onClick}
            >
              {t.google}
            </Button>
            {error && <Banner tone="overdue">{error.message}</Banner>}
            {!isOnline && <Banner tone="offline">{t.offline}</Banner>}
            <hr className={styles.rule} />
            <p className={styles.help}>
              <Icon name="info" tone="current" className={styles.helpIcon} />
              {t.noSignUp}
            </p>
            <p className={styles.mobileQuote}>{t.quote}</p>
          </div>
        ) : (
          <form className={styles.column} onSubmit={submit} noValidate>
            <header className={styles.header}>
              <h1 className={styles.title}>{t.heading}</h1>
              <p className={styles.subtitle}>{t.subtitle}</p>
            </header>
            {!isOnline && <Banner tone="offline" />}
            {error?.kind === 'other' && <Banner tone="overdue">{error.message}</Banner>}
            <Field
              kind="email"
              label={t.email}
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(next) => {
                setEmail(next);
                onEdit?.();
              }}
            />
            <Field
              kind="password"
              label={t.password}
              value={password}
              onChange={(next) => {
                setPassword(next);
                onEdit?.();
              }}
              error={error?.kind === 'credentials' ? error.message : undefined}
            />
            <Button
              type="submit"
              width="full"
              state={pending ? 'loading' : canSubmit ? 'normal' : 'disabled'}
              loadingText={t.submitting}
            >
              {t.submit}
            </Button>
            <p className={styles.mobileQuote}>{t.quote}</p>
          </form>
        )}
      </main>
    </div>
  );
}
