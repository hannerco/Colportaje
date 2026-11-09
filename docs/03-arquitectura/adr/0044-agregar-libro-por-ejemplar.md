# ADR-0044: "Agregar libro" en la ficha lista cada ejemplar en físico
Estado: Aceptado · Fecha: 2026-11-08 · Reemplaza la forma de elegir de la ronda 20 (#8) y amplía ADR-0026

## Contexto
La ronda 20 definió que tocar un título asignaba el ejemplar más antiguo, que se podía expandir para elegir por número y que los agotados salían atenuados. El diseño aprobado lista cada ejemplar en físico con su "+", busca por libro o número y asigna al instante (ronda 26).

## Decisión
- El buscador "Agregar libro del inventario" lista **cada ejemplar `in_stock`** de títulos que no son minibook, **ordenado por título y luego por el recibido más antiguo** (luego por número), con su número y su precio público congelado (el que tomará como precio acordado).
- Busca por **título o número**. Tocar "+" asigna ese ejemplar al cliente **en ese momento** (BR-COPY-06); "−" lo quita (durante la creación, como error; después, como devolución).
- **No se muestran agotados.** Los minibooks quedan fuera hasta que exista su módulo.

## Alternativas descartadas
- *Tocar el título y asignar el más antiguo (ronda 20):* el diseño mostró que elegir el ejemplar concreto es más claro, en línea con ADR-0026.

## Consecuencias
- La consulta del selector devuelve ejemplares, no títulos agrupados.

## Referencias
BR-COPY-06 · ADR-0026 · DECISION-LOG ronda 20 (#8), ronda 26 (Q19)
