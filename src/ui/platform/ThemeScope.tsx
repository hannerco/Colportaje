'use client';

import type { CSSProperties, ReactNode } from 'react';
import { PlatformProvider, type Platform } from './PlatformProvider';
import styles from './ThemeScope.module.css';

export type Theme = 'light' | 'dark';

export type ThemeScopeProps = {
  /** Tema de lo que envuelve. Sin valor, se hereda (o sigue al sistema). */
  theme?: Theme;
  /** Plataforma de lo que envuelve: fija `data-platform` y el `PlatformProvider`. Sin valor, se hereda. */
  platform?: Platform;
  /** Escala de toda la letra (`--font-scale`). Sin valor, se hereda. */
  fontScale?: number;
  /** Pinta el fondo de página del tema (los marcos del Storybook). */
  page?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * Ámbito de tema, plataforma y letra (ADR-0050 §3): pone `data-theme`, `data-platform` y `--font-scale` en un
 * ancestro, y todo lo de adentro toma esos valores sin recibirlos por props. Es lo que usa cada marco del Storybook.
 */
export function ThemeScope({
  theme,
  platform,
  fontScale,
  page,
  className,
  style,
  children,
}: ThemeScopeProps) {
  const content = (
    <div
      data-ui-scope=""
      data-theme={theme}
      data-platform={platform}
      className={[styles.scope, page ? styles.page : undefined, className].filter(Boolean).join(' ')}
      style={fontScale === undefined ? style : ({ ...style, '--font-scale': fontScale } as CSSProperties)}
    >
      {children}
    </div>
  );
  return platform ? <PlatformProvider platform={platform}>{content}</PlatformProvider> : content;
}
