'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import { Choice, ChoiceGroup } from '../../atoms/Choice';
import { Icon } from '../../icons';
import { Menu } from '../../molecules/Menu';
import { SearchBox, type SearchBoxProps } from '../../molecules/SearchBox';
import { Tabs, type TabsProps } from '../../molecules/Tabs';
import { usePlatform } from '../../platform';
import styles from './ViewBar.module.css';

export type SortDirection = 'asc' | 'desc';

export type ViewBarFilters = {
  /** Nombre del botón de filtros, p. ej. «Estado» o «Método». */
  label: string;
  /** Las opciones del filtro (las pone la pantalla, p. ej. casillas de estado): menú en escritorio, hoja en móvil. */
  panel: ReactNode;
  /** Filtros aplicados, como chips que se pueden quitar. */
  activeChips: { id: string; label: string }[];
  onRemove: (id: string) => void;
  onClear: () => void;
  /** Al abrir el menú o la hoja de filtros. */
  onOpen?: () => void;
};

export type ViewBarSort = {
  /** Opciones de orden de la lista (las define la HU de back de cada módulo). */
  options: { id: string; label: string }[];
  value: string;
  direction: SortDirection;
  onChange: (sort: { value: string; direction: SortDirection }) => void;
};

export type ViewBarProps = {
  /** Vistas de la lista (pestañas). */
  views: TabsProps;
  search: SearchBoxProps;
  filters?: ViewBarFilters;
  sort?: ViewBarSort;
  className?: string;
};

/**
 * Barra de vista (HU-UI-28, ADR-0029: un único componente): pestañas, buscador, filtros, orden y chips de filtros
 * activos. Escritorio: buscador de 300, botón de filtros con su menú, chip de orden en acento con el sentido al lado y
 * «Limpiar». Móvil: buscador de 52 con el botón de filtros dentro, que abre la hoja «Filtrar / Ordenar».
 */
export function ViewBar({ views, search, filters, sort, className }: ViewBarProps) {
  const mobile = usePlatform() === 'mobile';
  const [sheet, setSheet] = useState<'filter' | 'sort' | null>(null);
  const chips = filters?.activeChips ?? [];

  const openSheet = () => {
    filters?.onOpen?.();
    setSheet(filters ? 'filter' : 'sort');
  };

  return (
    <div
      role="region"
      aria-label={copy.ui.viewBar.region}
      className={[styles.bar, className].filter(Boolean).join(' ')}
    >
      <Tabs {...views} />
      <div className={styles.tools}>
        <SearchBox
          {...search}
          filters={mobile && (filters || sort) ? 'show' : 'hide'}
          activeFilterCount={chips.length}
          onOpenFilters={openSheet}
        />
        {!mobile && filters && <FilterPopover filters={filters} />}
        {!mobile && sort && <SortControl sort={sort} />}
      </div>
      {chips.length > 0 &&
        (mobile ? (
          <MobileChips filters={filters!} onOpenSheet={openSheet} />
        ) : (
          <div className={styles.chips}>
            {chips.map((chip) => (
              <ActiveChip key={chip.id} chip={chip} onRemove={filters!.onRemove} />
            ))}
            <Button variant="link" size="compact" onClick={filters!.onClear}>
              {copy.ui.viewBar.clear}
            </Button>
          </div>
        ))}
      {mobile && (filters || sort) && (
        <FilterSheet tab={sheet} onTabChange={setSheet} filters={filters} sort={sort} />
      )}
    </div>
  );
}

function ActiveChip({
  chip,
  onRemove,
}: {
  chip: { id: string; label: string };
  onRemove: (id: string) => void;
}) {
  return (
    <Chip kind="filter" selected removable onRemove={() => onRemove(chip.id)}>
      {chip.label}
    </Chip>
  );
}

/** El ámbito de tema y plataforma más cercano, para pintar ahí las capas flotantes (un marco del Storybook o el body). */
function useScope() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const ref = useCallback(
    (node: HTMLSpanElement | null) => setContainer(node?.closest<HTMLElement>('[data-ui-scope]') ?? null),
    [],
  );
  return [container ?? undefined, ref] as const;
}

// ─── Escritorio ───

/** R7: el botón «Estado» abre su menú de filtros (las opciones las pone la pantalla). */
function FilterPopover({ filters }: { filters: ViewBarFilters }) {
  const [container, scopeRef] = useScope();
  return (
    <Popover.Root onOpenChange={(open) => open && filters.onOpen?.()}>
      <span ref={scopeRef} hidden />
      <Popover.Trigger asChild>
        <Button variant="secondary" size="compact" icon="filter">
          {filters.activeChips.length > 0
            ? `${filters.label} · ${filters.activeChips.length}`
            : filters.label}
        </Button>
      </Popover.Trigger>
      <Popover.Portal container={container}>
        <Popover.Content
          className={styles.popover}
          align="start"
          sideOffset={6}
          collisionPadding={8}
          aria-label={filters.label}
        >
          {filters.panel}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** CA-4: chip de orden en acento (abre las opciones) y el sentido como segmento. */
function SortControl({ sort }: { sort: ViewBarSort }) {
  const current = sort.options.find((option) => option.id === sort.value);
  return (
    <span className={styles.sort}>
      <Menu
        selectable
        value={sort.value}
        items={sort.options}
        title={copy.ui.viewBar.sortBy}
        onSelect={(value) => sort.onChange({ value, direction: sort.direction })}
        trigger={
          <button type="button" className={styles.sortChip}>
            <Icon name="sort" size={14} tone="current" />
            <span className={styles.visuallyHidden}>{copy.ui.viewBar.sortBy} </span>
            {current?.label}
            <Icon name="expand" size={14} tone="current" />
          </button>
        }
      />
      <DirectionControl sort={sort} />
    </span>
  );
}

function DirectionControl({ sort, wide = false }: { sort: ViewBarSort; wide?: boolean }) {
  return (
    <RadioGroup.Root
      className={styles.direction}
      data-wide={wide || undefined}
      value={sort.direction}
      onValueChange={(direction) =>
        sort.onChange({ value: sort.value, direction: direction as SortDirection })
      }
      orientation="horizontal"
      aria-label={copy.ui.viewBar.direction}
    >
      {(['asc', 'desc'] as const).map((direction) => (
        <RadioGroup.Item
          key={direction}
          value={direction}
          className={styles.directionItem}
          data-direction={direction}
          title={copy.ui.viewBar[direction]}
        >
          <Icon name="expand" size={16} tone="current" />
          {wide ? (
            copy.ui.viewBar[direction]
          ) : (
            <span className={styles.visuallyHidden}>{copy.ui.viewBar[direction]}</span>
          )}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

// ─── Móvil ───

/** R6: los chips en una sola fila; si no caben, se resumen en «Filtros (3)», que abre la hoja. */
function MobileChips({ filters, onOpenSheet }: { filters: ViewBarFilters; onOpenSheet: () => void }) {
  const measure = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);
  const count = filters.activeChips.length;

  // Una copia invisible con todos los chips dice si caben en el ancho de la fila.
  useEffect(() => {
    const el = measure.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setFits(el.scrollWidth <= el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  const chips = filters.activeChips.map((chip) => (
    <ActiveChip key={chip.id} chip={chip} onRemove={filters.onRemove} />
  ));
  return (
    <div className={styles.mobileChips}>
      <div ref={measure} className={styles.measure} aria-hidden="true" inert>
        {chips}
      </div>
      {fits ? (
        chips
      ) : (
        <Chip kind="filter" selected onClick={onOpenSheet}>
          {copy.ui.viewBar.summary(count)}
        </Chip>
      )}
    </div>
  );
}

/** R6: la hoja «Filtrar / Ordenar», con dos pestañas. */
function FilterSheet({
  tab,
  onTabChange,
  filters,
  sort,
}: {
  tab: 'filter' | 'sort' | null;
  onTabChange: (tab: 'filter' | 'sort' | null) => void;
  filters?: ViewBarFilters;
  sort?: ViewBarSort;
}) {
  const [container, scopeRef] = useScope();
  const items = [
    ...(filters ? [{ id: 'filter', label: copy.ui.viewBar.filterTab }] : []),
    ...(sort ? [{ id: 'sort', label: copy.ui.viewBar.sortTab }] : []),
  ];
  return (
    <Dialog.Root open={tab !== null} onOpenChange={(open) => !open && onTabChange(null)}>
      <span ref={scopeRef} hidden />
      <Dialog.Portal container={container}>
        <Dialog.Overlay className={styles.scrim} />
        <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
          <span className={styles.handle} aria-hidden="true" />
          <Dialog.Title className={styles.sheetTitle}>{copy.ui.viewBar.sheetTitle}</Dialog.Title>
          {items.length > 1 && (
            <Tabs
              variant="segmented"
              items={items}
              value={tab ?? 'filter'}
              onValueChange={(next) => onTabChange(next as 'filter' | 'sort')}
              aria-label={copy.ui.viewBar.sheetTitle}
            />
          )}
          <div className={styles.sheetBody}>
            {tab === 'filter' && filters && (
              <>
                {filters.panel}
                {filters.activeChips.length > 0 && (
                  <Button variant="link" size="compact" onClick={filters.onClear}>
                    {copy.ui.viewBar.clear}
                  </Button>
                )}
              </>
            )}
            {tab === 'sort' && sort && (
              <>
                <ChoiceGroup
                  legend={copy.ui.viewBar.sortBy}
                  value={sort.value}
                  onValueChange={(value) => sort.onChange({ value, direction: sort.direction })}
                >
                  {sort.options.map((option) => (
                    <Choice key={option.id} kind="radio" value={option.id} label={option.label} />
                  ))}
                </ChoiceGroup>
                <DirectionControl sort={sort} wide />
              </>
            )}
          </div>
          <Dialog.Close asChild>
            <Button width="full">{copy.ui.viewBar.done}</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
