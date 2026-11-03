# Registro de decisiones de arquitectura (ADR)

Un ADR por decisión relevante. Formato: contexto → decisión → alternativas descartadas → consecuencias → referencias. Estado: **Aceptado** (decidido con el dueño), **Propuesto** (recomendado, sin discutir), **Reemplazado por ADR-NNNN**.

**Regla:** no se editan ADRs aceptados para cambiar de opinión; se crea uno nuevo que lo reemplaza y se actualiza el estado del anterior. Toda decisión nueva significativa requiere ADR. Fuente de las respuestas del dueño: `00-contexto/DECISION-LOG.md`.

## Índice
| ADR | Tema | Estado |
|---|---|---|
| 0001 | Multiusuario, roles e invitación | Aceptado |
| 0002 | Stack, plataformas y región (us-east-1, medida) | Aceptado (revisado) |
| 0003 | Offline por fases (+ lectura sin conexión en F1) | Aceptado (revisado) |
| 0004 | Idioma, formato y glosario | Aceptado |
| 0005 | Cliente como agregado y valores derivados | Aceptado |
| 0006 | Prospectos derivados | Aceptado |
| 0007 | Títulos con categoría y catálogo de admin | Aceptado |
| 0008 | Ejemplares: número, snapshots, novedad | Aceptado |
| 0009 | Abonos: una tabla, prórrogas, parciales, cancelación y alerta | Aceptado (revisado) |
| 0010 | Cuadre del Abibono | Aceptado |
| 0011 | Minibooks | Aceptado |
| 0012 | Calendario con tres tipos de evento | Aceptado |
| 0013 | Política de fotos | Aceptado |
| 0014 | Búsqueda y dirección | Aceptado |
| 0015 | Totalizadores en Hacer inventario | Aceptado |
| 0016 | Meta de bonificación | Aceptado |
| 0017 | Antigüedad, favoritos y agregar a inventario | Aceptado (revisado) |
| 0018 | Navegación base | Aceptado (base; el diseño decide) |
| 0019 | Arquitectura en capas y pruebas | Aceptado |
| 0020 | Copias de seguridad | Aceptado |
| 0021 | Rendimiento percibido | Aceptado |
| 0022 | Borrado lógico, archivado y bloqueos de dinero entregado | Aceptado (revisado) |
| 0023 | Numeración de ejemplares | Propuesto |
| 0024 | Campañas diferidas | Aceptado |
| 0025 | Devoluciones, saldo a favor y sin reembolsos | Aceptado (revisado) |
| 0026 | Elección de ejemplares uno por uno | Aceptado |
| 0027 | Invitaciones y restablecimiento por enlace desde el panel de admin | Aceptado |
| 0028 | Pérdidas, "A responder al líder" y devolución al líder | Aceptado |
| 0029 | Estilo Notion, barra de vista única y navegación por íconos | Aceptado |
| 0030 | Formato regional y preferencias de usuario | Aceptado |
| 0031 | Tarjeta "Por entregar" en Hoy | Aceptado (revisado) |
| 0032 | Principios de diseño: minimalismo, color con propósito, anti-IA | Aceptado |
| 0034 | Design system con tokens (tamaño de letra ajustable por una variable) | Aceptado |
| 0035 | "Nuevo cliente" con ficha viva (reemplaza al asistente "+ Vender") | Aceptado |
| 0036 | Ubicación del cliente: coordenadas, selector con pin y mapa interactivo | Aceptado |
| 0037 | Avatar del cliente con emoji opcional | Aceptado |
| 0033 | Recorte, motivos de cancelación, prórroga y signo del saldo a favor | Aceptado |

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
