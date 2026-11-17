# HU-UI-04 · Botón

> **Iteración 1** · **Nivel:** átomo · **Código:** `Button` en `src/ui/atoms/Button/` · **Storybook:** `Átomos/Botón` · **Depende de:** HU-UI-03 · **Diseño:** ficha `Lib-Boton`, fuente `Boton.dc.html` · **Reglas:** ADR-0050

## Historia
**Como** colportor **quiero** reconocer de un vistazo la acción principal de cada pantalla **para** no dudar qué tocar.

## Qué es (de la ficha)
Dispara una acción. Hay **un solo botón principal por pantalla**; el resto baja de jerarquía (secundario, terciario, enlace). En escritorio es una píldora de 40; en móvil el principal mide 52 y ocupa el ancho.
- **Usarlo:**
  - Principal: la acción que la pantalla existe para hacer (Nuevo cliente, Entregar al líder, Guardar).
  - Secundario: acciones de apoyo o filtros.
  - Terciario: salir sin hacer nada.
  - Flotante: crear desde una lista en móvil.
- **No usarlo:**
  - para navegar a otra pantalla (usa un enlace o una fila);
  - dos principales en la misma vista;
  - «peligro» para algo que se puede deshacer (basta Aviso + Deshacer).

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `children` | `texto` | `string` | — | Verbo en infinitivo o acción corta, sin punto final. Con `iconOnly` pasa a ser el `aria-label` |
| `variant` | `variante` | `'primary' \| 'secondary' \| 'tertiary' \| 'link' \| 'danger' \| 'fab'` | `'primary'` | primario, secundario, terciario, enlace, peligro, flotante |
| `size` | `tamano` | `'normal' \| 'compact'` | `'normal'` | Compacto para tablas, islas y barras de herramientas |
| `icon` | `icono` | `IconName` | — | A la izquierda del texto |
| `iconOnly` | `soloIcono` | `boolean` | `false` | Circular sin texto. `fab` siempre es solo ícono |
| `state` | `estado` | `'normal' \| 'disabled' \| 'loading'` | `'normal'` | |
| `width` | `ancho` | `'auto' \| 'full'` | `'auto'` | |
| `loadingText` | `textoCargando` | `string` | `copy.ui.saving` («Guardando…») | |
| `onClick`, `type`, `href` | — | | `type="button"` | Con `href` se pinta como enlace (`<a>`) con el mismo aspecto |

## Comportamiento (medidas del diseño, todas por token)
- **R1.** Alto: principal y peligro `--size-primary` (40 escritorio / 52 móvil); los demás `--size-control` (40 / 44); compacto `--size-control-sm` (32 / 36); flotante 56; enlace sin alto fijo.
- **R2.** Radio: píldora, salvo principal y peligro en móvil no compacto (`--radius-primary` = 16).
- **R3.** Colores por variante:

  | Variante | Fondo | Borde | Texto | Sombra |
  |---|---|---|---|---|
  | `primary` | `accent` | — | `on-accent` | — |
  | `secondary` | `control-bg` | `control-border` | `text` | `shadow-control` |
  | `tertiary` | transparente | — | `text-2` | — |
  | `link` | transparente | — | `accent-text`, subrayado con `underline` y separación 4 | — |
  | `danger` | `danger` | — | `on-danger` | — |
  | `fab` | `accent` | — | `on-accent` | `shadow-bar` |
- **R4.** Peso 600 en principal, peligro y flotante; 500 en los demás. Texto `--text-body`; compacto `--text-secondary`.
- **R5.** Ícono de `--size-icon`; 16 en compacto; 24 en flotante. Si `iconOnly` no trae ícono, usa `more` (y `new-customer` en `fab`).
- **R6.** `loading` reemplaza el ícono por un giro, muestra `loadingText`, pone `aria-busy` y no dispara `onClick`.
- **R7.** `disabled` usa `aria-disabled="true"` (sigue siendo enfocable), opacidad 0,4 y no dispara `onClick`.

## Stories
«Explorar» · Escritorio: «Principal» (ícono nuevo-cliente), «Secundario» (Estado, filtro), «Terciario» (Cancelar), «Enlace» (Ver ficha), «Peligro» (Eliminar), «Compacto» (Editar), «Solo ícono» (Cerrar), «Cargando» (Guardar), «Deshabilitado» (Entregar al líder) · Móvil: «Principal · ancho completo», «Secundario» (Reintentar), «Terciario» (Seguir editando), «Flotante», «Solo ícono» (Volver), «Peligro · completo», «Cargando» · «Matriz».

## Accesibilidad
- Es un `<button>` real: se activa con Enter y Espacio.
- Deshabilitado usa `aria-disabled` para que siga siendo enfocable y se pueda explicar por qué.
- Área táctil mínima de 44 × 44 en móvil.
- Contraste del texto ≥ 4,5:1 en ambos temas.

## No incluye
Grupos de botones ni menús (HU-UI-20).

## Criterios de aceptación
- **CA-1.** **Dado** `variant="primary"` en móvil, **entonces** mide 52 de alto con radio 16, y en escritorio mide 40 con forma de píldora.
- **CA-2.** **Dado** `state="loading"`, **cuando** se pulsa, **entonces** `onClick` no se llama, se ve el giro con «Guardando…» y el botón tiene `aria-busy="true"`.
- **CA-3.** **Dado** `state="disabled"`, **cuando** navego con Tab, **entonces** recibe foco, tiene `aria-disabled="true"` y Enter no dispara `onClick`.
- **CA-4.** **Dado** `iconOnly` con `children="Cerrar"` e `icon="close"`, **entonces** es circular, sin texto visible, con nombre accesible «Cerrar».
- **CA-5.** **Dado** `variant="fab"` sin ícono, **entonces** muestra `new-customer` a 24 px, mide 56 y tiene sombra `shadow-bar`.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
