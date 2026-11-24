import { copy } from '@/copy/es';
import { Icon } from '../../icons';
import { Logo } from '../Logo';
import styles from './Avatar.module.css';

export type AvatarKind = 'person' | 'emoji' | 'cover' | 'brand';
export type AvatarSize = 'auto' | 'sm' | 'md' | 'lg' | 'xl';

export type AvatarProps = {
  /** Tipo (`tipo`): cliente sin emoji, cliente con emoji, portada de un libro o marca. */
  kind?: AvatarKind;
  /** Emoji que eligió el colportor (`emoji`). Solo en `emoji`. */
  emoji?: string;
  /** Imagen del título (DT-10). Solo en `cover`; sin ella se dibuja el ícono `books`. */
  coverUrl?: string;
  /** Lado (`tamano`): sm 24 · md 32 · lg 40 · xl 56. `auto`: md en escritorio y lg en móvil; la marca, siempre md. */
  size?: AvatarSize;
  /** Nombre accesible (`nombre`): el del cliente. En portada y marca, por defecto «Portada» y «Colportor». */
  name?: string;
  /** El nombre ya está al lado: el avatar se oculta al lector de pantalla para no leerlo dos veces. */
  decorative?: boolean;
  className?: string;
};

/**
 * Avatar (HU-UI-08, ficha Lib-Avatar): identifica a un cliente (ícono de persona o su emoji), a un libro (portada) o
 * a la marca. El tamaño automático cambia con la plataforma por tokens (`--size-avatar`).
 */
export function Avatar({
  kind = 'person',
  emoji,
  coverUrl,
  size = 'auto',
  name,
  decorative = false,
  className,
}: AvatarProps) {
  const side = kind === 'brand' && size === 'auto' ? 'md' : size;
  const label = name ?? (kind === 'cover' || kind === 'brand' ? copy.ui.avatar[kind] : copy.ui.avatar.person);
  return (
    <span
      className={[styles.avatar, className].filter(Boolean).join(' ')}
      data-kind={kind}
      data-size={side}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
    >
      {kind === 'brand' ? (
        // Ronda 37: la marca es el Logo elegido como ícono de app (cuadro accent y marca blanca al 60 %).
        <Logo variant="app-icon" size={BRAND_SIDE[side === 'auto' ? 'md' : side]} decorative />
      ) : (
        <Content kind={kind} emoji={emoji} coverUrl={coverUrl} />
      )}
    </span>
  );
}

/** Lado de la marca en px (los mismos de `--size-avatar-*`). */
const BRAND_SIDE: Record<Exclude<AvatarSize, 'auto'>, number> = { sm: 24, md: 32, lg: 40, xl: 56 };

function Content({ kind, emoji, coverUrl }: Pick<AvatarProps, 'kind' | 'emoji' | 'coverUrl'>) {
  switch (kind) {
    case 'emoji':
      return <span className={styles.emoji}>{emoji}</span>;
    case 'cover':
      return coverUrl ? (
        // La portada viene del almacenamiento de Supabase y mide como mucho 45 × 70: no hace falta next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.image} src={coverUrl} alt="" />
      ) : (
        <Icon name="books" tone="current" className={styles.glyph} />
      );
    default:
      return <Icon name="person" tone="current" className={styles.glyph} />;
  }
}
