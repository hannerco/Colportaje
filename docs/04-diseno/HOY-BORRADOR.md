# Hoy — borrador de lo que quiere el dueño (sin definir)

**Estado:** pendiente de diseño (DT-09, `06-planificacion/OPEN-QUESTIONS.md`). Este archivo solo conserva lo que el dueño dijo el 2026-11-04 para retomarlo cuando se diseñe Hoy. **No es una regla**: la fuente normativa sigue siendo BR-CAL-07/08/09, que están marcadas «en revisión».

## Lo que el dueño quiere que sea Hoy
Un **resumen general de todo**. A grandes rasgos, debe tener:
1. Lo que hay en el **calendario para hoy**.
2. Una **vista fácil de abonos** para **chequearlos** y **cobrarlos rápidamente**.
3. Un **resumen de los libros en físico**.
4. Otras cosas **sin definir** («cuando lleguemos allá, sabremos»).

**Decidido:** «Agregar al inventario» **no** va en Hoy; vive en Inventario.

## Lo que ya existe en los docs (y puede chocar)
| Documento | Dice hoy | Choque con lo que el dueño quiere |
|---|---|---|
| BR-CAL-07 | Pantalla mínima, un único botón («Entregar»), sin subtítulos, **sin calendario ni semana**; tarjeta «Por entregar» → aviso de vencidos → barra de meta → una lista cronológica | El dueño quiere calendario del día, cobro rápido de abonos y resumen de libros |
| BR-CAL-08 | Tarjeta «Por entregar» con un único botón «Entregar» | Un botón de cobro rápido sería otra acción en Hoy |
| BR-CAL-09 | Aviso único de vencidos («N cobros vencidos ›»), sin repetirlos en la lista | El cobro rápido de abonos tendría que decidir si incluye los vencidos |
| BR-GOAL-06 | Cifras de dinero en Hoy solo en «Por entregar»; en Inventario ninguna | Un resumen de libros son cantidades, no dinero; los abonos a cobrar sí son dinero |
| BR-GEN-10 / RQ-QLT-06 | Una sola acción principal; Hoy con un único botón | El cobro rápido añade acciones por fila |
| BR-GEN-12 | Sin subtítulos ni contadores; filas de máximo 2 líneas | Un resumen de libros es un contador |
| Prompt de Hoy | `04-diseno/PROMPT-CLAUDE-DESIGN.md`, «Spec de HOY» | Habría que reescribirlo |

## Preguntas para cuando se diseñe Hoy (no se contestan ahora)
- ¿Qué significa «cobrar rápido»? Hoy cobrar pide monto, fecha y método (BR-PAY-05): ¿se cobra con un toque con valores por defecto o abre un formulario corto?
- ¿La vista de abonos muestra solo los de hoy, o también los vencidos (BR-CAL-09)?
- ¿Qué muestra el «resumen de libros en físico»: total de ejemplares o los «Por resolver»?
- ¿Hoy conserva «Por entregar» y la barra de meta (DT-02)?
- ¿El calendario del día es la lista cronológica actual (cobros, visitas, capacitaciones, recordatorios) o algo más?
- ¿Cuáles son esas «otras cosas»?
- Dónde queda cada cosa en móvil (una mano, en la calle) frente a escritorio (cuadre nocturno).

## Cómo retomarlo
Al llegar a Hoy: leer este archivo, BR-CAL-07..09, BR-GOAL-06 y el «Spec de HOY» del prompt; preguntar al dueño con la técnica «grill-me» y **solo entonces** reescribir BR-CAL-07/08/09, el prompt de Hoy y cerrar DT-09.
