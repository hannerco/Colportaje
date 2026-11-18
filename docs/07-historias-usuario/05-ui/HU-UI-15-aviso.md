# HU-UI-15 · Aviso (mensaje temporal con Deshacer)

> **Iteración 1** · **Nivel:** molécula · **Código:** `Toast`, `ToastProvider` y `useToast()` en `src/ui/molecules/Toast/` · **Storybook:** `Moléculas/Aviso` · **Depende de:** HU-UI-04 · **Diseño:** ficha `Lib-Aviso`, fuente `Aviso.dc.html` · **Reglas:** BR-COPY-11, BR-COPY-17, `business-config` `undo.toastSeconds`, I-03, I-34

## Historia
**Como** colportor **quiero** ver confirmado lo que acabo de hacer y poder deshacerlo unos segundos **para** corregir un toque equivocado sin pasos extra.

## Qué es (de la ficha)
Mensaje breve y temporal que confirma lo que acaba de pasar y deja deshacerlo. Aparece abajo a la izquierda en escritorio y sobre la barra inferior en móvil, y se va solo.
- **Usarlo:** después de cobrar, entregar, archivar o eliminar; para errores de red recuperables, con «Reintentar».
- **No usarlo:** para decisiones que requieren respuesta (Diálogo); para estados permanentes (Franja).

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `message` | `mensaje` | `string` | — | Qué pasó, en pasado |
| `action` | `accion` | `{ label: string; onAction: () => void }` | — | Sin `action` no hay botón |
| `tone` | `tipo` | `'info' \| 'success' \| 'error'` | `'success'` | Cambia el ícono (`check` / `alert`; info sin ícono) |
| `durationMs` | — | `number` | `undo.toastSeconds × 1000` | Viene de la configuración; ver I-34 |
| `width` | `ancho` | `number \| 'auto'` | 380 en escritorio, 100 % en móvil | |

`useToast().show({...})` lo muestra desde cualquier pantalla; `ToastProvider` va en la raíz de la app.

## Comportamiento
- **R1.** Fondo invertido `toast` y texto `on-toast`. Ícono `toast-ok` (éxito) o `toast-bad` (error). Acción en `toast-link`. Alto 48 en escritorio y 52 en móvil, radio 12 / 14, sombra `shadow-bar`.
- **R2.** **Un aviso a la vez:** uno nuevo reemplaza al anterior.
- **R3.** Se cierra solo a los `durationMs`. El tiempo se pausa mientras tiene el foco o el puntero encima.
- **R4.** Escritorio: abajo a la izquierda del área de contenido. Móvil: encima de la barra inferior (o del borde inferior si no hay barra).
- **R5.** Pulsar la acción la ejecuta una sola vez y cierra el aviso.

## Stories
«Explorar» · Escritorio: «Éxito» (Abono cobrado · Deshacer), «Información» (Cliente archivado), «Error» (No se pudo guardar · Reintentar) · Móvil: «Éxito», «Error» · «Reemplazo» (dos avisos seguidos: solo queda el segundo) · «Matriz».

## Accesibilidad
- `role="status"` y `aria-live="polite"`: se anuncia sin mover el foco.
- Permanece mientras tenga el foco o el puntero encima.
- La acción se alcanza con teclado.

## No incluye
Pilas de varios avisos.

## Criterios de aceptación
- **CA-1.** **Dado** `show({ message: 'Abono cobrado', action: Deshacer })` con `undo.toastSeconds = 6`, **cuando** pasan 6 s sin interacción, **entonces** el aviso desaparece y `onAction` no se llamó.
- **CA-2.** **Dado** un aviso visible, **cuando** pulso «Deshacer», **entonces** `onAction` se llama una vez y el aviso se cierra.
- **CA-3.** **Dado** un aviso visible, **cuando** se muestra otro, **entonces** solo queda el nuevo.
- **CA-4.** **Dado** el puntero sobre el aviso a los 5 s, **cuando** pasan 3 s más, **entonces** sigue visible; al salir el puntero, el tiempo continúa.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
