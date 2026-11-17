# HU-UI-26 · Estado vacío y de carga

> **Iteración 1** · **Nivel:** organismo · **Código:** `EmptyState` y `ListSkeleton` en `src/ui/organisms/EmptyState/` · **Storybook:** `Organismos/Estado vacío y de carga` · **Depende de:** HU-UI-04 · **Diseño:** ficha `Lib-EstadoVacio`, fuente `EstadoVacio.dc.html` · **Reglas:** BR-GEN-08, BR-GEN-10, CONVENTIONS §4, I-35

## Historia
**Como** colportor **quiero** que cuando una lista no muestra nada me diga por qué y qué hacer **para** no pensar que la app se dañó.

## Qué es (de la ficha)
Lo que se ve cuando una lista no tiene nada que mostrar: está vacía, la búsqueda no dio resultados, no hay conexión, falló o está cargando (esqueleto).
- **Usarlo:** dentro de cualquier lista o isla, en lugar de las filas.
- **No usarlo:** para errores de un campo (van en el Campo).

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `kind` | `tipo` | `'empty' \| 'no-results' \| 'offline' \| 'error' \| 'loading'` | |
| `title` | `titulo` | `string` | Qué pasa |
| `text` | `texto` | `string` | Qué hacer |
| `action` | `accion` | `{ label; icon?; onClick; disabled? }` | Botón principal en `empty` (crea algo); secundario en los demás (corrige) |
| `icon` | — | `IconName` | Por defecto según `kind`: `customers`, `search`, `offline`, `alert` |
| `rows` | — | `number` | Solo `loading`: filas del esqueleto (4 por defecto) |

## Comportamiento
- **R1.** Ícono del caso en un círculo gris (`tone`), en `text-2`; en `error`, en `bad`. Debajo van el título, el texto y la acción.
- **R2.** `loading` pinta un esqueleto (`ListSkeleton`) con el alto de la Fila de lista (64 / 72), avatar y dos barras de largos distintos, en color `skeleton`.
- **R3.** Los textos de cada pantalla vienen de `copy/es.ts` y siguen las reglas del negocio. Los ejemplos del diseño se corrigen así:
  - Vacío dice «Todavía no tienes clientes / Cuando crees un cliente…» («venta» y «Vender» no existen, ADR-0035).
  - Sin conexión dice «puedes consultar lo guardado, pero no registrar» (BR-GEN-08), no «los cambios se envían cuando vuelva la señal» (fase 2, I-35).
- **R4.** Sin conexión, una acción que escribe (p. ej. «Nuevo cliente») se muestra deshabilitada con «Necesita conexión» (BR-GEN-08).

## Stories
«Explorar» · Escritorio: «Vacío», «Sin resultados» (para «Marta» · Quitar filtros), «Sin conexión» (Reintentar), «Error» (No se pudo cargar · Reintentar), «Cargando» · Móvil: «Vacío», «Sin resultados», «Cargando» · «Matriz».

## Accesibilidad
`role="status"` (error: `role="alert"`). El esqueleto lleva `aria-busy="true"` y un solo texto oculto «Cargando…»: no se anuncia fila por fila.

## No incluye
Ilustraciones grandes ni chistes.

## Criterios de aceptación
- **CA-1.** **Dado** `kind="error"`, **entonces** tiene `role="alert"`, ícono `alert` en rojo y botón secundario «Reintentar».
- **CA-2.** **Dado** `kind="loading" rows={4}`, **entonces** se ven 4 filas de esqueleto, `aria-busy="true"`, y un lector anuncia «Cargando…» una sola vez.
- **CA-3.** **Dado** `kind="empty"` con acción «Nuevo cliente», **entonces** el botón es principal; en `no-results` es secundario.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
