import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Avatar } from './Avatar';

/** Portada de ejemplo (sin derechos de terceros): un rectángulo 2:3 con dos franjas. */
const SAMPLE_COVER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90"><rect width="60" height="90" fill="#7a4e2d"/><rect y="58" width="60" height="14" fill="#e8c27a"/><rect x="8" y="12" width="44" height="4" fill="#f5efe4"/></svg>',
)}`;

const meta = {
  title: 'Átomos/Avatar',
  component: Avatar,
  args: { kind: 'person', name: 'Luz Marina' },
  argTypes: {
    kind: { control: 'inline-radio', options: ['person', 'emoji', 'cover', 'brand'] },
    size: { control: 'inline-radio', options: ['auto', 'sm', 'md', 'lg', 'xl'] },
    emoji: { control: 'text' },
    coverUrl: { control: 'text' },
  },
  parameters: {
    design: {
      ficha: 'Lib-Avatar',
      version: 'v1.1',
      iteration: 1,
      whenToUse: [
        'Al inicio de filas de clientes, abonos y ejemplares.',
        'En el encabezado de una ficha (xl).',
        'Marca en la cabecera de la barra lateral.',
      ],
      whenNotToUse: ['Como botón por sí solo.', 'Con fotos reales de clientes sin su permiso.'],
      usedIn: ['Fila de lista', 'Encabezado de la ficha del cliente', 'Barra lateral'],
    },
    docs: {
      description: {
        component:
          'Identifica a un cliente (ícono de persona o el emoji que eligió el colportor), a un libro (portada) o a la marca. En `auto` mide 32 en escritorio y 40 en móvil. Si el nombre ya está al lado, usa `decorative`.',
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const frames = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('figure.sb-frame')];
const avatarOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-kind]')!;
const isMobile = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>('[data-ui-scope]')!.dataset.platform === 'mobile';
const box = (el: Element) => {
  const { width, height } = el.getBoundingClientRect();
  return { width: Math.round(width), height: Math.round(height) };
};

export const Explorar: Story = {};

// ─── Escritorio ───

/** CA-1: en `auto` mide 32 en escritorio y 40 en móvil; el ícono, la mitad. */
export const Persona: Story = {
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const avatar = avatarOf(frame);
      const side = isMobile(frame) ? 40 : 32;
      expect(box(avatar)).toEqual({ width: side, height: side });
      expect(box(avatar.querySelector('svg')!)).toEqual({ width: side / 2, height: side / 2 });
      expect(getComputedStyle(avatar).borderRadius).toBe('999px');
      expect(avatar.getAttribute('role')).toBe('img');
    }
  },
};

/** CA-3: el nombre accesible es el del cliente. */
export const Emoji: Story = {
  args: { kind: 'emoji', emoji: '🌻', name: 'Luz Marina' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const avatar = avatarOf(frame);
      expect(avatar.getAttribute('role')).toBe('img');
      expect(avatar.getAttribute('aria-label')).toBe('Luz Marina');
      expect(avatar.textContent).toBe('🌻');
      expect(parseFloat(getComputedStyle(avatar.firstElementChild!).fontSize)).toBeCloseTo(
        (isMobile(frame) ? 40 : 32) * 0.72,
      );
    }
  },
};

export const Portada: Story = {
  args: { kind: 'cover', name: undefined, coverUrl: SAMPLE_COVER },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const avatar = avatarOf(frame);
      expect(avatar.getAttribute('aria-label')).toBe('Portada');
      expect(getComputedStyle(avatar.querySelector('img')!).objectFit).toBe('cover');
      expect(box(avatar)).toEqual(isMobile(frame) ? { width: 32, height: 40 } : { width: 26, height: 32 });
    }
  },
};

/** R4: siempre md, fondo de acento y radio 9. */
export const Marca: Story = {
  args: { kind: 'brand', name: undefined },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const avatar = avatarOf(frame);
      expect(avatar.getAttribute('aria-label')).toBe('Colportor');
      expect(box(avatar)).toEqual({ width: 32, height: 32 });
      // Ronda 37: la marca es el Logo como ícono de app (cuadro con radio del 22,5 %).
      const tile = avatar.querySelector<HTMLElement>('[data-variant="app-icon"] > span')!;
      expect(getComputedStyle(tile).borderRadius).toBe('7.2px');
    }
  },
};

export const PersonaXl: Story = {
  name: 'Persona · xl',
  args: { size: 'xl' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement))
      expect(box(avatarOf(frame))).toEqual({ width: 56, height: 56 });
  },
};

/** CA-2: sin imagen, 45 × 70 con radio 10 y el ícono de libro. */
export const PortadaXl: Story = {
  name: 'Portada · xl',
  args: { kind: 'cover', name: undefined, size: 'xl' },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const avatar = avatarOf(frame);
      expect(box(avatar)).toEqual({ width: 45, height: 70 });
      expect(getComputedStyle(avatar).borderRadius).toBe('10px');
      expect(avatar.querySelector('svg')!.dataset.icon).toBe('books');
    }
  },
};

/** CA-4: con el nombre al lado, el avatar no se anuncia. */
export const Decorativo: Story = {
  args: { decorative: true },
  play: async ({ canvasElement }) => {
    for (const frame of frames(canvasElement)) {
      const avatar = avatarOf(frame);
      expect(avatar.getAttribute('aria-hidden')).toBe('true');
      expect(avatar.hasAttribute('role')).toBe(false);
    }
  },
};

// ─── Móvil ───

export const PersonaMovil: Story = { name: 'Persona · móvil' };

export const EmojiMovil: Story = { name: 'Emoji · móvil', args: { kind: 'emoji', emoji: '📚' } };

export const PortadaMovil: Story = {
  name: 'Portada · móvil',
  args: { kind: 'cover', name: undefined, coverUrl: SAMPLE_COVER },
};

export const PersonaXlMovil: Story = { name: 'Persona · xl · móvil', args: { size: 'xl' } };

/** Todos los tipos y tamaños en claro y oscuro × escritorio y móvil. R5: trazo 2 solo en sm. */
export const Matriz: Story = {
  parameters: { frames: 'matrix' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      {(['sm', 'md', 'lg', 'xl', 'auto'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <Avatar size={size} name="Luz Marina" />
          <Avatar size={size} kind="emoji" emoji="🌻" name="Luz Marina" />
          <Avatar size={size} kind="cover" />
          <Avatar size={size} kind="cover" coverUrl={SAMPLE_COVER} />
          <Avatar size={size} kind="brand" />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Íconos de trazo (la marca es el Logo, relleno: no lleva trazo de ícono).
    for (const svg of canvasElement.querySelectorAll<SVGElement>(
      '[data-kind]:not([data-kind="brand"]) svg',
    )) {
      const size = svg.closest<HTMLElement>('[data-kind]')!.dataset.size;
      expect(getComputedStyle(svg).strokeWidth).toBe(size === 'sm' ? '2px' : '1.8px');
    }
  },
};
