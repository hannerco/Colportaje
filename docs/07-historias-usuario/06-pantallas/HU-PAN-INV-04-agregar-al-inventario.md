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
- **2026-11-19 (al programarla; lienzo leído en `InvEscritorio` e `InvMovil`, vistas agregar, agregar-fecha, agregar-sesion, agregar-cantidad y agregar-resumen):**
  - **Pantalla en `/inventario/agregar`** (la HU decía «Agregar»; el lienzo de escritorio lo dibuja como panel junto a Libros en físico, aquí es la pantalla propia que ya tenía la ruta). `AddCopiesScreen`: escritorio con la isla «Agregar al inventario» (buscador, fecha, un botón por título agrupado por categoría y la barra «3 por agregar · recibidos hoy», «Descartar» y «Agregar N»); móvil a pantalla completa con «Cancelar / Agregar al inventario / Listo», pestañas de categoría y una fila por título.
  - **Piezas del módulo:** `TitleTile` (portada, nombre y su cantidad en acento con un «−», escritorio) y `QuantityControl` («+», o «− cantidad +» con la cantidad escribible, móvil).
  - **Fecha de recibido:** menú Hoy / Ayer / Anteayer / «Otra fecha…» (calendario de HU-PAN-CLI-05; nunca futura).
  - **Resumen:** «Vas a agregar N ejemplares», la fecha, una caja por categoría (tocarla resalta sus títulos), la lista «Título (cantidad)» y el total; «Seguir agregando» / «Agregar N». El envío se prepara al abrirlo y, si falla, el diálogo sigue abierto con el Aviso «Reintentar» y manda los mismos identificadores (no duplica, R6).
  - **Fuera / pendiente:** «Deshacer» el último toque del tablero «agregar-sesion» no se programa (los − hacen lo mismo y el lote es local); el resumen no muestra el ícono de forma por categoría del lienzo (círculo / triángulo / cuadrado); en el lienzo el panel convive con la lista en escritorio (aquí van separados).
- **2026-11-22 (#24):** en el celular la pantalla va dentro del armazón en modo tarea, con margen lateral de 16; antes tocaba los bordes y «Listo» se cortaba.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Agregar a inventario por lote» (TESTING.md, flujo 2) pasa.
