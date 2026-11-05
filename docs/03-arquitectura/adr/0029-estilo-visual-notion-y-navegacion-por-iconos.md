# ADR-0029: Estilo visual Notion, barra de vista única y navegación por íconos
Estado: Aceptado · Fecha: 2026-10-28 · Ampliado por ADR-0032 (principios de diseño, 2026-10-29)

## Contexto
El sistema original estaba en Notion y el dueño quiere **el mismo estilo visual**, con un diseño "muy atractivo" y filtros/selectores con **un mismo estilo en todos los módulos**. Quiere que cada sección tenga un ícono, como en Instagram, donde el ícono basta en la barra y el título se ve por otro lado.

## Decisión
- Estética **Notion**: neutra, bordes finos, mucho aire, etiquetas suaves, tablas tipo base de datos con pestañas de vista, propiedades editables en línea, modo oscuro automático.
- **Un único componente `ViewBar`** (pestañas de vista, filtro, orden, búsqueda) reutilizado por todos los módulos.
- **Un ícono propio por sección**; barra inferior móvil con **ícono y su nombre** (ronda 19; antes solo íconos, ver ADR-0018); menú lateral de escritorio con ícono y texto.
- Stack de UI: Tailwind + shadcn/ui (Radix). La implementación sigue el diseño elegido en Claude Design.

## Alternativas descartadas
Estilos distintos por módulo; barra con etiquetas siempre visibles en móvil.

## Consecuencias
`ui/` contiene `ViewBar` y el set de íconos. Las decisiones visuales abiertas (DT-01..DT-06) se toman en el diseño.

## Referencias
04-diseno/DESIGN-BRIEF.md §3, §5, §11 · RQ-QLT-01 · DECISION-LOG Q1 (ronda 7), Q8, Q29
