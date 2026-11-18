# HU-PAN-INV-01 · Libros en físico y Por resolver

> **Iteración 1** · **Nivel:** pantalla · **Código:** `InStockScreen` en `src/features/inventory/screens/`; contenedor `src/app/(app)/inventario/page.tsx` · **Storybook:** `Pantallas/Inventario/Libros en físico` · **Depende de:** HU-UI-28, HU-PAN-BASE-01 · **Back:** HU-INV-03, HU-INV-07 · **Diseño:** sección «1 · Libros en físico, Agregar y Por resolver» (escritorio: Inv-d-fisico, -fisico-titulo, -resolver, -resolver-hecho, -resolver-nota, -resolver-perdido, -fisico-v-agregar-izq; móvil: Inv-m-fisico, -fisico-final, -fisico-titulo, -resolver, -resolver-deslizar, -resolver-hecho, -fisico-mas, -resolver-nota, -resolver-perdido; nota del dueño en el lienzo: tocar un ejemplar abre el Ejemplar) · **Reglas:** BR-COPY-11, BR-COPY-12, BR-INV-03, BR-TIT-03, I-16, I-17, BR-COPY-11 (sin texto de que el líder asume)

## Historia
**Como** colportor **quiero** ver qué libros tengo en la maleta por título y resolver los que tienen novedad (apareció o se perdió) **para** tener el inventario al día.

## Contrato que usa
`useInStockSummary`, `useInStockCopiesOfTitle`, `useFlaggedCopies`, `useCopyIssueActions` (resolver Apareció o Perdido, con nota opcional, y deshacer).

## Pantalla
- **Escritorio:** lista de títulos en físico con cantidad y precio de referencia; un título abierto muestra sus ejemplares, y **tocar un ejemplar abre el Ejemplar** (HU-PAN-INV-03). La acción principal es «Agregar» (HU-PAN-INV-04). «Por resolver» se abre en un modal con los ejemplares con novedad, ordenados de la novedad más nueva a la más antigua (I-17).
- **Móvil:** la misma información, con los minibooks al final, un título abierto y «Más acciones» (Devolver al líder, HU-PAN-INV-05).
- **Resolver:** Apareció / Perdido, con nota opcional (FI-03 si está dibujada) y Aviso con «Deshacer».
- **Deslizar en móvil** (tablero «resolver-deslizar»): se programa como pieza del módulo (`SwipeRow` en `features/inventory/components/`), con las mismas acciones también disponibles sin deslizar.
- La variante «Agregar a la izquierda» del lienzo es una alternativa: se usa el tablero principal (Inv-d-fisico) salvo que el dueño diga lo contrario.

## Estados (stories)
Con libros · Un título abierto · Por resolver abierto · Apareció con Deshacer · Perdido con nota y con Deshacer · Vacío (sin libros en físico) · Cargando · Sin conexión (FI-07, con los componentes de la biblioteca).

## Reglas de pantalla
- **R1.** Ningún texto dice que el líder asume una pérdida (BR-COPY-11).
- **R2.** Los títulos desactivados que aún tienen ejemplares se muestran (I-16).

## Criterios de aceptación
- **CA-1.** **Dado** 3 ejemplares de «Psiconutrición» en físico, **entonces** el título muestra 3 y, al abrirlo, los ejemplares #4, #6 y #7; tocar el #6 abre su detalle.
- **CA-2.** **Dado** 2 ejemplares con novedad, **cuando** marco uno como Apareció, **entonces** sale de la lista, aparece «Ejemplar #4 apareció · Deshacer» y, al deshacer, vuelve.
- **CA-3.** **Dado** sin conexión, **entonces** Agregar y Resolver están deshabilitados y la lista se puede consultar.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
