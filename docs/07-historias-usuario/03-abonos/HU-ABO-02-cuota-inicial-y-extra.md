# HU-ABO-02 · Cuota inicial, abono extra y corrección de cobros

> **Épica:** Abonos · **Depende de:** HU-ABO-07, HU-DIN-01, HU-CLI-02 · **Reglas:** BR-PAY-01/03/04/10/11/13, BR-CUS-16, AF-22, AF-27, AF-31, AF-115 · **Diseño:** sección "Cuota inicial" de Crear (valor y medio de pago; el diseño marca Efectivo, C-09); "Registrar abono" de la ficha sin formulario (FC-09)

## Historia
**Como** colportor **quiero** registrar lo que el cliente me paga de entrada o fuera del plan, y corregir un cobro mal registrado **para** que su saldo y mi dinero por entregar sean correctos.

## Contexto
- **Cuota inicial** y **abono extra** nacen **cobrados**. Método por defecto: **Transferencia**, siempre (ronda 26).
- En la **ficha nueva**, la cuota inicial es **una sola**: escribir el valor la crea (fecha de hoy) o la actualiza; dejarla en $0 o vacía la borra; con $0 no se pide método y aun así se pueden programar abonos (ronda 26).
- En un **cliente guardado**, "Registrar abono" permite otra cuota inicial (si recompra) o un abono extra, con fecha real editable (no futura).
- Un cobro **entregado** (Abibono confirmado) está bloqueado; uno en un **Abibono borrador** sí se corrige y el borrador recalcula lo esperado (ronda 26, AF-115).
- El disparador de abonos que no cuadran depende del momento: durante la creación es `form_edit` (franja); en un cliente guardado, `extra_payment` (modal). El front indica el contexto.

## Alcance
- **Incluye:** fijar la cuota inicial de la ficha nueva; registrar cuota inicial o extra en un cliente guardado; editar y borrar un cobro.
- **No incluye:** cobrar un abono programado (HU-ABO-06), el modal (front; resolución en HU-ABO-07).

## Contrato para el front
### Acciones
- `setCreationDownPayment({ paymentId, customerId, amount, method = 'transfer' })` → `Result<{ account; excess }>`: `amount` 0 o vacío borra la cuota si existe; > 0 la crea o actualiza con fecha de hoy.
- `registerCollectedPayment({ paymentId, customerId, kind: 'down_payment' | 'extra', paidAmount, paidAt = hoy, method = 'transfer' })` → `Result<{ account; excess }>` (disparador `extra_payment`).
- `updateCollectedPayment(paymentId, { paidAmount?, paidAt?, method? })` → `Result<{ account; excess }>` (disparador `edit_collected`).
- `deletePayment(paymentId)` → `Result<{ account; excess }>` (para cobrados: disparador `delete_collected`; para programados ver HU-ABO-04).
- Errores comunes: `VALIDATION` (`paidAmount` entero > 0; `paidAt` no futura), `PAYMENT_LOCKED` (entregado), `CUSTOMER_ARCHIVED`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** Cuota inicial y extra DEBEN nacer `collected`, con valor real, fecha real y método; la cuota inicial con fecha acordada y original iguales a la fecha real (BR-PAY-03).
- **R2.** El método por defecto DEBE ser `transfer` (BR-PAY-04).
- **R3.** Un cobro de un Abibono confirmado NO DEBE editarse ni borrarse (`PAYMENT_LOCKED`, BR-PAY-10).
- **R4.** Editar o borrar un cobro que está en un **borrador** DEBE permitirse; borrarlo lo desvincula del borrador; el borrador no cambia el efectivo ni la transferencia escritos (BR-PAY-11).
- **R5.** Borrar DEBE ser lógico; toda acción actualiza `updated_at` del cliente.
- **R6.** Cada respuesta DEBE traer la evaluación de abonos que no cuadran con el disparador que corresponda (HU-ABO-07).
- **R7.** Registrar un cobro nuevo en un cliente archivado DEBE rechazarse con `CUSTOMER_ARCHIVED` (primero se restaura). Corregir o borrar un cobro ya existente de un cliente archivado sí se permite (sus cobros siguen en Dinero, AF-47).

## Criterios de aceptación
- **CA-1.** **Dado** Natalia en creación con un libro de 180.000, **cuando** escribe una cuota inicial de 40.000, **entonces** existe un abono cobrado de 40.000 por Transferencia con fecha de hoy y el saldo es 140.000.
- **CA-2.** **Dado** esa cuota, **cuando** cambia el valor a 50.000, **entonces** sigue habiendo una sola cuota, de 50.000.
- **CA-3.** **Dado** esa cuota, **cuando** pone $0, **entonces** la cuota queda borrada y el saldo vuelve a 180.000.
- **CA-4.** **Dado** un cliente guardado que debe 40.000 con 4 programados de 10.000, **cuando** registra un extra de 20.000, **entonces** queda cobrado y la evaluación es modal con sobrante 20.000 (AF-20).
- **CA-5.** **Dado** un cobro de 50.000 en un Abibono borrador, **cuando** se corrige a 45.000, **entonces** se guarda y el borrador sigue con el mismo efectivo y transferencia (su esperado baja a lo que corresponda).
- **CA-6.** **Dado** un cobro en un Abibono confirmado, **cuando** se intenta editar o borrar, **entonces** `PAYMENT_LOCKED`.
- **CA-7.** **Dado** una fecha real de mañana, **cuando** se registra, **entonces** `VALIDATION` con `field = paidAt`.

## Casos borde y errores
- Una cuota inicial mayor que la deuda deja saldo a favor; se permite.

## Datos
Funciones SQL `set_creation_down_payment`, `register_collected_payment`, `update_collected_payment`, `delete_payment`.

## Cómo se verifica
- **Integración:** CA-1 a CA-7.

## Terminado cuando
Se cumple §10 de las reglas comunes.
