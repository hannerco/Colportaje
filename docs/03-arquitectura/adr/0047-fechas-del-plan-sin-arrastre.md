# ADR-0047: Fechas del plan sin separación mínima y sin arrastre
Estado: Aceptado · Fecha: 2026-11-11 · Reemplaza parte de ADR-0039 y ADR-0045

## Contexto
ADR-0045 fijó una separación mínima entre abonos sugeridos (7 días en quincenal, 20 en mensual) y ADR-0039 una opción «Correr también los siguientes». Al cerrar las interpretaciones de las HU (ronda 28) el dueño aclaró que el cliente suele pedir «paso mañana y te pago», así que dos cobros seguidos son normales, y que mover fechas no debe arrastrar a las demás.

## Decisión
- Cada fecha sugerida es el **siguiente día de pago** posterior a la anterior, sin separación mínima. El primer abono sugerido es el siguiente día de pago a hoy, aunque sea mañana.
- Cambiar la fecha de un abono (corrección al crear, prórroga con el cliente guardado) mueve **solo ese abono**. No existe «Correr también los siguientes».
- Al crear el cliente, cambiar la **frecuencia, el valor o el primer abono** del plan sigue recalculando todos los abonos programados (BR-PAY-15).

## Alternativas descartadas
- *Mantener la separación mínima:* impedía sugerir cobros seguidos que el cliente sí acepta.
- *Arrastrar los siguientes de forma opcional:* el dueño prefiere editar cada abono por separado.

## Consecuencias
- Desaparece el valor de configuración `paymentPlan.minGapDays` y el parámetro `shiftFollowing` de `correctScheduledDate` y `reschedulePayment`.
- `nextDueDate(previous, frequency)` es el primer día de pago estrictamente posterior a `previous`.

## Referencias
BR-PAY-06, BR-PAY-15, BR-GEN-15, HU-ABO-03/04/05, DECISION-LOG ronda 28.
