# ADR-0024: Campañas diferidas
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Una campaña dura ~3 meses y la siguiente empieza pronto. Se propuso filtrar totalizadores por campaña. El dueño respondió: "Por ahora no… déjalo anotado para la siguiente fase. Por ahora solo lo usaremos para esta campaña."

## Decisión
No hay entidad ni filtro de campaña en la v1. Se conserva `sold_at`/`received_at` en los ejemplares y `paid_at`/`due_date` en los abonos, de modo que añadir campañas después sea un filtro por rango de fechas sin migrar datos. Las **metas** quedan globales (ADR-0016).

## Alternativas descartadas
Tabla `campaign` desde ya (alcance extra sin necesidad inmediata).

## Consecuencias
Entra en el backlog junto con el apartado de **Metas** ampliado.

## Referencias
ROADMAP (backlog) · DECISION-LOG Q32
