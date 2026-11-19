# HU-ABO-10 · Deshacer un cobro

> **Épica:** Abonos · **Depende de:** HU-ABO-06 · **Reglas:** BR-PAY-02, BR-PAY-17 · **Diseño:** el Aviso «Abono cobrado · Deshacer» de HU-PAN-DIN-02 (CA-3) · **Origen:** decisión del dueño (2026-11-19): la HU de pantalla pide «Deshacer» y el back no lo tenía

## Historia
**Como** colportor que cobró un abono por error **quiero** deshacer el cobro en el momento **para** que el abono vuelva a estar por cobrar sin tener que corregirlo a mano.

## Contexto
- Hasta HU-ABO-06 un abono cobrado solo se corregía (valor, fecha, método) o se borraba; no volvía a «por cobrar».
- Es la transición nueva `collected → scheduled` de la tabla única (`PAYMENT_TRANSITIONS`, acción `uncollect`), igual en el dominio y en `payment_guard`.

## Contrato para el front
- `undoCollectPayment(paymentId)` → `Result<{ customerId }>` (`useUndoCollectPayment`) · errores: `INVALID_TRANSITION` (no está cobrado, o es cuota inicial o abono extra), `PAYMENT_LOCKED` (ya está en un Abibono, borrador o entregado), `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `OFFLINE`.
- Función SQL `undo_collect_payment(p_payment_id)`.

## Reglas (el sistema DEBE…)
- **R1.** Solo un abono **programado** (`kind = scheduled`) en estado `collected`, sin Abibono, DEBE poder deshacerse; pasa a `scheduled`.
- **R2.** DEBE borrar su valor real, fecha real y método; el valor y la fecha acordados, y la fecha original, NO cambian.
- **R3.** La cuota inicial y el abono extra (nacen cobrados) NO se deshacen: se corrigen o se borran (BR-PAY-11).
- **R4.** Un cobro dentro de un Abibono (borrador o entregado) NO se deshace (`PAYMENT_LOCKED`): primero se saca del Abibono.
- **R5.** Un cliente archivado NO permite deshacer (`CUSTOMER_ARCHIVED`).
- **R6.** DEBE actualizar `updated_at` del cliente (BR-CUS-16).
- **R7.** Lo que el cobro hubiera provocado en otros abonos (p. ej. un sobrante resuelto, AF-21) NO se deshace.

## Criterios de aceptación
- **CA-1.** **Dado** un abono cobrado por 30.000 en efectivo de 40.000 acordados, **cuando** se deshace, **entonces** queda por cobrar por 40.000 con la misma fecha acordada y sin valor, fecha ni método reales.
- **CA-2.** **Dado** un abono deshecho, **entonces** se puede volver a cobrar.
- **CA-3.** **Dado** una cuota inicial o un abono extra, **entonces** `INVALID_TRANSITION`.
- **CA-4.** **Dado** un cobro dentro de un Abibono, **entonces** `PAYMENT_LOCKED` y sigue cobrado.
- **CA-5.** **Dado** un cliente archivado, **entonces** `CUSTOMER_ARCHIVED`.
- **CA-6.** **Dado** otro usuario, sin sesión o un usuario inactivo, **entonces** `NOT_FOUND` / sin acceso / `FORBIDDEN`.

## Pruebas
`tests/rls/undo-collect-payment.test.ts` (CA-1 a CA-6), `tests/rls/payment.test.ts` (la tabla de transiciones coincide con el dominio) y `src/features/payments/collect-payment.test.ts`.

## Terminado cuando
Migración `20261119090000_undo_collect_payment.sql`, pruebas RLS en verde y el «Deshacer» de HU-PAN-DIN-02 conectado.
