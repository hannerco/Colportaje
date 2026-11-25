# ADR-0052: Abonos a mano, sin plan automático; nada obliga, todo es aviso

**Estado:** Aceptado (2026-11-24, ronda 38) · **Reemplaza:** ADR-0039 (plan de abonos automático) y, en lo que toca a obligar, ADR-0033 (confirmar más de 2 meses, recorte obligatorio) y ADR-0045 (corregir solo al crear) · **Cambia:** BR-PAY-06, BR-PAY-13, BR-PAY-15, BR-PAY-15b, BR-CUS-14 · **Diseño:** lienzo, pestaña «Propuestas», «Abonos a mano, sin plan automático (24/11/2026)» (Prop-10 Crear cliente, Prop-11 Ficha; piezas AbonosIsla y FechaAbono)

## Contexto
El plan automático pedía frecuencia, valor de cada abono y primer abono, y repartía el saldo. Cambiar un abono hacía que los demás se reacomodaran (BR-PAY-15b). Con el cliente guardado, la fecha solo podía ir hacia adelante (prórroga) y a más de 2 meses pedía confirmar. Si sobraban abonos con saldo 0, había que recortar sí o sí. En el celular, la fila del abono se desbordaba.

El dueño, al usarlo, dijo: **"Quita todo lo que tenga que ver con el plan de cobro … Simplemente pon agregar abonos. Un totalizador … simplemente necesito saber si estoy programando más o menos"** y **"Todo lo que ahora se exige, ya no será exigencia sino un aviso."**

## Decisión
1. **Sin plan automático.** Se quitan frecuencia, valor de cada abono, primer abono y «Así quedan los abonos». El colportor arma la lista con **«+ Agregar abono»**. El abono nuevo propone como valor lo que falta por programar ($0 si ya está cubierto) y la fecha la elige él.
2. **Cada abono por cobrar se cambia cuando sea:** la fecha (calendario) y el valor (cualquier valor) se tocan en la fila. Cambiar uno **no toca los demás**. La lista se ordena por fecha («Abono N de M»; en la ficha la cuenta incluye los pagados). La basura pide confirmar y el abono pasa a Cancelados (motivo manual).
3. **Totalizador:** saldo pendiente, programado y el resultado: «Falta programar $X», «Programaste de más $X» o «Todo programado». Nunca bloquea. En la ficha, si sobra, «Revisar» ofrece recortar desde el más lejano (opcional; «Dejar así» siempre se puede).
4. **Avisos, nunca bloqueos:** «Esta fecha ya pasó», «Es antes de la fecha que tenía», «Lo estás aplazando N días» / «Pasa del … al … (N días después)», «Ojo: hay un abono programado después/antes» (si salta otro), «Es más de 2 meses desde hoy» (ya no se confirma) y «Pon el valor» / «Elige la fecha» (ese abono no se guarda).
5. **Corregir o aplazar (cliente guardado):** la ventana de la fecha pregunta «¿Por qué cambia?». **Me equivoqué** corrige (`correct_scheduled_date`: cambia la fecha acordada, sin historial). **El cliente pidió aplazar** aplaza (`reschedule_payment`: conserva la fecha original, queda en el historial con nota opcional y la fila dice «Aplazado · antes …»). «Dar más plazo» pasa a llamarse **«Aplazar»**.
6. **Base:** `reschedule_payment` acepta cualquier fecha distinta de la actual (sin `DATE_NOT_LATER` ni `RESCHEDULE_NEEDS_CONFIRMATION`); `resolve_schedule_excess` permite «Dejar como está» también con saldo 0 o a favor (sin `LEAVE_NOT_ALLOWED`). `apply_payment_plan` se conserva porque `save_new_customer` la usa para guardar la lista que armó el colportor.
7. **Una sola ventana de fecha** (`DatePickerDialog` de la biblioteca), con la pregunta, la fecha que tenía (anillo punteado), los otros abonos (punto) y la caja de avisos. **Una sola pieza de lista** (`PaymentSchedule`) en Nuevo cliente y en la ficha: dos renglones en el celular o en un panel angosto; una línea en escritorio con espacio.

## Alternativas descartadas
- **Conservar el plan automático como ayuda, pero editable.** Se probó (BR-PAY-15b) y generó reacomodos inesperados; el dueño pidió quitarlo.
- **Mostrar el sobrante con una ventana obligatoria.** Obligaba a decidir en el momento; ahora el totalizador lo dice y «Revisar» es opcional.
- **Dos botones en la fila (corregir y aplazar).** No caben en 390 px; la pregunta dentro de la ventana de la fecha resuelve lo mismo.

## Consecuencias
- El código del plan (`buildPaymentPlan`, `adjustPlanAmounts`, `applyPaymentPlan`) ya no lo usa ninguna pantalla; queda para las pruebas y la siembra de e2e. Pendiente: limpiarlo cuando se revisen esas pruebas.
- Un abono vencido se ve «Vencido hace N días» en la propia fila de la ficha.
