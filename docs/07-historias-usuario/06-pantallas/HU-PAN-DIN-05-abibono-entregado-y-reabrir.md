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
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Reabrir un Abibono» (TESTING.md, flujo 13) pasa.
