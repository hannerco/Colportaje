'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import { Icon } from '@/ui/icons';
import { Popover } from '@/ui/molecules/Popover';
import { SearchBox } from '@/ui/molecules/SearchBox';
import { DetailWindow } from '@/ui/organisms/DetailWindow';
import { usePlatform } from '@/ui/platform';
import {
  CATEGORY_ICON,
  buildEmojiGroups,
  filterEmojis,
  pushRecent,
  type CatalogEntry,
  type EmojiCategory,
} from './emoji-data';
import styles from './EmojiAvatar.module.css';

export type EmojiAvatarProps = {
  /** El emoji del cliente; `null` = avatar de persona. */
  emoji: string | null;
  /** Elegir (`emoji`) o quitar (`null`). Sin función, el avatar no se puede tocar. */
  onChange?: (emoji: string | null) => void;
  /** Por qué no se puede cambiar ahora (sin nombre, sin conexión, archivado). */
  disabledReason?: string | null;
  /** Ruta de vuelta de la hoja en móvil. */
  backHref: string;
};

const t = copy.customers.emoji;

/**
 * Avatar del cliente con su selector de emoji (BR-CUS-15, FC-02, #34; propuesta 4 del lienzo): al tocarlo se abre una
 * hoja (móvil) o un panel junto al avatar (escritorio) con búsqueda en español y grupos cortos; «Quitar» vuelve al
 * avatar de persona. Se cierra al elegir.
 */
export function EmojiAvatar({ emoji, onChange, disabledReason, backHref }: EmojiAvatarProps) {
  const mobile = usePlatform() === 'mobile';
  const [open, setOpen] = useState(false);
  const disabled = !onChange || Boolean(disabledReason);
  const pick = (next: string | null) => {
    onChange?.(next);
    setOpen(false);
  };

  const trigger = (
    <button
      type="button"
      className={styles.trigger}
      aria-label={emoji ? t.change : t.choose}
      aria-haspopup="dialog"
      disabled={disabled}
      title={disabledReason ?? undefined}
      onClick={mobile ? () => setOpen(true) : undefined}
    >
      <Avatar kind={emoji ? 'emoji' : 'person'} emoji={emoji ?? undefined} size="xl" decorative />
      {!disabled && (
        <span className={styles.badge} aria-hidden="true">
          <Icon name="edit" size={12} tone="current" />
        </span>
      )}
    </button>
  );

  const picker = <EmojiPicker selected={emoji} onPick={pick} />;

  if (mobile)
    return (
      <>
        {trigger}
        {open && (
          <DetailWindow
            mode="sheet"
            title={t.title}
            breadcrumb={{ label: t.title, href: backHref }}
            onClose={() => setOpen(false)}
          >
            {picker}
          </DetailWindow>
        )}
      </>
    );
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={trigger} title={t.title}>
      {picker}
    </Popover>
  );
}

const RECENT_KEY = 'colportor:emoji-recent';

const readRecent = (): string[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/**
 * Selector de emoji (#63): buscador, pestañas por categoría (Recientes, Caras, Personas, Animales, Comida, Viajes,
 * Actividades, Objetos, Símbolos y Banderas) y todos los emojis; tocar una pestaña lleva a su grupo. El catálogo se
 * carga al abrir (no pesa en el resto de la app).
 */
function EmojiPicker({
  selected,
  onPick,
}: {
  selected: string | null;
  onPick: (emoji: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<readonly CatalogEntry[] | null>(null);
  const [recent] = useState(readRecent);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    void import('./emoji-catalog.json').then((module) => {
      if (alive) setCatalog(module.default as unknown as CatalogEntry[]);
    });
    return () => {
      alive = false;
    };
  }, []);
  const all = useMemo(
    () => (catalog ? buildEmojiGroups(catalog, recent, t.categories) : []),
    [catalog, recent],
  );
  const groups = filterEmojis(query, all);
  const count = groups.filter((g) => g.id !== 'recent').reduce((sum, g) => sum + g.items.length, 0);
  const pick = (emoji: string | null) => {
    if (emoji)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(pushRecent(readRecent(), emoji)));
      } catch {
        // Sin almacenamiento: no se recuerdan los recientes.
      }
    onPick(emoji);
  };
  const goTo = (id: string) =>
    scroller.current?.querySelector<HTMLElement>(`[data-group="${id}"]`)?.scrollIntoView({ block: 'start' });

  return (
    <div className={styles.picker}>
      <div className={styles.tools}>
        <SearchBox value={query} onValueChange={setQuery} placeholder={t.search} filters="hide" />
        {selected && (
          <Button variant="tertiary" onClick={() => pick(null)}>
            {t.remove}
          </Button>
        )}
      </div>
      {!query && all.length > 0 && (
        <div className={styles.categories} role="group" aria-label={t.categoriesLabel}>
          {all.map((group) => (
            <button
              key={group.id}
              type="button"
              className={styles.category}
              aria-label={group.label}
              title={group.label}
              onClick={() => goTo(group.id)}
            >
              {CATEGORY_ICON[group.id as EmojiCategory]}
            </button>
          ))}
        </div>
      )}
      <div ref={scroller} className={styles.scroller}>
        {!catalog ? (
          <p role="status" className={styles.empty}>
            {copy.ui.empty.loading}
          </p>
        ) : groups.length === 0 ? (
          <p className={styles.empty}>{t.noResults}</p>
        ) : (
          groups.map((group) => (
            <section key={group.id} data-group={group.id} className={styles.group} aria-label={group.label}>
              <h3 className={styles.groupLabel}>{group.label}</h3>
              <div className={styles.grid}>
                {group.items.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    className={styles.emoji}
                    aria-label={item.label ?? item.name}
                    aria-pressed={item.emoji === selected}
                    onClick={() => pick(item.emoji)}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      {catalog && <p className={styles.count}>{t.count(count)}</p>}
    </div>
  );
}
