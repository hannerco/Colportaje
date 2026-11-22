import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { Title } from '@/domain/title';
import { appNavItems, NAV_HREFS } from '@/features/shell';
import { Banner } from '@/ui/molecules/Banner';
import { AdminCatalogScreen, type SaveOutcome } from './AdminCatalogScreen';

const title = (overrides: Partial<Title> & Pick<Title, 'id' | 'name'>): Title => ({
  author: null,
  description: null,
  imageUrl: null,
  publicPrice: 104_000,
  colportorPrice: 52_000,
  category: 'cultural',
  isActive: true,
  ...overrides,
});

/** Algunos títulos de la lista de precios de fin de año 2026-2027. */
const TITLES: Title[] = [
  title({
    id: 't-psico',
    name: 'Psiconutrición',
    author: 'Julián Melgosa',
    publicPrice: 156_000,
    colportorPrice: 78_000,
  }),
  title({ id: 't-feliz', name: 'Estoy aquí, para ser feliz' }),
  title({
    id: 't-familias',
    name: 'Familias felices, no perfectas',
    publicPrice: 164_000,
    colportorPrice: 98_400,
  }),
  title({
    id: 't-zoo',
    name: 'Había una vez un zoológico',
    publicPrice: 64_000,
    colportorPrice: 32_000,
    isActive: false,
  }),
  title({
    id: 't-holman',
    name: 'Biblia 14 pts HOLMAN',
    category: 'religious',
    publicPrice: 189_000,
    colportorPrice: 151_200,
  }),
  title({
    id: 'm-paz',
    name: 'Paz para el corazón',
    category: 'minibook',
    publicPrice: null,
    colportorPrice: 1_500,
  }),
];

const meta = {
  title: 'Pantallas/Admin/Catálogo',
  component: AdminCatalogScreen,
  args: {
    nav: {
      active: 'admin',
      items: appNavItems(true),
      hrefs: NAV_HREFS,
      account: { name: 'Hanner Conde' },
      onNewCustomer: fn(),
      onNavigate: fn(),
    },
    isOnline: true,
    isAdmin: true,
    titles: TITLES,
    newId: () => 't-nuevo',
    onSave: fn(async (): Promise<SaveOutcome> => ({ ok: true })),
    onSetCover: fn(async () => true),
    onRemoveCover: fn(async () => true),
    backHref: NAV_HREFS.admin,
  },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
          { id: 'aria-hidden-focus', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Admin · Catálogo (sin diseño del lienzo, armado con la biblioteca)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['/admin: el administrador crea y edita títulos, sus precios y su portada.'],
      whenNotToUse: ['La carga inicial del catálogo (BR-TIT-06) sigue con el script `pnpm catalog:load`.'],
      usedIn: ['Admin'],
    },
    docs: {
      description: {
        component:
          'Admin · Catálogo (HU-PAN-ADM-01, pedido del dueño, 2026-11-22): la lista de títulos por categoría con buscador, y la ventana para crear o editar uno (nombre, autor, descripción, categoría, precios, activo y portada). Un título no se borra: se desactiva (BR-TIT-03). Cambiar los precios no cambia los ejemplares ya recibidos (BR-TIT-07).',
      },
    },
  },
} satisfies Meta<typeof AdminCatalogScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const firstFrame = (root: HTMLElement) => frames(root)[0]!;
const button = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.trim() === name)!;
/** La fila de un título (su texto empieza por el nombre). */
const row = (root: Element, name: string) =>
  [...root.querySelectorAll<HTMLElement>('li > button')].find((b) => b.textContent?.startsWith(name))!;
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const input = (root: Element, label: string) =>
  [...root.querySelectorAll<HTMLLabelElement>('label')].find((l) => l.textContent?.trim().startsWith(label))
    ?.control as HTMLInputElement;

export const Explorar: Story = {};

/** CA-1: los títulos por categoría, con autor, precios y «Desactivado». */
export const Lista: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.querySelector('h1')?.textContent).toBe('Admin');
      expect(frame.textContent).toContain('Cultural · 4');
      expect(frame.textContent).toContain('Religioso · 1');
      expect(frame.textContent).toContain('Minibooks · 1');
      expect(frame.textContent).toContain('Público $156.000 · Colportor $78.000');
      expect(frame.textContent).toContain('Colportor $1.500');
      expect(frame.textContent).toContain('Desactivado');
    }
  },
};

/** Buscar por nombre o autor, sin tildes. */
export const Buscar: Story = {
  play: async ({ canvasElement }) => {
    const frame = firstFrame(canvasElement);
    await userEvent.type(frame.querySelector<HTMLInputElement>('input[type="search"]')!, 'melgosa');
    await waitFor(() => expect(frame.textContent).toContain('Cultural · 1'));
    expect(frame.textContent).not.toContain('Biblia 14 pts HOLMAN');
  },
};

export const SinResultados: Story = {
  play: async ({ canvasElement }) => {
    const frame = firstFrame(canvasElement);
    await userEvent.type(frame.querySelector<HTMLInputElement>('input[type="search"]')!, 'zzz');
    await waitFor(() => expect(frame.textContent).toContain('Ningún título coincide con «zzz»'));
  },
};

/** CA-2: «Nuevo título» abre el formulario vacío y guarda con el id nuevo. */
export const NuevoTitulo: Story = {
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(button(firstFrame(canvasElement), 'Nuevo título'));
    const window = await waitFor(() => dialog());
    expect(window.textContent).toContain('Guarda el título para ponerle portada.');
    await userEvent.type(input(window, 'Nombre'), 'Bebidas saludables');
    await userEvent.type(input(window, 'Precio al público'), '164000');
    await userEvent.type(input(window, 'Precio colportor'), '82000');
    await userEvent.click(button(window, 'Guardar'));
    await waitFor(() =>
      expect(args.onSave).toHaveBeenCalledWith({
        id: 't-nuevo',
        isNew: true,
        fields: expect.objectContaining({
          name: 'Bebidas saludables',
          publicPrice: 164_000,
          colportorPrice: 82_000,
          category: 'cultural',
          isActive: true,
        }),
      }),
    );
  },
};

/** CA-3: un error de un campo se muestra junto a él (aquí, sin precio al público). */
export const ErrorEnUnCampo: Story = {
  globals: { platform: 'desktop' },
  args: {
    onSave: fn(async (): Promise<SaveOutcome> => ({
      ok: false,
      message: 'Revisa los datos marcados.',
      field: 'publicPrice',
    })),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(button(firstFrame(canvasElement), 'Nuevo título'));
    const window = await waitFor(() => dialog());
    await userEvent.type(input(window, 'Nombre'), 'Sin precio');
    await userEvent.click(button(window, 'Guardar'));
    await waitFor(() =>
      expect(window.textContent).toContain(
        'Escribe el precio al público (solo un minibook puede ir sin él).',
      ),
    );
  },
};

/** CA-4: editar un título existente trae sus datos; desactivarlo es apagar «Activo». */
export const EditarYDesactivar: Story = {
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(row(firstFrame(canvasElement), 'Psiconutrición'));
    const window = await waitFor(() => dialog());
    expect(input(window, 'Nombre').value).toBe('Psiconutrición');
    expect(input(window, 'Autor').value).toBe('Julián Melgosa');
    expect(window.textContent).toContain('Cambiar los precios no cambia los ejemplares que ya recibiste.');
    await userEvent.click(window.querySelector<HTMLElement>('[role="switch"]')!);
    await userEvent.click(button(window, 'Guardar'));
    await waitFor(() =>
      expect(args.onSave).toHaveBeenCalledWith({
        id: 't-psico',
        isNew: false,
        fields: expect.objectContaining({ isActive: false, author: 'Julián Melgosa' }),
      }),
    );
  },
};

/** CA-5: con portada, «Cambiar portada» y «Quitar portada». */
export const ConPortada: Story = {
  globals: { platform: 'desktop' },
  args: {
    titles: TITLES.map((t) =>
      t.id === 't-psico'
        ? {
            ...t,
            imageUrl:
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="80" height="100" fill="gray"/></svg>',
          }
        : t,
    ),
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(row(firstFrame(canvasElement), 'Psiconutrición'));
    const window = await waitFor(() => dialog());
    expect(button(window, 'Cambiar portada')).toBeTruthy();
    await userEvent.click(button(window, 'Quitar portada'));
    await waitFor(() => expect(args.onRemoveCover).toHaveBeenCalledWith('t-psico'));
  },
};

/** Sin conexión: se consulta, pero «Nuevo título» y «Guardar» quedan deshabilitados. */
export const SinConexion: Story = {
  args: { isOnline: false, banner: <Banner tone="offline" /> },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(button(frame, 'Nuevo título')).toHaveAttribute('aria-disabled', 'true');
  },
};

export const Vacio: Story = { args: { titles: [] } };

export const Cargando: Story = { args: { titles: undefined } };

export const NoEsAdmin: Story = {
  args: { isAdmin: false },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(frame.textContent).toContain('Solo para administradores');
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
