# HU-ABO-09 · Fecha de la cuota inicial en la ficha nueva

> **Épica:** Abonos · **Depende de:** HU-ABO-02 · **Reglas:** BR-GEN-16, BR-PAY-03/05, ADR-0049 · **Diseño:** el campo de fecha junto al valor de la cuota inicial, con el chip «Hoy ▾» (mismo patrón que INV-02); sin pantalla nueva

## Historia
**Como** colportor que carga un cliente al que le vendí hace días **quiero** poner la fecha en que me dio la cuota inicial **para** no tener que editar el abono después.

## Contexto
- Hoy la cuota inicial de la ficha nueva queda con la fecha de cuando se creó la ficha y, al actualizarla, la fecha **no cambia** (decisión 24 del DECISION-LOG). Esta HU lo amplía con una migración nueva.
- La cuota inicial nace `collected`; su fecha acordada y la original siguen a la fecha real (BR-PAY-03, ya soportado por `payment_guard`).

## Alcance
- **Incluye:** parámetro de fecha en `set_creation_down_payment`; actualizar la fecha al actualizar la cuota inicial.
- **No incluye:** registrar abonos en un cliente guardado (ya aceptan `paidAt`), cambios de método o valor.

## Contrato para el front
### Acciones
- `setCreationDownPayment({ customerId, paymentId, paidAmount, method, paidOn? })` → igual que hoy; `paidOn` por defecto hoy. Errores: los de HU-ABO-02 más `VALIDATION` (`paidOn` futura, `field = paidOn`).

## Reglas (el sistema DEBE…)
- **R1.** CUANDO se crea la cuota inicial con `paidOn`, el sistema DEBE guardarla como `collected` con `paid_at = paidOn`.
- **R2.** CUANDO se actualiza una cuota inicial vigente, el sistema DEBE actualizar valor, método **y fecha** (si se manda `paidOn`; si no, conserva la que tenía).
- **R3.** `paidOn` NO DEBE ser futura (America/Bogota).
- **R4.** El resto de reglas de HU-ABO-02 (una sola cuota inicial, 0 la borra, idempotencia por id, bloqueo si está entregada) NO cambian.

## Criterios de aceptación
- **CA-1.** **Dado** hoy 16/11, **cuando** se fija una cuota inicial de 50.000 con `paidOn = 03/11`, **entonces** queda `collected` con `paid_at = 03/11`.
- **CA-2.** **Dado** esa cuota inicial, **cuando** se actualiza a 60.000 con `paidOn = 04/11`, **entonces** sigue siendo una sola, con 60.000 y fecha 04/11.
- **CA-3.** **Dado** una actualización sin `paidOn`, **entonces** conserva 04/11.
- **CA-4.** **Dado** `paidOn = 17/11` (mañana), **entonces** `VALIDATION` con `field = paidOn`.
- **CA-5.** **Dado** una cuota inicial ya entregada en un Abibono confirmado, **cuando** se intenta cambiar su fecha, **entonces** `PAYMENT_LOCKED`.

## Datos
Migración nueva que cambia `set_creation_down_payment` para recibir `p_paid_on date default null`.

## Cómo se verifica
- **Integración:** CA-1 a CA-5 y que la cuota inicial siga siendo una sola por cliente.

## Terminado cuando
Se cumple §10 de las reglas comunes.
