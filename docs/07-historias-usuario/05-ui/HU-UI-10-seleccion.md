# HU-UI-10 · Selección (casilla, radio e interruptor)

> **Iteración 1** · **Nivel:** átomo · **Código:** `Choice` en `src/ui/atoms/Choice/` (+ `ChoiceGroup` para radios) · **Storybook:** `Átomos/Selección` · **Depende de:** HU-UI-03 · **Diseño:** ficha `Lib-Seleccion`, fuente `Seleccion.dc.html` · **Reglas:** ADR-0050 (Radix Checkbox, RadioGroup y Switch)

## Historia
**Como** colportor **quiero** marcar opciones con controles claros y grandes **para** no equivocarme al tocar en el celular.

## Qué es (de la ficha)
Controles para elegir: casilla (varias opciones), radio (una entre varias) e interruptor (activar algo con efecto inmediato).
- **Usarlo:**
  - casilla: marcar varios elementos o aceptar algo;
  - radio: método de pago, una sola opción visible;
  - interruptor: preferencias con efecto inmediato.
- **No usarlo:**
  - interruptor para algo que requiere Guardar después;
  - radio con más de 5 opciones (Campo selección).

> El texto de ejemplo del diseño, «Correr también los siguientes», es una función **que ya no existe** (I-08, ADR-0047). Las stories usan los otros ejemplos de la ficha.

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `kind` | `tipo` | `'checkbox' \| 'radio' \| 'switch'` | `'checkbox'` | |
| `checked` / `onCheckedChange` | `marcado` | `boolean` | `false` | En radio lo maneja `ChoiceGroup` |
| `disabled` | `deshabilitado` | `boolean` | `false` | |
| `label` | `texto` | `string` | — (obligatoria) | En positivo («Recordarme», no «No recordarme») |
| `description` | `descripcion` | `string` | — | Aclaración debajo, en gris |
| `ChoiceGroup`: `legend`, `value`, `onValueChange` | — | | | `<fieldset>` con leyenda para radios |

## Comportamiento
- **R1.** Control de 18 en escritorio y 22 en móvil; interruptor de 36 × 22 y 44 × 26. Toda la fila es tocable, con alto mínimo de 32 en escritorio y 44 en móvil.
- **R2.** Casilla: radio 5 / 6, borde de 1,5 `input-border`, fondo `input-bg`. Marcada: fondo y borde `accent` con ✓ en `on-accent`.
- **R3.** Radio: círculo. Marcado: borde `accent` y punto central de 8 / 10.
- **R4.** Interruptor: carril `line`; activo `accent`. Perilla de color `on-accent` (el `#FFFFFF` literal del diseño pasa a token).
- **R5.** Deshabilitado: opacidad 0,4 y no cambia.

## Stories
«Explorar» · Escritorio: «Casilla» (Recordarme mañana), «Casilla marcada», «Radio» (Transferencia), «Radio marcado» (Efectivo), «Interruptor», «Interruptor activo», «Deshabilitado» (Abono entregado) · Móvil: «Casilla marcada», «Radio marcado» (Efectivo, «$280.000 en caja»), «Interruptor activo» · «Grupo de radios» (Efectivo / Transferencia) · «Matriz».

## Accesibilidad
- Controles de Radix (`checkbox`, `radio`, `switch`) con `aria-checked`.
- Los radios van dentro de un `fieldset` con leyenda.
- Espacio activa; las flechas mueven entre radios.

## No incluye
Interruptores dentro de tablas.

## Criterios de aceptación
- **CA-1.** **Dado** una casilla sin marcar, **cuando** toco su texto, **entonces** queda marcada y `onCheckedChange(true)` se llama una vez.
- **CA-2.** **Dado** un `ChoiceGroup` «Método» con Efectivo marcado, **cuando** pulso flecha abajo, **entonces** se marca Transferencia y el foco va a ella.
- **CA-3.** **Dado** `disabled`, **cuando** lo toco, **entonces** no cambia.
- **CA-4.** **Dado** un interruptor en móvil, **entonces** mide 44 × 26 y la fila tiene al menos 44 de alto.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
