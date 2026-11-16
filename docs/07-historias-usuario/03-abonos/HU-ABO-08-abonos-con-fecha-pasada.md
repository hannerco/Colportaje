# HU-ABO-08 · Abonos programados con fecha pasada

> **Épica:** Abonos · **Depende de:** HU-ABO-03, HU-ABO-04, HU-ABO-05 · **Reglas:** BR-GEN-16, BR-PAY-06/08/15/16, ADR-0049 · **Diseño:** sin pantalla nueva: el calendario de fechas ya existe; el front agrega el aviso «Esta fecha ya pasó»

## Historia
**Como** colportor que empieza a usar la app con la campaña ya iniciada **quiero** programar un abono con una fecha que ya pasó (p. ej. la cuota del 15 que el cliente no pagó) **para** que aparezca vencida desde esa fecha («Venció hace 1 día»).

## Contexto
- Hoy ninguna fecha de abono programado puede ser anterior a hoy (ADR-0045, HU-ABO-01 R5, HU-ABO-03 R4, HU-ABO-04, HU-ABO-05). El dueño decidió que sí debe poderse, con un **aviso** (ronda 30, ADR-0049).
- **El aviso es de pantalla.** El back no bloquea ni pide confirmación; el dominio ofrece `isPastDate(date, today)` para que el front lo muestre.
- Vencido sigue siendo derivado (BR-PAY-08): abono `scheduled` con `due_date < hoy`. No se guarda nada nuevo.
- El plan automático **sigue sugiriendo** desde el siguiente día de pago después de hoy; el colportor lo edita. No se agrega un «plan hacia atrás».

## Alcance
- **Incluye:** quitar el bloqueo de fecha pasada al programar un abono suelto, al corregir la fecha, al prorrogar (sigue siendo posterior a la actual) y al crear el plan con un primer abono pasado; `isPastDate`.
- **No incluye:** el aviso en pantalla (front), un plan que genere fechas hacia atrás, cambios en cobros (ya aceptan fechas pasadas).

## Contrato para el front
### Dominio
- `isPastDate(date, today)` → `boolean` (comparación por día en Bogotá).
### Acciones (cambian solo sus validaciones)
- `scheduleSinglePayment`, `correctScheduledDate`, `reschedulePayment`, `applyPaymentPlan` y `buildPaymentPlan({ …, firstDueDate })` aceptan fechas anteriores a hoy.
- Se elimina el error `VALIDATION` por «fecha anterior a hoy»; el resto de validaciones (valor, múltiplos del plan, `PAYMENT_NOT_SCHEDULED`, `DATE_NOT_LATER`) no cambian.

## Reglas (el sistema DEBE…)
- **R1.** CUANDO se programa, corrige o crea un abono con una fecha anterior a hoy, el sistema DEBE guardarlo como `scheduled` con esa fecha (el abono ya cuenta como vencido).
- **R2.** CUANDO se prorroga, la nueva fecha DEBE ser posterior a la fecha actual del abono; PUEDE ser anterior a hoy. Sigue la confirmación a más de 2 meses desde hoy (BR-PAY-06).
- **R3.** El trigger de fechas de HU-ABO-01 R5 DEBE dejar de rechazar `due_date < hoy`; la fecha real de un cobro sigue sin poder ser futura (R6).
- **R4.** CUANDO el primer abono del plan es anterior a hoy, las siguientes fechas DEBEN seguir calculándose con la misma regla de días de pago (sin separación mínima, ADR-0047).
- **R5.** Un abono nacido vencido DEBE aparecer en **Por cobrar ▸ Vencidos**, en Hoy (BR-CAL-09) y en el calendario con «Venció el <fecha>».

## Criterios de aceptación
- **CA-1.** **Dado** hoy 16/11, **cuando** se programa un abono de 30.000 para el 15/11, **entonces** existe `scheduled` con `due_date = 15/11` y la lectura lo marca vencido hace 1 día.
- **CA-2.** **Dado** Natalia en creación con un abono el 20/11, **cuando** se corrige al 10/11, **entonces** `due_date` y `original_due_date` son 10/11, sin prórroga registrada.
- **CA-3.** **Dado** un abono del 01/11 (vencido, hoy 16/11), **cuando** se prorroga al 10/11, **entonces** se guarda (posterior a la actual aunque anterior a hoy) con 1 fila de historial.
- **CA-4.** **Dado** un abono del 10/11, **cuando** se prorroga al 05/11, **entonces** `DATE_NOT_LATER`.
- **CA-5.** **Dado** hoy 16/11, quincenal y primer abono 01/11 con saldo 100.000 y abonos de 50.000, **cuando** se crea el plan, **entonces** hay 2 abonos de 50.000 el 01/11 y el 15/11, ambos vencidos.
- **CA-6.** **Dado** una fecha de cobro de mañana, **cuando** se cobra, **entonces** sigue siendo `VALIDATION` (no futura).
- **CA-7.** **Dado** `isPastDate(15/11, 16/11)` → `true`; `isPastDate(16/11, 16/11)` → `false`.

## Casos borde y errores
- Fecha pasada con año equivocado: se acepta (el aviso del front es la defensa; riesgo en ADR-0049).

## Datos
Migración nueva que reemplaza el trigger/función de validación de fechas del abono (HU-ABO-01 R5) y las funciones `schedule_single_payment`, `correct_scheduled_date`, `reschedule_payment` y `apply_payment_plan` sin el chequeo «no anterior a hoy». Sin columnas nuevas.

## Cómo se verifica
- **Dominio (Vitest):** `isPastDate`; `buildPaymentPlan` con primer abono pasado.
- **Integración:** CA-1 a CA-6; probar que el trigger ya no rechaza y que ninguna otra validación se perdió.

## Terminado cuando
Se cumple §10 de las reglas comunes.
