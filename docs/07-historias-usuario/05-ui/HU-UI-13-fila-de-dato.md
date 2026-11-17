# HU-UI-13 · Fila de dato

> **Iteración 1** · **Nivel:** molécula · **Código:** `DataRow` en `src/ui/molecules/DataRow/` · **Storybook:** `Moléculas/Fila de dato` · **Depende de:** HU-UI-03 · **Diseño:** ficha `Lib-FilaDato`, fuente `FilaDato.dc.html` · **Reglas:** BR-PRC-* (precio anterior tachado), BR-GEN-07

## Historia
**Como** colportor **quiero** leer cada dato de un detalle como «etiqueta: valor» y editar los que se pueden **para** corregir un precio o una fecha sin abrir otro formulario.

## Qué es (de la ficha)
Una línea etiqueta–valor dentro de una isla de detalle. En escritorio la etiqueta va en una columna fija de 170; en móvil, etiqueta a la izquierda y valor a la derecha.
- **Usarlo:** datos de un detalle (precio, diferencia, fechas, cliente); valores editables en el lugar (subrayado punteado).
- **No usarlo:** para listas de elementos (Fila de lista).

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `label` | `etiqueta` | `string` | — | |
| `value` | `valor` | `ReactNode` | — | Dinero y fechas ya formateados por quien lo usa con `formatCOP` y `domain/time` (excepción a §7: es un contenedor genérico) |
| `icon` | `icono` | `IconName` | — | En gris |
| `kind` | `tipo` | `'text' \| 'editable' \| 'amount' \| 'link'` | `'text'` | |
| `previous` | `secundario` | `ReactNode` | — | Valor anterior tachado (precio de inventario) |
| `divider` | `linea` | `boolean` | `true` | Divisor superior; la primera fila va sin línea |
| `onEdit` | — | `() => void` | — | Obligatorio en `editable`: el valor es un botón que abre la edición |
| `href` / `onClick` | — | | | En `link` |

## Comportamiento
- **R1.** Escritorio: rejilla de 170 px + resto. Móvil: fila con la etiqueta a la izquierda y el valor alineado a la derecha.
- **R2.** Alto mínimo `--size-data-row` (44 / 48). Divisor superior `line` si `divider`.
- **R3.**
  - `amount`: peso 600.
  - `editable`: subrayado punteado con color `underline`.
  - `link`: color `accent-text` con subrayado `accent-border`.
- **R4.** `previous` se muestra tachado en `text-3`, junto al valor.
- **R5.** La edición en el lugar (abrir un Campo donde estaba el valor) la hace quien la usa con `onEdit`: la fila no contiene el formulario.

## Stories
«Explorar» · Escritorio: «Editable con anterior» (Precio acordado $93.000, antes $98.000, sin línea), «Monto» (Diferencia −$5.000), «Enlace» (Cliente: María Camila Henao), «Fecha editable» (Vendido el 02/11/2026) · Móvil: «Editable con anterior», «Monto», «Enlace» · «Matriz».

## Accesibilidad
- Se lee como par: «Precio acordado: $93.000» (`<dl>`/`<dt>`/`<dd>` o equivalente).
- En `editable`, el valor es un `<button>` con nombre «Editar Precio acordado, $93.000».

## No incluye
El formulario de edición.

## Criterios de aceptación
- **CA-1.** **Dado** `kind="editable"`, **cuando** pulso el valor o Enter sobre él, **entonces** se llama `onEdit`.
- **CA-2.** **Dado** `previous` «$98.000», **entonces** se ve tachado y un lector lo anuncia como «antes $98.000».
- **CA-3.** **Dado** escritorio, **entonces** las etiquetas de varias filas quedan alineadas en una columna de 170 px.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
