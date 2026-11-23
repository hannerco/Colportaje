# HU-PAN-INV-02 · Lista de ejemplares

> **Iteración 1** · **Nivel:** pantalla · **Código:** `CopiesListScreen` en `src/features/inventory/screens/`; contenedor `src/app/(app)/inventario/ejemplares/page.tsx` · **Storybook:** `Pantallas/Inventario/Ejemplares` · **Depende de:** HU-UI-28 · **Back:** HU-INV-04 · **Diseño:** sección «2 · Ejemplares» (escritorio: Inv-d-ejemplares, -vendidos, -descuentos, -ordenar; móvil: Inv-m-ejemplares, -vendidos, -descuentos, -ordenar) · **Reglas:** BR-COPY-12, OQ-14, I-12, I-23

## Historia
**Como** colportor **quiero** ver todos mis ejemplares, los vendidos y los que vendí con descuento o aumento **para** revisar a quién le vendí cada libro y a qué precio.

## Contrato que usa
`useCopiesList(params)` con `CopiesView`, `CopiesSortKey` y `DEFAULT_COPIES_LIST_PARAMS`.

## Pantalla
`ListTemplate` con:
- **Pestañas:** las vistas del lienzo (Por fecha / Todos, Vendidos, Con descuentos y aumentos), con conteos que no cambian con la búsqueda (I-12).
- **Buscador:** por título o número exacto («12» o «#12», I-23).
- **Orden:** Recibido, vendido, título, precio acordado y diferencia (OQ-14).
- **Lista:** `ListTable kind="copy"`.
- Abrir una fila abre el Ejemplar (HU-PAN-INV-03) en la Ventana de detalle o en pantalla.

## Estados (stories)
Todos · Vendidos · Con descuentos y aumentos · Ordenar abierto · Sin resultados · Cargando · Vacío · Sin conexión.

## No incluye
FI-08 (filtro Estado abierto) si no está dibujado; FI-09 (detalle de un minibook).

## Criterios de aceptación
- **CA-1.** **Dado** que busco «12», **entonces** solo aparece el ejemplar #12 (no el 1 ni el 120).
- **CA-2.** **Dado** la vista «Con descuentos y aumentos», **entonces** cada fila muestra el precio acordado y la diferencia con el público.
- **CA-3.** **Dado** el orden por diferencia descendente, **entonces** los ejemplares sin diferencia van al final (BR-GEN-14).

## Cambios por iteración
- **2026-11-19 (al programarla; lienzo leído en `InvEscritorio` e `InvMovil`, vistas ejemplares, ejemplares-vendidos, ejemplares-descuentos y ejemplares-ordenar):**
  - **Pantalla:** `CopiesListScreen` sobre la Plantilla de lista, con las secciones del módulo («Libros en físico» / «Ejemplares») como Pestañas en segmento entre el Encabezado y la Barra de vista. La vista vive en la URL (`?vista=vendidos&orden=titulo-asc&q=12`).
  - **Pestañas:** el lienzo dibuja **cuatro**: Todos, En físico, Vendidos y Con descuentos y aumentos (la HU nombraba tres; el back ya tiene las cuatro vistas). Los conteos no cambian con la búsqueda (I-12).
  - **Orden:** Recibido, Vendido, Título, Precio acordado y Diferencia. El selector de sentido es el de la biblioteca (Ascendente / Descendente) y no «Mayor primero / Menor primero» del lienzo. La fecha de cada fila sigue al orden (Recibido o Vendido; los sin vender, sin fecha y al final).
  - **Huecos de la biblioteca cubiertos (para subirlos al diseño):** `ListRow` de ejemplar suma la columna **Diferencia** (`+$7.000` / `−$5.000`; en móvil bajo el precio), `dateKind` («Vendido el» / «Vendido 02/11/2026»), el número `#6` junto al título y el cliente en la segunda línea en móvil; `StatusPill` suma **Perdido** y **Devuelto al líder** (los 13 estados de ejemplar del lienzo); `ListTemplate` suma la ranura opcional `sections`.
  - **Abrir una fila** lleva a `/inventario/ejemplares/[id]` (HU-PAN-INV-03): hasta entonces es el armazón. Sin Ventana de detalle en escritorio.
  - **Fuera:** el filtro «Estado» (el lienzo dibuja el botón sin abrir, FI-08) y el detalle de un minibook (FI-09).
- **2026-11-22 (#29):** en escritorio, abrir una fila ya no va siempre a la página completa: abre la Ventana de detalle de la lista con la forma recordada (Lateral o Centrada), como Clientes; si la forma es Página, va a la página. Desde la página, elegir Lateral o Centrada vuelve a la lista con el registro abierto, en vez de cerrarlo. Story «… › Abrir en la Ventana».

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
