# ADR-0017: Antigüedad, favoritos y agregar a inventario
Estado: Aceptado · Fecha: 2026-10-26 · Revisado: 2026-10-28 (patrón "+ / pastilla")

## Contexto
Conviene vender primero los ejemplares más antiguos, pero el dueño no quiere que el usuario tenga "tan presente cuántos libros lleva": propuso un icono por etapas (la idea de una fruta que se pudre, "poco profesional"). En Notion agregar inventario era un botón por libro, que no escala. El líder normalmente entrega 2–4 ejemplares por título, pero de minibooks entrega muchos. Un botón "×N" visible le pareció poco estético; pidió pensar "cómo lo haría Notion".

## Decisión
- **Antigüedad** derivada por días desde `received_at`: Reciente 0–2, Normal 3–6, Envejeciendo 7–12, Antiguo ≥ 13; umbrales `[2,6,12]` **editables por el admin**. Icono sobrio por etapas, solo en libros en físico y en el selector.
- **Agregar a inventario:** lista buscable + **favoritos** (máx. 6, editable por admin). Cada fila tiene un **"+"**; un toque = un ejemplar; tras agregar, el "+" se vuelve una **pastilla numérica** (de la sesión) que al tocarse permite **escribir la cantidad total** (ajusta solo los ejemplares recién agregados). Igual para libros y minibooks. **Deshacer** unos segundos. Un **chip de fecha "Hoy ▾"** permite un día pasado.

## Alternativas descartadas
- *Botón por título*: no escala.
- *Selector ×N siempre visible*: poco estético y casi nunca necesario con libros.
- *Cantidad visible desde el inicio solo en minibooks*: el dueño pidió el mismo patrón para ambos.

## Consecuencias
La antigüedad no añade columnas; los favoritos son por usuario (`title_favorite`).

## Referencias
BR-COPY-02/04/13, BR-INV-02 · RQ-INV-01..03, RQ-INV-08 · DECISION-LOG Q2, Q28, Q36, Q37, Q45
