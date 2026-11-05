# ADR-0009: Abonos en una tabla, prórrogas, parciales y cancelación
Estado: Aceptado · Fecha: 2026-10-26 · Revisado: 2026-10-28

## Contexto
Cuota inicial, programado y extra solo se diferencian por cómo nacen. El cliente puede pedir más plazo (conservar la fecha original), pagar menos, pagar de más o devolver un libro, y entonces los abonos programados dejan de cuadrar con lo que realmente falta; ese dinero no debe contarse como "en la calle".

## Decisión
- Una tabla **`payment`** con `kind` ∈ {`down_payment`,`scheduled`,`extra`} y `status` ∈ {`scheduled` (Por cobrar), `collected` (Cobrado), `delivered` (Entregado al líder), `canceled` (Cancelado)}.
- **Abono extra:** pago fuera del plan, nace cobrado, sin fecha acordada.
- **Prórroga:** `original_due_date` inmutable + `due_date` + `payment_reschedule`.
- **Parcial:** queda cobrado por lo pagado; el faltante vive en el saldo; la app **sugiere**, no crea.
- **Alerta de abonos que no cuadran (BR-PAY-13):** si `scheduled_total > remaining`, un modal ofrece *Recortar automáticamente* (desde el más próximo tras abono extra/sobrepago; desde el más lejano tras devolución/baja de precio/archivado), *Cancelar los que marque* o *Dejar como está* (aviso persistente; solo si `balance > 0`, ronda 24). Recortar cancela o reduce `agreed_amount`, registrando `payment_event`.
- **`canceled`**: se conserva (sección Cancelados) pero **no cuenta** en calendario, Hoy ni totales.
- **Bloqueo:** un abono entregado no se edita ni se borra salvo reabriendo su Abibono (ADR-0010).

## Alternativas descartadas
- *Tres tablas*: triplica pantallas y consultas.
- *Cancelar automáticamente sin preguntar*: el dueño quiere decidir.
- *Borrar los abonos programados sobrantes*: se pierde la información que el dueño quiere conservar.

## Consecuencias
El calendario lee `due_date` de abonos `scheduled`. El mismo mecanismo cubre cuatro disparadores.

## Referencias
BR-PAY-01..13 · FLOWS F-13, F-14, F-29 · FLOWS-ALTERNATIVOS AF-05, AF-20..AF-32 · DECISION-LOG Q7, Q10–Q13, Q22
