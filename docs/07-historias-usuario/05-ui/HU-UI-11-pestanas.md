# HU-UI-11 · Pestañas

> **Iteración 1** · **Nivel:** molécula · **Código:** `Tabs` en `src/ui/molecules/Tabs/` · **Storybook:** `Moléculas/Pestañas` · **Depende de:** HU-UI-02 · **Diseño:** ficha `Lib-Pestanas`, fuente `Pestanas.dc.html` · **Reglas:** ADR-0029 (barra de vista), I-12 (los conteos no cambian con la búsqueda), BR-GEN-11

## Historia
**Como** colportor **quiero** cambiar entre las vistas de una lista (Todos, Deudores, Saldados) y ver cuántos hay en cada una **para** ir directo a lo que necesito.

## Qué es (de la ficha)
Cambian la vista de una misma lista (**óvalos**) o las partes de un módulo (**segmento**: Abonos de clientes | Abibonos). Cada opción puede llevar su conteo.
- **Usarlo:** óvalos para vistas de una lista; segmento para dos o tres partes hermanas de un módulo (a todo el ancho en móvil); el modo de la Ventana (lateral, centrada, página).
- **No usarlo:** para filtros combinables (Chips); para navegar entre módulos (Navegación).

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `items` | `opciones` | `{ id: string; label: string; count?: number; icon?: IconName }[]` | — | En el diseño es texto «Todos:48,…»; en código, una lista tipada |
| `value` / `onValueChange` | `activa` | `string` (id) | primera | |
| `variant` | `estilo` | `'pills' \| 'segmented'` | `'pills'` | óvalos, segmento |
| `width` | `ancho` | `number \| 'auto'` | auto (segmento: 100 %) | |
| `aria-label` | — | `string` | — (obligatoria) | Nombre del grupo, p. ej. «Vistas de clientes» |

## Comportamiento
- **R1.** Carril con fondo `tab-track`, relleno 4 y separación 2, en escritorio y en segmento. Los óvalos en móvil van sin carril, con separación 4 y desplazamiento horizontal.
- **R2.** Opción: alto 36 en escritorio y 40 en móvil; relleno horizontal 14 / 16; texto `--text-body`.
  - Activa: fondo `active-bg`, sombra `shadow-control`, texto y conteo `accent-text`, peso 600.
  - Inactiva: texto `text-2`, conteo `text-3`, peso 500.
- **R3.** Segmento: las opciones se reparten el ancho por igual.
- **R4.** En móvil, al cambiar de pestaña la activa se desplaza a la vista.
- **R5.** Los conteos se ocultan mientras cargan (`count` indefinido): nunca se muestra un 0 provisional.

## Stories
«Explorar» · Escritorio: «Óvalos» (Todos 48, Deudores 21, Saldados 9, Archivados 3), «Óvalos · otra activa», «Segmento» (Abonos de clientes 66 | Abibonos 6), «Segmento · modo de ventana» (Lateral, Centrada, Página; con íconos `window-*`) · Móvil: «Óvalos (con desplazamiento)», «Segmento · ancho completo» · «Matriz».

## Accesibilidad
- `role="tablist"`, y cada opción `role="tab"` con `aria-selected` (Radix Tabs).
- Las flechas izquierda/derecha cambian de pestaña.
- El conteo forma parte del nombre: «Deudores, 21».

## No incluye
El contenido de cada pestaña (lo pinta quien la usa).

## Criterios de aceptación
- **CA-1.** **Dado** óvalos con «Deudores» activa, **entonces** «Deudores» tiene `aria-selected="true"`, peso 600 y color acento, y su nombre accesible es «Deudores, 21».
- **CA-2.** **Dado** el foco en «Todos», **cuando** pulso flecha derecha, **entonces** el foco y la selección pasan a «Deudores» y se llama `onValueChange('debtors')`.
- **CA-3.** **Dado** un segmento de 2 opciones en móvil, **entonces** cada opción ocupa la mitad del ancho.
- **CA-4.** **Dado** `count` indefinido en una opción, **entonces** no se ve número.

## Cambios por iteración
- **2026-11-22 (#30):** el segmento reparte el ancho con una rejilla de columnas iguales que miden al menos su texto: con «Abonos de clientes 3» se ensancha en vez de desbordar y correr el fondo de la activa. Si el espacio no alcanza para partes iguales (un celular angosto), cada opción mide al menos su texto; CA-3 («cada una la mitad») vale cuando caben. Story «Moléculas/Pestañas › Segmento con texto largo».
- **2026-11-22 (#37):** el fondo de la opción activa es un indicador que se desliza a la nueva (220 ms, tokens `--motion-*`; inmediato con «Reducir movimiento»), en óvalos y segmento. Hook `useSlidingIndicator` (ui/platform). Falta subirlo a la ficha Lib-Pestanas.
- **2026-11-23 (#78):** al pasar de una página a otra con las mismas pestañas o el mismo segmento (p. ej. «Libros en físico / Ejemplares»), el indicador sale de donde estaba y se desliza hasta el nuevo, como en WhatsApp; antes aparecía de la nada. La posición se recuerda por conjunto de opciones, y también en la sesión del navegador, por si la página se recarga. Prueba: `tests/e2e/nav-indicator.spec.ts` (barra de navegación y segmento, en móvil y escritorio).

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
