# HU-ABO-03 · Plan de abonos automático

> **Épica:** Abonos · **Depende de:** HU-ABO-01, HU-CLI-02 · **Reglas:** BR-PAY-15, BR-GEN-15, ADR-0039, ADR-0045, AF-113, AF-116 · **Diseño:** "Plan para el saldo de $X" (frecuencia, valor de cada abono, primer abono, "Así quedan los abonos") en Crear cliente

## Historia
**Como** colportor **quiero** decir cada cuánto y cuánto pagará el cliente, y que la app arme los abonos con fechas que coincidan con sus días de pago **para** no calcular fechas ni valores a mano.

## Contexto
- El plan **no** es una entidad: crea abonos programados normales y **no guarda la frecuencia** (ronda 26).
- Cantidad de abonos = `saldo ÷ valor` hacia abajo (mínimo 1); el sobrante lo suma el **más próximo**; los abonos suman **exactamente** el saldo. El valor de cada abono es múltiplo de $1.000 (configurable).
- **Fechas (ronda 26):** en Colombia el sueldo se paga el 15 y el último día del mes. Quincenal = 15 y 30 (febrero: último día); mensual = 30 (febrero: último día); semanal = cada 7 días. El primer abono sugerido es el día de pago más cercano **después de hoy**. Cada siguiente es el siguiente día de pago posterior al anterior, sin separación mínima (ADR-0047). Todo configurable (BR-GEN-15).
- **Durante la creación**, cambiar frecuencia, valor o primer abono **reemplaza** los programados; **con el cliente guardado**, un plan nuevo reparte **solo lo sin programar** (AF-116). El front indica el modo.

## Alcance
- **Incluye:** cálculo puro del plan y de las fechas sugeridas; aplicar el plan en sus dos modos.
- **No incluye:** cambiar una fecha o un valor del plan ya creado (HU-ABO-04), prórrogas (HU-ABO-05).

## Contrato para el front
### Dominio
- `suggestFirstDueDate(frequency, today)`.
- `nextDueDate(previous, frequency)`.
- `buildPaymentPlan({ base, frequency, amount, firstDueDate })` → `Result<[{ dueDate, amount }]>` · errores: `PLAN_REQUIRES_BALANCE`, `VALIDATION` (`amount` múltiplo de 1.000 y > 0; `firstDueDate` no anterior a hoy).
### Acciones
- `applyPaymentPlan({ customerId, mode: 'replace_all' | 'unscheduled_only', items: [{ paymentId, dueDate, amount }] })` → `Result<{ account }>` · errores: `PLAN_REQUIRES_BALANCE`, `PLAN_TOTAL_MISMATCH`, `VALIDATION`, `CUSTOMER_ARCHIVED`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** `base` DEBE ser el saldo pendiente (`remaining`) en `replace_all` y lo sin programar (`unscheduled`) en `unscheduled_only`; si es 0, `PLAN_REQUIRES_BALANCE`.
- **R2.** CUANDO `base < amount`, el plan DEBE ser un solo abono por `base` (AF-113).
- **R3.** Quincenal: `nextDueDate` DEBE ser el primer día de pago (15 o 30/último) **posterior** al anterior; mensual: el primer 30 (o último día) posterior; semanal: +7 días. `suggestFirstDueDate` = primer día de pago **posterior** a hoy (semanal: hoy + 7).
- **R4.** El servidor DEBE validar que la suma de `items` sea exactamente `base`, que cada valor sea entero > 0 y cada fecha no anterior a hoy, antes de guardar.
- **R5.** `replace_all` DEBE borrar (lógicamente, sin evento) los programados del cliente y crear los nuevos en una transacción; `unscheduled_only` NO DEBE tocar los existentes.
- **R6.** Los abonos creados DEBEN nacer programados con fecha acordada = fecha original.

## Criterios de aceptación
- **CA-1.** **Dado** saldo 140.000 y abonos de 30.000, **entonces** el plan es 50.000, 30.000, 30.000 y 30.000, el mayor primero (RQ-SAL-06).
- **CA-2.** **Dado** saldo 140.000 y abonos de 35.000, **entonces** son 4 de 35.000.
- **CA-3.** **Dado** saldo 20.000 y abonos de 30.000, **entonces** es un solo abono de 20.000.
- **CA-4.** **Dado** hoy 07/11/2026 y quincenal, **entonces** las fechas sugeridas son 15/11, 30/11, 15/12 y 30/12; **dado** mensual, 30/11, 30/12, 30/01/2027 y 28/02/2027.
- **CA-5.** **Dado** quincenal con primer abono cambiado al 28/11, **entonces** la siguiente es 30/11 (sin separación mínima).
- **CA-6.** **Dado** un valor de 35.500, **entonces** `VALIDATION` (no es múltiplo de 1.000).
- **CA-7.** **Dado** Natalia en creación con un plan de 4 abonos, **cuando** cambia el valor a 70.000, **entonces** quedan solo los 2 abonos nuevos (los 4 anteriores borrados).
- **CA-8.** **Dado** un cliente guardado que debe 100.000 con 40.000 programados, **cuando** aplica un plan de 30.000 en modo `unscheduled_only`, **entonces** se crean abonos por 60.000 (30.000 + 30.000) y los 40.000 existentes siguen igual (AF-116).
- **CA-9.** **Dado** saldo 0, **cuando** se pide un plan, **entonces** `PLAN_REQUIRES_BALANCE`.

## Casos borde y errores
- Saldo que no es múltiplo de 1.000 (p. ej. 145.500 con abonos de 30.000): el más próximo absorbe 25.500 de más (55.500, 30.000, 30.000, 30.000).
- Hoy 30/11 y quincenal: el primer abono sugerido es 15/12.

## Datos
Función SQL `apply_payment_plan(p_customer_id, p_mode, p_items jsonb)`.

## Cómo se verifica
- **Dominio:** CA-1 a CA-6 y CA-9; propiedades: la suma es exacta, todos enteros > 0, múltiplos de 1.000 salvo el más próximo, fechas estrictamente crecientes.
- **Integración:** CA-7 y CA-8.

## Terminado cuando
Se cumple §10 de las reglas comunes.
