import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { localDate } from '@/domain/time';
import { SoldBookList } from './SoldBookList';

const meta = {
  title: 'Pantallas/Clientes/Piezas/Libros vendidos',
  component: SoldBookList,
  args: {
    books: [
      {
        copyId: 'c1',
        titleName: 'El poder de mis palabras',
        number: 1,
        agreedPrice: 104000,
        publicPriceSnapshot: 104000,
        priceDelta: null,
        soldAt: new Date('2026-11-22T15:00:00Z'),
      },
    ],
    copyHref: (id: string) => `#ejemplar-${id}`,
    onChangeSoldOn: fn(async () => {}),
    today: localDate('2026-11-22'),
  },
  parameters: {
    design: {
      ficha: 'Ficha de cliente · Libros vendidos',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Los libros vendidos de un cliente, en la ficha y en Nuevo cliente.'],
      whenNotToUse: ['Para elegir libros del inventario (Agregar libro).'],
      usedIn: ['Ficha de cliente', 'Nuevo cliente'],
    },
  },
} satisfies Meta<typeof SoldBookList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explorar: Story = {};

/** #56: «Vendido el …» abre el calendario y guarda la fecha corregida. */
export const CambiarFechaDeVenta: Story = {
  name: 'Cambiar fecha de venta',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = canvasElement.querySelector<HTMLElement>('figure.sb-frame')!;
    await userEvent.click(within(frame).getByRole('button', { name: /Vendido el .*cambiar/ }));
    const dialog = await within(document.body).findByRole('alertdialog');
    const days = within(dialog).getAllByRole('button', { name: /20/ });
    await userEvent.click(days[0]!);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar fecha' }));
    await waitFor(() => expect(args.onChangeSoldOn).toHaveBeenCalled());
  },
};

export const Matriz: Story = { parameters: { frames: 'matrix' } };
