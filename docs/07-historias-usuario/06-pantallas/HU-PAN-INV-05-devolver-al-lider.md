# HU-PAN-INV-05 · Devolver al líder

> **Iteración 1** · **Nivel:** pantalla · **Código:** `ReturnToLeaderScreen` en `src/features/inventory/screens/` · **Storybook:** `Pantallas/Inventario/Devolver al líder` · **Depende de:** HU-PAN-INV-01 · **Back:** HU-INV-09 · **Diseño:** sección «5 · Devolver al líder» (escritorio: Inv-d-devolver-modal, -devolver-angosto, -angosto-minibooks, -angosto-resumen; móvil: Inv-m-devolver, -devolver-sesion, -devolver-nota, -devolver-resumen) · **Reglas:** BR-COPY-16, ADR-0043

## Historia
**Como** colportor **quiero** elegir los ejemplares que le devuelvo al líder, agregar una nota y confirmar, con la opción de deshacer, **para** que mi inventario quede igual a la maleta.

## Contrato que usa
`useReturnToLeaderCandidates`, `returnSelectionSummary` (puro) y `useReturnToLeader` (devolver y deshacer).

## Pantalla
- **Escritorio:** modal con cada ejemplar por título y casillas. El lienzo trae dos variantes, «modal» y «angosta, sin categorías»: **se usa la angosta**, que es la que tiene minibooks y resumen completos, salvo que el dueño diga otra.
- **Móvil:** pantalla con los ejemplares a elegir → «Siguiente: nota» → «Listo: resumen con la nota».
- Al confirmar: Aviso con «Deshacer».

## Estados (stories)
Eligiendo · Minibooks abierto · Nota · Resumen · Devolviendo · Sin conexión.

## Criterios de aceptación
- **CA-1.** **Dado** que elijo 2 ejemplares de «Psiconutrición» y 1 minibook, **entonces** el resumen dice 3 y los lista con la nota.
- **CA-2.** **Dado** la devolución confirmada, **cuando** pulso «Deshacer», **entonces** los 3 vuelven a En físico.
- **CA-3.** **Dado** ningún ejemplar elegido, **entonces** «Siguiente» está deshabilitado.

## Cambios por iteración
- **2026-11-19 (al programarla; lienzo leído en `InvEscritorio` e `InvMovil`, vistas devolver-modal, devolver-angosto, devolver-angosto-minibooks y devolver-angosto-resumen):**
  - **Pantalla en `/inventario/devolver`** (`ROUTES.returnToLeader`; «Devolver al líder» del menú «Más» en móvil y el botón de escritorio de Libros en físico ya la abren). `ReturnToLeaderScreen`: escritorio con la variante **angosta** (una sola hoja con buscador, la lista con casilla y «Recibido», «Minibooks (por cantidad)», la Nota y la barra «3 ejemplares seleccionados» / «3 ejemplares y 2 minibooks», «Cancelar» y «Listo»); móvil en dos pasos con «Paso N de 2» (elegir → «Siguiente» → Nota → «Listo»).
  - **Minibooks por cantidad:** un campo numérico por título, «de N», que no deja pedir más de lo que hay en físico.
  - **Resumen:** «Vas a devolver N ejemplares», la nota, una caja por categoría (tocarla resalta sus títulos), la lista «Título (cantidad)» y el total; «Seguir eligiendo» / «Devolver N». El envío (con su `opId`) se prepara al abrirlo y, si falla, el diálogo sigue abierto con el Aviso «Reintentar» y manda el mismo `opId` (no devuelve de más, R6).
  - **Deshacer:** el Aviso «N ejemplares devueltos · Deshacer» llama `undoReturnToLeader` por cada ejemplar devuelto (el back lo deshace por ejemplar y pide nota) con **la misma nota** de la devolución.
  - **Fuera / pendiente:** la variante «modal» con la columna Categoría no se programa (la HU manda la angosta); en el lienzo es un modal sobre Libros en físico, aquí es la pantalla propia; el resumen no lleva el ícono de forma por categoría.
- **2026-11-22 (#24):** igual que Agregar: en el celular va en el armazón en modo tarea, con margen lateral de 16.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Devolver al líder en lote y deshacer» (TESTING.md, flujo 15) pasa.
