# ADR-0043: Inventario según el diseño: agregar por lote, sin favoritos, devolver por unidad y deshacer
Estado: Aceptado · Fecha: 2026-11-08 · Reemplaza la parte "Agregar a inventario" de ADR-0017 y la forma de elegir de ADR-0028

## Contexto
El diseño aprobado de Inventario (escritorio claro) cambió varias reglas: Agregar acumula ejemplares y los confirma con un resumen; no hay favoritos; Devolver al líder se elige marcando ejemplares; Eliminar aparece en el ejemplar en físico; las resoluciones de una novedad ofrecen Deshacer (ronda 26).

## Decisión
- **Agregar por lote:** se tocan títulos (agrupados en Culturales, Religiosos y Minibooks, con búsqueda); cada toque suma uno localmente y "−" resta; **nada se guarda** hasta confirmar en el Resumen ("Agregar N"), que crea todos los ejemplares en **una operación de todo o nada**, con **una sola fecha de recibido** (Hoy, Ayer, Anteayer u otra fecha pasada). Los números se asignan al confirmar. "Descartar" o "Cancelar" no tocan la base de datos. No hay Deshacer después de confirmar: un ejemplar de más se elimina.
- **Favoritos eliminados** (no pasan al backlog). Idea futura, fuera de la v1: ordenar los títulos según lo que más pide el colportor.
- **Libros en físico** muestra, por título, el **precio de referencia** (precio público vigente; en minibooks sin precio público, el precio colportor). No es una suma.
- **Devolver al líder:** los libros se eligen **por unidad** (casillas) y los minibooks **por cantidad** (los de recibido más antiguo); nota obligatoria; una sola operación. Deshacer por ejemplar desde su historial, con nota obligatoria.
- **Eliminar un ejemplar:** permitido en **En físico** y **Con novedad**, nunca en Vendido; nota opcional (configurable para volverla obligatoria). Deshacer solo en el aviso de unos segundos.
- **Resolver una novedad:** nota opcional. **Apareció** y **Perdido** se pueden deshacer desde el aviso y, después, desde el historial del ejemplar; vuelven a Con novedad con la misma novedad abierta. Perdido deja de ser terminal.
- **Ejemplares:** la lista y sus conteos excluyen minibooks; la columna Fecha muestra la fecha del orden elegido (Recibido → recibido; Vendido → vendido, los no vendidos al final; demás órdenes → recibido).

## Alternativas descartadas
- *Un ejemplar por toque con Deshacer (ADR-0017):* el diseño eligió el lote con resumen.
- *Devolver por cantidad por título (ADR-0028):* el diseño eligió marcar ejemplares.

## Consecuencias
- Se eliminan `title_favorite`, `app_settings.max_favorites` y BR-INV-02.
- Nuevos eventos de ejemplar: `deleted`, `undo_deleted`, `undo_resolved`.
- Máquina de estados: `in_stock → [borrado]`, `lost → flagged` (deshacer), `in_stock → flagged` (deshacer Apareció).

## Referencias
BR-COPY-02/10/11/12/16, BR-INV-01..03, BR-GOAL-06 · ADR-0017, ADR-0028 · DECISION-LOG ronda 26 (Q21–Q28, Q51–Q55, Q64–Q66)
