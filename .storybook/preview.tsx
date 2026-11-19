// Configuración común de todas las stories (HU-UI-01): barra superior, marcos, documentación y accesibilidad.
import type { Preview } from '@storybook/nextjs-vite';
import '../src/ui/tokens/tokens.css';
import { DocsPage } from './DocsPage';
import { withFrames } from './frames';

const preview: Preview = {
  // R1: los tres controles son globales; al cambiarlos, todas las stories se repintan sin recargar.
  globalTypes: {
    theme: {
      description: 'Tema',
      toolbar: {
        title: 'Tema',
        icon: 'mirror',
        dynamicTitle: true,
        items: [
          { value: 'light', title: 'Tema: Claro' },
          { value: 'dark', title: 'Tema: Oscuro' },
          { value: 'both', title: 'Tema: Lado a lado' },
        ],
      },
    },
    platform: {
      description: 'Plataforma',
      toolbar: {
        title: 'Plataforma',
        icon: 'mobile',
        dynamicTitle: true,
        items: [
          { value: 'desktop', title: 'Plataforma: Escritorio' },
          { value: 'mobile', title: 'Plataforma: Móvil' },
          { value: 'both', title: 'Plataforma: Lado a lado' },
        ],
      },
    },
    fontScale: {
      description: 'Letra',
      toolbar: {
        title: 'Letra',
        icon: 'paragraph',
        dynamicTitle: true,
        items: [
          { value: '0.85', title: 'Letra: 0,85' },
          { value: '1', title: 'Letra: 1' },
          { value: '1.15', title: 'Letra: 1,15' },
          { value: '1.3', title: 'Letra: 1,3' },
        ],
      },
    },
  },
  initialGlobals: { theme: 'light', platform: 'both', fontScale: '1' },
  decorators: [withFrames],
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    docs: { page: DocsPage },
    // Cualquier violación de accesibilidad hace fallar la story en `pnpm test` (00-REGLAS-COMUNES-FRONT §8).
    a11y: { test: 'error' },
    options: {
      storySort: {
        order: ['Inicio', 'Fundamentos', 'Átomos', 'Moléculas', 'Organismos', 'Plantillas', 'Pantallas'],
      },
    },
  },
};

export default preview;
