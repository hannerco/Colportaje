# HU-UI-16 · Franja

> **Iteración 1** · **Nivel:** molécula · **Código:** `Banner` en `src/ui/molecules/Banner/` · **Storybook:** `Moléculas/Franja` · **Depende de:** HU-UI-03 · **Diseño:** ficha `Lib-Franja`, fuente `Franja.dc.html` · **Reglas:** BR-GEN-08 (sin conexión)

## Historia
**Como** colportor **quiero** ver en una línea la situación de un registro («Vencido hace 3 días») o que no tengo conexión **para** saber el contexto antes de actuar.

## Qué es (de la ficha)
Aviso fijo dentro de una pantalla o isla: sin conexión, «Vencido hace 3 días», «A tiempo». Explica el contexto del registro y puede llevar una acción.
- **Usarlo:** en el encabezado de un abono o ejemplar para resumir su situación; arriba de la pantalla cuando no hay conexión.
- **No usarlo:** para confirmar una acción (Aviso); para el estado en sí (la Pastilla ya lo dice).

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `tone` | `tipo` | `'offline' \| 'overdue' \| 'collected' \| 'delivered' \| 'neutral'` | `'offline'` | Tono e ícono |
| `children` | `texto` | `string` | texto de `offline` desde `copy/es.ts` | Lo más corto posible (2–5 palabras) |
| `action` | `accion` | `{ label: string; onAction: () => void }` | — | Enlace subrayado |

| `tone` | Borde | Fondo | Texto | Ícono |
|---|---|---|---|---|
| `offline` | `row-line` | `tone` | `text-2` | `offline` |
| `overdue` | `bad-border` | `bad-bg` | `bad` | `alert` |
| `collected` | `ok-border` | `ok-bg` | `ok` | `collected` |
| `delivered` | `accent-border` | `accent-bg` | `accent-text` | `delivered` |
| `neutral` | `row-line` | `tone` | `text-2` | `scheduled` |

## Comportamiento
- **R1.** Alto 40 en escritorio y 44 en móvil, ancho completo, texto `--text-secondary`.
- **R2.** **Texto de sin conexión:** «Sin conexión: puedes consultar, pero no registrar» (BR-GEN-08). El ejemplo del diseño («Los cambios se guardan en este dispositivo») describe la escritura sin conexión de la **fase 2** y no se usa (I-35).
- **R3.** No se apilan dos franjas: si hay que mostrar «sin conexión» y otra, la de sin conexión va arriba de la pantalla y la otra dentro de su isla.

## Stories
«Explorar» · Escritorio: «Sin conexión», «Vencido» (Vencido hace 3 días · Cobrar), «Cobrado» (05/11/2026 · 3 días tarde), «Entregado» (A tiempo), «Neutro» (Faltan 10 días) · Móvil: «Sin conexión», «Vencido», «Neutro» (Recibido hace 10 días) · «Matriz».

## Accesibilidad
`offline` y `overdue` usan `role="status"`; las demás son una nota. El color va siempre con ícono y texto.

## No incluye
El cálculo de «hace 3 días» (lo entrega el modelo de vista de cada pantalla).

## Criterios de aceptación
- **CA-1.** **Dado** `tone="offline"` sin texto, **entonces** dice «Sin conexión: puedes consultar, pero no registrar» con el ícono `offline` y `role="status"`.
- **CA-2.** **Dado** `tone="overdue"` con acción «Cobrar», **cuando** pulso «Cobrar», **entonces** se llama `onAction`.
- **CA-3.** **Dado** `tone="delivered"`, **entonces** usa fondo `accent-bg` y no tiene `role="status"`.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
