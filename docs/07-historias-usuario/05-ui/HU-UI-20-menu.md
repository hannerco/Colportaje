# HU-UI-20 · Menú (y campo de selección)

> **Iteración 1** · **Nivel:** molécula · **Código:** `Menu` y `SelectField` en `src/ui/molecules/Menu/` · **Storybook:** `Moléculas/Menú` · **Depende de:** HU-UI-09 · **Diseño:** ficha `Lib-Menu`, fuente `Menu.dc.html`; decisión «Orden y chips» (página Decisiones recientes) · **Reglas:** BR-GEN-11 (máximo 7 opciones, grupos), ADR-0050 (Radix DropdownMenu)

## Historia
**Como** colportor **quiero** que las opciones secundarias (ordenar, más acciones) se abran en un menú en escritorio y en una hoja desde abajo en el celular **para** tenerlas a mano sin llenar la pantalla.

## Qué es (de la ficha)
Lista de opciones que se abre desde un botón: el orden de una lista o las acciones de un registro (⋯). En escritorio es un menú flotante de 260; en móvil sube como hoja inferior.
- **Usarlo:** para el orden de una lista; para las acciones secundarias de un detalle (Más acciones).
- **No usarlo:** para navegar entre módulos; para una sola acción (Botón).

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `trigger` | — | `ReactElement` | Normalmente un `Button` |
| `items` | `conjunto` (datos de ejemplo) | `{ id; label; icon?: IconName; danger?: boolean; disabled?: boolean }[]` | Las destructivas van al final |
| `selectable` | — | `boolean` | `true` para orden: una opción marcada con ✓ |
| `value` / `onSelect` | `seleccion` | `string` | |
| `title` | `titulo` | `string` | Título de la hoja en móvil |
| `SelectField` | — | `Field` (`kind="select"`) + `Menu` selectable | Para el tipo selección del Campo (HU-UI-09, R6) |

## Comportamiento (cambia de forma: usa `usePlatform()`)
- **R1.** Escritorio: tarjeta flotante de 260 de ancho, relleno 6, radio 14, borde `card-border` y sombra `shadow-bar`. Opciones de 40 de alto.
- **R2.** Móvil: hoja inferior con asa, título, radio 28 arriba, relleno 10 12 24 y sombra `shadow-modal` sobre fondo `scrim`. Opciones de 52 de alto.
- **R3.** Opción: ícono `text-2` y texto `text`. La marcada lleva fondo `row-selected` y ✓. La destructiva va en `bad` (texto e ícono) y al final.
- **R4.** Elegir una opción la ejecuta y cierra el menú, devolviendo el foco al disparador.
- **R5.** Más de 7 opciones es un error de uso (aviso en desarrollo). No hay submenús.

## Stories
«Explorar» · Escritorio: «Orden» (Más recientes ✓, Nombre (A–Z), Saldo pendiente, Último abono), «Acciones de ejemplar» (Marcar con novedad, Devolver al líder, Abrir como página, Eliminar), «Acciones de abono» · Móvil: «Acciones de abono (hoja)» · «Campo de selección» (Método: Efectivo / Transferencia) · «Matriz».

## Accesibilidad
- `role="menu"`, con opciones `menuitem` o `menuitemradio` y `aria-checked`.
- Las flechas mueven entre opciones; Esc cierra y devuelve el foco al botón.

## No incluye
Submenús; el orden de cada lista (lo define la pantalla con los criterios de su HU de back).

## Criterios de aceptación
- **CA-1.** **Dado** el menú de orden en escritorio, **cuando** lo abro, bajo con flechas y pulso Enter en «Saldo pendiente», **entonces** se llama `onSelect('balance')`, el menú se cierra y el foco vuelve al botón «Orden».
- **CA-2.** **Dado** móvil, **cuando** abro «Acciones de abono», **entonces** sube una hoja con título, opciones de 52 de alto y «Cancelar abono» en rojo al final.
- **CA-3.** **Dado** el menú abierto, **cuando** pulso Esc, **entonces** se cierra sin elegir nada.
- **CA-4.** **Dado** `SelectField` «Método», **cuando** elijo «Transferencia», **entonces** el campo muestra «Transferencia» y `aria-expanded` vuelve a `false`.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
