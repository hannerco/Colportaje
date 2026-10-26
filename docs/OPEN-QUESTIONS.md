# Preguntas abiertas y supuestos

Todo lo que **no** quedó decidido explícitamente por el dueño. Cada ítem trae el supuesto por defecto que se debe usar **mientras no se confirme**. Al resolver uno: moverlo a `DECISION-LOG.md`, actualizar la regla correspondiente y borrarlo de aquí.

Leyenda: 🟡 supuesto razonable (seguir) · 🔴 necesita confirmación antes de implementar · 🔵 se resuelve con el diseño.

## Producto / reglas

| ID | Tema | Supuesto vigente | Estado |
|---|---|---|---|
| OQ-01 | **Qué significa "Recientes"** en Clientes | Orden por fecha de creación descendente. Alternativa: última actividad (venta o abono) | 🟡 |
| OQ-02 | **Ubicación de la barra de meta** | En **Hoy**; el dueño dijo "sujeto a cambios, puede que no la muestre si no me gusta". Pedir 2 propuestas al diseño | 🔵 |
| OQ-03 | **Representación de "Con novedad"** | Marcador con nota; resolución Apareció / Perdido / Corregido. El dueño dijo: "cualquier cosa te aviso en el momento" | 🔵 |
| OQ-04 | **Número máximo de favoritos** | 6 (editable por el admin vía `max_favorites`) | 🟡 |
| OQ-05 | **¿`received_at` editable?** | No, en v1 (es automático). Puede ser necesario si se registran libros recibidos días atrás | 🟡 |
| OQ-06 | **Hora de "inicio del día"** para recordatorios | 07:00 America/Bogota | 🟡 |
| OQ-07 | **Tope del saldo a favor aplicado a minibooks** | El monto aplicado no puede exceder el saldo a favor vigente | 🟡 |
| OQ-08 | **¿Cuántas fotos de recibo en un Abibono?** | Una o más; mínimo una para confirmar | 🟡 |
| OQ-09 | **Imprimir/compartir "Hacer inventario"** | Vista imprimible (CSS de impresión) + botón compartir/copiar; sin PDF generado en servidor | 🟡 |
| OQ-10 | **Borrado de cliente con ejemplares vendidos** | Prohibido hasta devolver los ejemplares (BR-CUS-09). El dueño dijo "borrado lógico con confirmación" | 🟡 |
| OQ-11 | **Entregas parciales de un abono entre Abibonos** | No: un abono va completo en un solo Abibono (BR-DEP-08) | 🟡 |
| OQ-12 | **Ejemplares "perdidos": ¿afectan la cuenta con el líder?** | Solo se registran (columna "Perdidos"); sin efecto monetario automático. Confirmar con el dueño cómo se factura una pérdida | 🔴 |
| OQ-13 | **Nombres definitivos** (Abibono, Títulos, Ejemplares, "Hoy") | Usar los de `GLOSSARY.md` (🔶). El dueño dijo: "todos los nombres… vamos a discutirlos" | 🔵 |
| OQ-14 | **Ordenamientos exactos** de las listas de Ejemplares | Recibido, vendido, título, precio acordado, diferencia | 🟡 |
| OQ-15 | **Visibilidad de cifras de dinero en Dinero y ficha de cliente** | Visibles (necesarias para operar); ocultas en pantallas de uso diario fuera de esas | 🔵 |
| OQ-16 | **Qué pasa con el abono `scheduled` si se devuelve el libro** | Se mantiene (el dueño pidió conservar la información); el colportor puede borrarlo manualmente | 🟡 |

## Técnicas

| ID | Tema | Supuesto vigente | Estado |
|---|---|---|---|
| OQ-20 | **Numeración de ejemplares en offline (F2)** | En F1 la asigna el servidor (función transaccional). En F2 hay que definir número provisional + reconciliación, o derivarlo (p. ej. por orden de `received_at`) | 🔴 (solo para F2) |
| OQ-21 | **Librería de búsqueda** (Fuse.js vs MiniSearch) | Elegir al scaffolding con la prueba RQ-CUS-04 | 🟡 |
| OQ-22 | **Librería UI** (Tailwind + shadcn/Radix) | Propuesta; no discutida con el dueño | 🟡 |
| OQ-23 | **Captura de fotos**: `<input capture>` vs. getUserMedia | `<input type=file accept=image/* capture>` por simplicidad y compatibilidad iOS | 🟡 |
| OQ-24 | **Escritura admin de invitaciones**: solo instrucciones o formulario en app | Solo instrucciones (dueño: "deja instrucciones de cómo invitar"). Un formulario con `service_role` sería F2 | 🟡 |
| OQ-25 | **Dominio propio / nombre comercial / marca** | Sin definir; usar nombre de trabajo "Colportaje". Pendiente para ícono PWA, nombre en el manifest | 🔴 |
| OQ-26 | **Aviso de tratamiento de datos (Ley 1581)** | Sin redactar | 🔴 |
| OQ-27 | **Región de Supabase** | `sa-east-1` (São Paulo). Verificar disponibilidad en el plan gratuito al crear el proyecto | 🟡 |
| OQ-28 | **Plan gratuito de Supabase**: pausa tras 7 días sin actividad y sin backups | Backups propios semanales; con uso diario no se pausa | 🟡 |
| OQ-29 | **Vercel Hobby es "no comercial"** | Aceptado mientras la app no se monetice; migrar a otro host o plan si cambia | 🟡 |

## Diferido (backlog; el dueño pidió dejarlo anotado)
- **Campañas**: tabla, filtros por campaña, metas por campaña, apartado de Metas ampliado ("en la nueva etapa tendrá muchas cosas").
- Cortes históricos de "Hacer inventario".
- Reembolsos a clientes ("no sé de dónde sale esa plata, mejor obviar").
- Seguimiento/recordatorio de personas interesadas en minibooks (la nota basta en v1).
- Vista de líder y transferencia de libros (F3).
- Posible eliminación de totalizadores (el dueño lo mencionó).
- Migración de fotos a Cloudflare R2.
- Vista de clientes vencidos (propuesta).
