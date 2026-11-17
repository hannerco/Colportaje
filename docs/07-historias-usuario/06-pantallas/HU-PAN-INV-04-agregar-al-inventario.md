# HU-PAN-INV-04 · Agregar al inventario

> **Iteración 1** · **Nivel:** pantalla · **Código:** `AddCopiesScreen` en `src/features/inventory/screens/`; contenedor `src/app/(app)/inventario/agregar/page.tsx` · **Storybook:** `Pantallas/Inventario/Agregar` · **Depende de:** HU-PAN-INV-01 · **Back:** HU-INV-02 · **Diseño:** sección «4 · Agregar al inventario» (escritorio: Inv-d-agregar, -agregar-fecha, -agregar-resumen; móvil: Inv-m-agregar, -agregar-sesion, -agregar-cantidad, -agregar-fecha, -agregar-resumen) · **Reglas:** BR-COPY-02, BR-COPY-04, ADR-0043, I-16, DT-10

## Historia
**Como** colportor **quiero** agregar los libros que me entregó el líder tocando cada título las veces que haga falta, revisar el resumen y confirmar **para** cargar una caja de libros en un minuto.

## Contrato que usa
`useAddCatalog`, `createAddBatch` / `prepareAddCopies` (lote local, sin red), `useAddCopiesBatch` y `useReceivedDateOptions`.

## Pantalla
- **Catálogo por categoría** con botones con imagen del título (DT-10; sin imagen, el cuadro del lienzo) y buscador. Cada toque suma uno al lote.
- **Escribir la cantidad** directamente (tablero «agregar-cantidad») y **Deshacer** el último toque (tablero «agregar-sesion»).
- **Fecha de recibido:** hoy por defecto, o una fecha pasada (nunca futura).
- **Resumen:** lista por título con cantidades; tocar una caja la resalta; «Agregar N» confirma todo o nada.

## Piezas del módulo
`TitleTile` (botón con imagen y contador) y el control de cantidad, como el lienzo. Van en `features/inventory/components/` y se anotan para subirlos a la biblioteca.

## Estados (stories)
Catálogo · Con lote en curso · Escribir cantidad · Fecha pasada · Resumen · Agregando · Error al confirmar con Reintentar (FI-06, con los componentes de la biblioteca) · Sin conexión.

## Criterios de aceptación
- **CA-1.** **Dado** que toco «Psiconutrición» 3 veces y «Bebidas saludables» 2, **entonces** el resumen dice 3 + 2 y el botón «Agregar 5».
- **CA-2.** **Dado** «Agregar 5» confirmado, **entonces** aparecen 5 ejemplares nuevos con números consecutivos por título y la fecha elegida, y vuelvo a Libros en físico con un Aviso.
- **CA-3.** **Dado** que el envío falla, **entonces** no se creó nada, el lote sigue en pantalla y «Reintentar» lo envía con los mismos IDs.
- **CA-4.** **Dado** un título desactivado, **entonces** no aparece en el catálogo (I-16).

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Agregar a inventario por lote» (TESTING.md, flujo 2) pasa.
