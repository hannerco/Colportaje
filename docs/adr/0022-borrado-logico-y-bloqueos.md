# ADR-0022: Borrado lógico, archivado y bloqueos de dinero entregado
Estado: Aceptado · Fecha: 2026-10-26 · Revisado: 2026-10-28 (archivar)

## Contexto
El dinero entregado al líder no se puede "devolver", y ante una devolución "el abibono debe seguir allí y la información del cliente con los abonos que ya dio también". En Notion el dueño a veces eliminaba al cliente tras una devolución, pero reconoce que conviene conservar la información. Visitas y abonos son **agregaciones**, no composiciones del cliente.

## Decisión
- Todo borrado de entidades de negocio es **lógico** (`deleted_at`).
- **Clientes:** en vez de "eliminar", se **archivan** (`archived_at`): se ocultan de las listas, se ven y restauran desde "Archivados"; solo si **no tienen ejemplares vendidos**; sus abonos programados se cancelan con confirmación; sus abonos cobrados siguen en Dinero; sus visitas permanecen.
- **Abono entregado** y **Abibono confirmado** son inmutables, salvo mediante **Reabrir** con motivo (ADR-0010).
- Historial de **solo inserción** para prórrogas, eventos de ejemplares, eventos de abonos y de Abibonos.

## Alternativas descartadas
Borrado en cascada (perdería dinero entregado); borrado físico (sin auditoría); permitir archivar clientes con libros vendidos.

## Consecuencias
Las consultas filtran `deleted_at is null` y `archived_at is null` salvo la vista Archivados.

## Referencias
BR-GEN-02, BR-PAY-10/12, BR-DEP-12, BR-CUS-09 · AF-71 · DECISION-LOG Q23, Q31, Q33
