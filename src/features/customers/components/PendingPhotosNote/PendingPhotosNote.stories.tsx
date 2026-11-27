import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PendingPhotosNote } from './PendingPhotosNote';

const meta = {
  title: 'Pantallas/Clientes/Piezas/Fotos por subir',
  component: PendingPhotosNote,
  args: { pending: 2, uploading: true, failed: 0, onRetry: fn(), onDiscard: fn() },
  parameters: {
    design: {
      ficha: 'Sin diseño propio (ADR-0054): usa la línea «Subiendo la foto…» de la Factura',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['En la ficha del cliente, mientras este teléfono tiene fotos de ese cliente por subir.'],
      whenNotToUse: [
        'Para una foto que se está subiendo desde la ficha (ahí la propia foto muestra su avance).',
      ],
      usedIn: ['Ficha de cliente'],
    },
    docs: {
      description: {
        component:
          'Bandeja de fotos (ADR-0054): las fotos de un cliente nuevo se guardan en el teléfono y se suben solas. Esta pieza dice lo que falta: «Subiendo…», «guardadas en este teléfono» mientras no hay señal y, si alguna falló sin remedio, «Reintentar» o «Descartar».',
      },
    },
  },
} satisfies Meta<typeof PendingPhotosNote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explorar: Story = {};

/** Recién guardado el cliente: la primera de dos fotos ya está subiendo. */
export const Subiendo: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText('Subiendo 2 fotos…').length).toBeGreaterThan(0);
  },
};

/** Sin señal: las fotos quedan guardadas en el teléfono y se suben solas al volver la señal. */
export const SinSenal: Story = {
  name: 'Sin señal',
  args: { pending: 1, uploading: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText('1 foto guardada en este teléfono. Se sube sola cuando haya señal.')
        .length,
    ).toBeGreaterThan(0);
  },
};

/** Una foto falló sin remedio (p. ej. el cliente se archivó): la persona decide. */
export const Fallida: Story = {
  args: { pending: 0, uploading: false, failed: 1 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('button', { name: 'Reintentar' })[0]!);
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

/** «Descartar» pregunta antes, porque la foto se borra del teléfono. */
export const DescartarPregunta: Story = {
  name: 'Descartar pregunta',
  args: { pending: 0, uploading: false, failed: 2 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('button', { name: 'Descartar' })[0]!);
    const dialog = within(canvasElement.ownerDocument.body);
    await expect(await dialog.findByText('¿Descartar 2 fotos?')).toBeInTheDocument();
    await userEvent.click(dialog.getAllByRole('button', { name: 'Descartar' }).at(-1)!);
    await expect(args.onDiscard).toHaveBeenCalled();
  },
};
