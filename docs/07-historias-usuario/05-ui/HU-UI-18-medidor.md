# HU-UI-18 · Medidor

> **Iteración 1** · **Nivel:** molécula · **Código:** `Gauge` en `src/ui/molecules/Gauge/` · **Storybook:** `Moléculas/Medidor` · **Depende de:** HU-UI-02 · **Diseño:** ficha `Lib-Medidor`, fuente `Medidor.dc.html` · **Reglas:** BR-DEP-14, I-11

## Historia
**Como** colportor **quiero** ver en un semicírculo qué parte del dinero ya entregué **para** saber cómo voy sin hacer cuentas.

## Qué es (de la ficha)
Semicírculo que reparte el dinero total en Entregado, Cobrado sin entregar y Por cobrar, con el porcentaje entregado en el centro.
- **Usarlo:** en el resumen de Dinero (escritorio y hoja móvil).
- **No usarlo:** para más de tres partes; para el avance de una tarea (barra).

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `delivered` | `entregado` | `number` | — | Porcentaje |
| `collected` | `cobrado` | `number` | — | Porcentaje |
| `pending` | `porCobrar` | `number` | — | Porcentaje |
| `size` | `tamano` | `'normal' \| 'large'` | `'normal'` | 240 o 320 de ancho |
| `caption` | `etiqueta` | `string` | «entregado» (de `copy/es.ts`) | |

## Comportamiento
- **R1.** Arco de 180° en tres tramos, de izquierda a derecha: entregado (`data-delivered`), cobrado (`data-collected`) y por cobrar (`data-pending`). Separación de 1,2° entre tramos. Grosor 24 en normal y 30 en grande.
- **R2.** Si los tres no suman 100, se normalizan. Un tramo de 0 no se dibuja (ni su separación).
- **R3.** En el centro: el porcentaje entregado («52 %», `--text-figure`) y la etiqueta.
- **R4.** El cálculo de los tramos es una **función pura** (`gaugeSegments(values, size)`), con prueba de Vitest aparte.

## Stories
«Explorar» · Escritorio: «Normal» (52/14/34), «Casi todo entregado» (86/6/8), «Grande» · Móvil: «Normal», «Inicio de mes» (10/20/70) · «Todo en cero» · «Matriz».

## Accesibilidad
`role="img"` con la descripción completa: «52 % entregado; 14 % cobrado sin entregar; 34 % por cobrar». Siempre va acompañado de las tarjetas con los montos exactos.

## No incluye
La leyenda (Tarjetas de métrica, HU-UI-17).

## Criterios de aceptación
- **CA-1.** **Dado** 52/14/34, **entonces** el centro dice «52 %» y la descripción accesible es la del ejemplo.
- **CA-2.** **Dado** 0/0/100, **entonces** solo se dibuja el tramo por cobrar, sin separaciones, y el centro dice «0 %».
- **CA-3.** **Dado** 30/30/30, **entonces** cada tramo ocupa un tercio del arco (prueba de `gaugeSegments`).
- **CA-4.** **Dado** 0/0/0, **entonces** no se dibuja ningún tramo, el centro dice «0 %» y no hay división por cero.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
