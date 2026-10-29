# ADR-0010: Cuadre del Abibono ("Entrega al líder")
Estado: Aceptado · Fecha: 2026-10-26 · Revisado: 2026-10-28 (reabrir y recibos)

## Contexto
El dinero entregado puede diferir de la suma de abonos (pérdidas, donaciones, otras fuentes). El recibo es obligatorio. Un error tras confirmar (efectivo vs. transferencia, foto equivocada) no debe obligar a pedir ayuda al admin. El nombre "Abibono" se conserva por ser un chiste interno; el tooltip dice "Entrega al líder".

## Decisión
- El Abibono guarda lo **realmente entregado** (`cash` + `transfer`); el **total** es derivado. Al vincular abonos o asignaciones de minibooks, ambos montos se **autocalculan por método** y siguen siendo editables.
- **Esperado** = Σ abonos vinculados + Σ asignaciones de minibooks. **Diferencia** = total − esperado, siempre visible; **nota obligatoria** si ≠ 0.
- Un abono va **completo** en un solo Abibono. Un Abibono sin abonos (donación) es válido.
- `draft` → `confirmed`; confirmar exige **≥ 1 foto de recibo** (una por defecto, "Añadir otra" disponible), total > 0 y nota si hay diferencia. Al confirmar, abonos a `delivered`, en una transacción.
- **Reabrir:** la nota y las fotos extra siempre se pueden añadir; para cambiar montos o abonos hay un botón **discreto "Reabrir"** con **motivo obligatorio** que devuelve el Abibono a `draft` y sus abonos a `collected`, con historial (`leader_deposit_event`).
- Título y fecha automáticos, editables.

## Alternativas descartadas
- *Forzar que el total coincida*: no cubre pérdidas ni donaciones.
- *Inmutable sin salida*: un error obligaría a intervención del admin.
- *Repartir un abono entre varios Abibonos*: complejidad sin necesidad real.

## Consecuencias
Funciones transaccionales `confirm_leader_deposit` y `reopen_leader_deposit`.

## Referencias
BR-DEP-01..12 · FLOWS F-17 · FLOWS-ALTERNATIVOS AF-40..AF-47 · RQ-DEP-01..07 · DECISION-LOG Q14, Q19, Q26, Q11
