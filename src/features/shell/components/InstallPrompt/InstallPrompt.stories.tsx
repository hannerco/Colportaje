import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { InstallPrompt } from './InstallPrompt';

const meta = {
  title: 'Pantallas/Armazón/Invitación a instalar',
  component: InstallPrompt,
  args: { kind: 'native', open: true, onInstall: fn(), onDismiss: fn() },
  parameters: {
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    design: {
      ficha: 'Marca · Invitación a instalar (Marca-3-Instalar)',
      version: 'v1.0',
      iteration: 1,
      whenToUse: [
        'Una vez, con la sesión abierta, si el navegador permite instalar y la app no está instalada.',
      ],
      whenNotToUse: ['Si ya está instalada o si se dijo «Ahora no» en este dispositivo.'],
      usedIn: ['Armazón de la app'],
    },
  },
} satisfies Meta<typeof InstallPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El diálogo se pinta dentro de cada marco; con dos marcos manda el último (es el que queda encima). */
const dialogIn = (root: HTMLElement) =>
  waitFor(() => {
    const dialogs = [...root.querySelectorAll<HTMLElement>('figure.sb-frame [role="alertdialog"]')];
    expect(dialogs.length).toBeGreaterThan(0);
    return dialogs[dialogs.length - 1]!;
  });

/** Android y computador: «Instalar» abre la instalación del navegador. */
export const Instalar: Story = {
  play: async ({ canvasElement, args }) => {
    const first = await dialogIn(canvasElement);
    expect(first.textContent).toContain('Instalar Colportor');
    expect(first.textContent).toContain('Funciona sin conexión.');
    await userEvent.click(within(first).getByRole('button', { name: 'Instalar', hidden: true }));
    expect(args.onInstall).toHaveBeenCalled();
  },
};

/** iPhone: los tres pasos de Safari y «Entendido». */
export const IPhone: Story = {
  name: 'iPhone',
  args: { kind: 'ios' },
  play: async ({ canvasElement, args }) => {
    const first = await dialogIn(canvasElement);
    expect(first.textContent).toContain('Agregar a pantalla de inicio');
    await userEvent.click(within(first).getByRole('button', { name: 'Entendido', hidden: true }));
    expect(args.onDismiss).toHaveBeenCalled();
  },
};
