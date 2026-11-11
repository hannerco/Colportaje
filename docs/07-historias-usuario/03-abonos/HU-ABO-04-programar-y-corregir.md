# HU-ABO-04 · Programar, editar, corregir, borrar y cancelar abonos programados

> **Épica:** Abonos · **Depende de:** HU-ABO-07, HU-CLI-02 · **Reglas:** BR-PAY-06/11/13/14/15/16, ADR-0045, AF-107 · **Diseño:** "Cambiar fecha de abono · calendario abierto / fecha cambiada" (con "Correr también los siguientes"); "Programar abono" de la ficha sin formulario (FC-10, FC-11)

## Historia
**Como** colportor **quiero** programar un abono suelto y ajustar los programados (valor, fecha mal escrita, borrar o cancelar) **para** que el plan refleje lo que acordé con el cliente.

## Contexto
- Un abono suelto se puede programar **siempre**, aunque no haya libro (aparece "Aún no tiene libro") (ronda 26).
- **Corregir** la fecha es solo **durante la creación** del cliente: cambia también la fecha original y no deja historial, y mueve **solo ese abono** (ADR-0047). Después de guardar, cambiar la fecha es **prórroga** (HU-ABO-05).
- **Borrar** = el abono nunca debió existir (no queda en Cancelados). **Cancelar** = se acordó y ya no se cobrará (queda en Cancelados, motivo `manual`).
- Ninguna fecha anterior a hoy.

## Alcance
- **Incluye:** programar un abono suelto; editar el valor de un programado; corregir su fecha (solo ese abono); borrar un programado; cancelar programados.
- **No incluye:** prórroga (HU-ABO-05), plan (HU-ABO-03), cobrados (HU-ABO-02).

## Contrato para el front
### Acciones
- `scheduleSinglePayment({ paymentId, customerId, agreedAmount, dueDate })` → `Result<{ account; excess }>` (disparador `form_edit`).
- `updateScheduledAmount(paymentId, agreedAmount)` → `Result<{ account; excess }>` (disparador `form_edit`).
- `correctScheduledDate(paymentId, dueDate)` → `Result<void>`.
- `deletePayment(paymentId)` (compartida con HU-ABO-02) para programados.
- `cancelScheduledPayments(paymentIds)` → `Result<{ account }>` (motivo `manual`).
- Errores: `VALIDATION` (valor entero > 0; fecha no anterior a hoy), `PAYMENT_NOT_SCHEDULED`, `CUSTOMER_ARCHIVED`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** Programar DEBE crear un abono `scheduled` con fecha acordada = fecha original; valor entero > 0 (cualquier entero, no exige múltiplo de 1.000); fecha ≥ hoy (BR-PAY-16).
- **R2.** Editar el valor DEBE aceptar cualquier entero > 0 y solo en abonos `scheduled` (BR-PAY-11, BR-PAY-15).
- **R3.** Corregir la fecha DEBE cambiar `due_date` y `original_due_date`, sin `payment_reschedule`; NO DEBE tocar los demás abonos del cliente.
- **R4.** Cancelar DEBE dejar el abono `canceled` con `canceled_at`, motivo `manual` y `payment_event canceled`.
- **R5.** Toda acción DEBE actualizar `updated_at` del cliente y devolver la evaluación con disparador `form_edit` cuando corresponda.

## Criterios de aceptación
- **CA-1.** **Dado** un prospecto sin libros, **cuando** se programa un abono de 50.000 para el 15/11, **entonces** existe y la cuenta trae `notices.noBook = true` y `excess` con sobrante 50.000 en franja (AF-107).
- **CA-2.** **Dado** un programado de 35.000, **cuando** se edita a 35.500, **entonces** se guarda (a mano no exige múltiplo).
- **CA-3.** **Dado** Natalia en creación con abonos el 17/11, 01/12, 15/12 y 29/12, **cuando** se corrige el segundo al 05/12, **entonces** su fecha y su fecha original son 05/12, no hay prórroga registrada y los demás abonos no cambian.
- **CA-4.** **Dado** una fecha de ayer, **cuando** se programa o se corrige, **entonces** `VALIDATION`.
- **CA-5.** **Dado** un programado, **cuando** se cancela, **entonces** aparece en Cancelados de la ficha y no cuenta en Por cobrar.

## Casos borde y errores
- Corregir o editar un abono ya cobrado devuelve `PAYMENT_NOT_SCHEDULED`.

## Datos
Funciones SQL `schedule_single_payment`, `update_scheduled_amount`, `correct_scheduled_date`, `cancel_scheduled_payments`.

## Cómo se verifica
- **Integración:** CA-1 a CA-5.

## Terminado cuando
Se cumple §10 de las reglas comunes.
