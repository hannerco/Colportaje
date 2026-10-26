# ADR-0009: Abonos en una tabla, prórrogas y parciales
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Cuota inicial, abono programado y abono extra solo se diferencian por cómo nacen. El cliente puede pedir más plazo (hay que conservar la fecha original) y puede pagar menos de lo acordado. Los nombres de estado originales ("Reclamado/Sin reclamar") confundían.

## Decisión
- Una tabla **`payment`** con `kind` ∈ {`down_payment`,`scheduled`,`extra`} y `status` ∈ {`scheduled` (Por cobrar), `collected` (Cobrado, en mi poder), `delivered` (Entregado al líder)}.
- **Prórroga:** `original_due_date` inmutable + `due_date` (la del calendario) + historial **`payment_reschedule`** de solo inserción.
- **Parcial:** el abono queda cobrado por lo realmente pagado; el faltante vive en el saldo (derivado); la app **sugiere** (no crea) otro abono.
- **Bloqueo:** un abono entregado no se edita ni se borra.
- **Vencido** es derivado.

## Alternativas descartadas
- *Tres tablas*: triplica pantallas y consultas.
- *Crear automáticamente el abono restante*: el dueño no quiere abonos que luego deba borrar.
- *Sobrescribir la fecha sin historial*: pierde la fecha original y la señal de clientes de riesgo.

## Consecuencias
El calendario lee `due_date` de abonos `scheduled`; no hay entidad de evento duplicada.

## Referencias
BR-PAY-01..12 · FLOWS F-13, F-14 · DECISION-LOG Q10–Q13
