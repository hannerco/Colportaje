# HU-INV-09 · Devolver al líder y deshacer

> **Épica:** Inventario · **Depende de:** HU-INV-03 · **Reglas:** BR-COPY-16, ADR-0043, AF-54, OQ-30 · **Diseño:** "Devolver al líder · variante angosta", "angosta · Minibooks abierto", "angosta · Listo: resumen" y "Ejemplar · devuelto al líder (deshacer)" (escritorio claro)

## Historia
**Como** colportor al final de la campaña (o con libros viejos que el líder acepta) **quiero** devolverle varios ejemplares de una vez con una nota **para** que salgan de mi inventario sin contarse como vendidos ni perdidos.

## Contexto
- El diseño elige los **libros por unidad** (casillas) y los **minibooks por cantidad** (se devuelven los de recibido más antiguo). Cualquier ejemplar en físico sirve, sin importar su fecha (ronda 26, ADR-0043).
- La **nota es obligatoria** y se pide antes del resumen "Vas a devolver N ejemplares" (por categoría).
- Se deshace **por ejemplar**, desde su historial, con nota obligatoria.

## Alcance
- **Incluye:** candidatos a devolver; resumen; devolver en lote; deshacer por ejemplar.
- **No incluye:** columna "Devueltos" de Hacer inventario (módulo sin diseño), devolver ejemplares que no están en físico.

## Contrato para el front
### Lecturas
- `useReturnToLeaderCandidates({ search })` → `{ books: [{ copyId, titleName, number, category, receivedAt }], minibooks: [{ titleId, name, inStockCount }] }`: libros `in_stock` (no minibook) ordenados por recibido más antiguo, luego título y número; minibooks con ejemplares en físico, por nombre. Búsqueda por título.
### Lógica local
- `returnSelectionSummary({ copyIds, minibookLines })` → `{ total, byCategory, lines }` (para "Vas a devolver N").
### Acciones
- `returnCopiesToLeader({ opId, copyIds, minibookLines: [{ titleId, quantity }], note })` → `Result<{ returnedCopyIds }>` · errores: `NOTE_REQUIRED`, `SELECTION_EMPTY`, `COPY_NOT_IN_STOCK` (`details.copyIds`), `NOT_ENOUGH_STOCK` (`details.titleId`), `OFFLINE`.
- `undoReturnToLeader(copyId, note)` → `Result<void>` · errores: `NOTE_REQUIRED`, `UNDO_NOT_AVAILABLE`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** La nota DEBE tener texto, al devolver y al deshacer (BR-COPY-16).
- **R2.** Devolver DEBE ser todo o nada: si un ejemplar ya no está en físico o falta stock de un minibook, no se devuelve ninguno.
- **R3.** Para los minibooks, DEBE tomar los ejemplares `in_stock` de recibido más antiguo; desempate por número y luego por id (OQ-30).
- **R4.** Cada ejemplar devuelto DEBE pasar a `returned_to_leader` y registrar el evento con la nota y el `opId`.
- **R5.** Deshacer DEBE estar disponible solo si el ejemplar sigue `returned_to_leader`; lo pasa a `in_stock` y registra `undo_returned_to_leader` con la nota.
- **R6.** Reintentar con el mismo `opId` NO DEBE devolver más ejemplares.

## Criterios de aceptación
- **CA-1.** **Dado** "Un corazón tranquilo #4", "El camino a Cristo #3" y "La gran esperanza #12" en físico, **cuando** se devuelven con "Fin de campaña, entregados en la oficina", **entonces** los tres quedan `returned_to_leader` y el resumen fue 1 cultural, 2 religiosos, total 3.
- **CA-2.** **Dado** 24 minibooks "Paz para el corazón" recibidos en distintas fechas, **cuando** se devuelven 2, **entonces** salen los 2 más antiguos y quedan 22 en físico.
- **CA-3.** **Dado** la selección sin nota, **cuando** se confirma, **entonces** `NOTE_REQUIRED` y nada cambia.
- **CA-4.** **Dado** un ejemplar de la selección vendido justo antes, **cuando** se confirma, **entonces** `COPY_NOT_IN_STOCK` y nada cambia.
- **CA-5.** **Dado** "El camino a Cristo #2" devuelto, **cuando** se deshace con "Me equivoqué de libro", **entonces** vuelve a físico y el historial muestra ambos eventos con sus notas.
- **CA-6.** **Dado** pedir 30 minibooks con 24 en físico, **cuando** se confirma, **entonces** `NOT_ENOUGH_STOCK`.

## Casos borde y errores
- La búsqueda de candidatos no cambia la selección ya marcada (es estado del front).

## Datos
Funciones SQL `return_copies_to_leader(p_op_id, p_copy_ids, p_minibook_lines, p_note)` y `undo_return_to_leader(p_copy_id, p_note)`.

## Cómo se verifica
- **Dominio:** resumen por categoría.
- **Integración:** CA-1 a CA-6, incluida la idempotencia por `opId`.

## Terminado cuando
Se cumple §10 de las reglas comunes.
