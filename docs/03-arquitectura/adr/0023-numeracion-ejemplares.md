# ADR-0023: Numeración de ejemplares
Estado: Propuesto · Fecha: 2026-10-26

## Contexto
Los ejemplares de un título son físicamente indistinguibles, pero el dueño exige **elegirlos uno por uno** y la idea del número consecutivo ("Corazón tranquilo #12") ayuda a identificar cuál falta en un descuadre.

## Decisión
`copy.number` es consecutivo por (colportor, título), asignado en el servidor mediante `copy_counter` en una transacción, **nunca reutilizado** (ni al devolver, ni al borrar). Se muestra en el selector y en el detalle del ejemplar, sin prominencia en listas generales.

## Alternativas descartadas
- *Sin número*: no se puede señalar un ejemplar concreto.
- *Número derivado por orden de `received_at`*: cambia al borrar/corregir.

## Consecuencias
**Abierto para F2 (OQ-20):** con UUID generados en cliente y creación offline hay que definir número provisional + reconciliación al sincronizar.

## Referencias
BR-COPY-05 · OPEN-QUESTIONS OQ-20 · DECISION-LOG Q37
