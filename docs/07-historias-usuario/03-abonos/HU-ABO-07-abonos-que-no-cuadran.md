# HU-ABO-07 · Alerta de abonos que no cuadran

> **Épica:** Abonos · **Depende de:** HU-ABO-01 · **Reglas:** BR-PAY-13, ADR-0033, OQ-30, OQ-36, AF-05, AF-20, AF-21, AF-25, AF-29, AF-32 · **Diseño:** sin pantalla (`FALTA-CLIENTES.md` FC-05: franja "Lo programado supera el saldo en $X · Revisar" y modal)

## Historia
**Como** colportor **quiero** que la app me avise cuando los abonos que tengo programados suman más de lo que el cliente realmente debe, y me proponga cómo ajustarlos **para** no cobrar de más ni tener cuentas falsas en lo "por cobrar".

## Contexto
- Hay sobrante cuando `lo programado − lo que falta pagar > 0` (BR-PAY-13). Puede pasar tras un abono extra, un cobro mayor al acordado, una devolución, una baja de precio, editar o borrar un cobro, o editar libros y abonos en la ficha.
- **Modal directo** solo ante devolución, abono extra o baja de precio (y cobro mayor, AF-21); en los demás casos, **franja** con "Revisar".
- Opciones: **Recortar automáticamente**, **Cancelar los que marque** o **Dejar como está** (solo si el cliente aún debe algo; con saldo 0 o a favor no se ofrece, ronda 24). "Dejar como está" no guarda nada: la franja sigue mientras haya sobrante.
- Archivar no usa este modal: cancela todo lo programado (HU-CLI-11).

## Alcance
- **Incluye:** evaluación del sobrante con su disparador; plan sugerido de recorte; aplicar la opción elegida.
- **No incluye:** la franja y el modal (front).

## Contrato para el front
### Dominio
- `evaluateScheduleExcess(account, scheduledPayments, trigger)` → `ExcessEvaluation | null`:
  `{ trigger, remaining, scheduledTotal, excess, presentation: 'modal' | 'banner', suggestedOrder: 'nearest' | 'farthest', cancelReason, canLeaveAsIs, payments: [{ paymentId, dueDate, agreedAmount }], suggestedPlan: [{ paymentId, action: 'cancel' | 'reduce', newAmount? }] }`.
- Tabla única de disparadores:

| `trigger` | Cuándo | Presentación | Orden | Motivo de cancelación |
|---|---|---|---|---|
| `extra_payment` | Registrar un abono cobrado en un cliente guardado (extra o cuota inicial) | modal | más próximo | `overpaid` |
| `overpayment` | Cobrar más de lo acordado | modal | más próximo | `overpaid` |
| `return` | Devolver un libro (cliente guardado) | modal | más lejano | `book_returned` |
| `price_decrease` | Bajar el precio acordado | modal | más lejano | `manual` |
| `edit_collected` | Editar un abono cobrado | franja | más próximo | `overpaid` |
| `delete_collected` | Borrar un abono cobrado | franja | más próximo | `manual` |
| `form_edit` | Agregar o editar abonos programados o libros en la ficha; cuota inicial o quitar libro durante la creación | franja | más lejano | `manual` |
| `review` | Tocar "Revisar" en la franja | modal | más lejano | `manual` |

### Acciones
- `resolveScheduleExcess(customerId, choice, trigger)` → `Result<{ account }>`, con `choice` = `{ action: 'auto_trim', order: 'nearest' | 'farthest' }` · `{ action: 'cancel_selected', paymentIds }` · `{ action: 'leave' }` · errores: `NO_EXCESS`, `LEAVE_NOT_ALLOWED`, `CONFLICT` (los programados cambiaron), `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** `excess = scheduledTotal − max(0, balance)`; solo hay evaluación si `excess > 0`. Lo "sin programar" (caso inverso) NO DEBE alertar.
- **R2.** El recorte automático DEBE recorrer los programados en el orden elegido (más próximo = fecha ascendente; más lejano = fecha descendente; empates por fecha de creación y luego por id, OQ-30), **cancelando completos** mientras el abono quepa en el sobrante y **reduciendo el valor acordado** del siguiente por lo que falte.
- **R3.** El servidor DEBE recalcular el plan al aplicar (no confiar en el que envía el front) y aplicarlo en una transacción: cancelados con `canceled_at` y el motivo del disparador; reducidos con `payment_event amount_reduced { previousAmount, newAmount, trigger }`.
- **R4.** "Cancelar los que marque" DEBE cancelar solo esos (con el motivo del disparador); si aún queda sobrante, la franja sigue.
- **R5.** CUANDO `balance ≤ 0`, `canLeaveAsIs` DEBE ser falso y `leave` DEBE devolver `LEAVE_NOT_ALLOWED`.
- **R6.** Los cancelados NO DEBEN contar en ningún total, calendario ni lista de Por cobrar.

## Criterios de aceptación
- **CA-1.** **Dado** saldo 20.000 y 4 programados de 10.000 tras un abono extra de 20.000, **entonces** la evaluación es modal, sobrante 20.000, orden "más próximo", y el plan cancela los 2 más próximos (AF-20).
- **CA-2.** **Dado** el mismo sobrante tras una devolución, **entonces** el plan cancela los 2 más lejanos con motivo `book_returned` (RQ-PAY-06).
- **CA-3.** **Dado** sobrante 15.000 y programados de 10.000, **cuando** se recorta automáticamente, **entonces** se cancela uno completo y el siguiente baja de 10.000 a 5.000, con su `payment_event`.
- **CA-4.** **Dado** saldo 0 con 2 programados (AF-25), **entonces** `canLeaveAsIs = false` y recortar cancela los dos.
- **CA-5.** **Dado** saldo 30.000 y programados por 20.000, **entonces** no hay evaluación.
- **CA-6.** **Dado** "Dejar como está" con saldo 20.000 y programados 40.000, **cuando** se aplica, **entonces** nada cambia y la cuenta sigue con `notices.excess` (franja persistente).
- **CA-7.** **Dado** que otro dispositivo cobró uno de los programados entre la evaluación y el recorte, **cuando** se aplica, **entonces** el servidor recalcula sobre lo vigente (o devuelve `CONFLICT` si ya no hay sobrante).
- **CA-8.** **Dado** un cobro borrado que deja sobrante, **entonces** la evaluación es franja, orden "más próximo", motivo `manual` (OQ-36).

## Casos borde y errores
- Dos programados con la misma fecha: el más antiguo por creación se recorta primero (OQ-30).

## Datos
Función SQL `resolve_schedule_excess(p_customer_id, p_choice jsonb, p_trigger text)`.

## Cómo se verifica
- **Dominio:** tabla de disparadores, algoritmo de recorte (propiedad: tras recortar, `scheduledTotal = remaining`), CA-1 a CA-6 y CA-8.
- **Integración:** CA-3, CA-6 y CA-7 con eventos.

## Terminado cuando
Se cumple §10 de las reglas comunes.
