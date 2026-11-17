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
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
