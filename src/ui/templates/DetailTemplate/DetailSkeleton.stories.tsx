import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { RowsSkeleton, TableSkeleton } from '../ListTemplate';
import { DetailSkeleton } from './DetailSkeleton';

const meta = {
  title: 'Plantillas/Esqueletos',
  component: DetailSkeleton,
  args: { islands: [{ rows: 3 }] },
  parameters: {
    design: {
      ficha: 'Sin ficha (#67): esqueletos con la forma de cada pantalla',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['Mientras carga un detalle, una tabla o una lista.'],
      whenNotToUse: ['Para un error o una lista vacía (Estado vacío).'],
      usedIn: ['Todas las listas y los detalles'],
    },
  },
} satisfies Meta<typeof DetailSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** #67: el esqueleto de la ficha de cliente: identidad con la cuenta, libros, abonos y datos. */
export const DetalleDeCliente: Story = {
  args: { islands: [] },
  name: 'Detalle de cliente',
  render: () => (
    <DetailSkeleton
      figure
      actions={2}
      islands={[{ rows: 2, row: 'cover' }, { rows: 4, row: 'payment' }, { rows: 3 }]}
    />
  ),
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>('figure.sb-frame') ?? canvasElement;
    expect(frame.querySelectorAll('section').length).toBe(4);
    expect(frame.querySelectorAll('[data-shape="pill"]').length).toBeGreaterThanOrEqual(5);
  },
};

/** #67: la tabla de Dinero en escritorio y sus filas en el celular. */
export const TablaYFilas: Story = {
  args: { islands: [] },
  name: 'Tabla y filas',
  render: () => (
    <>
      <TableSkeleton columns={['person', 'amount', 'date', 'pill', 'button']} rows={3} />
      <RowsSkeleton rows={3} />
    </>
  ),
};
