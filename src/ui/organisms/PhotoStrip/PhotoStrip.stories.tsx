import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { PhotoStrip, type PhotoStripPhoto, type PhotoStripProps } from './PhotoStrip';

const swatch = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90"><rect width="120" height="90" fill="${color}"/></svg>`,
  )}`;

const PHOTOS: PhotoStripPhoto[] = [
  { photoId: 'p1', thumbUrl: swatch('#d8cfc0') },
  { photoId: 'p2', thumbUrl: swatch('#b9c4cc') },
];

/** Con fotos que se agregan, se cambian y se quitan de verdad (como el contenedor). */
function Demo(args: PhotoStripProps) {
  const [photos, setPhotos] = useState(args.photos);
  let next = photos.length;
  return (
    <PhotoStrip
      {...args}
      photos={photos}
      onAdd={
        args.onAdd &&
        (async (file) => {
          const done = await args.onAdd!(file);
          if (done !== false)
            setPhotos((current) => [...current, { photoId: `n${++next}`, thumbUrl: swatch('#c9d6c3') }]);
          return done;
        })
      }
      onRemove={
        args.onRemove &&
        ((photoId) => {
          void args.onRemove!(photoId);
          setPhotos((current) => current.filter((p) => p.photoId !== photoId));
        })
      }
    />
  );
}

const frames = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>('figure.sb-frame'),
];

const viewerButton = async (frame: HTMLElement, label: string) =>
  waitFor(() => {
    const viewer = frame.querySelector<HTMLElement>('[role="dialog"]');
    expect(viewer).not.toBeNull();
    const found = [...viewer!.querySelectorAll<HTMLElement>('button')].find(
      (b) => b.textContent?.trim() === label,
    );
    expect(found).toBeDefined();
    return found!;
  });

const meta = {
  title: 'Organismos/Fotos',
  component: PhotoStrip,
  render: (args) => <Demo {...args} />,
  args: {
    photos: PHOTOS,
    onAdd: fn(async () => true),
    onReplace: fn(),
    onRemove: fn(),
  },
  parameters: {
    design: {
      ficha: 'Lib-Fotos',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Toda foto de la app: imágenes del cliente, facturas y recibos del Abibono se ven igual.',
        'Tocar una foto la abre en grande; si se puede editar, desde ahí se cambia o se quita.',
      ],
      whenNotToUse: [
        'Portadas de los libros y el avatar del cliente (son otra cosa: identifican, no se guardan como foto).',
      ],
      usedIn: [
        'Ficha del cliente (imágenes y facturas)',
        'Nuevo cliente',
        'Nuevo Abibono',
        'Detalle del Abibono',
      ],
    },
  },
} satisfies Meta<typeof PhotoStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explorar: Story = {};

/** Sin fotos todavía: solo el «+». */
export const SinFotos: Story = { name: 'Sin fotos', args: { photos: [] } };

/** Solo para ver (un Abibono entregado, un cliente archivado): sin «+»; tocar una foto la abre, sin acciones. */
export const SoloVer: Story = {
  name: 'Solo ver',
  args: { onAdd: undefined, onReplace: undefined, onRemove: undefined },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    expect(frame.querySelector('[aria-label="Agregar foto"]')).toBeNull();
    await userEvent.click(frame.querySelector<HTMLElement>('[aria-label="Ver foto 1"]')!);
    await waitFor(() => expect(frame.querySelector('[role="dialog"]')).not.toBeNull());
    const labels = [...frame.querySelector('[role="dialog"]')!.querySelectorAll('button')].map((b) =>
      b.textContent?.trim(),
    );
    expect(labels).not.toContain('Quitar foto');
  },
};

/** Tocar una foto la abre en grande; «Quitar foto» la quita. */
export const QuitarDesdeElVisor: Story = {
  name: 'Quitar desde el visor',
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(frame.querySelector<HTMLElement>('[aria-label="Ver foto 1"]')!);
    expect(await viewerButton(frame, 'Cambiar foto')).toBeDefined();
    await userEvent.click(await viewerButton(frame, 'Quitar foto'));
    expect(args.onRemove).toHaveBeenCalledWith('p1');
    await waitFor(() => expect(frame.querySelectorAll('img')).toHaveLength(1));
  },
};

/** Si la subida falla, se avisa y «Reintentar» manda el mismo archivo. */
export const ErrorAlSubir: Story = {
  name: 'Error al subir',
  args: { onAdd: fn(async () => false) },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    await userEvent.upload(frame.querySelector<HTMLInputElement>('[data-testid="photo-input"]')!, file);
    await waitFor(() => expect(frame.textContent).toContain('No se pudo subir la foto'));
    const retry = [...frame.querySelectorAll<HTMLElement>('button')].find(
      (b) => b.textContent === 'Reintentar',
    )!;
    await userEvent.click(retry);
    expect(args.onAdd).toHaveBeenCalledTimes(2);
    expect(args.onAdd).toHaveBeenLastCalledWith(file);
  },
};

/** Sin conexión: el «+» se ve apagado con el motivo debajo. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { disabledReason: 'Necesita conexión' },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
