import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { SignInScreen } from './SignInScreen';

const meta = {
  title: 'Pantallas/Sesión/Iniciar sesión',
  component: SignInScreen,
  args: { isOnline: true, onSubmit: fn(async () => {}), onEdit: fn() },
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
      ficha: 'Sesión · Iniciar sesión (sin diseño del dueño: OQ-44)',
      version: 'v1.1',
      iteration: 1,
      whenToUse: ['/entrar: quien no tiene sesión abierta entra con su correo y su contraseña.'],
      whenNotToUse: [
        'Para crear una cuenta: el registro está desactivado, las cuentas las crea el administrador.',
      ],
      usedIn: ['Sesión'],
    },
    docs: {
      description: {
        component:
          'Iniciar sesión (HU-PAN-BASE-02, BR-USR-02): una isla centrada con el nombre de la app, el correo, la contraseña (con «Mostrar») y «Entrar», que se habilita al llenar ambos. Sin conexión avisa con la Franja y no deja entrar. Un error de credenciales se ve en el campo de la contraseña; los demás, en una Franja. Armada con la biblioteca porque el diseño no existe (OQ-44).',
      },
    },
  },
} satisfies Meta<typeof SignInScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const field = (frame: Element, label: string) =>
  [...frame.querySelectorAll<HTMLInputElement>('input')].find((i) => i.labels?.[0]?.textContent === label)!;
const submit = (frame: Element) =>
  [...frame.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === 'Entrar')!;

export const Explorar: Story = {};

/** Vacío: «Entrar» deshabilitado hasta escribir el correo y la contraseña. */
export const Vacio: Story = {
  name: 'Vacío',
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      expect(frame.textContent).toContain('Colportor');
      expect(frame.textContent).toContain('Entra con tu correo y tu contraseña');
      expect(submit(frame)).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(submit(frame));
      expect(args.onSubmit).not.toHaveBeenCalled();
    }
  },
};

/** Con correo y contraseña se entra (también con Enter), con el correo sin espacios sobrantes. */
export const Entrar: Story = {
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.type(field(frame, 'Correo'), '  ana@ejemplo.com ');
    await userEvent.type(field(frame, 'Contraseña'), 'secreta123');
    await waitFor(() => expect(submit(frame)).not.toHaveAttribute('aria-disabled', 'true'));
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith({ email: 'ana@ejemplo.com', password: 'secreta123' }),
    );
    expect(args.onEdit).toHaveBeenCalled();
  },
};

/** La contraseña se oculta y se puede mostrar. */
export const MostrarContrasena: Story = {
  name: 'Mostrar contraseña',
  play: async ({ canvasElement }) => {
    const frame = frames(canvasElement)[0]!;
    const password = field(frame, 'Contraseña');
    expect(password.type).toBe('password');
    await userEvent.click([...frame.querySelectorAll('button')].find((b) => b.textContent === 'Mostrar')!);
    expect(password.type).toBe('text');
  },
};

export const Entrando: Story = { args: { pending: true } };

/** El error de credenciales se ve en el campo de la contraseña (INVALID_CREDENTIALS). */
export const CredencialesIncorrectas: Story = {
  name: 'Credenciales incorrectas',
  args: { error: { kind: 'credentials', message: 'El correo o la contraseña no coinciden.' } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const alert = frame.querySelector('[role="alert"]')!;
      expect(alert.textContent).toContain('El correo o la contraseña no coinciden.');
      expect(field(frame, 'Contraseña')).toHaveAttribute('aria-invalid', 'true');
    }
  },
};

/** Otros motivos (usuario desactivado, red) van en una Franja arriba de los campos. */
export const UsuarioDesactivado: Story = {
  name: 'Usuario desactivado',
  args: { error: { kind: 'other', message: 'Tu usuario está desactivado. Habla con tu líder.' } },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(frame.textContent).toContain('Tu usuario está desactivado. Habla con tu líder.');
  },
};

/** Sin conexión: la Franja avisa y «Entrar» no funciona aunque esté todo escrito. */
export const SinConexion: Story = {
  name: 'Sin conexión',
  args: { isOnline: false },
  play: async ({ canvasElement, args }) => {
    const frame = frames(canvasElement)[0]!;
    await userEvent.type(field(frame, 'Correo'), 'ana@ejemplo.com');
    await userEvent.type(field(frame, 'Contraseña'), 'secreta123');
    expect(frame.textContent).toContain('Sin conexión');
    expect(submit(frame)).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(submit(frame));
    expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** Las combinaciones en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = { parameters: { frames: 'matrix' } };
