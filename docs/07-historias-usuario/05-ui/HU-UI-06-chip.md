# HU-UI-06 · Chip

> **Iteración 1** · **Nivel:** átomo · **Código:** `Chip` en `src/ui/atoms/Chip/` · **Storybook:** `Átomos/Chip` · **Depende de:** HU-UI-03 · **Diseño:** ficha `Lib-Chip`, fuente `Chip.dc.html`; decisión «Orden y chips» (página Decisiones recientes) · **Reglas:** ADR-0050

## Historia
**Como** colportor **quiero** ver los filtros que apliqué y quitarlos con un toque, y ver los libros de un cliente en su fila, **para** entender qué estoy mirando.

## Qué es (de la ficha)
Pieza pequeña y redondeada para filtrar una lista o mostrar los libros de un cliente. A diferencia de la Pastilla, el chip de filtro se puede pulsar y quitar.
- **Usarlo:** filtros activos sobre una lista (Estado: Vencido ✕); libros de un cliente en la fila móvil, con «+N» si hay más; opciones rápidas en un menú de filtros.
- **No usarlo:** para estados (Pastilla); para cambiar de vista de una lista (Pestañas).

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `children` | `texto` | `string` | — | |
| `kind` | `tipo` | `'filter' \| 'book' \| 'count'` | `'filter'` | Filtro es pulsable; libro y conteo son informativos |
| `selected` | `seleccionado` | `boolean` | `false` | Filtro aplicado (tono acento) |
| `removable` | `quitable` | `boolean` | `false` | Muestra la ✕ (solo `filter`) |
| `count` | `conteo` | `number` | — | Cuántos resultados da |
| `icon` | `icono` | `IconName` | `books` en `book`; ninguno en los demás | `count` nunca lleva ícono |
| `maxWidth` | `anchoMax` | `number` (80–400) | 200 | Corta con «…» |
| `onClick`, `onRemove` | — | | | |

## Comportamiento
- **R1.** `filter`: alto `--size-control-sm` (32 / 36), píldora, texto `--text-secondary` en peso 500, ícono de 16.
  - Sin seleccionar: fondo `control-bg`, borde `control-border`, sombra `shadow-control`, texto `text` e ícono `text-2`.
  - Seleccionado: fondo `accent-bg`, borde `accent-border`, texto e ícono `accent-text`, sin sombra.
- **R2.** `book`: alto 24 en escritorio y 26 en móvil, radio 8, borde `line`, texto `--text-caption` en `text-2`, ícono `books` de 13 en `text-3`.
- **R3.** `count`: alto 24 / 26, píldora, borde `line`, texto `--text-caption` en peso 500 y color `text-3`, sin ícono (p. ej. «+2»).
- **R4.** El conteo va en `text-3`, o en `accent-text` si está seleccionado.
- **R5.** La ✕ es un botón propio que llama `onRemove` sin disparar `onClick`.

## Stories
«Explorar» · Escritorio: «Filtro» (Estado), «Con conteo» (Vencidos 4), «Seleccionado y quitable» (Vencido), «Libro» (Un corazón tranquilo), «Libro largo» (Las bellas historias de la Biblia, 180), «Conteo» (+2) · Móvil: «Filtro», «Seleccionado y quitable», «Libro» (170), «Conteo» (+1) · «Matriz».

## Accesibilidad
- Filtro: `<button>` con `aria-pressed` según esté aplicado.
- La ✕ tiene su propio nombre: «Quitar filtro Vencido» (texto de `copy/es.ts`).
- Libro y conteo son texto y no reciben foco.

## No incluye
La fila de chips activos ni su resumen «Filtros (3)» en móvil (van en la Barra de vista, HU-UI-28).

## Criterios de aceptación
- **CA-1.** **Dado** un filtro `selected removable` «Vencido», **cuando** pulso la ✕, **entonces** se llama `onRemove` una vez y `onClick` no se llama.
- **CA-2.** **Dado** `kind="book"` con «Las bellas historias de la Biblia» y `maxWidth={180}`, **entonces** el texto se corta con «…» y el título completo queda disponible (`title`).
- **CA-3.** **Dado** un filtro sin seleccionar y luego seleccionado, **entonces** `aria-pressed` pasa de `false` a `true` y los colores cambian a acento.
- **CA-4.** **Dado** `kind="count"` «+2», **entonces** no recibe foco con Tab.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
