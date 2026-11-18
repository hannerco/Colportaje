import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { localDate } from '@/domain/time';
import { ListRow, ListTable, type ListRowKind, type ListRowProps } from './ListRow';

const label: Record<ListRowKind, string> = { customer: 'Clientes', payment: 'Abonos', copy: 'Ejemplares' };

const meta = {
  title: 'Moléculas/Fila de lista',
  component: ListRow,
  render: (args) => (
    <ListTable kind={args.kind} aria-label={label[args.kind]}>
      <ListRow {...args} />
    </ListTable>
  ),
  args: {
    kind: 'customer',
    title: 'María Camila Henao',
    avatar: { kind: 'emoji', emoji: '🌷' },
    books: { first: 'Las bellas historias de la Biblia', more: 2 },
    phone: '312 555 1234',
    amount: 120000,
    date: localDate('2026-11-02'),
    status: 'overdue',
    href: '#cliente',
  },
  argTypes: {
    kind: { control: 'inline-radio', options: ['customer', 'payment', 'copy'] },
    variant: { control: 'inline-radio', options: ['row', 'header'] },
    date: { control: 'text' },
  },
  parameters: {
    design: {
      ficha: 'Lib-FilaLista',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Listas de Clientes, Abonos de clientes, Abibonos y Ejemplares.',
        'La variante cabecera para los títulos de columna (escritorio) o de grupo (móvil).',
      ],
      whenNotToUse: ['Para datos sueltos de un detalle (Fila de dato).'],
      usedIn: ['Clientes', 'Abonos de clientes', 'Abibonos', 'Inventario'],
    },
    docs: {
      description: {
        component:
          'La fila de las listas principales. En escritorio es una fila de tabla con columnas y el nombre es el enlace al detalle; en móvil, una fila de dos líneas con el monto a la derecha y la fila entera es el enlace. Las filas van dentro de `ListTable`, que pone la tabla (escritorio) o la lista (móvil).',
      },
    },
  },
} satisfies Meta<typeof ListRow>;

export default meta;
// Las props son una unión por `kind`: cada story da las suyas completas, así que no se exigen las del `meta`.
type Story = StoryObj<typeof ListRow>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const tokenColor = (frame: HTMLElement, token: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  frame.querySelector('[data-ui-scope]')!.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
/** La fila: `role="row"` en escritorio; el enlace o botón que ocupa el `<li>` en móvil. */
const rowOf = (frame: HTMLElement) =>
  isMobile(frame)
    ? frame.querySelector<HTMLElement>('li > a, li > button, li > span')!
    : [...frame.querySelectorAll<HTMLElement>('[role="row"]')].at(-1)!;
const truncated = (el: Element) => el.scrollWidth > el.clientWidth;
/** El texto de la celda termina en su borde derecho (alineado a la derecha). */
const alignedEnd = (cell: HTMLElement) => {
  const range = document.createRange();
  range.selectNodeContents(cell);
  return Math.abs(range.getBoundingClientRect().right - cell.getBoundingClientRect().right) < 1;
};

const customer = {
  kind: 'customer',
  title: 'María Camila Henao',
  avatar: { kind: 'emoji', emoji: '🌷' },
  books: { first: 'Las bellas historias de la Biblia', more: 2 },
  phone: '312 555 1234',
  amount: 120000,
  date: localDate('2026-11-02'),
  status: 'overdue',
  href: '#cliente',
} satisfies ListRowProps;

const payment = {
  kind: 'payment',
  title: 'Jorge Iván Ospina',
  installment: { index: 2, total: 4 },
  amount: 30000,
  date: localDate('2026-11-20'),
  status: 'scheduled',
  href: '#abono',
} satisfies ListRowProps;

const copyRow = {
  kind: 'copy',
  title: 'Las bellas historias de la Biblia',
  copyNumber: 6,
  amount: 98000,
  date: localDate('2026-10-15'),
  customerName: 'María Camila Henao',
  status: 'sold',
  href: '#ejemplar',
} satisfies ListRowProps;

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-4: la cabecera de clientes tiene 6 títulos de columna; el de Saldo pendiente, a la derecha. */
export const ClienteCabecera: Story = {
  name: 'Cliente · cabecera',
  args: { variant: 'header', kind: 'customer', groupLabel: 'Deudores', groupCount: 21 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (isMobile(frame)) continue;
      const headers = [...frame.querySelectorAll<HTMLElement>('[role="columnheader"]')];
      expect(headers.map((h) => h.textContent)).toEqual([
        'Cliente',
        'Teléfono',
        'Libro(s)',
        'Saldo pendiente',
        'Último abono',
        'Estado',
      ]);
      expect(alignedEnd(headers[3]!)).toBe(true);
    }
  },
};

/** CA-1: el libro va en un chip cortado con «…» (máximo 170) y los demás en el chip «+2». */
export const Cliente: Story = {
  args: customer,
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const row = rowOf(frame);
      expect(row.getBoundingClientRect().height).toBe(isMobile(frame) ? 72 : 64);
      if (isMobile(frame)) continue;
      const book = row.querySelector<HTMLElement>('[data-kind="book"]')!;
      expect(book.getAttribute('title')).toBe('Las bellas historias de la Biblia');
      expect(book.getBoundingClientRect().width).toBeLessThanOrEqual(170);
      expect(truncated(book.querySelector('span:last-child')!)).toBe(true);
      expect(row.querySelector('[data-kind="count"]')!.textContent).toBe('+2');
      const cells = [...row.querySelectorAll<HTMLElement>('[role="cell"]')];
      expect(cells).toHaveLength(6);
      expect(cells[3]!.textContent).toBe('$120.000');
      expect(getComputedStyle(cells[3]!).fontVariantNumeric).toBe('tabular-nums');
      expect(alignedEnd(cells[3]!)).toBe(true);
    }
  },
};

/** CA-5: la fila abierta tiene fondo `row-selected` y `aria-current="true"`. */
export const ClienteSeleccionada: Story = {
  name: 'Cliente · seleccionada',
  args: {
    ...customer,
    title: 'Ana Lucía Betancur',
    avatar: { kind: 'person' },
    books: { first: 'El conflicto de los siglos', more: 0 },
    amount: 60000,
    status: 'current',
    selected: true,
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const row = rowOf(frame);
      expect(row.getAttribute('aria-current')).toBe('true');
      expect(getComputedStyle(row).backgroundColor).toBe(tokenColor(frame, '--color-row-selected'));
      if (isMobile(frame)) expect(getComputedStyle(row).borderRadius).toBe('12px');
      else expect(row.querySelector('[data-kind="count"]')).toBeNull();
    }
  },
};

export const AbonoCabecera: Story = {
  name: 'Abono · cabecera',
  args: { variant: 'header', kind: 'payment', groupLabel: 'Vencidos', groupCount: 3 },
};

export const Abono: Story = { args: payment };

/** CA-3: cuota «3/4» y la Pastilla «Vencido». */
export const AbonoVencido: Story = {
  name: 'Abono vencido',
  args: {
    ...payment,
    title: 'Luz Marina Restrepo',
    avatar: { kind: 'emoji', emoji: '🌻' },
    installment: { index: 3, total: 4 },
    date: localDate('2026-10-28'),
    status: 'overdue',
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const row = rowOf(frame);
      expect(row.querySelector('[data-status="overdue"]')!.textContent).toBe('Vencido');
      expect(row.textContent).toContain('28/10/2026');
      if (isMobile(frame)) continue;
      const tag = row.querySelector<HTMLElement>('[data-kind="fraction"]')!;
      expect(tag.querySelector('[aria-hidden="true"]')!.textContent).toBe('3/4');
      expect(tag.textContent).toContain('Cuota 3 de 4');
    }
  },
};

export const EjemplarCabecera: Story = {
  name: 'Ejemplar · cabecera',
  args: { variant: 'header', kind: 'copy', groupLabel: 'En físico', groupCount: 12 },
};

export const Ejemplar: Story = {
  args: copyRow,
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const row = rowOf(frame);
      expect(row.querySelector('[data-kind="cover"]')).not.toBeNull();
      if (isMobile(frame)) expect(row.textContent).toContain('Recibido 15/10/2026');
      else expect(row.querySelector('[data-kind="number"]')!.textContent).toBe('#6');
    }
  },
};

// ─── Móvil ───

export const ClienteCabeceraDeGrupo: Story = {
  name: 'Cliente · cabecera de grupo · móvil',
  args: { variant: 'header', kind: 'customer', groupLabel: 'Deudores', groupCount: 21 },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      if (isMobile(frame)) expect(frame.querySelector('li')!.textContent).toBe('Deudores21');
  },
};

export const ClienteMovil: Story = {
  name: 'Cliente · móvil',
  args: { ...customer, href: undefined, onOpen: fn() },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      const row = rowOf(frame);
      // La fila entera es el botón o enlace al detalle.
      expect(row.tagName).toBe('BUTTON');
      await userEvent.click(row);
    }
    expect((args as unknown as { onOpen: ReturnType<typeof fn> }).onOpen).toHaveBeenCalled();
  },
};

/** CA-2: «Debe» sobre «$0», y el $0 en `text-3`. */
export const ClienteAlDia: Story = {
  name: 'Cliente al día · móvil',
  args: {
    ...customer,
    title: 'Beatriz Elena Salazar',
    avatar: { kind: 'person' },
    books: { first: 'El Deseado de todas las gentes', more: 0 },
    amount: 0,
    status: 'settled',
  },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      if (!isMobile(frame)) continue;
      const row = rowOf(frame);
      const pill = row.querySelector<HTMLElement>('[data-status="settled"]')!;
      expect(pill.textContent).toBe('Debe');
      expect(pill.dataset.shape).toBe('text');
      const amount = pill.nextElementSibling!;
      expect(amount.textContent).toBe('$0');
      expect(pill.getBoundingClientRect().bottom).toBeLessThanOrEqual(amount.getBoundingClientRect().top);
      expect(getComputedStyle(amount).color).toBe(tokenColor(frame, '--color-text-3'));
    }
  },
};

export const AbonoMovil: Story = { name: 'Abono · móvil', args: payment };

export const EjemplarMovil: Story = { name: 'Ejemplar · móvil', args: copyRow };

export const Seleccionada: Story = {
  name: 'Seleccionada · móvil',
  args: { ...customer, selected: true },
};

/** CA-4 y R4: la tabla de clientes tiene 6 columnas, cada nombre es un enlace y los nombres largos se cortan. */
export const TablaCompleta: Story = {
  name: 'Tabla completa',
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <ListTable kind="customer" aria-label="Clientes">
        <ListRow variant="header" kind="customer" groupLabel="Deudores" groupCount={5} />
        <ListRow {...customer} />
        <ListRow
          {...customer}
          title="Ana Lucía Betancur"
          avatar={{ kind: 'person' }}
          books={{ first: 'El conflicto de los siglos', more: 0 }}
          amount={60000}
          status="current"
          href="#ana"
          selected
        />
        <ListRow
          {...customer}
          title="Luz Marina Restrepo de las Mercedes Villalobos"
          avatar={{ kind: 'emoji', emoji: '🌻' }}
          amount={45000}
          href="#luz"
        />
        <ListRow
          {...customer}
          title="Beatriz Elena Salazar"
          avatar={{ kind: 'person' }}
          books={{ first: 'El Deseado de todas las gentes', more: 0 }}
          amount={0}
          status="settled"
          href="#beatriz"
        />
        <ListRow kind="customer" title="Jorge Iván Ospina" phone="300 123 4567" href="#jorge" />
      </ListTable>
      <ListTable kind="payment" aria-label="Abonos">
        <ListRow variant="header" kind="payment" groupLabel="Próximos" groupCount={5} />
        <ListRow {...payment} />
        <ListRow
          {...payment}
          title="Luz Marina Restrepo"
          installment={{ index: 3, total: 4 }}
          date={localDate('2026-10-28')}
          status="overdue"
          href="#p2"
        />
        <ListRow
          {...payment}
          title="Ana Lucía Betancur"
          installment={{ index: 1, total: 3 }}
          status="collected"
          href="#p3"
        />
        <ListRow
          {...payment}
          title="Beatriz Elena Salazar"
          installment={{ index: 4, total: 4 }}
          amount={25000}
          href="#p4"
        />
        <ListRow
          {...payment}
          title="Carlos Andrés Mejía"
          installment={{ index: 2, total: 2 }}
          status="canceled"
          href="#p5"
        />
      </ListTable>
      <ListTable kind="copy" aria-label="Ejemplares">
        <ListRow variant="header" kind="copy" groupLabel="Ejemplares" groupCount={5} />
        <ListRow {...copyRow} />
        <ListRow {...copyRow} copyNumber={7} customerName={undefined} status="in_stock" href="#e2" />
        <ListRow {...copyRow} title="El conflicto de los siglos" copyNumber={2} status="flagged" href="#e3" />
        <ListRow
          {...copyRow}
          title="El Deseado de todas las gentes"
          copyNumber={11}
          customerName="Ana Lucía Betancur"
          href="#e4"
        />
        <ListRow
          {...copyRow}
          title="Mensajes para los jóvenes"
          copyNumber={3}
          amount={undefined}
          customerName={undefined}
          status="in_stock"
          href="#e5"
        />
      </ListTable>
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const customers = frame.querySelector<HTMLElement>('[aria-label="Clientes"]')!;
      if (isMobile(frame)) {
        expect(customers.tagName).toBe('UL');
        expect(customers.querySelectorAll('li > a')).toHaveLength(5);
        continue;
      }
      expect(customers.getAttribute('role')).toBe('table');
      expect(customers.querySelectorAll('[role="columnheader"]')).toHaveLength(6);
      const rows = [...customers.querySelectorAll<HTMLElement>('[role="row"]')].slice(1);
      expect(rows).toHaveLength(5);
      for (const row of rows) {
        const first = row.querySelector('[role="cell"]')!;
        expect(first.querySelector('a[href]')).not.toBeNull();
        expect(row.querySelectorAll('[role="cell"]')).toHaveLength(6);
      }
      const longName = rows[2]!.querySelector('a span')!;
      expect(truncated(longName)).toBe(true);
      // Los montos quedan alineados a la derecha en la misma columna.
      const rights = new Set(
        rows.map((row) =>
          Math.round(row.querySelectorAll('[role="cell"]')[3]!.getBoundingClientRect().right),
        ),
      );
      expect(rights.size).toBe(1);
    }
  },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <ListTable kind="customer" aria-label="Clientes">
        <ListRow variant="header" kind="customer" groupLabel="Deudores" groupCount={2} />
        <ListRow {...customer} />
        <ListRow {...customer} title="Beatriz Elena Salazar" amount={0} status="settled" href="#b" selected />
      </ListTable>
      <ListTable kind="payment" aria-label="Abonos">
        <ListRow variant="header" kind="payment" groupLabel="Próximos" groupCount={1} />
        <ListRow {...payment} />
      </ListTable>
      <ListTable kind="copy" aria-label="Ejemplares">
        <ListRow variant="header" kind="copy" groupLabel="Ejemplares" groupCount={1} />
        <ListRow {...copyRow} />
      </ListTable>
    </div>
  ),
};
