# ADR-0017: Antigüedad de ejemplares y favoritos
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Conviene vender primero los ejemplares más antiguos, pero el dueño no quiere que el usuario tenga "tan presente cuántos libros lleva todo el tiempo": propuso un icono por etapas (idea de una fruta que se pudre, pero "poco profesional"). En Notion agregar inventario era un botón por libro, que **no escala**.

## Decisión
- **Antigüedad** derivada: días calendario desde `received_at`. Etapas por defecto: Reciente 0–2, Normal 3–6, Envejeciendo 7–12, Antiguo ≥ 13; umbrales `[2,6,12]` **editables por el admin** en `app_settings`. Icono sobrio por etapas (no fruta), solo en libros en físico y en el selector de ejemplares.
- **Agregar a inventario:** selector en **lista** buscable + **Títulos favoritos** como botones de un toque. Máximo **6** favoritos (editable por el admin). Cada toque crea un ejemplar. Los minibooks también se agregan desde aquí.

## Alternativas descartadas
- *Botón por título*: no escala con el catálogo.
- *Mostrar el número de días en toda la app*: es lo que el dueño no quiere.

## Consecuencias
La antigüedad no añade columnas. Los favoritos son por usuario (`title_favorite`).

## Referencias
BR-COPY-13, BR-INV-01..03 · RQ-INV-01..03 · DECISION-LOG Q37, Q45 y "Agregar a inventario"
