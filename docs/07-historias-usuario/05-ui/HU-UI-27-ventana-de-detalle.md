# HU-UI-27 · Ventana de detalle

> **Iteración 1** · **Nivel:** organismo · **Código:** `DetailWindow` en `src/ui/organisms/DetailWindow/` · **Storybook:** `Organismos/Ventana de detalle` · **Depende de:** HU-UI-11, HU-UI-21, HU-UI-22 · **Diseño:** ficha `Lib-VentanaDetalle`, fuente `VentanaDetalle.dc.html` (reemplaza a la «Ventana» anterior, `Ventana.dc.html`, que ya no se usa); decisión «Ventana: lateral, centrada y página completa» · **Reglas:** FT-04 (la forma elegida se guarda en el dispositivo), ADR-0050

## Historia
**Como** colportor **quiero** abrir el detalle de un ejemplar, un abono, un cliente o un Abibono sin perder la lista, y elegir si lo veo al lado, centrado o como página, **para** revisar varios registros seguidos o concentrarme en uno.

## Qué es (de la ficha)
Abre el detalle de un registro sin perder la lista.
- **Escritorio:** tres formas que el usuario cambia desde la barra: **lateral** (panel de 780 a la derecha; la lista sigue visible y la fila abierta queda marcada), **centrada** (ventana de 940 sobre fondo oscurecido) y **página** (ocupa todo el contenido, con ruta de vuelta «Inventario / Psiconutrición»).
- **Móvil:** la misma pila de islas en **pantalla completa** con Volver, o en una **hoja** inferior al 80 % para una vista rápida.
- **Usarlo:**
  - lateral, para revisar varios registros seguidos (anterior / siguiente);
  - centrada, para editar o confirmar con toda la atención;
  - página, para trabajo largo o un enlace para compartir;
  - en móvil, la hoja para una vista rápida y la página para el detalle completo.
- **No usarlo:** para crear un registro con muchos pasos (pantalla de crear); para una confirmación simple (Diálogo).

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `mode` / `onModeChange` | `modo` | `'side' \| 'center' \| 'page' \| 'sheet'` | Escritorio: side, center, page. Móvil: page, sheet. Un modo que no existe en la plataforma se convierte (side o center → page en móvil; sheet → side en escritorio) |
| `title` | — | `string` | Nombre con número, p. ej. «Psiconutrición #6» |
| `breadcrumb` | — | `{ label: string; href: string }` | Ruta de vuelta en modo página («Inventario») |
| `onClose` | — | `() => void` | |
| `onPrev` / `onNext` | — | `(() => void) \| undefined` | Sin función, el botón queda deshabilitado |
| `moreActions` | — | `ReactElement` | Menú «Más acciones» |
| `children` | `contenido` | `ReactNode` | Las islas del registro (en el diseño, ejemplos de ejemplar y abono) |

El `fondo` del diseño (la lista detrás) es el contexto real de la pantalla, no una prop.

## Comportamiento (cambia de forma: usa `usePlatform()`)
- **R1.** Barra superior:
  - cerrar (o la ruta en modo página);
  - selector de forma «Lateral · Centrada · Página» (`Tabs` segmento con íconos `window-side`, `window-center`, `window-page`; solo en escritorio);
  - anterior / siguiente;
  - Más acciones.
- **R2.** Contenedores:
  - **lateral:** 780 de ancho, pegado a la derecha, alto completo, sombra `shadow-modal`;
  - **centrada:** 940 de ancho sobre `scrim`;
  - **página:** ocupa el área de contenido, con contenido de máximo 900 y sin sombra;
  - radio 20 (escritorio) / 16 (móvil).
- **R3.** Móvil:
  - **página:** pantalla completa con `PageHeader kind="detail"`;
  - **hoja:** hoja inferior al 80 % del alto, con asa, que se cierra deslizando hacia abajo o tocando el fondo.
- **R4.** **Recordar la forma:** la última forma elegida en escritorio se guarda en el dispositivo (`localStorage`, FT-04) y es la que se usa al abrir el próximo detalle. Si no hay nada guardado: lateral. En móvil se abre en página, salvo que la pantalla pida hoja.
- **R5.** Anterior / siguiente también con las teclas **J** y **K** (solo con el foco dentro de la ventana y sin un campo de texto enfocado).
- **R6.** Nunca se abre una ventana encima de otra: abrir otro registro reemplaza el contenido.
- **R7.** La acción principal (p. ej. Cobrar) va en la isla de identidad, **no** en la barra.
- **R8.** El modo página tiene URL propia (la pone la pantalla). Las demás formas se reflejan en la URL con un parámetro, para que «atrás» del navegador cierre la ventana.

## Stories
«Explorar» · Escritorio: «Lateral» (ejemplar, lista detrás con la fila marcada), «Centrada», «Página» (ruta «Inventario / Psiconutrición»), «Lateral · abono» (con Cobrar en la isla de identidad) · Móvil: «Página» (con Volver), «Hoja», «Página · abono», «Hoja · abono» · Tema oscuro (escritorio centrada y móvil hoja, por la barra de Tema) · «Matriz».

## Accesibilidad
- Lateral y hoja: `role="dialog"` sin bloquear la lista en escritorio. Centrada: `aria-modal` y foco atrapado.
- Esc cierra y devuelve el foco a la fila que lo abrió.
- El selector de forma es un grupo de radios; anterior y siguiente también funcionan con J y K.
- Página tiene su propia URL.

## No incluye
El contenido de cada detalle (las pantallas de las HU-PAN); abrir una ventana sobre otra.

## Criterios de aceptación
- **CA-1.** **Dado** escritorio en lateral, **cuando** elijo «Centrada», **entonces** la ventana pasa a 940 sobre fondo oscurecido, se llama `onModeChange('center')` y, al abrir otro detalle, se abre centrada.
- **CA-2.** **Dado** `mode="side"` en móvil, **entonces** se pinta en pantalla completa con Volver.
- **CA-3.** **Dado** la ventana centrada abierta desde una fila, **cuando** pulso Esc, **entonces** se cierra y el foco vuelve a esa fila.
- **CA-4.** **Dado** el foco dentro de la ventana y ningún campo enfocado, **cuando** pulso K, **entonces** se llama `onNext`; con `onNext` indefinido no pasa nada y el botón está deshabilitado.
- **CA-5.** **Dado** móvil en hoja, **cuando** la deslizo hacia abajo, **entonces** se cierra.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
