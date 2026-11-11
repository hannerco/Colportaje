# ADR-0046: Dinero según la exploración elegida: tarjeta única, Dinero total y cancelados aparte
Estado: Aceptado · Fecha: 2026-11-08 · Amplía y reemplaza en parte ADR-0040

## Contexto
El dueño eligió la exploración "Por entregar (Cobrado) y Dinero total en una sola tarjeta" como la versión más reciente de Dinero (ronda 26). Además, al revisar contradicciones se definieron cómo se cuentan cancelados, cuota inicial, abono extra y lo programado.

## Decisión
- **Tarjeta única** sobre la vista Abonos de clientes: "Por entregar (Cobrado)" con total, efectivo y transferencia, y el botón **"Entregar al líder"**, que abre **Nuevo Abibono** precargado (BR-DEP-13). Debajo, un **medidor** con el % entregado, **tres tarjetas** tocables (Entregado, Cobrado, Por cobrar; monto y %) y **"Dinero total"**. En la vista Abibonos, la tarjeta muestra Por entregar y el botón.
- **Dinero total** = suma de todos los abonos **no cancelados**: Entregado + Cobrado + Por cobrar (programado). No incluye lo sin programar. Es la base de los porcentajes.
- **Programado (Por cobrar)** = suma literal de los valores acordados de los abonos por cobrar (lo mismo que suman las filas), aunque supere lo que el cliente debe.
- **Cancelados:** no aparecen en Todos ni en su conteo; tienen una **quinta pestaña "Cancelados"** (además de la sección plegable de la ficha) y no cuentan en ningún total.
- **Cuota inicial y abono extra** muestran como valor y fecha acordados su valor y fecha reales (solo se muestra; no se guarda).
- **Filtro Método:** oculto en Por cobrar; ni el filtro ni la búsqueda cambian los totales.
- **Órdenes:** Abonos por fecha acordada (por defecto; descendente, ascendente en Por cobrar), fecha real, valor acordado, valor real y cliente. Abibonos por fecha (por defecto, descendente), total y nombre. Los vacíos van al final.
- **Color:** Entregado en azul marino con candado (cierra DT-11; ronda 27 reemplazó el verde inicial).

## Alternativas descartadas
- *Barra de 3 tramos y botón "Nuevo Abibono" (ADR-0040):* reemplazados por la exploración.
- *Programado recortado a lo que el cliente debe:* el total no coincidiría con la lista.

## Consecuencias
- La identidad `por cobrar = programado + sin programar` solo se cumple cuando no hay sobrante (BR-PAY-13).
- La pestaña Cancelados no está diseñada; queda en `04-diseno/pendientes/`.

## Referencias
BR-DEP-13/14, BR-PAY-02, BR-GOAL-03 · ADR-0040 · DECISION-LOG ronda 26 (Q30–Q35, Q56–Q59)
