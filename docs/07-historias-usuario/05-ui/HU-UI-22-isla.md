# HU-UI-22 · Isla

> **Iteración 1** · **Nivel:** organismo · **Código:** `Island` en `src/ui/organisms/Island/` · **Storybook:** `Organismos/Isla` · **Depende de:** HU-UI-13, HU-UI-19 · **Diseño:** ficha `Lib-Isla`, fuente `Isla.dc.html` · **Reglas:** ADR-0050

## Historia
**Como** colportor **quiero** que el detalle de un registro esté agrupado en bloques claros (quién es, sus datos, su historial) **para** encontrar cada cosa siempre en el mismo lugar.

## Qué es (de la ficha)
Tarjeta que agrupa los datos de un detalle. Un detalle se arma apilando islas: identidad, datos, historial. **En código recibe cualquier contenido.**
- **Usarlo:** en el detalle de ejemplar, abono, cliente y Abibono; en bloques de Ajustes.
- **No usarlo:** para listas largas a pantalla completa; islas dentro de islas.

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `title` | `titulo` | `string` | Sin título no hay encabezado |
| `icon` | `icono` | `IconName` | Junto al título |
| `action` | `accion` | `{ label; onClick \| href }` | Enlace a la derecha del título (p. ej. «Agregar») |
| `children` | `contenido` | `ReactNode` | En el diseño eran ejemplos fijos (datos, abono, historial, libre) |

## Comportamiento
- **R1.** Fondo `card`, borde `card-border`, sombra `shadow-card`, radio 18 en escritorio y 16 en móvil, relleno 18 24 10 en escritorio y 14 16 8 en móvil.
- **R2.** Título `--text-heading` con su ícono en `text-2`; la acción es un `Button variant="link" size="compact"`.

## Stories
«Explorar» · Escritorio: «Datos» (Precio y fechas, con 3 Filas de dato), «Historial» (con Historial), «Contenido libre» (Notas, ícono nota, «Agregar») · Móvil: «Datos», «Historial» · «Matriz».

## Accesibilidad
`<section>` con nombre igual al título (`aria-labelledby`). El orden de lectura es igual al visual.

## No incluye
El orden de las islas de un detalle (Plantilla de detalle, HU-UI-29).

## Criterios de aceptación
- **CA-1.** **Dado** `title="Historial"`, **entonces** un lector anuncia la sección «Historial».
- **CA-2.** **Dado** una isla sin `title`, **entonces** no hay encabezado ni hueco superior extra.
- **CA-3.** **Dado** `action={{ label: 'Agregar' }}`, **cuando** la pulso, **entonces** se llama su `onClick`.

## Cambios por iteración
- **2026-11-22 (#26):** el contenido de la Isla va en un cuerpo que separa sus bloques (campos, listas, mapa) con el token `--island-gap` (14, como en CrearV5 del lienzo). Antes los campos quedaban pegados en Nuevo cliente, la ficha y el editor de Abibonos. Story «Organismos/Isla › Campos». Falta subirlo a la ficha Lib-Isla.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
