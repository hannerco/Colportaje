# HU-UI-07 · Etiqueta

> **Iteración 1** · **Nivel:** átomo · **Código:** `DataTag` en `src/ui/atoms/DataTag/` · **Storybook:** `Átomos/Etiqueta` · **Depende de:** HU-UI-03 · **Diseño:** ficha `Lib-Etiqueta`, fuente `Etiqueta.dc.html` · **Reglas:** BR-GEN-07 (fechas dd/mm/aaaa)

## Historia
**Como** colportor **quiero** ver datos cortos (cuota «2/4», ejemplar «#6», fecha acordada) siempre igual **para** leerlos rápido.

## Qué es (de la ficha)
Dato corto de solo lectura sobre fondo gris. No es estado ni se puede pulsar.
- **Usarlo:** cuota de un abono (fracción); número de ejemplar; fecha acordada en el encabezado del abono.
- **No usarlo:** para estados (Pastilla) ni filtros (Chip); para textos largos.

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `kind` | `tipo` | `'fraction' \| 'number' \| 'date' \| 'text'` | `'fraction'` | Cambia ícono, peso y altura |
| `value` | `texto` | según `kind`: `{ index, total }` en `fraction`; `number` en `number`; fecha de `domain/time` en `date`; `string` en `text` | — | El componente formatea: «2/4», «#6», «05/11/2026» |
| `prefix` | `prefijo` | `string` | — | Texto previo en gris claro, p. ej. «Fecha acordada» |

## Comportamiento
- **R1.** Fondo `tone`.
  - `date`: alto 28 en escritorio y 30 en móvil, radio 8, relleno 0 10 0 8, ícono `calendar`, texto `--text-secondary`.
  - Los demás: alto 24, radio 6, relleno 0 8, texto `--text-caption`.
- **R2.** Color: `text-3` en `number`; `text-2` en los demás. Peso 600 en `fraction` y 500 en los demás. Números tabulares.
- **R3.** Las fechas se formatean siempre `dd/mm/aaaa` con los helpers de `domain/time`.

## Stories
«Explorar» · Escritorio: «Fracción» (2/4), «Número» (#6), «Fecha» (Fecha acordada 05/11/2026), «Texto» (Efectivo) · Móvil: «Fracción» (3/4), «Fecha» · «Matriz».

## Accesibilidad
Es texto plano. Si la fracción va sola, el contexto la nombra («Cuota 2 de 4», con `aria-label` desde `copy/es.ts`). Contraste del gris ≥ 4,5:1.

## No incluye
Color de estado.

## Criterios de aceptación
- **CA-1.** **Dado** `kind="fraction" value={{ index: 2, total: 4 }}`, **entonces** se lee «2/4» en peso 600 y su nombre accesible es «Cuota 2 de 4».
- **CA-2.** **Dado** `kind="date"` con el 5 de noviembre de 2026 y `prefix="Fecha acordada"`, **entonces** se ve el ícono de calendario, «Fecha acordada» y «05/11/2026».
- **CA-3.** **Dado** `kind="number" value={6}`, **entonces** se ve «#6» en `text-3`.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
