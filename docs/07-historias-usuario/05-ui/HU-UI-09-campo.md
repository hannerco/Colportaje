# HU-UI-09 · Campo de formulario

> **Iteración 1** · **Nivel:** átomo · **Código:** `Field` en `src/ui/atoms/Field/` · **Storybook:** `Átomos/Campo de formulario` · **Depende de:** HU-UI-03 · **Diseño:** ficha `Lib-Campo`, fuente `Campo.dc.html` · **Reglas:** BR-GEN-07, `04-diseno/DESIGN-BRIEF.md` §5b (campos móviles ≥ 16 px)

## Historia
**Como** colportor **quiero** escribir teléfonos, precios y fechas con el teclado correcto y ver claro qué está mal **para** llenar los datos rápido y sin errores.

## Qué es (de la ficha)
Entrada de un dato con su etiqueta arriba, ayuda opcional y mensaje de error. El tipo decide el ícono, el teclado del celular y el formato (dinero con «$», fechas dd/mm/aaaa).
- **Usarlo:** en Crear cliente, Agregar libro, Programar abono y Editar precio; tipo selección para listas cortas.
- **No usarlo:** para buscar (Buscador); para elegir entre 2 o 3 opciones visibles (Selección radio o Pestañas segmento).

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `label` | `etiqueta` | `string` | — (obligatoria) | Siempre visible |
| `kind` | `tipo` | `'text' \| 'money' \| 'date' \| 'phone' \| 'select' \| 'textarea'` | `'text'` | |
| `value` / `onChange` | `valor` | según `kind`: `COP \| null` en `money`; fecha de `domain/time` o `null` en `date`; `string` en los demás | — | Controlado |
| `placeholder` | `placeholder` | `string` | — | Ejemplo de formato, no instrucción |
| `help` | `ayuda` | `string` | — | Pista corta debajo |
| `error` | `estado = error` + `error` | `string` | — | Si llega, el campo está en error y muestra el mensaje |
| `disabled` | `estado = deshabilitado` | `boolean` | `false` | |
| `width` | `ancho` | `number` (160–720) \| `'full'` | `'full'` | |
| `onOpen` | — | `() => void` | — | Solo `select`: abre la lista (ver R6) |

El estado «enfocado» del diseño es el foco real del navegador: no es una prop.

## Comportamiento
- **R1.** Etiqueta arriba (`<label>` unido al campo). Caja de alto `--size-field` (40 / 48) y radio `--radius-field` (10 / 12); `textarea` mide 104 de alto. Relleno 0 12, fondo `input-bg`, borde `input-border`.
- **R2.** Foco: borde `accent` y anillo de 3 px `ring`. Error: borde `bad` y anillo de 3 px `bad-bg`, más el mensaje debajo con ícono `alert`. Deshabilitado: fondo `tone`, opacidad 0,6, texto `text-3`.
- **R3.** Por tipo:
  - `phone`: ícono `call` y `inputmode="tel"`.
  - `money`: prefijo «$», `inputmode="numeric"` y miles con punto mientras se escribe («93.000»); entrega un entero COP o `null`.
  - `date`: ícono `calendar` y `inputmode="numeric"`; acepta `dd/mm/aaaa` y entrega la fecha o `null` si no existe.
  - `select`: botón con el valor y el ícono `expand`.
- **R4.** El texto del campo es `--text-body` (17 px en móvil, así iOS no amplía la pantalla al enfocar).
- **R5.** El campo no valida mientras se escribe por primera vez. Muestra el error que le pasan; quien lo usa decide cuándo.
- **R6.** `select` es solo el disparador (`aria-haspopup="listbox"`, `aria-expanded`). La lista de opciones la abre `SelectField`, que combina `Field` con `Menu` (HU-UI-20), porque un átomo no usa moléculas.

## Stories
«Explorar» · Escritorio: «Teléfono», «Moneda · enfocado» (Precio acordado 93.000; foco con `play`), «Fecha · error» (32/11/2026, «Esa fecha no existe»), «Selección» (Método, Efectivo), «Deshabilitado» (Vendedor), «Área de texto» (Nota, «Opcional») · Móvil: «Teléfono», «Moneda · enfocado», «Fecha · error» · «Matriz».

## Accesibilidad
- La etiqueta es un `<label>` unido al campo: tocarla enfoca la caja.
- Error con `role="alert"` y `aria-invalid` en el campo; la ayuda y el error se enlazan con `aria-describedby`.
- Teclado numérico en teléfono y dinero (`inputmode`). Anillo de foco visible de 3 px.

## No incluye
**Selector de fecha con calendario:** la pantalla «Cambiar fecha de abono» lo dibuja, pero no está en la biblioteca. Se programa como pieza de Clientes en HU-PAN-CLI-05 (README, «Lo que la biblioteca aún no tiene»). Este campo acepta la fecha escrita.

## Criterios de aceptación
- **CA-1.** **Dado** `kind="money"`, **cuando** escribo «93000», **entonces** veo «$ 93.000» y `onChange` recibe `93000`; al borrar todo recibe `null`.
- **CA-2.** **Dado** `kind="date"`, **cuando** escribo «32/11/2026», **entonces** `onChange` recibe `null`; con `error="Esa fecha no existe"` se ven el borde rojo, el mensaje con `role="alert"` y `aria-invalid="true"`.
- **CA-3.** **Dado** `kind="phone"` en móvil, **entonces** el campo mide 48 de alto, tiene `inputmode="tel"` y letra de 17 px.
- **CA-4.** **Dado** un campo con etiqueta «Teléfono», **cuando** toco la etiqueta, **entonces** el foco va a la caja.
- **CA-5.** **Dado** `disabled`, **entonces** no se puede escribir y el texto se ve en `text-3`.

## Cambios por iteración
- **2026-11-22 (#54):** el texto largo crece con lo que se escribe desde 104 hasta `--size-textarea-max` (320) y desde ahí se desplaza por dentro. Story «Átomos/Campo › Texto largo que crece».
- **2026-11-22 (#62):** el ícono del calendario de una fecha abre el calendario. Nueva molécula **Campo de fecha** (`src/ui/molecules/DateField`): el Campo `dd/mm/aaaa` con el ícono como botón «Abrir calendario» que abre el calendario en un Panel flotante; elegir un día lo escribe y lo cierra. Con `noFuture` no deja elegir días después de hoy (Cobrar, cuota inicial, fecha de venta). El calendario (`DatePickerCalendar`) pasó de Pagos a la biblioteca. La usan todos los formularios con fecha. Prueba: stories «Elegir en el calendario» y «Sin fechas futuras».

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
