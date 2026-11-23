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
- **2026-11-19 (al programarla; lienzo leído en `InvEscritorio` e `InvMovil`, vistas fisico, fisico-titulo, fisico-final, fisico-mas, resolver, resolver-deslizar, resolver-hecho, resolver-nota y resolver-perdido):**
  - **Pantalla:** `InStockScreen` con el Encabezado («Inventario», «Agregar» en escritorio; en móvil, el botón flotante «Agregar al inventario» del armazón), las secciones del módulo como Pestañas en segmento («Libros en físico» con el total y «Ejemplares», que lleva a HU-PAN-INV-02) y la isla «Libros en físico» con cada título (portada, nombre, precio de referencia y cantidad) y los minibooks al final. No usa la Plantilla de lista: la Barra de vista exige un buscador y el lienzo no lo dibuja aquí.
  - **Un título abierto:** la Ventana de detalle (centrada en escritorio, hoja en móvil) con «N en físico · $precio» y sus ejemplares («#4 · Recibido 18/10/2026»); tocar uno abre `/inventario/ejemplares/[id]` (HU-PAN-INV-03). El lienzo lo dibuja como menú flotante en escritorio.
  - **Por resolver:** «N por resolver» abre la Ventana de detalle (centrada en escritorio; página en móvil) con la pieza `FlaggedCopiesList`: «Apareció», «Perdido (lo asumo yo)» y «Eliminar» (el back ya tiene las tres resoluciones). Apareció va directo; Perdido y Eliminar piden la nota opcional del lienzo («Nota (opcional)», «¿Qué pasó? Puedes dejarlo en blanco»). El Aviso usa los textos del lienzo («Psiconutrición #4 está de nuevo en físico», «… quedó como perdido») y no el del CA-2 («Ejemplar #4 apareció»); «Deshacer» lo devuelve. El título abierto y Por resolver van en la URL (`?titulo=`, `?por-resolver`).
  - **Deslizar (móvil):** pieza `SwipeRow`: hacia la derecha, Apareció; hacia la izquierda, Perdido y Eliminar; tocar la fila abre el Ejemplar. Las acciones son botones reales detrás de la fila: con el teclado o un lector de pantalla se llega a ellas sin deslizar y la fila se abre al recibir el foco.
  - **«Devolver al líder»** (escritorio: botón; móvil: «Más acciones») aparece cuando llegue HU-PAN-INV-05; hoy la pantalla lo admite pero el contenedor no lo pasa. El panel «Agregar al inventario» que el lienzo pone junto a la lista en escritorio es HU-PAN-INV-04; aquí «Agregar» lleva a `/inventario/agregar`.
  - **Textos sin dibujo:** el vacío («Todavía no tienes libros en físico» / «Cuando agregues libros al inventario, aparecen aquí por título.»), «No hay nada por resolver», el título de la nota de Eliminar («Eliminar · …») y su Aviso («… se eliminó»).
- **2026-11-22 (#27):** encabezado y pestañas van juntos a 12, como en la Plantilla de lista, para que al pasar entre Libros en físico (con «Agregar») y Ejemplares (sin él) nada salte. Story «… › Sin salto al cambiar de sección», también en Ejemplares.
- **2026-11-22 (#53):** Por resolver muestra la portada de cada ejemplar.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
