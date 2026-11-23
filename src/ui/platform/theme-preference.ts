// Tema elegido en Ajustes (#42, propuesta 5): «Como el teléfono», «Claro» u «Oscuro», guardado solo en este dispositivo.
// Sin elección, `<html>` no lleva `data-theme` y los tokens siguen al sistema (I-38).

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'colportor.theme';

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Aplica el tema al instante y lo recuerda en este dispositivo (sin conexión también). */
export function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
  try {
    if (preference === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Sin almacenamiento (navegación privada): el tema vale mientras la app esté abierta.
  }
}
