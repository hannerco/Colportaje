import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { EmojiAvatar, type EmojiAvatarProps } from './EmojiAvatar';

function Stateful(args: EmojiAvatarProps) {
  const [emoji, setEmoji] = useState(args.emoji);
  return (
    <EmojiAvatar
      {...args}
      emoji={emoji}
      onChange={(next) => {
        setEmoji(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta = {
  title: 'Pantallas/Clientes/Piezas/Avatar con emoji',
  component: EmojiAvatar,
  render: (args) => <Stateful {...args} />,
  args: { emoji: null, onChange: fn(), backHref: '#' },
  parameters: {
    design: {
      ficha: 'Propuestas · 4 · Emoji del cliente',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['El avatar de Nuevo cliente y de la ficha: tocarlo elige o quita el emoji (BR-CUS-15).'],
      whenNotToUse: ['En listas: allí el avatar solo muestra el emoji (Avatar).'],
      usedIn: ['Nuevo cliente', 'Ficha de cliente'],
    },
  },
} satisfies Meta<typeof EmojiAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explorar: Story = {};

/** #34: buscar «pan», elegir el emoji y verlo en el avatar; «Quitar» vuelve al de persona. */
export const ElegirYQuitar: Story = {
  name: 'Elegir y quitar',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = canvasElement.querySelector<HTMLElement>('figure.sb-frame')!;
    await userEvent.click(within(frame).getByRole('button', { name: 'Elegir emoji del cliente' }));
    const body = within(document.body);
    // #63: todas las categorías y más de mil emojis. Con todas las pruebas a la vez, pintarlos tarda más de 1 s.
    const categories = await body.findByRole('group', { name: 'Categorías de emojis' }, { timeout: 5000 });
    expect(within(categories).getByRole('button', { name: 'Animales y naturaleza' })).toBeTruthy();
    expect(body.getByText(/\d\.\d{3} emojis/)).toBeTruthy();
    await userEvent.type(await body.findByRole('searchbox'), 'panaderia');
    await userEvent.click(await body.findByRole('button', { name: 'pan de molde' }));
    expect(args.onChange).toHaveBeenCalledWith('🍞');
    await waitFor(() =>
      expect(within(frame).getByRole('button', { name: 'Cambiar emoji del cliente' })).toBeTruthy(),
    );
    await userEvent.click(within(frame).getByRole('button', { name: 'Cambiar emoji del cliente' }));
    await userEvent.click(await body.findByRole('button', { name: 'Quitar' }));
    expect(args.onChange).toHaveBeenLastCalledWith(null);
  },
};

export const ConEmoji: Story = { name: 'Con emoji', args: { emoji: '🌻' } };

export const Deshabilitado: Story = { args: { disabledReason: 'Escribe el nombre primero' } };

export const Matriz: Story = { parameters: { frames: 'matrix' } };
