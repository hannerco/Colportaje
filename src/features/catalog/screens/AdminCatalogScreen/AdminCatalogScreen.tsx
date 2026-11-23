'use client';

import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { formatCOP, type COP } from '@/domain/money';
import { normalizeForSearch } from '@/domain/text';
import { CATEGORY_ORDER, type Title, type TitleCategory, type TitleFieldsDraft } from '@/domain/title';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import { Choice, ChoiceGroup } from '@/ui/atoms/Choice';
import { Field } from '@/ui/atoms/Field';
import { SearchBox } from '@/ui/molecules/SearchBox';
import { DetailWindow } from '@/ui/organisms/DetailWindow';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import type { AppNavProps } from '@/ui/organisms/AppNav';
import { usePlatform } from '@/ui/platform';
import { RowsSkeleton } from '@/ui/templates/ListTemplate';
import { ShellScreen } from '@/features/shell';
import styles from './AdminCatalogScreen.module.css';

/** Resultado de guardar: bien, o el mensaje (junto al campo que falló, si se sabe). */
export type SaveOutcome = { ok: true } | { ok: false; message: string; field?: string };

export type AdminCatalogScreenProps = {
  /** La navegación del armazón (`useAppShell().nav`). */
  nav: AppNavProps;
  /** Franja de sin conexión. */
  banner?: ReactNode;
  isOnline: boolean;
  /** Si el usuario es admin; sin valor mientras carga el perfil. */
  isAdmin?: boolean;
  /** Catálogo · Usuarios (las partes de Admin, ronda 34). */
  sections?: ReactNode;
  /** `useAllTitles().data`; sin valor mientras carga o si falló. */
  titles?: readonly Title[];
  error?: boolean;
  onRetry?: () => void;
  /** Crea (`id` nuevo) o cambia (`id` existente) un título. El contenedor pone el Aviso. */
  onSave: (input: { id: string; isNew: boolean; fields: TitleFieldsDraft }) => Promise<SaveOutcome>;
  /** Genera el id de un título nuevo (BR-GEN-04). */
  newId: () => string;
  /** Pone o cambia la portada. Devuelve si salió bien (el contenedor ya avisó si no). */
  onSetCover: (titleId: string, file: File) => Promise<boolean>;
  /** Quita la portada. Devuelve si salió bien. */
  onRemoveCover: (titleId: string) => Promise<boolean>;
  /** Ruta de Admin (vuelta de la ventana en móvil). */
  backHref: string;
};

const t = copy.admin;

/** Un formulario vacío: cultural, activo, sin precios. */
const EMPTY: TitleFieldsDraft = {
  name: '',
  author: null,
  description: null,
  publicPrice: null,
  colportorPrice: null,
  category: 'cultural',
  isActive: true,
};

const fieldsOf = (title: Title): TitleFieldsDraft => ({
  name: title.name,
  author: title.author,
  description: title.description,
  publicPrice: title.publicPrice,
  colportorPrice: title.colportorPrice,
  category: title.category,
  isActive: title.isActive,
});

const matches = (title: Title, query: string): boolean => {
  const q = normalizeForSearch(query);
  return !q || normalizeForSearch(`${title.name} ${title.author ?? ''}`).includes(q);
};

/**
 * Admin · Catálogo (HU-PAN-ADM-01, pedido del dueño, 2026-11-22; sin diseño del lienzo, armado con la biblioteca): la
 * lista de títulos por categoría con buscador, y una ventana para crear o editar un título (nombre, autor, descripción,
 * categoría, precios, activo y portada). Un título no se borra: se desactiva (BR-TIT-03).
 */
export function AdminCatalogScreen(props: AdminCatalogScreenProps) {
  const { titles, isOnline } = props;
  const mobile = usePlatform() === 'mobile';
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ id: string; isNew: boolean } | null>(null);

  const visible = useMemo(() => (titles ?? []).filter((title) => matches(title, query)), [titles, query]);
  const editingTitle =
    editing && !editing.isNew ? titles?.find((title) => title.id === editing.id) : undefined;

  const body = (() => {
    if (props.isAdmin === false)
      return (
        <EmptyState
          kind="empty"
          icon="admin"
          title={t.catalog.notAdmin.title}
          text={t.catalog.notAdmin.text}
        />
      );
    if (!titles || props.isAdmin === undefined)
      return props.error ? (
        <EmptyState
          kind="error"
          title={t.catalog.error.title}
          text={t.catalog.error.text}
          action={props.onRetry ? { label: copy.errors.retry, onClick: props.onRetry } : undefined}
        />
      ) : (
        <RowsSkeleton leading="cover" />
      );
    if (titles.length === 0)
      return (
        <EmptyState
          kind="empty"
          icon="books"
          title={t.catalog.empty.title}
          text={t.catalog.empty.text}
          action={{
            label: t.catalog.newTitle,
            icon: 'add',
            onClick: () => setEditing({ id: props.newId(), isNew: true }),
            disabled: !isOnline,
          }}
        />
      );
    if (visible.length === 0)
      return <EmptyState kind="no-results" title={t.catalog.noResults.title(query.trim())} />;
    return (
      <Island title={t.catalog.title} icon="books">
        {CATEGORY_ORDER.map((category) => {
          const group = visible.filter((title) => title.category === category);
          if (group.length === 0) return null;
          const label = t.catalog.categories[category];
          return (
            <section key={category} aria-label={label}>
              <h3 className={styles.subheading}>{t.catalog.section(label, group.length)}</h3>
              <ul className={styles.titles}>
                {group.map((title) => (
                  <li key={title.id}>
                    <button
                      type="button"
                      className={styles.titleRow}
                      aria-current={editing?.id === title.id ? 'true' : undefined}
                      onClick={() => setEditing({ id: title.id, isNew: false })}
                    >
                      <Avatar kind="cover" coverUrl={title.imageUrl ?? undefined} decorative />
                      <span className={styles.titleText}>
                        <span className={styles.titleName}>{title.name}</span>
                        <span className={styles.secondary}>{title.author ?? t.catalog.noAuthor}</span>
                        <span className={styles.secondary}>
                          {t.catalog.prices(
                            title.publicPrice === null ? null : formatCOP(title.publicPrice),
                            formatCOP(title.colportorPrice),
                          )}
                        </span>
                      </span>
                      {!title.isActive && <span className={styles.inactive}>{t.catalog.inactive}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </Island>
    );
  })();

  const showToolbar = props.isAdmin === true && titles !== undefined && titles.length > 0;

  return (
    <ShellScreen nav={props.nav} title={copy.ui.nav.items.admin} banner={props.banner}>
      <div className={styles.screen} data-shape={mobile ? 'mobile' : 'desktop'}>
        {props.isAdmin && props.sections}
        {showToolbar && (
          <div className={styles.toolbar}>
            <SearchBox
              value={query}
              onValueChange={setQuery}
              placeholder={t.catalog.search}
              filters="hide"
              width={mobile ? undefined : 'auto'}
              resultsAnnouncement={t.catalog.results(visible.length)}
              className={styles.search}
            />
            <Button
              variant="primary"
              icon="add"
              width={mobile ? 'full' : 'auto'}
              state={isOnline ? 'normal' : 'disabled'}
              onClick={() => setEditing({ id: props.newId(), isNew: true })}
            >
              {t.catalog.newTitle}
            </Button>
          </div>
        )}
        {body}
      </div>

      {editing && (
        <DetailWindow
          mode={mobile ? 'page' : 'center'}
          title={editingTitle?.name ?? t.editor.newTitle}
          breadcrumb={{ label: copy.ui.nav.items.admin, href: props.backHref }}
          onClose={() => setEditing(null)}
          className={mobile ? styles.editorPage : undefined}
        >
          {!editing.isNew && !editingTitle ? (
            // Recién creado: se espera a que vuelva de la base para mostrarlo con su portada.
            <RowsSkeleton leading="cover" />
          ) : (
            <TitleEditor
              key={editing.id}
              id={editing.id}
              title={editingTitle}
              isOnline={isOnline}
              onCancel={() => setEditing(null)}
              onSave={async (fields) => {
                const outcome = await props.onSave({ id: editing.id, isNew: editing.isNew, fields });
                // Un título nuevo queda abierto ya creado: así se le puede poner portada enseguida.
                if (outcome.ok) setEditing(editing.isNew ? { id: editing.id, isNew: false } : null);
                return outcome;
              }}
              onSetCover={props.onSetCover}
              onRemoveCover={props.onRemoveCover}
            />
          )}
        </DetailWindow>
      )}
    </ShellScreen>
  );
}

type TitleEditorProps = {
  id: string;
  /** El título que se edita; sin él, es uno nuevo. */
  title?: Title;
  isOnline: boolean;
  onCancel: () => void;
  onSave: (fields: TitleFieldsDraft) => Promise<SaveOutcome>;
  onSetCover: (titleId: string, file: File) => Promise<boolean>;
  onRemoveCover: (titleId: string) => Promise<boolean>;
};

function TitleEditor({ id, title, isOnline, onCancel, onSave, onSetCover, onRemoveCover }: TitleEditorProps) {
  const [fields, setFields] = useState<TitleFieldsDraft>(title ? fieldsOf(title) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{ message: string; field?: string } | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const formId = useId();

  const set = <K extends keyof TitleFieldsDraft>(key: K, value: TitleFieldsDraft[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (failure?.field === key) setFailure(null);
  };
  const fieldError = (key: keyof typeof t.editor.errors) =>
    failure?.field === key ? t.editor.errors[key] : undefined;

  const save = async () => {
    if (saving || !isOnline) return;
    setSaving(true);
    setFailure(null);
    try {
      const outcome = await onSave(fields);
      if (!outcome.ok)
        setFailure({ message: outcome.message, ...(outcome.field ? { field: outcome.field } : {}) });
    } finally {
      setSaving(false);
    }
  };

  const cover = async (run: () => Promise<boolean>) => {
    setCoverBusy(true);
    try {
      await run();
    } finally {
      setCoverBusy(false);
    }
  };

  return (
    <form
      id={formId}
      className={styles.editor}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Island title={t.editor.cover} icon="books">
        {title ? (
          <div className={styles.cover}>
            <Avatar
              kind="cover"
              size="xl"
              coverUrl={title.imageUrl ?? undefined}
              name={t.editor.coverAlt(title.name)}
            />
            <div className={styles.coverActions}>
              <Button
                variant="secondary"
                size="compact"
                icon="add"
                state={coverBusy ? 'loading' : isOnline ? 'normal' : 'disabled'}
                onClick={() => input.current?.click()}
              >
                {title.imageUrl ? t.editor.changeCover : t.editor.addCover}
              </Button>
              {title.imageUrl && (
                <Button
                  variant="tertiary"
                  size="compact"
                  state={coverBusy || !isOnline ? 'disabled' : 'normal'}
                  onClick={() => void cover(() => onRemoveCover(id))}
                >
                  {t.editor.removeCover}
                </Button>
              )}
              <input
                ref={input}
                className={styles.fileInput}
                type="file"
                accept="image/*"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void cover(() => onSetCover(id, file));
                }}
              />
            </div>
          </div>
        ) : (
          <p className={styles.muted}>{t.editor.coverAfterSave}</p>
        )}
      </Island>

      <Island>
        <div className={styles.fields}>
          <Field
            label={t.editor.name}
            value={fields.name}
            onChange={(value) => set('name', value)}
            error={fieldError('name')}
          />
          <Field
            label={t.editor.author}
            placeholder={t.editor.authorPlaceholder}
            value={fields.author ?? ''}
            onChange={(value) => set('author', value)}
          />
          <Field
            kind="textarea"
            label={t.editor.description}
            placeholder={t.editor.descriptionPlaceholder}
            value={fields.description ?? ''}
            onChange={(value) => set('description', value)}
          />
          <ChoiceGroup
            legend={t.editor.category}
            value={fields.category}
            onValueChange={(value) => set('category', value as TitleCategory)}
          >
            {CATEGORY_ORDER.map((category) => (
              <Choice key={category} kind="radio" value={category} label={t.catalog.categories[category]} />
            ))}
          </ChoiceGroup>
          <Field
            kind="money"
            label={t.editor.publicPrice}
            help={fields.category === 'minibook' ? t.editor.publicPriceHelp : undefined}
            value={fields.publicPrice}
            onChange={(value: COP | null) => set('publicPrice', value)}
            error={fieldError('publicPrice')}
          />
          <Field
            kind="money"
            label={t.editor.colportorPrice}
            value={fields.colportorPrice}
            onChange={(value: COP | null) => set('colportorPrice', value)}
            error={fieldError('colportorPrice')}
          />
          {title && <p className={styles.muted}>{t.editor.pricesHint}</p>}
          <Choice
            kind="switch"
            label={t.editor.active}
            description={t.editor.activeHelp}
            checked={fields.isActive}
            onCheckedChange={(checked) => set('isActive', checked)}
          />
        </div>
      </Island>

      {failure && !failure.field && (
        <p className={styles.failure} role="alert">
          {failure.message}
        </p>
      )}
      {!isOnline && <p className={styles.muted}>{copy.ui.empty.needsConnection}</p>}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" state={saving ? 'loading' : isOnline ? 'normal' : 'disabled'}>
          {t.editor.save}
        </Button>
        <Button variant="tertiary" onClick={onCancel}>
          {t.editor.cancel}
        </Button>
      </div>
    </form>
  );
}
