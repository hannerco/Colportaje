import styles from './MapPin.module.css';

/** Pin fijo en el centro del mapa (diseño «8 · Elegir ubicación»): la punta toca el centro; el mapa se mueve debajo. */
export function MapPin({ label }: { label?: string }) {
  return (
    <>
      <span className={styles.shadow} aria-hidden="true" />
      <svg
        className={styles.pin}
        viewBox="0 0 36 46"
        {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      >
        <path d="M18 45s15-13.5 15-26A15 15 0 0 0 3 19c0 12.5 15 26 15 26z" fill="currentColor" />
        <circle className={styles.dot} cx="18" cy="18.5" r="5.5" />
      </svg>
    </>
  );
}
