# ADR-0042: La factura como entidad propia, siempre con foto
Estado: Aceptado · Fecha: 2026-11-08 · Reemplaza la parte de facturas de ADR-0038

## Contexto
ADR-0038 guardaba el N.º y la fecha de factura en cada fila de `photo`. El diseño muestra N.º y fecha antes de subir la foto, lo que no tendría dónde guardarse. El dueño aclaró que **lo principal es la foto**: puede no hacer factura, pero si la hace, la foto es obligatoria; N.º y fecha son un agregado para verla más fácil. Si un cliente compra dos veces, tiene dos facturas con sus propios datos, y en el futuro puede existir "Ver facturas". También pidió que una foto de factura equivocada se pueda borrar (ronda 26).

## Decisión
- Nueva tabla **`customer_invoice`**: `customer_id`, `invoice_number` (texto, opcional), `invoice_date` (opcional; por defecto el día, America/Bogota, en que se sube la primera foto; editable).
- **No hay factura sin foto:** la factura nace junto con su primera foto, en una sola operación. Sin foto no se puede escribir N.º ni fecha.
- Una factura tiene **una o varias fotos** (`photo.kind = customer_invoice` con `invoice_id`).
- Borrar una foto de factura **se permite siempre** (borrado lógico). Si se borra la última foto, la factura se borra lógicamente con ella.
- No se validan N.º ni fecha entre facturas (pueden repetirse).

## Alternativas descartadas
- *N.º y fecha en cada foto (ADR-0038):* no deja agrupar el frente y el reverso de una misma factura ni listar facturas.
- *Factura sin foto:* el dueño no la quiere.

## Consecuencias
- `photo` pierde `invoice_number` e `invoice_date` y gana `invoice_id`.
- BR-CUS-17 y BR-PHO-03 cambian; las fotos de recibo de un Abibono confirmado siguen sin poder borrarse.

## Referencias
BR-CUS-17, BR-PHO-03 · ADR-0038 · DECISION-LOG ronda 26 (Q17, Q18, Q42–Q44, Q63)
