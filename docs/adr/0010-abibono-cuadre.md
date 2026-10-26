# ADR-0010: Cuadre del Abibono
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El dinero entregado al líder puede diferir de la suma de abonos (se perdió dinero, apareció de otra fuente, una donación). El texto original pedía "concluir cómo calcular estos casos". El recibo es obligatorio.

## Decisión
- El Abibono guarda lo **realmente entregado** (`cash_amount` + `transfer_amount`; el **total** es derivado y no editable). Al vincular abonos y/o asignaciones de minibooks, ambos montos se **autocalculan por método** y siguen siendo editables.
- **Esperado** = Σ abonos vinculados + Σ asignaciones de minibooks. **Diferencia** = total − esperado, siempre visible; **nota obligatoria** si ≠ 0.
- Un abono va **completo** en un solo Abibono. Un Abibono sin abonos (donación) es válido.
- Estados `draft` → `confirmed`; **confirmar exige ≥ 1 foto de recibo**, total > 0 y nota si hay diferencia. Al confirmar, los abonos pasan a `delivered` en una transacción.
- Título automático (`Abibono – dd/mm/aaaa`) y fecha automática, editables.

## Alternativas descartadas
- *Forzar que el total coincida con la suma*: no cubre pérdidas ni donaciones.
- *Repartir un abono en varios Abibonos*: complejidad sin necesidad real.
- *Pasar a `delivered` al crear*: el dueño pidió confirmar antes "que todo esté".

## Consecuencias
Función transaccional `confirm_leader_deposit`. El recibo actúa de compuerta.

## Referencias
BR-DEP-01..11 · FLOWS F-17 · RQ-DEP-01..06 · DECISION-LOG Q14
