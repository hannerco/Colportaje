// HU-UI-01 · Enlace «Reportar corrección» y datos de diseño de la documentación (CA-6).
import { describe, expect, it } from 'vitest';
import { correctionIssueUrl, componentNameFromTitle, designVersionLabel } from '../../.storybook/design';
import { frameCombinations } from '../../.storybook/frames';

describe('Reportar corrección (HU-UI-01)', () => {
  it('CA-6: abre un issue nuevo con la plantilla «Corrección de diseño» y el título «[Botón] »', () => {
    const url = new URL(
      correctionIssueUrl({
        title: 'Átomos/Botón',
        storyUrl: 'https://sb.example/?path=/docs/atomos-boton--docs',
      }),
    );
    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/hannerco/Colportaje/issues/new');
    expect(url.searchParams.get('template')).toBe('correccion-de-diseno.yml');
    expect(url.searchParams.get('title')).toBe('[Botón] ');
    expect(url.searchParams.get('componente')).toBe('Botón');
    expect(url.searchParams.get('enlace')).toBe('https://sb.example/?path=/docs/atomos-boton--docs');
  });

  it('sin enlace de la story, no envía ese campo; el nombre es el último tramo del título', () => {
    const url = new URL(correctionIssueUrl({ title: 'Pantallas/Clientes/Lista' }));
    expect(url.searchParams.get('title')).toBe('[Lista] ');
    expect(url.searchParams.has('enlace')).toBe(false);
    expect(componentNameFromTitle('Inicio')).toBe('Inicio');
  });

  it('la versión del diseño se muestra como «Iteración 1 · diseño v1.1»', () => {
    expect(designVersionLabel({ iteration: 1, version: 'v1.1' })).toBe('Iteración 1 · diseño v1.1');
  });
});

describe('marcos del Storybook (HU-UI-01, R2)', () => {
  const labels = (...args: Parameters<typeof frameCombinations>) =>
    frameCombinations(...args).map((c) => c.label);

  it('un marco por combinación elegida en la barra', () => {
    expect(labels('dark', 'desktop')).toEqual(['Escritorio · Oscuro']);
    expect(labels('light', 'both')).toEqual(['Escritorio · Claro', 'Móvil · Claro']);
    expect(labels('both', 'mobile')).toEqual(['Móvil · Claro', 'Móvil · Oscuro']);
    expect(labels('both', 'desktop')).toEqual(['Escritorio · Claro', 'Escritorio · Oscuro']);
  });

  it('R2: con Tema y Plataforma en «Lado a lado», cuatro marcos; «Matriz» siempre pinta los cuatro', () => {
    // Una fila por tema; en cada fila, escritorio y móvil lado a lado.
    const four = ['Escritorio · Claro', 'Móvil · Claro', 'Escritorio · Oscuro', 'Móvil · Oscuro'];
    expect(labels('both', 'both')).toEqual(four);
    expect(labels('light', 'desktop', 'matrix')).toEqual(four);
  });
});
