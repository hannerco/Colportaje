# ADR-0008: Ejemplares con número, precios congelados y novedad
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Los ejemplares son unidades físicas. Hay que distinguirlos, congelar precios históricos y manejar descuadres con el líder ("me dijo que me dio 4 y tengo 3"). El estado original "Sin resolver" nunca se definió con precisión.

## Decisión
- Estados: `in_stock`, `sold`, `flagged` (**Con novedad**), `lost` (Perdido).
- **Número consecutivo** por (colportor, título), nunca reutilizado (ver ADR-0023).
- **Snapshots** del precio público y colportor al recibirse; los totalizadores usan los snapshots.
- **Precio acordado** editable por ejemplar individual tras la venta.
- **Con novedad:** marcador con nota obligatoria; no cuenta como físico; se resuelve como *Apareció* (→ `in_stock`), *Perdido* (→ `lost`) o *Corregido* (borrado lógico).
- Historial en `copy_event` (solo inserción).
- Identidad en *Hacer inventario*: `Recibidos = Vendidos + En físico + Con novedad + Perdidos`.

## Alternativas descartadas
- *Ejemplares anónimos con solo cantidad*: no permite señalar cuál falta ni elegir uno por uno.
- *Recalcular con el precio vigente del título*: cambiaría historia al cambiar precios.
- *Estado "Sin resolver" sin reglas*: nunca se usó; se reemplaza por "Con novedad" con resolución explícita.

## Consecuencias
Las vistas de Ejemplares (Todos / En inventario / Vendidos / Con descuentos y aumentos) son filtros sobre esta tabla.

## Referencias
BR-COPY-01..15, BR-PRC-* · DOMAIN-MODEL · DECISION-LOG Q15, Q20, Q21, Q35, Q37
