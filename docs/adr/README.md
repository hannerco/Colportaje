# Registro de decisiones de arquitectura (ADR)

Un ADR por decisión relevante. Formato: contexto → decisión → alternativas descartadas → consecuencias → referencias. Estado: **Aceptado** (decidido con el dueño), **Propuesto** (recomendado, sin discutir), **Reemplazado por ADR-NNNN**.

**Regla:** no se editan ADRs aceptados para cambiar de opinión; se crea uno nuevo que lo reemplaza y se actualiza el estado del anterior. Toda decisión nueva significativa requiere ADR. Fuente de las respuestas del dueño: `../DECISION-LOG.md`.

## Índice
| ADR | Tema | Estado |
|---|---|---|
| 0001 | Multiusuario, roles e invitación | Aceptado |
| 0002 | Stack y despliegue | Aceptado |
| 0003 | Offline por fases | Aceptado |
| 0004 | Idioma, formato y glosario | Aceptado |
| 0005 | Cliente como agregado y valores derivados | Aceptado |
| 0006 | Prospectos derivados | Aceptado |
| 0007 | Títulos con categoría y catálogo de admin | Aceptado |
| 0008 | Ejemplares: número, snapshots, novedad | Aceptado |
| 0009 | Abonos: una tabla, prórrogas, parciales | Aceptado |
| 0010 | Cuadre del Abibono | Aceptado |
| 0011 | Minibooks | Aceptado |
| 0012 | Calendario con tres tipos de evento | Aceptado |
| 0013 | Política de fotos | Aceptado |
| 0014 | Búsqueda y dirección | Aceptado |
| 0015 | Totalizadores en Hacer inventario | Aceptado |
| 0016 | Meta de bonificación | Aceptado |
| 0017 | Antigüedad de ejemplares y favoritos | Aceptado |
| 0018 | Navegación base | Aceptado (base; el diseño decide) |
| 0019 | Arquitectura en capas y pruebas | Aceptado |
| 0020 | Copias de seguridad | Aceptado |
| 0021 | Rendimiento percibido | Aceptado |
| 0022 | Borrado lógico y bloqueos de dinero entregado | Aceptado |
| 0023 | Numeración de ejemplares | Propuesto |
| 0024 | Campañas diferidas | Aceptado |
| 0025 | Devoluciones y saldo a favor, sin reembolsos | Aceptado |
| 0026 | Elección de ejemplares uno por uno | Aceptado |

## Plantilla
```markdown
# ADR-NNNN: Título
Estado: Aceptado | Propuesto · Fecha: AAAA-MM-DD

## Contexto
## Decisión
## Alternativas descartadas
## Consecuencias
## Referencias
(BR-*, RQ-*, DECISION-LOG Q#, otros ADRs)
```
