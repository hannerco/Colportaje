# ADR-0008: Ejemplares con número, precios congelados, novedad y devolución al líder
Estado: Aceptado · Fecha: 2026-10-26 · Revisado: 2026-10-28

## Contexto
Los ejemplares son unidades físicas. Hay que distinguirlos, congelar precios, manejar descuadres con el líder ("me dijo que me dio 4 y tengo 3"), pérdidas (normalmente las asume el colportor) y devoluciones de libros no vendidos al líder (fin de campaña o libros antiguos).

## Decisión
- Estados: `in_stock`, `sold`, `flagged` (**Con novedad**), `lost` (Perdido), `returned_to_leader` (Devuelto al líder).
- **Número consecutivo** por (colportor, título), nunca reutilizado (ADR-0023).
- **Snapshots** de precio público y colportor al recibirse.
- **Precio acordado** editable por ejemplar individual.
- **`received_at`:** hoy por defecto; fecha pasada al agregar; editable en línea después (no futura, no posterior a la venta), con historial.
- **Con novedad:** nota obligatoria; no cuenta como físico. Salidas que ofrece la app: *Apareció*, *Perdido (lo asumo yo)*, *Eliminar*. **Ningún texto sugiere que el líder pueda asumir pérdidas** (es un acto de bondad que el colportor no debe ver como opción); *Eliminar* sirve igualmente si ocurre.
- **Devolver al líder:** acción en lote sobre `in_stock` de cualquier antigüedad, con nota y deshacer.
- Identidad en *Hacer inventario*: `Recibidos = Vendidos + En físico + Con novedad + Perdidos + Devueltos`.
- Historial en `copy_event` (solo inserción).

## Alternativas descartadas
- *Ejemplares anónimos con cantidad*: no permite señalar cuál falta ni elegir uno por uno.
- *Opción visible "el líder asume"*: compromete al líder.
- *`received_at` inmutable*: un día sin internet impide registrar a tiempo.

## Consecuencias
Pérdidas asumidas alimentan "A responder al líder" (ADR-0028). Las vistas de Ejemplares son filtros sobre esta tabla.

## Referencias
BR-COPY-01..16 · DOMAIN-MODEL · FLOWS-ALTERNATIVOS AF-50..AF-57 · DECISION-LOG Q15, Q20, Q21, Q24, Q25, Q28, Q33, Q34, Q35, Q37
