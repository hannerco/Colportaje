import { copy } from '@/copy/es';
import { Logo } from '@/ui/atoms/Logo';
import styles from './BootScreen.module.css';

/**
 * Pantalla de arranque (lienzo «Marca · arranque», ronda 37): mientras se abre la sesión, fondo de la app, el logo de
 * 96 centrado y debajo la frase de la marca. Sin animaciones: aparece y da paso a la pantalla pedida.
 */
export function BootScreen() {
  return (
    <main className={styles.boot} aria-busy="true">
      <Logo size={96} />
      <p className={styles.tagline}>{copy.app.tagline}</p>
    </main>
  );
}
