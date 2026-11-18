# HU-UI-24 · Diálogo

> **Iteración 1** · **Nivel:** organismo · **Código:** `ConfirmDialog` en `src/ui/organisms/ConfirmDialog/` · **Storybook:** `Organismos/Diálogo` · **Depende de:** HU-UI-04 · **Diseño:** ficha `Lib-Dialogo`, fuente `Dialogo.dc.html` · **Reglas:** ADR-0050 (Radix AlertDialog), BR-CUS-14 (descartar)

## Historia
**Como** colportor **quiero** que la app me pregunte antes de algo que no se puede deshacer **para** no perder datos por un toque.

## Qué es (de la ficha)
Pide una decisión antes de seguir. En escritorio es una ventana centrada de 440 sobre fondo oscurecido; en móvil, una hoja inferior con los botones a todo el ancho.
- **Usarlo:** para descartar cambios; para acciones destructivas sin Deshacer (eliminar).
- **No usarlo:** para confirmar algo que se puede deshacer (Aviso); para formularios largos (Ventana de detalle o una pantalla).

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `open` / `onOpenChange` | — | `boolean` | |
| `tone` | `tipo` | `'confirm' \| 'danger'` | Peligro pinta la acción en rojo |
| `title` | `titulo` | `string` | Pregunta |
| `message` | `mensaje` | `ReactNode` | Qué pasa si confirma, en una o dos líneas |
| `confirmLabel` | `primario` | `string` | Repite el verbo del título |
| `cancelLabel` | `secundario` | `string` | |
| `onConfirm` | — | `() => void \| Promise<void>` | Mientras la promesa está pendiente, el botón queda en `loading` |
| `children` | — | `ReactNode` | Contenido opcional entre el mensaje y los botones (p. ej. un Campo de nota obligatoria) |

## Comportamiento (cambia de forma: usa `usePlatform()`)
- **R1.** Escritorio: ventana de 440 de ancho, radio 20, relleno 24, sombra `shadow-modal` y fondo `scrim`. Botones en fila: terciario + principal (o peligro).
- **R2.** Móvil: hoja inferior con asa, radio 28 arriba y relleno 10 20 28. Botones en columna a todo el ancho, principal arriba y terciario debajo.
- **R3.** Con `onConfirm` asíncrono: el botón muestra «cargando», no se puede cerrar con Esc ni tocando el fondo mientras espera, y se cierra al terminar bien. Si falla, queda abierto y quien lo usa muestra el error.

## Stories
«Explorar» · Escritorio: «Confirmación» (¿Descartar el cliente? · Descartar / Seguir editando), «Peligro» (¿Eliminar el ejemplar #6? · Eliminar / Cancelar) · Móvil: «Confirmación (hoja)» · «Con nota obligatoria» (Campo dentro) · «Confirmando…» (estado de carga) · «Matriz».

## Accesibilidad
- `role="alertdialog"`, `aria-modal` y título enlazado.
- Foco atrapado dentro; Esc cierra; al cerrar, el foco vuelve al botón que lo abrió.
- En peligro, el foco inicial va a la acción segura (cancelar).

## No incluye
Los textos de cada caso (los pone la pantalla desde `copy/es.ts`). Nada de «Aceptar» / «Cancelar» genéricos.

## Criterios de aceptación
- **CA-1.** **Dado** un diálogo de peligro abierto con el teclado, **entonces** el foco inicial está en «Cancelar».
- **CA-2.** **Dado** el diálogo abierto, **cuando** pulso Esc, **entonces** se cierra y el foco vuelve al botón que lo abrió.
- **CA-3.** **Dado** `onConfirm` que tarda 1 s, **cuando** confirmo, **entonces** el botón muestra el giro y Esc no cierra hasta que termine.
- **CA-4.** **Dado** móvil, **entonces** los botones ocupan todo el ancho, con el principal arriba.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
