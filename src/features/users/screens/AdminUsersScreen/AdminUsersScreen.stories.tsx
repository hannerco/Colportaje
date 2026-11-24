import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { AppUser } from '@/domain/app-user';
import { APP_NAV_ITEMS, NAV_HREFS } from '../../../shell/navigation';
import { AdminUsersScreen } from './AdminUsersScreen';

const USERS: AppUser[] = [
  {
    userId: null,
    email: 'luzmarina@gmail.com',
    fullName: 'Luz Marina Restrepo',
    isAdmin: false,
    status: 'pending',
  },
  { userId: 'u1', email: 'hanner@unac.edu.co', fullName: 'Hanner Conde', isAdmin: true, status: 'active' },
  { userId: 'u2', email: 'william@gmail.com', fullName: 'William Barrero', isAdmin: false, status: 'active' },
  {
    userId: 'u3',
    email: 'jhonfredy@gmail.com',
    fullName: 'Jhon Fredy Ospina',
    isAdmin: false,
    status: 'inactive',
  },
];

const meta = {
  title: 'Pantallas/Admin/Usuarios',
  component: AdminUsersScreen,
  args: {
    nav: {
      active: 'admin',
      items: APP_NAV_ITEMS,
      hrefs: NAV_HREFS,
      account: { name: 'Hanner Conde' },
      onNewCustomer: fn(),
      onNavigate: fn(),
    },
    isOnline: true,
    users: USERS,
    sections: null,
    onAuthorize: fn(async () => {}),
    onRemovePending: fn(),
    onSetActive: fn(),
  },
  parameters: {
    frameSize: 'screen',
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'landmark-main-is-top-level', enabled: false },
        ],
      },
    },
    design: {
      ficha: 'Propuestas · 6 · Admin · Usuarios',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        '/admin/usuarios: autorizar correos de Google y desactivar o reactivar usuarios (BR-USR-07).',
      ],
      whenNotToUse: ['Para el catálogo (Admin · Catálogo).'],
      usedIn: ['Admin'],
    },
  },
} satisfies Meta<typeof AdminUsersScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];

export const Explorar: Story = {};

/** #43: Pendiente, Activo y Desactivado; cada uno con su acción. */
export const ConEstados: Story = {
  name: 'Con estados',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    for (const text of ['Pendiente', 'Activo', 'Desactivado']) expect(frame.textContent).toContain(text);
  },
};

/** #43: «Autorizar correo» pide nombre, correo de Google y si es administrador. */
export const AutorizarCorreo: Story = {
  name: 'Autorizar correo',
  globals: { platform: 'desktop' },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(within(frame).getByRole('button', { name: 'Autorizar correo' }));
    const dialog = await within(document.body).findByRole('alertdialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Nombre' }), 'María Camila');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Correo de Google' }),
      'mariacamila@gmail.com',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Autorizar' }));
    await waitFor(() =>
      expect(args.onAuthorize).toHaveBeenCalledWith({
        email: 'mariacamila@gmail.com',
        fullName: 'María Camila',
        isAdmin: false,
      }),
    );
  },
};

/** #102: en el celular, «Autorizar correo» es el botón flotante (antes no se veía) y abre el mismo formulario. */
export const AutorizarCorreoMovil: Story = {
  name: 'Autorizar correo · móvil',
  globals: { platform: 'mobile' },
  // Con el diálogo abierto, el resto queda oculto al lector (es lo esperado de un diálogo).
  parameters: { a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } } },
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.click(within(frame).getByRole('button', { name: 'Autorizar correo' }));
    await waitFor(() => expect(frame.querySelector('[role="alertdialog"]')).not.toBeNull());
  },
};

export const Cargando: Story = { args: { users: undefined } };

export const Matriz: Story = { parameters: { frames: 'matrix' } };
