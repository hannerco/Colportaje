# HU-UI-21 · Encabezado

> **Iteración 1** · **Nivel:** organismo · **Código:** `PageHeader` en `src/ui/organisms/PageHeader/` · **Storybook:** `Organismos/Encabezado` · **Depende de:** HU-UI-04 · **Diseño:** ficha `Lib-Encabezado`, fuente `Encabezado.dc.html` · **Reglas:** BR-GEN-10 (una acción principal), BR-GEN-12

## Historia
**Como** colportor **quiero** saber siempre en qué pantalla estoy, cuántos registros hay y cuál es la acción principal **para** orientarme sin pensar.

## Qué es (de la ficha)
Parte superior de una pantalla. **Raíz:** título grande con conteo y la acción principal (o el botón de resumen en Dinero móvil). **Detalle:** volver, título y más acciones.
- **Usarlo:** en toda pantalla raíz (Clientes, Inventario, Dinero) y en todo detalle.
- **No usarlo:** dentro de una isla (la isla tiene su propio título).

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `kind` | `tipo` | `'root' \| 'detail'` | |
| `title` | `titulo` | `string` | Único `<h1>` de la pantalla |
| `count` | `conteo` | `number` | Solo en raíz, en gris |
| `primaryAction` | `accion` + `accionIcono` | `{ label; icon?: IconName; onClick; disabled? }` | Botón principal a la derecha, **solo en escritorio** (en móvil la acción va en el botón flotante) |
| `summary` | `resumen` | `{ label: string; amount: COP; onOpen: () => void }` | Botón que abre la hoja de resumen, p. ej. «Por entregar $385.000» (Dinero) |
| `back` | `anterior` | `{ label: string; href \| onClick }` | Solo en detalle; el nombre accesible es «Volver a Clientes» |
| `moreActions` | — | `ReactElement` | Solo en detalle: un `Menu` con disparador `more` |

## Comportamiento
- **R1.** Raíz: alto 56 en escritorio y 52 en móvil. Título `--text-title` (32 / 28) y conteo en `text-3`. Botón principal a la derecha en escritorio.
- **R2.** Con `summary` no se muestra `primaryAction`. El botón de resumen mide 36 / 40, con el monto y el ícono `expand`.
- **R3.** Detalle: botón volver (`back`, solo ícono en móvil y con texto en escritorio), título centrado en móvil y «Más acciones» a la derecha.
- **R4.** En escritorio el encabezado no se desplaza con la lista (lo fija la Plantilla de lista).

## Stories
«Explorar» · Escritorio: «Raíz» (Clientes 48, Nuevo cliente), «Raíz con resumen» (Dinero, Por entregar $385.000), «Detalle» (María Camila Henao) · Móvil: «Raíz», «Raíz con resumen», «Detalle» (Psiconutrición #6, vuelve a Inventario) · «Matriz».

## Accesibilidad
Un solo `<h1>` por pantalla: el título. «Volver» dice a dónde: «Volver a Clientes».

## No incluye
Más de una acción principal.

## Criterios de aceptación
- **CA-1.** **Dado** `kind="root"` con `primaryAction` en móvil, **entonces** el botón no se pinta (lo cubre el botón flotante de la Navegación).
- **CA-2.** **Dado** `summary` en Dinero, **cuando** lo pulso, **entonces** se llama `onOpen` y se ve «Por entregar $385.000».
- **CA-3.** **Dado** `kind="detail"` con `back.label = 'Inventario'`, **entonces** el botón volver tiene nombre accesible «Volver a Inventario».

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
