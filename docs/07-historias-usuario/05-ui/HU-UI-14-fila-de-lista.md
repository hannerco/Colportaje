# HU-UI-14 · Fila de lista

> **Iteración 1** · **Nivel:** molécula · **Código:** `ListRow` y `ListTable` en `src/ui/molecules/ListRow/` · **Storybook:** `Moléculas/Fila de lista` · **Depende de:** HU-UI-05, HU-UI-06, HU-UI-07, HU-UI-08 · **Diseño:** ficha `Lib-FilaLista`, fuente `FilaLista.dc.html` · **Reglas:** BR-CUS-13, I-10 («Libro(s)» y «+N»), BR-GEN-12 (filas de máximo 2 líneas)

## Historia
**Como** colportor **quiero** que las listas de clientes, abonos y ejemplares se lean igual en todo el sistema **para** encontrar el dato que busco siempre en el mismo lugar.

## Qué es (de la ficha)
La fila de las listas principales: en escritorio, una fila de tabla con columnas; en móvil, una fila de dos líneas con el monto a la derecha. Un solo componente con tres tipos (cliente, abono, ejemplar) y su cabecera.
- **Usarlo:** en las listas de Clientes, Abonos de clientes, Abibonos y Ejemplares; la variante cabecera para los títulos de columna (escritorio) o de grupo (móvil).
- **No usarlo:** para datos sueltos de un detalle (Fila de dato).

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `kind` | `tipo` | `'customer' \| 'payment' \| 'copy'` | Columnas y orden de datos |
| `variant` | `variante` | `'row' \| 'header'` | `header`: títulos de columna en escritorio, título de grupo con conteo en móvil (`groupLabel`, `groupCount`) |
| `selected` | `seleccionada` | `boolean` | Fila abierta en la Ventana de detalle |
| `title` | `titulo` | `string` | Nombre del cliente o del libro |
| `avatar` | `emoji` | `{ kind: 'person' } \| { kind: 'emoji', emoji } \| { kind: 'cover', coverUrl? }` | `copy` siempre usa portada |
| `books` | `detalle` + `extra` | `{ first: string; more: number }` | Solo `customer` (I-10) |
| `installment` | `detalle` | `{ index: number; total: number }` | Solo `payment` (cuota «2/4») |
| `copyNumber` | `detalle` | `number` | Solo `copy` («#6») |
| `phone` | `telefono` | `string` | Solo `customer` |
| `amount` | `monto` | `COP` | Saldo pendiente, monto del abono o precio |
| `date` | `fecha` | fecha de `domain/time` | Último abono, fecha acordada o recibido el |
| `customerName` | — | `string` | Solo `copy` (cliente del ejemplar vendido) |
| `status` | `estado` | `PillStatus` | Se pasa tal cual a la Pastilla |
| `href` / `onOpen` | — | | Abre el detalle |

## Columnas en escritorio (del diseño)
| `kind` | Columnas (proporción) |
|---|---|
| `customer` | Cliente 1,7 · Teléfono 0,8 · Libro(s) 1,5 · Saldo pendiente 0,7 (derecha) · Último abono 0,8 · Estado 0,8 |
| `payment` | Cliente 2 · Cuota 0,6 · Fecha acordada 1 · Monto 0,8 (derecha) · Estado 0,9 |
| `copy` | Ejemplar 1,8 · Recibido el 0,9 · Precio 0,8 (derecha) · Cliente 1,4 · Estado 0,9 |

Los títulos de columna salen de `copy/es.ts`.

## Comportamiento
- **R1.** Escritorio: alto `--size-list-row` (64). El nombre va subrayado y es el enlace al detalle. Libros con `Chip kind="book"` (máximo 170) y `+N` con `Chip kind="count"`. Cuota con `DataTag fraction`, número con `DataTag number`, estado con `StatusPill` en forma píldora. Montos alineados a la derecha con números tabulares.
- **R2.** Móvil: alto 72, dos líneas (título + dato secundario), el monto a la derecha y la Pastilla en forma `text`.
  - En `customer`, la Pastilla dice «Debe» sobre el monto; el monto $0 va en `text-3`.
  - En `payment`, la segunda línea es la fecha.
  - En `copy`, la segunda línea es «Recibido dd/mm/aaaa».
- **R3.** Seleccionada: fondo `row-selected` y `aria-current="true"`; en móvil, con margen y radio.
- **R4.** Los títulos largos se cortan con «…»: nunca dos líneas en escritorio.
- **R5.** `ListTable` es el contenedor en escritorio: da la semántica de tabla (`role="table"`, `row`, `columnheader`, `cell`) y la plantilla de columnas por `kind`. En móvil es una lista (`<ul>`).

## Stories
«Explorar» · Escritorio: «Cliente · cabecera», «Cliente», «Cliente · seleccionada» (Ana Lucía Betancur, $60.000, pagando), «Abono · cabecera», «Abono», «Abono vencido» (Luz Marina Restrepo 🌻, 3/4, 28/10/2026), «Ejemplar · cabecera», «Ejemplar» · Móvil: «Cliente · cabecera de grupo» (Deudores 21), «Cliente», «Cliente al día» (Beatriz Elena Salazar, $0, saldado), «Abono», «Ejemplar», «Seleccionada» · «Tabla completa» (cabecera + 5 filas de cada tipo) · «Matriz».

## Accesibilidad
- Escritorio: tabla real; el nombre es el enlace al detalle.
- Móvil: la fila entera es el enlace.
- Fila abierta con `aria-current`.

## No incluye
- Botones de acción por fila en escritorio (van en la Ventana).
- **Deslizar la fila en móvil** (Cobrar / Más plazo, en las pantallas de Dinero y Por resolver): no está en la biblioteca (README, «Lo que la biblioteca aún no tiene»). La acción sigue disponible en el detalle.

## Criterios de aceptación
- **CA-1.** **Dado** `kind="customer"` con libros `{ first: 'Las bellas historias de la Biblia', more: 2 }`, **entonces** en escritorio se ve el chip del libro cortado con «…» y el chip «+2».
- **CA-2.** **Dado** `kind="customer"`, `amount = 0` y `status="settled"` en móvil, **entonces** se ve «Debe» sobre «$0» en `text-3`.
- **CA-3.** **Dado** `kind="payment"` con `installment = { index: 3, total: 4 }` y `status="overdue"`, **entonces** se ven «3/4» y la Pastilla «Vencido».
- **CA-4.** **Dado** una `ListTable` de clientes, **entonces** un lector de pantalla la anuncia como tabla con 6 columnas, y cada nombre es un enlace.
- **CA-5.** **Dado** `selected`, **entonces** la fila tiene fondo `row-selected` y `aria-current="true"`.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
