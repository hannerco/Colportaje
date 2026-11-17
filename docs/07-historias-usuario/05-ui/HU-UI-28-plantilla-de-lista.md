# HU-UI-28 · Plantilla de lista y Barra de vista

> **Iteración 1** · **Nivel:** plantilla · **Código:** `ListTemplate` en `src/ui/templates/ListTemplate/` y `ViewBar` en `src/ui/organisms/ViewBar/` · **Storybook:** `Plantillas/Lista` y `Organismos/Barra de vista` · **Depende de:** HU-UI-06, HU-UI-11, HU-UI-12, HU-UI-14, HU-UI-15, HU-UI-20, HU-UI-21, HU-UI-23, HU-UI-26 · **Diseño:** ficha `Lib-Plantilla-Lista`; decisión «Orden y chips · chip de orden con acento + sentido segmentado» · **Reglas:** ADR-0029 (un único `ViewBar`), ADR-0050 §8, CONVENTIONS §4, BR-GEN-08, BR-GEN-14

## Historia
**Como** colportor **quiero** que Clientes, Inventario y Dinero tengan la misma forma (título, vistas, búsqueda, filtros y lista) **para** aprender una vez y usarla en todos los módulos.

## Qué es (de la ficha)
Esqueleto de toda pantalla raíz con una lista (Clientes, Inventario, Dinero), armado solo con componentes de la biblioteca: si cambia uno, cambian esta plantilla y todas las pantallas que la siguen.

Componentes, en orden:
1. `AppNav`
2. `PageHeader`
3. `Tabs` (vistas)
4. `SearchBox` + botones de Filtro y Orden + chips de filtros activos: esto es la **Barra de vista** (`ViewBar`)
5. `ListTable` con sus filas
6. `Toast`

## Props
**`ViewBar`** (composición de la barra de vista; ADR-0029 pide un único componente):

| Prop | Tipo | Notas |
|---|---|---|
| `views` | props de `Tabs` | Vistas de la lista |
| `search` | props de `SearchBox` | |
| `filters` | `{ label: string; activeChips: { id; label }[]; onOpen; onRemove(id); onClear }` | Botón «Estado»/«Método» y chips activos |
| `sort` | `{ label: string; options; value; direction: 'asc' \| 'desc'; onChange }` | Chip de orden en acento + sentido segmentado (decisión «Orden y chips») |

**`ListTemplate`**:

| Prop | Tipo | Notas |
|---|---|---|
| `nav` | props de `AppNav` | |
| `header` | props de `PageHeader` (`kind="root"`) | |
| `viewBar` | props de `ViewBar` | |
| `banner` | `ReactNode` | Franja de sin conexión |
| `state` | `'ready' \| 'loading' \| 'empty' \| 'no-results' \| 'offline-empty' \| 'error'` | Cuál de los estados de `EmptyState` se pinta en lugar de la lista |
| `emptyState` | props de `EmptyState` | Textos del estado actual |
| `children` | `ReactNode` | La `ListTable` con sus filas |
| `detail` | `ReactNode` | La `DetailWindow` abierta, si la hay |

## Comportamiento
- **R1.** Orden fijo: encabezado → pestañas → buscador y filtros → lista.
- **R2.** Un solo botón principal (escritorio) o botón flotante (móvil).
- **R3.** La lista ocupa el resto del alto. En escritorio el encabezado y la barra de vista **no se desplazan**.
- **R4.** Estados de la lista con `EmptyState`: vacío, sin resultados, sin conexión, error y cargando. Sin conexión con datos guardados: se ve la lista y, arriba, la Franja de sin conexión.
- **R5.** Al abrir una fila: `DetailWindow` en escritorio (la fila queda marcada) y pantalla de detalle (o hoja) en móvil.
- **R6.** `ViewBar` en móvil:
  - pestañas desplazables;
  - buscador blanco de 52 con el botón de filtros dentro;
  - filtros y orden en una hoja «Filtrar / Ordenar» con dos pestañas (pantallas «Estado-filtrar» y «Estado-ordenar»);
  - chips activos en una sola fila; si no caben, se resumen en «Filtros (3)».
- **R7.** `ViewBar` en escritorio: pestañas, buscador de 300, botón «Estado» con su menú de filtros, chip de orden y «Limpiar» cuando hay filtros activos.

## Stories
`Plantillas/Lista`: «Escritorio» (1440 × 900, clientes de ejemplo), «Móvil» (390 × 844), «Con fila abierta», «Cargando», «Vacía», «Sin resultados», «Sin conexión con datos», «Sin conexión sin datos» · `Organismos/Barra de vista`: «Sin filtros», «Con filtros y orden activos», «Hoja Filtrar», «Hoja Ordenar» · «Matriz».

## Accesibilidad
La barra de vista es un `region` con nombre («Vista de la lista»). El número de resultados se anuncia al cambiar filtros o búsqueda. El foco va al primer elemento de la lista al cambiar de pestaña con el teclado.

## No incluye
Los datos ni los criterios de filtro y orden de cada módulo (los dan las pantallas con sus HU de back).

## Criterios de aceptación
- **CA-1.** **Dado** escritorio con 100 filas, **cuando** desplazo la lista, **entonces** el encabezado y la barra de vista quedan fijos.
- **CA-2.** **Dado** `state="no-results"`, **entonces** en lugar de la lista se ve `EmptyState` «Sin resultados» con «Quitar filtros», que llama `filters.onClear`.
- **CA-3.** **Dado** dos filtros activos en móvil, **entonces** se ven sus chips y, al quitar uno, se llama `onRemove(id)`.
- **CA-4.** **Dado** el orden «Saldo pendiente» descendente, **entonces** el chip de orden se ve en acento con el sentido marcado, y cambiar el sentido llama `onChange` con `direction: 'asc'`.
- **CA-5.** **Dado** una fila abierta en escritorio, **entonces** la `DetailWindow` se ve y la fila tiene `aria-current`.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
