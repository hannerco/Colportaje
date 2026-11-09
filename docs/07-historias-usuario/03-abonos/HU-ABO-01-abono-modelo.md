# HU-ABO-01 · Abono: modelo, estados y vencido

> **Épica:** Abonos · **Depende de:** HU-CLI-01 · **Reglas:** BR-PAY-01/02/03/04/08/12, BR-AUD-01, ADR-0009, ADR-0040, ADR-0046 · **Diseño:** estados "Por cobrar", "Cobrado", "Entregado", "Cancelado" y la marca "Vencido · hace N días"

## Historia
**Como** colportor **quiero** que cada pago de un cliente quede registrado con su tipo, su estado y sus fechas **para** saber qué me deben, qué cobré y qué ya entregué al líder.

## Contexto
- Una sola tabla de abonos con tipo: **Cuota inicial**, **Abono programado** y **Abono extra** (BR-PAY-01).
- Estados: **Por cobrar** → **Cobrado** (ya lo recibiste, falta entregarlo al líder) → **Entregado al líder**; y **Cancelado** solo para lo que nunca se cobró (BR-PAY-02).
- **Vencido no es un estado**: es un abono por cobrar con fecha pasada (BR-PAY-08).
- El enlace con un Abibono (`leader_deposit_id`) y el bloqueo de lo entregado se agregan en HU-DIN-01 con una migración aditiva.

## Alcance
- **Incluye:** tablas `payment`, `payment_reschedule`, `payment_event` con checks y RLS; máquina de estados; "vencido"; valores que muestra Dinero para cuota inicial y extra.
- **No incluye:** cada acción (HU-ABO-02..07), Abibonos (épica Dinero).

## Contrato para el resto del código
- Dominio `Payment = { id, customerId, kind: 'down_payment' | 'scheduled' | 'extra', status: 'scheduled' | 'collected' | 'delivered' | 'canceled', originalDueDate, dueDate, paidAt, agreedAmount, paidAmount, method: 'cash' | 'transfer' | null, canceledAt, cancelReason, createdAt }`.
- `paymentTransitions` (tabla única): `scheduled → collected` (cobrar), `scheduled → canceled` (cancelar), `collected → delivered` (confirmar Abibono), `delivered → collected` (reabrir Abibono).
- `isOverdue(p, today)`, `overdueDays(p, today)`.
- `displayAgreed(p)` → `{ amount, date }`: si es programado, su valor y fecha acordados; si es cuota inicial o extra, su valor y fecha **reales** (ronda 26; solo para mostrar, no se guarda).
- `moneyAmount(p)` → valor real si está cobrado o entregado; valor acordado si está por cobrar; 0 si está cancelado (ADR-0046).

## Reglas (el sistema DEBE…)
- **R1.** Un abono `scheduled` o `canceled` DEBE ser de tipo programado y tener valor acordado > 0, fecha acordada y fecha original (checks de DATABASE.md).
- **R2.** Un abono cobrado o entregado DEBE tener valor real > 0, fecha real y método.
- **R3.** Un abono cancelado DEBE tener fecha y motivo de cancelación (`book_returned`, `overpaid`, `manual`, `customer_archived`).
- **R4.** La fecha original NO DEBE cambiar nunca después de crearse, salvo la **corrección durante la creación** del cliente (HU-ABO-04).
- **R5.** CUANDO se inserta un abono programado o se cambia su fecha acordada, la fecha NO DEBE ser anterior a hoy en Bogotá (trigger; BR-PAY-06/16). Editar otros campos de un abono ya vencido sí se permite.
- **R6.** La fecha real NO DEBE ser futura.
- **R7.** Toda cancelación, recorte o reapertura DEBE registrar un `payment_event`; toda prórroga, una fila en `payment_reschedule`.

## Criterios de aceptación
- **CA-1.** **Dado** un abono programado de 60.000 para el 17/10 y hoy 05/11, **entonces** `isOverdue = true` y `overdueDays = 19`.
- **CA-2.** **Dado** un abono programado sin fecha acordada, **cuando** se inserta, **entonces** la base lo rechaza.
- **CA-3.** **Dado** una cuota inicial de 80.000 pagada el 03/10, **entonces** `displayAgreed` = 80.000 el 03/10 y `moneyAmount` = 80.000.
- **CA-4.** **Dado** un abono extra de 20.000 pagado el 28/10, **entonces** `displayAgreed` = 20.000 el 28/10.
- **CA-5.** **Dado** un abono cancelado, **entonces** `moneyAmount` = 0.
- **CA-6.** **Dado** un abono programado nuevo con fecha de ayer, **cuando** se inserta, **entonces** la base lo rechaza.
- **CA-7.** **Dado** un abono `canceled`, **cuando** se intenta cobrar, **entonces** `INVALID_TRANSITION`.

## Casos borde y errores
- Un abono programado cobrado conserva su valor y fecha acordados (para comparar con lo real).

## Datos
`payment` (sin `leader_deposit_id`, que agrega HU-DIN-01), `payment_reschedule`, `payment_event`, índices de DATABASE.md, RLS.

## Cómo se verifica
- **Dominio:** transiciones, `isOverdue`, `displayAgreed`, `moneyAmount`.
- **Integración:** checks y trigger de fechas; RLS A/B.

## Terminado cuando
Se cumple §10 de las reglas comunes.
