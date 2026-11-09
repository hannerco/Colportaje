# Inventario: lo que falta por diseñar

Reglas de Inventario que el back cubre (ADR-0041) y que no tienen pantalla en el diseño del 05/11/2026.

| # | Qué falta | Dónde iría | Regla |
|---|---|---|---|
| FI-01 | **Acciones de un ejemplar vendido** ("Más acciones": devolver a inventario con motivo) | Inventario · Ejemplar | BR-COPY-09, F-08 |
| FI-02 | **Deshacer desde el historial** de Apareció y Perdido (como ya existe para "Devuelto al líder") | Inventario · Ejemplar | BR-COPY-11 |
| FI-03 | Campo de **nota opcional** al resolver una novedad | Por resolver | BR-COPY-11 |
| FI-04 | **Nota obligatoria** al deshacer "Devuelto al líder" | Inventario · Ejemplar | BR-COPY-16 |
| FI-05 | Editar **"Recibido el"** en escritorio | Inventario · Ejemplar | BR-COPY-04 |
| FI-06 | Error al confirmar un lote de **Agregar** (no se creó nada; reintentar) | Agregar · Resumen | BR-COPY-02, AF-91 |
| FI-07 | Estados de Inventario: cargando, vacío (sin libros en físico), sin conexión, sin resultados al buscar | Libros en físico, Ejemplares, Agregar | CONVENTIONS §4 |
| FI-08 | Filtro **Estado** de Ejemplares abierto (opciones En físico, Vendido, Con novedad, Perdido, Devuelto al líder) | Ejemplares | BR-COPY-12 |
| FI-09 | Detalle de un ejemplar de **minibook** (no está en la lista Ejemplares; se llega desde el título en Libros en físico) | Libros en físico | BR-COPY-12, BR-INV-03 |
