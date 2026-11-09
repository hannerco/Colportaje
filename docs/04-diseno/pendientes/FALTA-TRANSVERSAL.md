# Pendientes transversales

Lo que cruza varios módulos o es un módulo entero sin diseño (05/11/2026).

## Módulos sin diseño (su back se pospone, ADR-0041)
| Módulo | Qué incluye | Reglas |
|---|---|---|
| **Hoy** | Calendario del día, Por cobrar con Cobrar, libros en físico, barra de meta; lugar de "Por entregar" (OQ-40) | BR-CAL-07..09 |
| **Calendario** | Visitas (con y sin cliente), capacitaciones, recordatorios, semana desde domingo | BR-CAL-01..06 |
| **Minibooks** | Ventas, canje por saldo a favor, asignación a Abibonos, totales propios (OQ-34) | BR-MBK-01..09 |
| **Hacer inventario** | Tabla por título, totalizadores, perdidos asumidos, "Copiar resumen" | BR-GOAL-02..07 |
| **Admin** | Catálogo, ajustes, usuarios, invitaciones y restablecimiento por enlace | BR-USR-04..07, BR-TIT-* |
| **Login y Ajustes** | Inicio de sesión, formato de hora, modo administrador, cerrar sesión | BR-USR-02, BR-GEN-07 |

## Elementos sin definir
| # | Qué | Dónde aparece | Estado |
|---|---|---|---|
| FT-01 | **"Buscar ⌘K"** en el sidebar: no está definido qué busca | Sidebar de escritorio | Sin regla; fuera por ahora |
| FT-02 | Botón **"Cambiar de cuenta"** junto al nombre del usuario: no hay varias cuentas | Sidebar de escritorio | Sin regla; fuera por ahora |
| FT-03 | **Identificador visual del título** (DT-10): ícono, portada o emoji; hoy es un cuadro gris | Todas las listas de libros | Abierto; el back usa solo `image_path` |
| FT-04 | Preferencia **Centrada / Lateral / Página completa** de la ficha | Ficha en escritorio | Se guarda en el dispositivo (no en el back) |
| FT-05 | Modo **oscuro** y **móvil** de Dinero | Dinero | Sin diseñar |
