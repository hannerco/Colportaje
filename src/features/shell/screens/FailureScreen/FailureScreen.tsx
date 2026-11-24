import { copy } from '@/copy/es';
import { Button } from '@/ui/atoms/Button';
import { Logo } from '@/ui/atoms/Logo';
import { Icon } from '@/ui/icons';
import styles from './FailureScreen.module.css';

export type FailureScreenProps = {
  /** `error`: algo falló al abrir la pantalla. `offline`: se abrió sin conexión antes de tener la app guardada. */
  kind: 'error' | 'offline';
  onRetry: () => void;
  /** Solo en `error`: un enlace para volver al inicio. */
  homeHref?: string;
};

const t = copy.app.failure;

/**
 * Página de error y «sin conexión» del arranque (lienzo «Marca · arranque», ronda 37): logo pequeño arriba, un mensaje
 * corto y una sola acción principal. Fuera del armazón (sin navegación): puede fallar antes de que exista.
 */
export function FailureScreen({ kind, onRetry, homeHref }: FailureScreenProps) {
  const error = kind === 'error';
  return (
    <main className={styles.page}>
      <div className={styles.logo}>
        <Logo variant="logotype" size={24} />
      </div>
      <div className={styles.body}>
        <Icon name={error ? 'alert' : 'offline'} size={40} tone="current" className={styles.icon} />
        <h1 className={styles.title}>{error ? t.errorTitle : t.offlineTitle}</h1>
        <p className={styles.message}>{error ? t.errorMessage : t.offlineMessage}</p>
        <div className={styles.actions}>
          <Button width="full" onClick={onRetry}>
            {t.retry}
          </Button>
          {error && homeHref && (
            <Button variant="tertiary" width="full" href={homeHref}>
              {t.goHome}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
