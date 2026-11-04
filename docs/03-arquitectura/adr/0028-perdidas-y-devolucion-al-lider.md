# ADR-0028: Pérdidas, "A responder al líder" y devolución de libros al líder
Estado: Aceptado · Fecha: 2026-10-28

## Contexto
Normalmente el colportor asume la pérdida de un libro (se le sigue cobrando). Un líder amable puede aceptar la pérdida como suya, pero es un acto de bondad que **el colportor no debe ver como opción** en la app. Además, al terminar la campaña —o con libros viejos que el líder acepta— el colportor devuelve libros no vendidos al líder.

## Decisión
- Salidas de "Con novedad": *Apareció*, *Perdido (lo asumo yo)* y *Eliminar* (con nota opcional). **Ningún texto, tooltip ni etiqueta menciona que el líder pueda asumir una pérdida.**
- *Hacer inventario* muestra **"Perdidos asumidos"** (cantidad y valor al precio colportor) y **"A responder al líder" = Mi compra + perdidos asumidos**. "Mi compra" sigue siendo solo vendidos.
- Nuevo estado **`returned_to_leader`**: acción **en lote** sobre `in_stock`, sin importar su **fecha de recibido**, con nota y **deshacer**; no cuenta en "Mi compra" ni en "A responder"; columna "Devueltos" en *Hacer inventario*.
- Identidad: `Recibidos = Vendidos + En físico + Con novedad + Perdidos + Devueltos`.

## Alternativas descartadas
- *Opción "el líder asume"*: compromete al líder.
- *Incluir perdidos dentro de "Mi compra"*: mezclaría ventas con pérdidas.
- *Tratar la devolución al líder como "perdido"*: distorsiona cuentas.

## Consecuencias
La fase 3 (vista de líder) podrá reflejar `returned_to_leader` como recepción del líder.

## Referencias
BR-COPY-10/11/14/16, BR-GOAL-07 · RQ-INV-06/09, RQ-TOT-05 · AF-52..AF-54 · DECISION-LOG Q6, Q24, Q25, Q33, Q34
