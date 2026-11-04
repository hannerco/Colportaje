# ADR-0033: Recorte, motivos de cancelación, prórroga y signo del saldo a favor
Estado: Aceptado · Fecha: 2026-10-29

## Contexto
Al preparar la capa de dominio aparecieron cuatro puntos que la documentación no dejaba cerrados y una inconsistencia numérica:

1. **Orden del recorte (BR-PAY-13).** La regla fijaba el orden para abono extra/sobrepago (más próximo) y para devolución, baja de precio y archivado (más lejano), pero no para *editar o borrar un abono cobrado* ni para *confirmar el asistente de venta*.
2. **Motivo de cancelación.** `cancel_reason` solo admite `book_returned`, `overpaid`, `manual` y `customer_archived`; baja de precio y asistente de venta no tenían un motivo propio.
3. **Prórroga (BR-PAY-06).** No limitaba la nueva fecha.
4. **Perdidos (BR-GOAL-07).** Definía `lost_assumed_value` sin filtrar categoría, mientras "Mi compra" excluye minibooks.
5. **Signo del saldo.** `balance = debt − paid_total − credit_applied` hacía que entregar un minibook con saldo a favor **aumentara** el saldo a favor (de $30.000 a $31.500), contradiciendo BR-MBK-07 y AF-10 ("lo reduce"). Lo detectó una prueba ejecutable de la derivación.

## Decisión
- **Recorte.** El colportor siempre decide entre *recortar automáticamente*, *cancelar los que marque* o *dejar como está*. El orden **sugerido** es: abono extra, sobrepago, **editar o borrar un cobro** → desde el más próximo; devolución, baja de precio, archivado y **asistente de venta** → desde el más lejano. El usuario puede cambiarlo en el modal.
- **Motivo de cancelación según el disparador:** abono extra, sobrepago y edición de un cobro → `overpaid`; devolución → `book_returned`; archivar → `customer_archived`; baja de precio, borrar un cobro y asistente de venta → `manual`. Lo que el usuario marque a mano usa el motivo del disparador.
- **Prórroga.** La nueva fecha debe ser **posterior** a la actual; si cae a **más de 2 meses desde hoy** (America/Bogota), la app pide **confirmar la fecha**.
- **Perdidos.** `lost_assumed_value` y `owed_to_leader` usan el mismo alcance que "Mi compra": libros culturales y religiosos según el selector; los **minibooks perdidos no cuentan**.
- **Signo.** `balance = debt − paid_total + credit_applied`: aplicar saldo a favor lo consume exactamente por el monto aplicado.

## Alternativas descartadas
- *Mismo orden para todo*: ignora que editar un cobro equivale a que el cliente se adelantó, y que al confirmar la venta lo recién programado se recorta por el final.
- *Motivos nuevos en el enum* (`price_lowered`…): cambia el esquema por un dato que solo se lee en la sección Cancelados; se puede retomar si hace falta distinguirlos.
- *Prórroga a cualquier fecha*: una fecha mal escrita pasaría sin aviso.
- *Incluir minibooks perdidos en "A responder"*: mezcla la cuenta aparte de minibooks con la de libros.
- *Dejar la fórmula del saldo y compensar en `credit`*: sería un parche sobre una derivación que debe tener una sola definición.

## Consecuencias
- BR-PAY-06, BR-PAY-13, BR-CUS-04 y BR-GOAL-07 se actualizaron; `02-datos/DOMAIN-MODEL.md` y `00-contexto/GLOSSARY.md` también.
- Las vistas SQL (`customer_balance_v`) deben usar el signo `+ credit_applied`; si discrepan del dominio, gana el dominio.
- El plazo de 2 meses es una constante de la regla, no un ajuste de `app_settings`.

## Referencias
BR-PAY-06, BR-PAY-13, BR-CUS-04, BR-MBK-07, BR-GOAL-07 · AF-05, AF-10, AF-20, AF-24, AF-29, AF-32 · DECISION-LOG Ronda 12 · ADR-0009, ADR-0028
