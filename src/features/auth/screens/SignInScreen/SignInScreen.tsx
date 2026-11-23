'use client';

import { useState, type FormEvent } from 'react';
import { copy } from '@/copy/es';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import { Field } from '@/ui/atoms/Field';
import { Banner } from '@/ui/molecules/Banner';
import { Island } from '@/ui/organisms/Island';
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

/**
 * Iniciar sesión (HU-PAN-BASE-02, BR-USR-02): una isla centrada con el nombre de la app, el correo, la contraseña y
 * «Entrar». Sin conexión avisa con la Franja y no deja entrar (no hay cómo comprobar la clave). Sin diseño del dueño
 * (OQ-44): se armó con la biblioteca. Pantalla de presentación: la sesión la abre quien la usa.
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

  if (google)
    return (
      <main className={styles.page}>
        <div className={styles.column}>
          {!isOnline && <Banner tone="offline" />}
          <Island>
            <div className={styles.form}>
              <header className={styles.brand}>
                <Avatar kind="brand" size="xl" decorative />
                <h1 className={styles.title}>{copy.app.name}</h1>
                <p className={styles.subtitle}>{t.googleSubtitle}</p>
              </header>
              {error && <Banner tone="overdue">{error.message}</Banner>}
              <Button
                variant="secondary"
                width="full"
                state={google.pending || pending ? 'loading' : isOnline ? 'normal' : 'disabled'}
                loadingText={t.googleOpening}
                onClick={google.onClick}
              >
                {t.google}
              </Button>
              {!isOnline && <p className={styles.subtitle}>{copy.ui.empty.needsConnection}</p>}
            </div>
          </Island>
        </div>
      </main>
    );

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        {!isOnline && <Banner tone="offline" />}
        <Island>
          <form className={styles.form} onSubmit={submit} noValidate>
            <header className={styles.brand}>
              <Avatar kind="brand" size="xl" decorative />
              <h1 className={styles.title}>{copy.app.name}</h1>
              <p className={styles.subtitle}>{t.subtitle}</p>
            </header>
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
          </form>
        </Island>
      </div>
    </main>
  );
}
