# ADR-0040: Dinero: vistas, estados con color y deuda sin programar
Estado: Aceptado · Fecha: 2026-11-05

## Contexto
El dueño usaba en Notion dos tablas: *Abonos de clientes* (vistas Por entregar, Entregados, Nequi/Efectivo por entregar, En la calle) y *Abibonos*. Su rutina nocturna era sumar lo por entregar por método, compararlo con lo que tenía y registrar el Abibono. Pidió totales visibles, una barra de progreso por estado y una forma de ver lo que falta por cobrar.

## Decisión
- **Dinero** tiene dos vistas (Abonos de clientes, Abibonos) con el mismo patrón que Inventario y una **tarjeta fija «Por entregar»** (total, efectivo, transferencia, «Nuevo Abibono») sobre ambas (BR-DEP-14).
- En Abonos de clientes: vistas **Todos · Por cobrar · Por entregar · Entregados**, filtro **Método** (reemplaza las vistas Nequi/Efectivo) y una **barra de 3 tramos** tocable para filtrar, sobre todos los abonos no cancelados.
- **«En la calle» desaparece como nombre**: es **Por cobrar** (estado, vista y totalizador). El totalizador = **programado + sin programar**; si hay **sin programar** se avisa («Sin programar $X · N clientes») para corregirlo.
- **Vencido no es un estado**: es una marca derivada de la fecha (Por cobrar con fecha pasada); el cliente deriva su Vencido de sus abonos.
- **Colores de los estados**: Por cobrar gris, Cobrado verde, Entregado «prime» (dorado o azul, DT-11), Cancelado gris tachado. El verde pasa a significar «dinero recibido».
- **Cobrar** se puede hacer desde la ficha, Hoy y Dinero (BR-PAY-05).
- **Total de venta** (Σ precio acordado de lo vendido) es un totalizador nuevo; «Dinero en la calle» pasa a llamarse «Por cobrar».
- No se añade una herramienta aparte de «contar»: la comparación esperado vs. entregado vive en el Abibono (BR-DEP-05).

## Alternativas descartadas
- *Vistas Nequi y Efectivo*: un filtro de método da lo mismo sin duplicar vistas.
- *«Vencido» como estado*: se solapa con Por cobrar; es derivado.
- *Todos los estados del abono en gris* (BR-GEN-12 anterior): no se distinguen en la barra ni en la lista.

## Consecuencias
- `to_collect_total`, `unscheduled_total`, `scheduled_to_collect` y `sales_total` como funciones del dominio con pruebas (suma exacta: por cobrar = programado + sin programar).
- BR-GEN-12 actualizada; DT-11 abierta (color de Entregado).

## Referencias
BR-DEP-14, BR-PAY-02/05/08, BR-GOAL-03 · RQ-DEP-01/09/10 · DECISION-LOG ronda 23
