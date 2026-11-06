# Hoy — definición y pendientes (DT-09)

**Estado:** parcialmente cerrada en la ronda 25 (2026-11-05). La fuente normativa son BR-CAL-07 y BR-CAL-09; este archivo resume lo decidido y lo que falta.

## Decidido (ronda 25)
Hoy es una pantalla de trabajo, sin subtítulos ni semana, con estas secciones en este orden:
1. **Calendario del día:** una línea con conteos por tipo (cobros, visitas, capacitaciones), cada tipo con su microícono de forma geométrica; tocarla abre el Calendario del día.
2. **Por cobrar:** vencidos arriba y de hoy debajo, máximo 5 filas y «Ver todos» (→ Dinero ▸ Por cobrar). Cada fila lleva el nombre del cliente bien visible y un botón **Cobrar**, que abre un formulario corto con el monto acordado (editable), la fecha de hoy y método **transferencia** por defecto. Se elimina el aviso único de vencidos.
3. **Libros en físico:** un número (ejemplares `in_stock`, sin dinero) que abre Inventario ▸ lista en físico. La barra de meta fina se conserva.

«Agregar al inventario» no va en Hoy. «Otras cosas» sin definir: quedan fuera de la fase 1 (backlog). Excepciones a BR-GEN-10, BR-GEN-12 y BR-GOAL-06 solo para Hoy.

## Pendiente (preguntas abiertas)
- **OQ-40 — «Por entregar» en Hoy:** el dueño dijo que será menos importante porque Dinero ya tiene su tarjeta, y su orden no la nombra. Opciones: A) se quita de Hoy (supuesto del asistente); B) se queda más abajo y sin acento; C) se queda arriba. Con A, «Entregar» deja de existir en Hoy y se reescriben BR-CAL-08 y BR-DEP-13.
- **OQ-41 — «Figuras geométricas»:** el dueño recuerda algo visual con figuras geométricas en el calendario; se supone que son los microíconos de tipo de evento (forma propia por tipo), a definir en el diseño.

## Idea próxima (no se crea todavía)
Comprobante de abono compartible: ver Backlog en `06-planificacion/OPEN-QUESTIONS.md`.
