# HU-UI-19 · Historial

> **Iteración 1** · **Nivel:** molécula · **Código:** `HistoryTimeline` en `src/ui/molecules/HistoryTimeline/` · **Storybook:** `Moléculas/Historial` · **Depende de:** HU-UI-04 · **Diseño:** ficha `Lib-Historial`, fuente `Historial.dc.html` · **Reglas:** BR-COPY-11, BR-COPY-16, BR-COPY-17 (deshacer desde el historial), HU-INV-05

## Historia
**Como** colportor **quiero** ver lo que le pasó a un ejemplar, un abono o un cliente, del más reciente al más antiguo, y deshacer el último cambio **para** entender y corregir sin pedir ayuda.

## Qué es (de la ficha)
Línea de tiempo de lo que le pasó a un registro. El último cambio se puede deshacer desde aquí.
- **Usarlo:** en la última isla del detalle de ejemplar, abono o cliente.
- **No usarlo:** como lista de actividad global (eso es Hoy).

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `items` | `conjunto` (datos de ejemplo) | `{ id: string; text: string; note?: string; date: DateOnly }[]` | Del más reciente al más antiguo; los textos los arma la pantalla desde `copy/es.ts` |
| `undo` | `deshacer` | `{ label: string; onUndo: () => void } \| undefined` | Si existe, aparece en la primera entrada. Lo decide el modelo de vista (`HistoryUndo` de HU-INV-05) |
| `maxVisible` | — | `number` | Por defecto 5; con más entradas aparece «Ver todo» |

## Comportamiento
- **R1.** Cada entrada lleva un punto (`accent-text` en la más reciente, `neutral-border` en las demás), una línea vertical `line` que une los puntos (salvo en la última), el texto, la nota opcional en `text-3` y la fecha `dd/mm/aaaa`.
- **R2.** «Deshacer» es un botón enlace en la primera entrada.
- **R3.** Con más de `maxVisible` entradas se muestran las primeras y el botón «Ver todo», que despliega el resto en el lugar.

## Stories
«Explorar» · Escritorio: «Ejemplar» (Apareció · Estaba en la caja de la casa; Con novedad; Recibido), «Abono» (Cobrado en efectivo · $65.000; Fecha acordada cambiada; Abono creado) · Móvil: «Ejemplar», «Cliente · sin deshacer» · «Largo» (8 entradas con «Ver todo») · «Matriz».

## Accesibilidad
- Lista ordenada (`<ol>`).
- «Deshacer» dice qué deshace: `aria-label` «Deshacer: Apareció».

## No incluye
La confirmación o la nota obligatoria al deshacer «Devuelto al líder» (BR-COPY-16): la pide la pantalla con un Diálogo.

## Criterios de aceptación
- **CA-1.** **Dado** tres entradas y `undo`, **entonces** solo la primera tiene «Deshacer», con nombre accesible «Deshacer: Apareció».
- **CA-2.** **Dado** 8 entradas, **entonces** se ven 5 y «Ver todo»; al pulsarlo se ven las 8.
- **CA-3.** **Dado** `undo` indefinido, **entonces** no hay ningún botón de deshacer.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
