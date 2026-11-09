# HU-INV-08 · Eliminar un ejemplar y deshacer

> **Épica:** Inventario · **Depende de:** HU-INV-07 · **Reglas:** BR-COPY-17, BR-COPY-11, BR-GEN-02, BR-GEN-15, AF-51 · **Diseño:** "Inventario · Ejemplar · acciones" y "eliminar con nota" (escritorio claro)

## Historia
**Como** colportor **quiero** eliminar un ejemplar que registré por error (por ejemplo, uno agregado de más) **para** que mi inventario no cuente libros que no existen.

## Contexto
- Se permite en **En físico** y **Con novedad**, **nunca** en Vendido (primero se devuelve), Perdido o Devuelto al líder (ronda 26).
- La nota es **opcional hoy**, pero el dueño dijo que en el futuro podría ser obligatoria: es un valor de configuración (`copyDelete.noteRequired`, BR-GEN-15).
- Es un **borrado lógico**: no cuenta en nada y su número no se reutiliza. Solo se deshace desde el aviso de unos segundos (el ejemplar desaparece de las listas).

## Alcance
- **Incluye:** eliminar desde el detalle (en físico o con novedad) y deshacer.
- **No incluye:** eliminar varios a la vez.

## Contrato para el front
### Acciones
- `deleteCopy(copyId, note?)` → `Result<void>` · errores: `COPY_NOT_DELETABLE`, `NOTE_REQUIRED` (solo si la configuración lo exige), `OFFLINE`.
- `undoDeleteCopy(copyId)` → `Result<void>` · errores: `UNDO_NOT_AVAILABLE`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** CUANDO el ejemplar está `in_stock`, eliminar DEBE marcar `deleted_at` y registrar `deleted` con el estado anterior y la nota.
- **R2.** CUANDO el ejemplar está `flagged`, eliminar DEBE resolver su novedad como `removed` (HU-INV-07) con la nota.
- **R3.** CUANDO el ejemplar está `sold`, `lost` o `returned_to_leader`, DEBE devolver `COPY_NOT_DELETABLE`.
- **R4.** CUANDO `copyDelete.noteRequired = true` y no hay nota, DEBE devolver `NOTE_REQUIRED`.
- **R5.** Deshacer DEBE restaurar el estado anterior: `in_stock`, o `flagged` con la misma novedad reabierta; y registrar `undo_deleted` (o `undo_resolved` si venía de una novedad).
- **R6.** El back NO DEBE imponer el tiempo del aviso: lo controla el front con `undo.toastSeconds`; el back solo exige que el último evento del ejemplar sea la eliminación.

## Criterios de aceptación
- **CA-1.** **Dado** "Bebidas saludables #9" en físico, **cuando** se elimina con "Lo registré dos veces", **entonces** desaparece de Libros en físico, Ejemplares y conteos, y el próximo ejemplar de ese título no reutiliza el 9.
- **CA-2.** **Dado** ese ejemplar recién eliminado, **cuando** se deshace, **entonces** vuelve a físico con el #9.
- **CA-3.** **Dado** un ejemplar vendido, **cuando** se intenta eliminar, **entonces** `COPY_NOT_DELETABLE`.
- **CA-4.** **Dado** un ejemplar con novedad, **cuando** se elimina sin nota, **entonces** su novedad queda resuelta como `removed` y el ejemplar se borra.
- **CA-5.** **Dado** `copyDelete.noteRequired = true` en una prueba, **cuando** se elimina sin nota, **entonces** `NOTE_REQUIRED`.

## Casos borde y errores
- Eliminar dos veces devuelve `NOT_FOUND`.

## Datos
Funciones SQL `delete_copy` y `undo_delete_copy`.

## Cómo se verifica
- **Dominio:** qué estados permiten eliminar; efecto de la configuración.
- **Integración:** CA-1 a CA-5.

## Terminado cuando
Se cumple §10 de las reglas comunes.
