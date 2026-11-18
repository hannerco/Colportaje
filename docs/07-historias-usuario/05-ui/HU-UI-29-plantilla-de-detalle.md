# HU-UI-29 · Plantilla de detalle en islas

> **Iteración 1** · **Nivel:** plantilla · **Código:** `DetailTemplate` en `src/ui/templates/DetailTemplate/` · **Storybook:** `Plantillas/Detalle en islas` · **Depende de:** HU-UI-16, HU-UI-22, HU-UI-27 · **Diseño:** ficha `Lib-Plantilla-Detalle` · **Reglas:** ADR-0050

## Historia
**Como** colportor **quiero** que todo detalle (ejemplar, abono, cliente, Abibono) tenga el mismo orden (quién es, sus datos, su historial) **para** encontrar las cosas sin buscar.

## Qué es (de la ficha)
Esqueleto de cualquier detalle. Se apilan islas en orden fijo: **identidad, datos, historial**.
- **Escritorio:** vive dentro de la Ventana de detalle (lateral, centrada o página).
- **Móvil:** es una pantalla con Volver, o una hoja.

## Props
| Prop | Tipo | Notas |
|---|---|---|
| `window` | props de `DetailWindow` (modo, título, cerrar, anterior / siguiente, más acciones) | |
| `banner` | props de `Banner` | Resumen de la situación (p. ej. «Vencido hace 3 días») |
| `identity` | `{ avatar; title; number?; status: PillStatus; subtitle?: ReactNode; primaryAction?: ButtonProps }` | Isla 1: portada o persona, nombre con número, estado y cliente; acción principal si aplica (Cobrar) |
| `children` | `ReactNode` | Islas 2 y siguientes: datos (con `DataRow`) e historial (con `HistoryTimeline`) |

## Comportamiento
- **R1.** Orden fijo: Franja → Isla 1 identidad → Isla 2 datos → Isla 3 historial (con Deshacer en el último cambio).
- **R2.** Ancho máximo del contenido: 900 en escritorio.
- **R3.** Las acciones secundarias van en «Más acciones» (Menú), nunca como botones sueltos en la barra.
- **R4.** Isla de identidad:
  - avatar `xl` en escritorio y `lg` en móvil;
  - título `--text-title` en escritorio y `--text-heading` en móvil;
  - acción principal a todo el ancho en móvil.
- **R5.** No más de 4 islas por detalle ni más de 7 filas de dato por isla (si hay más, se divide); en desarrollo se avisa si se rompe.

## Stories
«Ejemplar · página» (1440 × 1000), «Ejemplar · móvil» (390), «Abono · lateral» (con Cobrar), «Abono · hoja móvil» · «Matriz».

## Accesibilidad
El título de la isla de identidad es el `<h1>` del detalle (o el `<h2>` dentro de la ventana lateral); el orden de lectura es el visual.

## No incluye
El contenido de cada tipo de detalle (pantallas HU-PAN).

## Criterios de aceptación
- **CA-1.** **Dado** un detalle de abono vencido, **entonces** se ve primero la Franja «Vencido hace 3 días», luego la isla de identidad con «Cobrar», los datos y el historial.
- **CA-2.** **Dado** escritorio en modo página, **entonces** el contenido no pasa de 900 de ancho.
- **CA-3.** **Dado** móvil, **entonces** «Cobrar» ocupa todo el ancho de la isla de identidad.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
