import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { PhotoViewer } from './PhotoViewer';

const svg = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"><rect width="60" height="80" fill="${color}"/></svg>`,
  )}`;
const THUMB = svg('#cccccc');
const FULL = svg('#7a4e2d');

const meta = {
  title: 'Organismos/Visor de fotos',
  component: PhotoViewer,
  args: {
    open: true,
    onOpenChange: fn(),
    title: 'Foto 1 de 2',
    previewSrc: THUMB,
    src: FULL,
    alt: 'Factura',
  },
  parameters: {
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    design: {
      ficha: 'Sin ficha en el lienzo (#99: visor a pantalla completa)',
      version: 'v1.0',
      iteration: 1,
      whenToUse: ['Al tocar la miniatura de una foto (imágenes del cliente, facturas, recibos).'],
      whenNotToUse: ['Para elegir una foto: eso abre la cámara o la galería.'],
      usedIn: ['Ficha del cliente', 'Nuevo cliente'],
    },
  },
} satisfies Meta<typeof PhotoViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const dialogIn = (root: HTMLElement) =>
  waitFor(() => {
    const all = [...root.querySelectorAll<HTMLElement>('figure.sb-frame [role="dialog"]')];
    expect(all.length).toBeGreaterThan(0);
    return all[all.length - 1]!;
  });

/** Se ve al instante con la miniatura y, cuando llega, con la foto completa. */
export const Foto: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await dialogIn(canvasElement);
    expect(dialog.textContent).toContain('Foto 1 de 2');
    await waitFor(() => expect(dialog.querySelector<HTMLImageElement>('img[alt="Factura"]')!.src).toBe(FULL));
  },
};

/** Si no se pudo traer, lo dice y deja reintentar. */
export const NoSePudo: Story = {
  name: 'No se pudo abrir',
  args: { src: null, error: true, onRetry: fn() },
  play: async ({ canvasElement, args }) => {
    const dialog = await dialogIn(canvasElement);
    expect(dialog.textContent).toContain('No se pudo abrir la foto.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar', hidden: true }));
    expect(args.onRetry).toHaveBeenCalled();
  },
};
