# HU-UI-17 · Tarjeta de métrica

> **Iteración 1** · **Nivel:** molécula · **Código:** `MetricCard` en `src/ui/molecules/MetricCard/` · **Storybook:** `Moléculas/Tarjeta de métrica` · **Depende de:** HU-UI-02 · **Diseño:** ficha `Lib-TarjetaMetrica`, fuente `TarjetaMetrica.dc.html` · **Reglas:** BR-DEP-14, I-11 (porcentajes enteros que suman 100), ADR-0046

## Historia
**Como** colportor **quiero** ver cada total de dinero con su color, monto y porcentaje **para** entender de un vistazo cuánto entregué, cuánto tengo por entregar y cuánto me deben.

## Qué es (de la ficha)
Un totalizador: color del grupo, etiqueta, monto y porcentaje. Tiene tres formas: tarjeta (escritorio), leyenda (debajo del medidor en móvil) y destacada (Dinero total).
- **Usarlo:** en el resumen de Dinero (Entregado, Por entregar, Por cobrar); totales de Inventario o de Hacer inventario.
- **No usarlo:** para un dato de un registro (Fila de dato).

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `label` | `etiqueta` | `string` | |
| `amount` | `monto` | `COP` | Se formatea con `formatCOP` |
| `percent` | `porcentaje` | `number` (entero 0–100) | Se muestra «52 %» (con espacio antes de %) |
| `tone` | `tono` | `'delivered' \| 'collected' \| 'pending' \| 'total'` | Color del grupo: `data-delivered`, `data-collected`, `data-pending`, `text` |
| `shape` | `forma` | `'card' \| 'legend' \| 'featured'` | |
| `width` | `ancho` | `number \| 'auto'` | Tarjeta 240; destacada 100 %; leyenda automática |

## Comportamiento
- **R1.** Cuadro de color del grupo (el mismo del Medidor), etiqueta, monto y barra de proporción con su porcentaje.
- **R2.** `legend` en móvil va centrada en columna (etiqueta `--text-secondary` en `text-2`). En escritorio, la etiqueta y el monto van en fila (`--text-body`, peso 600).
- **R3.** `featured` (Dinero total) ocupa el ancho y usa el tono `total`.
- **R4.** El orden lo pone quien la usa, siempre Entregado, Por entregar, Por cobrar.

## Stories
«Explorar» · Escritorio: «Tarjeta · entregado» ($1.420.000, 52 %), «Tarjeta · por entregar» ($385.000, 14 %), «Tarjeta · por cobrar» ($935.000, 34 %), «Leyenda», «Destacada» (Dinero total $2.740.000, 100 %) · Móvil: «Leyenda · entregado», «Leyenda · cobrado», «Leyenda · por cobrar», «Destacada» · «Matriz».

## Accesibilidad
El cuadro de color es decorativo: la etiqueta nombra el grupo. Montos con números tabulares.

## No incluye
El cálculo de montos y porcentajes (HU-DIN-02 lo entrega ya redondeado, I-11).

## Criterios de aceptación
- **CA-1.** **Dado** `tone="collected" amount={385000} percent={14}`, **entonces** se ve el cuadro `data-collected`, «$385.000» y «14 %» con su barra al 14 %.
- **CA-2.** **Dado** `shape="legend"` en móvil, **entonces** la etiqueta y el monto van centrados uno encima del otro.
- **CA-3.** **Dado** Tema = Oscuro, **entonces** el cuadro de «entregado» usa `#A9C8EA`.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
