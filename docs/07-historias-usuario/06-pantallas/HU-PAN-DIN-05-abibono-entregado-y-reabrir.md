# HU-PAN-DIN-05 · Abibono entregado y reabrir

> **Iteración 1** · **Nivel:** pantalla · **Código:** `DepositDetailScreen` en `src/features/money/screens/` · **Storybook:** `Pantallas/Dinero/Abibono entregado` · **Depende de:** HU-PAN-DIN-04 · **Back:** HU-DIN-05, HU-DIN-07 · **Diseño:** «3 · Abibonos» (escritorio: Dinero-d-confirmado, -reabrir) y móvil (Dinero-m-entregado, -reabrir) · **Reglas:** BR-DEP-06, BR-DEP-11, BR-DEP-12, I-27, I-28

## Historia
**Como** colportor **quiero** ver un Abibono entregado tal como quedó y, si me equivoqué, reabrirlo explicando por qué **para** corregir la entrega sin perder el rastro.

## Contrato que usa
`useDeposit`, `useUpdateDepositNote` (editar la nota), `useReopenDeposit` (con `validateReopenReason`).

## Pantalla
- `DetailTemplate` en solo lectura: identidad («Abibono (n)», Pastilla «Entregado» con candado), datos (fecha, totales por método, esperado, diferencia, nota, recibos) e historial (confirmado, reabierto…).
- La nota se puede editar, pero no puede quedar vacía si hay diferencia (I-27).
- **Reabrir:** en Más acciones, con `ConfirmDialog` y motivo obligatorio. Al confirmar, vuelve a borrador y se abre su edición (HU-PAN-DIN-04).

## Estados (stories)
Entregado · Reabrir (diálogo con motivo) · Con diferencia y nota · Móvil.

## Criterios de aceptación
- **CA-1.** **Dado** un Abibono entregado, **entonces** no hay campos editables salvo la nota y «Reabrir» está en Más acciones.
- **CA-2.** **Dado** «Reabrir» sin motivo, **entonces** no se puede confirmar; con motivo, el Abibono vuelve a Borrador, conserva su número (I-31) y sus abonos vuelven a «Cobrado».
- **CA-3.** **Dado** diferencia −$10.000, **cuando** borro la nota, **entonces** no se puede guardar.

## Cambios por iteración
- **2026-11-19 (al programarla; lienzo leído en `DineroEscritorio`, vistas «confirmado» y «reabrir»):**
  - **Pantalla:** `DepositDetailScreen` en `/dinero/abibonos/[id]` cuando el Abibono está entregado (la misma ruta muestra el editor si es borrador). `DetailTemplate` con identidad («Abibono (n)», Pastilla «Entregado» con candado) y tres islas: **Datos** (fecha, efectivo, transferencia, total, esperado y diferencia, más la nota y el recibo), **Abonos** (los vinculados, cada uno lleva a su detalle) e **Historial** (entregado y reabierto, con el motivo).
  - **Solo lectura salvo la nota y los recibos nuevos** (BR-DEP-12): título, fecha, montos y abonos no se editan; los recibos se pueden añadir, no quitar (BR-PHO-03). La nota tiene su «Guardar nota» (aparece al cambiar el texto) y no puede quedar vacía si hay diferencia (I-27, CA-3); sin diferencia se puede borrar del todo.
  - **Reabrir:** en Más acciones (como pide esta HU), con el diálogo del lienzo «Reabrir Abibono (n)»: Motivo obligatorio (sin motivo avisa «Escribe el motivo.» y no se confirma). Al reabrir, la lectura se actualiza y la misma ruta abre su edición (HU-PAN-DIN-04); conserva su número (I-31) y sus abonos vuelven a Cobrado.
  - **E2E:** flujo 13 a continuación del 5 (nota, reabrir con y sin motivo, y volver a entregar con el recibo que ya tenía).
  - **Fuera / pendiente:** el lienzo dibuja «Reabrir» como botón visible en el panel; aquí va en Más acciones, como dice la HU y «discreto» según BR-DEP-12.
- **2026-11-22 (#29):** en escritorio, abrir una fila ya no va siempre a la página completa: abre la Ventana de detalle de la lista con la forma recordada (Lateral o Centrada), como Clientes; si la forma es Página, va a la página. Desde la página, elegir Lateral o Centrada vuelve a la lista con el registro abierto, en vez de cerrarlo. Story «… › Abrir en la Ventana».
- **2026-11-22 (#71):** el Abibono (nuevo, borrador y entregado) sigue el diseño aceptado («AbibonoPanel»). Arriba va la cabecera: nombre (o su campo), estado y fecha, con el Total grande y cuántos abonos lleva, y Efectivo y Transferencia con lo suyo. Siguen la isla Abonos (Cliente · Fecha real · Método · Valor real, con casilla o candado al inicio y «N de M seleccionados» con Todos/Ninguno en el borrador), «Lo que entregas», «Recibo» y «Cuadre» (Esperado y Diferencia con su «Qué es», y la Nota). En el entregado, «Reabrir» va en la barra de abajo (ya no en Más acciones), y el Historial solo aparece si alguna vez se reabrió. En una isla angosta, cada abono queda en dos líneas sin encimarse. Piezas comunes: `features/money/components/DepositPanel`; la Selección acepta `hideLabel`.
- Ronda 37, #92 (2026-11-23): «Ver recibo» abre el recibo del Abibono (logotipo, abonos y cuadre) para compartir, imprimir o guardar PDF; al imprimir, tinta negra.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Reabrir un Abibono» (TESTING.md, flujo 13) pasa.
