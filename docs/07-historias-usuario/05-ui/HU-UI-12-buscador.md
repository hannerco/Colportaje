# HU-UI-12 · Buscador

> **Iteración 1** · **Nivel:** molécula · **Código:** `SearchBox` en `src/ui/molecules/SearchBox/` · **Storybook:** `Moléculas/Buscador` · **Depende de:** HU-UI-04 · **Diseño:** ficha `Lib-Buscador`, fuente `Buscador.dc.html` · **Reglas:** BR-CUS-07, FT-01

## Historia
**Como** colportor **quiero** buscar mientras escribo **para** encontrar un cliente o un libro sin pulsar «Buscar».

## Qué es (de la ficha)
Campo para buscar dentro de una lista. En escritorio es una píldora de 40 junto a los filtros; en móvil es una caja blanca de 52 con el botón de filtros adentro.
- **Usarlo:** arriba de cualquier lista de más de 10 elementos.
- **No usarlo:** para capturar datos de un formulario (Campo).

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `value` / `onValueChange` | `valor` | `string` | `''` | Busca mientras se escribe |
| `placeholder` | `placeholder` | `string` | — | «Buscar cliente» |
| `filters` | `filtros` | `'auto' \| 'show' \| 'hide'` | `'auto'` | Auto: botón de filtros solo en móvil |
| `onOpenFilters` | — | `() => void` | — | Botón de filtros (móvil) |
| `activeFilterCount` | — | `number` | 0 | Se muestra junto al ícono de filtros |
| `shortcut` | `atajo` | `boolean` | `false` | Muestra «⌘K» (solo escritorio) |
| `width` | `ancho` | `number \| 'auto'` | 300 en escritorio, 100 % en móvil | |
| `resultsAnnouncement` | — | `string` | — | Texto que se anuncia, p. ej. «12 clientes» |

El «enfocado» del diseño es el foco real, no una prop.

## Comportamiento
- **R1.** Escritorio: alto `--size-search` (40), píldora, fondo `control-bg`, borde `control-border`, relleno 0 14, lupa de 18 en `text-3`.
- **R2.** Móvil: alto 52, radio 18, fondo `card`, sin borde, sombra `shadow-control`, relleno 0 14 0 16, lupa de 22 en `text-2`.
- **R3.** Foco: borde `accent` y anillo de 3 px `ring`.
- **R4.** Con texto aparece el botón ✕ para borrar, que deja el foco en la caja.
- **R5.** Esc borra el texto si hay; si está vacío, quita el foco.

## Stories
«Explorar» · Escritorio: «Vacío», «Con texto y enfocado» (Mar), «Barra lateral con atajo» (Buscar, ⌘K) · Móvil: «Vacío con filtros», «Con texto» (Marí) · «Matriz».

## Accesibilidad
- `role="search"` e `input type="search"` con nombre.
- Los botones de borrar y de filtros tienen `aria-label` («Borrar búsqueda», «Filtros»).
- Los resultados se anuncian con `aria-live="polite"` usando `resultsAnnouncement`.

## No incluye
- **La búsqueda global ⌘K de la barra lateral** (FT-01: no está definido qué busca). El atajo visual existe para la story, pero la app no lo muestra hasta que se defina.
- La lógica de búsqueda (la entrega el back, HU-CLI-05).

## Criterios de aceptación
- **CA-1.** **Dado** el buscador con «Mar», **cuando** pulso ✕, **entonces** se llama `onValueChange('')` y el foco queda en la caja.
- **CA-2.** **Dado** el foco en la caja vacía, **cuando** pulso Esc, **entonces** pierde el foco.
- **CA-3.** **Dado** `filters="auto"`, **entonces** el botón de filtros aparece en móvil y no en escritorio; con `activeFilterCount={2}` su nombre accesible es «Filtros, 2 activos».
- **CA-4.** **Dado** `resultsAnnouncement="12 clientes"`, **entonces** un lector de pantalla lo anuncia sin mover el foco.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
