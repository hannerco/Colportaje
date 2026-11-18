// Decorador de marcos (HU-UI-01): la ÚNICA forma de dar tema, plataforma y letra a una story (R3).
import type { Decorator } from '@storybook/nextjs-vite';
import type { CSSProperties } from 'react';
import { ThemeScope, type Platform, type Theme } from '../src/ui/platform';
import './frames.css';

export type ThemeGlobal = Theme | 'both';
export type PlatformGlobal = Platform | 'both';

/** `matrix` pinta las cuatro combinaciones aunque la barra diga otra cosa (story «Matriz»). */
export type FramesParameter = 'toolbar' | 'matrix';
/** `component`: 1280 / 390 de ancho. `screen`: plantillas y pantallas a tamaño real (1440 × 900 y 390 × 844). */
export type FrameSizeParameter = 'component' | 'screen';

const THEME_LABEL: Record<Theme, string> = { light: 'Claro', dark: 'Oscuro' };
const PLATFORM_LABEL: Record<Platform, string> = { desktop: 'Escritorio', mobile: 'Móvil' };

const SIZE: Record<FrameSizeParameter, Record<Platform, CSSProperties>> = {
  component: { desktop: { width: 1280 }, mobile: { width: 390 } },
  screen: { desktop: { width: 1440, minHeight: 900 }, mobile: { width: 390, minHeight: 844 } },
};

const pick = <T extends string>(value: T | 'both', both: readonly T[]): readonly T[] =>
  value === 'both' ? both : [value];

/** Las combinaciones a pintar, fila por fila: una fila por tema (claro primero) y en cada una escritorio y móvil. */
export const frameCombinations = (
  theme: ThemeGlobal,
  platform: PlatformGlobal,
  frames: FramesParameter = 'toolbar',
): { theme: Theme; platform: Platform; label: string }[] => {
  const themes = frames === 'matrix' ? (['light', 'dark'] as const) : pick(theme, ['light', 'dark'] as const);
  const platforms =
    frames === 'matrix' ? (['desktop', 'mobile'] as const) : pick(platform, ['desktop', 'mobile'] as const);
  return themes.flatMap((t) =>
    platforms.map((p) => ({ theme: t, platform: p, label: `${PLATFORM_LABEL[p]} · ${THEME_LABEL[t]}` })),
  );
};

export const withFrames: Decorator = (Story, context) => {
  const theme = (context.globals.theme ?? 'light') as ThemeGlobal;
  const platform = (context.globals.platform ?? 'both') as PlatformGlobal;
  const fontScale = Number(context.globals.fontScale ?? '1');
  const frames = (context.parameters.frames ?? 'toolbar') as FramesParameter;
  const size = (context.parameters.frameSize ?? 'component') as FrameSizeParameter;

  const combos = frameCombinations(theme, platform, frames);
  const columns = new Set(combos.map((c) => c.platform)).size;
  return (
    <div
      className="sb-frames"
      data-frames={frames}
      style={{ gridTemplateColumns: `repeat(${columns}, max-content)` }}
    >
      {combos.map((combo) => (
        // La clave incluye la Letra: al cambiarla, el marco se vuelve a montar y lo de adentro se mide otra vez.
        <figure key={`${combo.label}·${fontScale}`} className="sb-frame" aria-label={combo.label}>
          <figcaption className="sb-frame__label">{combo.label}</figcaption>
          <ThemeScope
            theme={combo.theme}
            platform={combo.platform}
            fontScale={fontScale}
            page
            className="sb-frame__body"
            style={SIZE[size][combo.platform]}
          >
            <Story />
          </ThemeScope>
        </figure>
      ))}
    </div>
  );
};
