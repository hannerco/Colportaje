# HU-ABO-05 · Prórroga

> **Épica:** Abonos · **Depende de:** HU-ABO-01 · **Reglas:** BR-PAY-06, BR-PAY-15, ADR-0033, ADR-0045, OQ-31, AF-24 · **Diseño:** sin pantalla (`FALTA-CLIENTES.md` FC-12)

## Historia
**Como** colportor **quiero** darle más plazo a un cliente que me lo pide, conservando la fecha que acordamos al principio **para** saber cuántas veces ha aplazado y desde cuándo.

## Contexto
- La prórroga cambia la fecha acordada; la **fecha original no cambia nunca** y cada prórroga queda en el historial (BR-PAY-06).
- La nueva fecha debe ser **posterior a la actual** y **no anterior a hoy**; si cae a **más de 2 meses desde hoy** (meses calendario; el límite exacto se acepta, OQ-31), la app pide confirmarla.
- Con el cliente ya guardado, todo cambio de fecha es prórroga (la corrección es solo durante la creación, HU-ABO-04).

## Alcance
- **Incluye:** prorrogar un abono programado (mueve solo ese abono, ADR-0047).
- **No incluye:** corrección en la creación (HU-ABO-04).

## Contrato para el front
### Acciones
- `reschedulePayment(paymentId, { newDueDate, note?, confirmed?: boolean })` → `Result<{ moved: [{ paymentId, previousDueDate, newDueDate }] }>` · errores: `PAYMENT_NOT_SCHEDULED`, `DATE_NOT_LATER`, `DATE_IN_PAST`, `RESCHEDULE_NEEDS_CONFIRMATION` (`details.dates`), `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** Solo abonos `scheduled` DEBEN prorrogarse.
- **R2.** La nueva fecha DEBE ser > fecha actual y ≥ hoy (BR-PAY-06).
- **R3.** CUANDO alguna fecha resultante supera hoy + 2 meses (`reschedule.confirmBeyondMonths`) y no viene `confirmed = true`, DEBE devolver `RESCHEDULE_NEEDS_CONFIRMATION` sin guardar.
- **R4.** Cada abono movido DEBE insertar una fila en `payment_reschedule` (fecha anterior, nueva, momento y nota) y conservar `original_due_date`.
- **R5.** La prórroga NO DEBE mover los demás abonos del cliente.
- **R6.** Todo en una transacción, con `updated_at` del cliente.

## Criterios de aceptación
- **CA-1.** **Dado** un abono del 17/10 (vencido, hoy 05/11), **cuando** se prorroga al 15/11, **entonces** la fecha acordada es 15/11, la original sigue 17/10 y hay 1 fila de historial.
- **CA-2.** **Dado** ese abono, **cuando** se prorroga otra vez al 30/11, **entonces** hay 2 filas y la original sigue 17/10 (RQ-PAY-03).
- **CA-3.** **Dado** un abono del 30/11, **cuando** se intenta llevar al 20/11, **entonces** `DATE_NOT_LATER`.
- **CA-4.** **Dado** hoy 05/11, **cuando** se prorroga al 10/01/2027 sin confirmar, **entonces** `RESCHEDULE_NEEDS_CONFIRMATION`; con `confirmed = true`, se guarda. Al 05/01/2027 (límite exacto) se guarda sin confirmar.
- **CA-5.** **Dado** abonos el 15/11, 30/11 y 15/12, **cuando** se prorroga el primero al 20/11, **entonces** quedan 20/11, 30/11 y 15/12, y solo el primero tiene fila de historial.

## Casos borde y errores
- Un abono vencido se puede prorrogar a una fecha ≥ hoy aunque sea muy posterior a la original.

## Datos
Función SQL `reschedule_payment(p_payment_id, p_new_due_date, p_note, p_confirmed)`.

## Cómo se verifica
- **Dominio:** cálculo de los 2 meses (incluido 31/12 + 2 meses = 28/02).
- **Integración:** CA-1 a CA-5.

## Terminado cuando
Se cumple §10 de las reglas comunes.
