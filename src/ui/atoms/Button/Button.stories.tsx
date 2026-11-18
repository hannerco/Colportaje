import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { ICON_NAMES } from '../../icons';
import { Button } from './Button';

const meta = {
  title: 'Átomos/Botón',
  component: Button,
  args: { children: 'Nuevo cliente', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'link', 'danger', 'fab'] },
    size: { control: 'inline-radio', options: ['normal', 'compact'] },
    state: { control: 'inline-radio', options: ['normal', 'disabled', 'loading'] },
    width: { control: 'inline-radio', options: ['auto', 'full'] },
    icon: { control: 'select', options: [undefined, ...ICON_NAMES] },
  },
  parameters: {
    design: {
      ficha: 'Lib-Boton',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Principal: la acción que la pantalla existe para hacer (Nuevo cliente, Entregar al líder, Guardar).',
        'Secundario: acciones de apoyo o filtros.',
        'Terciario: salir sin hacer nada.',
        'Flotante: crear desde una lista en móvil.',
      ],
      whenNotToUse: [
        'Para navegar a otra pantalla (usa un enlace o una fila).',
        'Dos principales en la misma vista.',
        '«Peligro» para algo que se puede deshacer (basta Aviso + Deshacer).',
      ],
      usedIn: ['Encabezado', 'Diálogo', 'Aviso', 'Buscador', 'Estado vacío', 'Pantallas'],
    },
    docs: {
      description: {
        component:
          'Dispara una acción. Hay un solo botón principal por pantalla; el resto baja de jerarquía (secundario, terciario, enlace). En escritorio es una píldora de 40; en móvil el principal mide 52 y puede ocupar el ancho.',
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const buttonOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-variant]')!;

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-1: en escritorio, píldora de 40; en móvil, 52 de alto con radio 16. */
export const Principal: Story = {
  args: { icon: 'new-customer' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const button = buttonOf(frame);
      const style = getComputedStyle(button);
      expect(button.getBoundingClientRect().height).toBe(isMobile(frame) ? 52 : 40);
      expect(style.borderTopLeftRadius).toBe(isMobile(frame) ? '16px' : '999px');
      expect(style.fontWeight).toBe('600');
    }
  },
};

export const Secundario: Story = { args: { variant: 'secondary', icon: 'filter', children: 'Estado' } };

export const Terciario: Story = { args: { variant: 'tertiary', children: 'Cancelar' } };

export const Enlace: Story = { args: { variant: 'link', children: 'Ver ficha' } };

export const Peligro: Story = { args: { variant: 'danger', icon: 'delete', children: 'Eliminar' } };

export const Compacto: Story = {
  args: { variant: 'secondary', size: 'compact', icon: 'edit', children: 'Editar' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      expect(buttonOf(frame).getBoundingClientRect().height).toBe(isMobile(frame) ? 36 : 32);
      expect(buttonOf(frame).querySelector('svg')!.getBoundingClientRect().width).toBe(16);
    }
  },
};

/** CA-4: circular, sin texto visible y con nombre accesible «Cerrar». */
export const SoloIcono: Story = {
  name: 'Solo ícono',
  args: { variant: 'secondary', iconOnly: true, icon: 'close', children: 'Cerrar' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const button = buttonOf(frame);
      const box = button.getBoundingClientRect();
      expect(box.width).toBe(box.height);
      expect(getComputedStyle(button).borderTopLeftRadius).toBe('999px');
      expect(button.textContent).toBe('');
      expect(button.getAttribute('aria-label')).toBe('Cerrar');
      expect(button.querySelector('svg')!.classList.contains('lucide-x')).toBe(true);
    }
  },
};

/** CA-2: cargando, el clic no llama a `onClick`; se ve el giro con «Guardando…» y `aria-busy="true"`. */
export const Cargando: Story = {
  args: { state: 'loading', icon: 'check', children: 'Guardar' },
  play: async ({ canvasElement, args }) => {
    for (const frame of frames(canvasElement)) {
      const button = buttonOf(frame);
      await userEvent.click(button);
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.textContent).toBe('Guardando…');
      expect(button.querySelector('[data-spinner]')).not.toBeNull();
      expect(button.querySelector('svg')).toBeNull();
    }
    expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** CA-3: deshabilitado recibe foco con Tab, tiene `aria-disabled="true"` y Enter no llama a `onClick`. */
export const Deshabilitado: Story = {
  args: { state: 'disabled', children: 'Entregar al líder' },
  play: async ({ canvasElement, args }) => {
    const first = buttonOf(frames(canvasElement)[0]!);
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute('aria-disabled')).toBe('true');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await userEvent.click(first);
    expect(args.onClick).not.toHaveBeenCalled();
    expect(getComputedStyle(first).opacity).toBe('0.4');
  },
};

/** Un botón normal sí dispara su acción con Enter y con Espacio. */
export const ConTeclado: Story = {
  name: 'Con teclado',
  args: { variant: 'secondary', children: 'Reintentar' },
  play: async ({ canvasElement, args }) => {
    buttonOf(frames(canvasElement)[0]!).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};

// ─── Móvil ───

export const PrincipalAnchoCompleto: Story = {
  name: 'Principal · ancho completo',
  args: { width: 'full', children: 'Guardar' },
};

export const SecundarioMovil: Story = {
  name: 'Secundario · móvil',
  args: { variant: 'secondary', children: 'Reintentar' },
};

export const TerciarioMovil: Story = {
  name: 'Terciario · móvil',
  args: { variant: 'tertiary', children: 'Seguir editando' },
};

/** CA-5: sin ícono muestra `new-customer` a 24 px, mide 56 y tiene la sombra `shadow-bar`. */
export const Flotante: Story = {
  args: { variant: 'fab', children: 'Nuevo cliente' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const button = buttonOf(frame);
      const svg = button.querySelector('svg')!;
      expect(svg.classList.contains('lucide-user-plus')).toBe(true);
      expect(svg.getBoundingClientRect().width).toBe(24);
      expect(button.getBoundingClientRect().height).toBe(56);
      expect(button.getBoundingClientRect().width).toBe(56);
      const shadow = getComputedStyle(frame.querySelector('[data-ui-scope]')!).getPropertyValue(
        '--shadow-bar',
      );
      const probe = document.createElement('div');
      probe.style.boxShadow = shadow;
      frame.appendChild(probe);
      expect(getComputedStyle(button).boxShadow).toBe(getComputedStyle(probe).boxShadow);
      probe.remove();
      expect(button.getAttribute('aria-label')).toBe('Nuevo cliente');
    }
  },
};

export const SoloIconoMovil: Story = {
  name: 'Solo ícono · móvil',
  args: { variant: 'tertiary', iconOnly: true, icon: 'back', children: 'Volver' },
};

export const PeligroCompleto: Story = {
  name: 'Peligro · completo',
  args: { variant: 'danger', width: 'full', icon: 'delete', children: 'Eliminar' },
};

export const CargandoMovil: Story = {
  name: 'Cargando · móvil',
  args: { state: 'loading', width: 'full', children: 'Guardar' },
};

/** Todas las variantes en claro y oscuro × escritorio y móvil. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
      <Button {...args} icon="new-customer">
        Nuevo cliente
      </Button>
      <Button {...args} variant="secondary" icon="filter">
        Estado
      </Button>
      <Button {...args} variant="tertiary">
        Cancelar
      </Button>
      <Button {...args} variant="link">
        Ver ficha
      </Button>
      <Button {...args} variant="danger" icon="delete">
        Eliminar
      </Button>
      <Button {...args} variant="secondary" size="compact" icon="edit">
        Editar
      </Button>
      <Button {...args} variant="secondary" iconOnly icon="close">
        Cerrar
      </Button>
      <Button {...args} state="loading">
        Guardar
      </Button>
      <Button {...args} state="disabled">
        Entregar al líder
      </Button>
      <Button {...args} variant="fab">
        Nuevo cliente
      </Button>
    </div>
  ),
};
