// HU-UI-01 · Todo componente de src/ui/{atoms,molecules,organisms,templates} y toda pantalla de
// src/features/*/screens tiene su .stories.tsx (00-REGLAS-COMUNES-FRONT §10, TESTING.md).
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const UI_LEVELS = ['atoms', 'molecules', 'organisms', 'templates'];

const dirs = (path: string) =>
  existsSync(path) ? readdirSync(path, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];

/** Nombres de los componentes y pantallas de `root` que no tienen su story. */
export function findMissingStories(root: string): string[] {
  const missing: string[] = [];
  // Cada componente vive en su carpeta: Button/Button.tsx → Button/Button.stories.tsx.
  for (const level of UI_LEVELS) {
    for (const component of dirs(join(root, 'src/ui', level))) {
      const folder = join(root, 'src/ui', level, component.name);
      if (
        existsSync(join(folder, `${component.name}.tsx`)) &&
        !existsSync(join(folder, `${component.name}.stories.tsx`))
      )
        missing.push(component.name);
    }
  }
  // Pantallas de presentación: features/<área>/screens/Foo.tsx → Foo.stories.tsx al lado.
  for (const area of dirs(join(root, 'src/features'))) {
    const screens = join(root, 'src/features', area.name, 'screens');
    if (!existsSync(screens)) continue;
    for (const file of readdirSync(screens)) {
      const screen = /^([A-Z]\w*)\.tsx$/.exec(file)?.[1];
      if (screen && !existsSync(join(screens, `${screen}.stories.tsx`))) missing.push(screen);
    }
  }
  return missing.sort();
}

const tmp: string[] = [];
afterAll(() => tmp.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const fixture = (files: string[]) => {
  const root = mkdtempSync(join(tmpdir(), 'colportor-stories-'));
  tmp.push(root);
  for (const file of files) {
    mkdirSync(join(root, file, '..'), { recursive: true });
    writeFileSync(join(root, file), 'export {};\n');
  }
  return root;
};

describe('arquitectura: una story por componente y pantalla (HU-UI-01)', () => {
  it('el repositorio cumple: ningún componente ni pantalla sin story', () => {
    expect(findMissingStories(ROOT)).toEqual([]);
  });

  it('CA-4: src/ui/atoms/Foo/Foo.tsx sin Foo.stories.tsx hace fallar la prueba y la nombra', () => {
    const root = fixture(['src/ui/atoms/Foo/Foo.tsx', 'src/ui/atoms/Foo/index.ts']);
    expect(findMissingStories(root)).toEqual(['Foo']);
  });

  it('revisa los cuatro niveles y las pantallas; con su story no falta nada', () => {
    const root = fixture([
      'src/ui/molecules/SearchBox/SearchBox.tsx',
      'src/ui/organisms/Dialog/Dialog.tsx',
      'src/ui/organisms/Dialog/Dialog.stories.tsx',
      'src/ui/templates/ListTemplate/ListTemplate.tsx',
      'src/features/customers/screens/CustomerListScreen.tsx',
      'src/features/customers/screens/CustomerListScreen.stories.tsx',
      'src/features/money/screens/MoneyScreen.tsx',
      // No son componentes: índices, pruebas y archivos de carpetas fuera de los niveles.
      'src/features/money/screens/index.ts',
      'src/ui/platform/ThemeScope.tsx',
      'src/ui/icons/Icon.tsx',
    ]);
    expect(findMissingStories(root)).toEqual(['ListTemplate', 'MoneyScreen', 'SearchBox']);
  });
});
