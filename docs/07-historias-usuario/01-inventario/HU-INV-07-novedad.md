# HU-INV-07 · Marcar con novedad, resolver y deshacer

> **Épica:** Inventario · **Depende de:** HU-INV-03 · **Reglas:** BR-COPY-10/11, ADR-0028, ADR-0043, AF-52 · **Diseño:** "Ejemplar · marcar con novedad", "Por resolver (modal)", "Por resolver · Apareció (Deshacer)" (escritorio claro)

## Historia
**Como** colportor **quiero** marcar un ejemplar que no cuadra con lo que dice el líder y luego resolverlo (apareció, lo perdí o lo elimino), pudiendo deshacer si me equivoco, **para** que mi inventario refleje la realidad.

## Contexto
- Ejemplo real: "El líder contó 3 y tengo 2". Se marca el ejemplar que falta con **nota obligatoria**; deja de contar como físico (BR-COPY-10).
- Salidas: **Apareció** (vuelve a físico), **Perdido (lo asumo yo)** (`lost`) y **Eliminar** (borrado lógico). Al resolver la nota es **opcional** (ronda 26).
- **Deshacer (ronda 26):** Apareció y Perdido se deshacen desde el aviso y después desde el historial; Eliminar solo desde el aviso. Deshacer reabre **la misma** novedad con su nota original.
- **Regla de contenido:** ningún texto puede insinuar que el líder asume una pérdida (BR-COPY-11). El back no produce textos, pero los nombres de códigos y eventos tampoco lo hacen.

## Alcance
- **Incluye:** marcar con novedad; resolver con nota opcional; deshacer una resolución.
- **No incluye:** la cuenta "A responder al líder" (Hacer inventario), Eliminar desde el detalle de un ejemplar en físico (HU-INV-08, que reutiliza esta resolución si el ejemplar tiene novedad).

## Contrato para el front
### Acciones
- `flagCopy(copyId, note)` → `Result<void>` · errores: `COPY_NOT_IN_STOCK`, `VALIDATION` (nota vacía), `OFFLINE`.
- `resolveCopyIssue(copyId, resolution: 'found' | 'lost' | 'removed', note?)` → `Result<void>` · errores: `COPY_NOT_FLAGGED`, `OFFLINE`.
- `undoResolveCopyIssue(copyId)` → `Result<void>` · errores: `UNDO_NOT_AVAILABLE`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** Solo un ejemplar `in_stock` DEBE poder marcarse, y la nota DEBE tener texto (BR-COPY-10).
- **R2.** Marcar DEBE crear una novedad abierta, pasar el ejemplar a `flagged` y registrar `flagged` con la nota.
- **R3.** Resolver DEBE cerrar la novedad con su resolución y nota opcional, y registrar `resolved`: `found` → `in_stock`; `lost` → `lost`; `removed` → borrado lógico del ejemplar.
- **R4.** Deshacer DEBE estar disponible solo si la última resolución del ejemplar es la más reciente de su historial y su estado no cambió desde entonces: `found` y el ejemplar sigue `in_stock`; `lost` y sigue `lost`; `removed` y sigue borrado. Deshacer DEBE volver a `flagged`, reabrir la misma novedad (borrando resolución, nota de resolución y fecha) y registrar `undo_resolved`.
- **R5.** Todo en una transacción por acción.

## Criterios de aceptación
- **CA-1.** **Dado** "Psiconutrición #4" en físico, **cuando** se marca con "El líder contó 3 y tengo 2", **entonces** queda `flagged`, sale del conteo en físico y aparece en Por resolver con esa nota.
- **CA-2.** **Dado** esa novedad, **cuando** se resuelve como Apareció, **entonces** vuelve a `in_stock` y deja de estar en Por resolver.
- **CA-3.** **Dado** esa resolución, **cuando** se deshace, **entonces** vuelve a Por resolver con la nota "El líder contó 3 y tengo 2".
- **CA-4.** **Dado** "La gran esperanza #11" resuelto como Perdido hace una semana, **cuando** se deshace desde el historial, **entonces** vuelve a `flagged` con su nota original.
- **CA-5.** **Dado** un ejemplar resuelto como Apareció y luego vendido, **cuando** se intenta deshacer, **entonces** `UNDO_NOT_AVAILABLE`.
- **CA-6.** **Dado** una novedad resuelta como Eliminar, **cuando** se deshace, **entonces** el ejemplar reaparece en Por resolver con su número original.
- **CA-7.** **Dado** un ejemplar vendido, **cuando** se intenta marcar, **entonces** `COPY_NOT_IN_STOCK` (primero se devuelve).

## Casos borde y errores
- Marcar dos veces el mismo ejemplar: la segunda devuelve `COPY_NOT_IN_STOCK` (ya está `flagged`).

## Datos
Funciones SQL `flag_copy`, `resolve_copy_issue`, `undo_resolve_copy_issue`.

## Cómo se verifica
- **Dominio:** transiciones y condiciones de deshacer (R4).
- **Integración:** CA-1 a CA-7 con eventos y novedad reabierta.

## Terminado cuando
Se cumple §10 de las reglas comunes.
