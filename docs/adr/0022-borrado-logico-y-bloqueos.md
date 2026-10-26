# ADR-0022: Borrado lógico y bloqueos de dinero entregado
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El dinero ya entregado al líder no se puede "devolver", y el dueño pidió que, ante una devolución, "el abibono debe seguir allí y la información del cliente con los abonos que ya dio también". Visitas y abonos son **agregaciones**, no composiciones del cliente.

## Decisión
- Todo borrado de entidades de negocio es **lógico** (`deleted_at`).
- Un **abono entregado** y un **Abibono confirmado** son **inmutables** (trigger en BD + regla de dominio).
- Un **cliente** se puede borrar (lógico, con confirmación) solo si **no tiene ejemplares vendidos**; sus abonos y visitas permanecen visibles como "(cliente eliminado)".
- Historial de **solo inserción** para prórrogas y eventos de ejemplares.

## Alternativas descartadas
Borrado en cascada (perdería dinero entregado); borrado físico (sin auditoría).

## Consecuencias
Las consultas deben filtrar `deleted_at is null`. Los bloqueos exigen pruebas de integración.

## Referencias
BR-GEN-02, BR-PAY-10/12, BR-DEP-10, BR-CUS-09 · DECISION-LOG Q31, Q33
