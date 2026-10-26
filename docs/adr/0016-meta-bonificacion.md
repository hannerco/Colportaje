# ADR-0016: Meta de bonificación
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
La casa publicadora da una bonificación si se alcanza una meta de compra de **libros culturales**. El dueño indicó 4 millones por defecto, editable por el admin, mostrada como **barra de progreso sin números**, "embebida en una página" (Hoy), sujeta a cambios.

## Decisión
`bonus_progress = Σ colportor_price_snapshot de ejemplares culturales vendidos ÷ bonus_goal`; `bonus_goal` por defecto **4.000.000** COP en `app_settings`, editable por el admin. Se muestra solo como barra (tope visual 100 %), inicialmente en **Hoy**. Las campañas y más metas quedan en el backlog.

## Alternativas descartadas
- *Medir por cantidad de libros*: el criterio real es la suma de compra.
- *Mostrar cifras*: el dueño no quiere dar "tanto bombo".

## Consecuencias
Meta global (no por campaña) en la v1. La ubicación puede cambiar tras el diseño (OQ-02).

## Referencias
BR-GOAL-01 · RQ-TOT-03 · DECISION-LOG Q42, Q47
