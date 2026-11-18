# HU-UI-25 · Resumen de dinero

> **Iteración 1** · **Nivel:** organismo del módulo Dinero · **Código:** `MoneySummary` en `src/features/money/components/MoneySummary/` (es propio de Dinero, no va en `ui/`) · **Storybook:** `Organismos/Resumen de dinero` · **Depende de:** HU-UI-04, HU-UI-17, HU-UI-18, HU-UI-24 · **Diseño:** ficha `Lib-ResumenDinero`, fuente `ResumenDinero.dc.html`; «Exploración elegida» de Dinero · **Reglas:** BR-DEP-14, BR-CAL-08, BR-DEP-13, ADR-0046, I-11 · **Back:** HU-DIN-02 (`useMoneySummary`)

## Historia
**Como** colportor **quiero** ver primero cuánto tengo que entregar al líder, con su botón, y debajo cómo va todo mi dinero **para** saber qué hacer hoy con el dinero.

## Qué es (de la ficha)
Totalizadores del módulo Dinero.
- **Escritorio:** panel con Por entregar y sus métodos, el botón Entregar al líder, el medidor, tres tarjetas y el Dinero total.
- **Móvil:** el mismo contenido dentro de la hoja que abre el botón del encabezado (opción 3A).
- **Usarlo:** encima de las listas de Dinero (escritorio) y en la hoja «Resumen de dinero» (móvil).
- **No usarlo:** en otros módulos (cada uno arma su propio resumen con Tarjetas de métrica).

## Props
| Prop | Tipo | Notas |
|---|---|---|
| `summary` | `MoneySummary` (de `features/money`, HU-DIN-02) | Por entregar (total, efectivo, transferencia), entregado, por cobrar, Dinero total y porcentajes ya calculados |
| `onDeliver` | `() => void` | «Entregar al líder»: abre Nuevo Abibono precargado (BR-DEP-13) |
| `onInfo` | `() => void` | Ícono `info` de «Por entregar» (tooltip «Cobrado: ya lo recibiste, falta entregarlo al líder») |

El estado «sin pendiente» del diseño no es una prop: sale de `summary` (Por entregar = 0).

## Comportamiento (cambia de forma: usa `usePlatform()`)
- **R1.** Orden fijo:
  1. Por entregar: cifra protagonista `--text-figure`, con efectivo (ícono `money`) y transferencia (ícono `transfer`).
  2. Botón principal «Entregar al líder».
  3. `Gauge`.
  4. Tres `MetricCard`: Entregado, Por entregar, Por cobrar.
  5. `MetricCard` destacada: Dinero total.
- **R2.** Escritorio: panel de hasta 1100 de ancho, con el medidor y las tarjetas en fila. Móvil: contenido en columna de 358, tarjetas en forma `legend` y botón a todo el ancho.
- **R3.** Con Por entregar = 0: muestra «$0», el botón queda deshabilitado y junto a él aparece el texto «No hay dinero por entregar».

## Stories
«Explorar» · Escritorio: «Normal» ($385.000 = $280.000 efectivo + $105.000 transferencia), «Sin pendiente» · Móvil: «Normal», «Sin pendiente» · «Matriz».

## Accesibilidad
El medidor tiene su descripción y los montos están en texto. El botón deshabilitado va con una explicación cercana, enlazada con `aria-describedby`.

## No incluye
- La hoja móvil que lo contiene: la abre la pantalla de Dinero con el botón del Encabezado.
- El tooltip completo de «ⓘ» (lo pone la pantalla).

## Criterios de aceptación
- **CA-1.** **Dado** un resumen con Por entregar $385.000 ($280.000 efectivo, $105.000 transferencia), **entonces** se ven las tres cifras y el botón «Entregar al líder» habilitado.
- **CA-2.** **Dado** Por entregar = 0, **entonces** el botón tiene `aria-disabled="true"` y se lee «No hay dinero por entregar».
- **CA-3.** **Dado** porcentajes 52/14/34, **entonces** el medidor y las tarjetas muestran los mismos números y suman 100.
- **CA-4.** **Dado** móvil, **entonces** las tarjetas aparecen en forma leyenda y el botón ocupa el ancho.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
