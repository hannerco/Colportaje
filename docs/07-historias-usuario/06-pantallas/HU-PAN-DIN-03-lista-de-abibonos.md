# HU-PAN-DIN-03 · Lista de Abibonos

> **Iteración 1** · **Nivel:** pantalla · **Código:** `DepositsListScreen` en `src/features/money/screens/`; contenedor `src/app/(app)/dinero/abibonos/page.tsx` · **Storybook:** `Pantallas/Dinero/Abibonos` · **Depende de:** HU-PAN-DIN-01 · **Back:** HU-DIN-06 · **Diseño:** sección «3 · Abibonos» (escritorio: Dinero-d-abibonos con ⓘ abierto, Dinero-d-vacio-abibonos; móvil: Dinero-m-abibonos-a) · **Reglas:** BR-DEP-02, BR-DEP-14, I-28 a I-31, FD-11

## Historia
**Como** colportor **quiero** ver mis entregas al líder (borradores y entregados) **para** saber qué entregué, cuándo y si me falta confirmar alguna.

## Contrato que usa
`useDepositsList(params)` (`DepositsListView`, orden por fecha, total o nombre).

## Pantalla
Mismo encabezado y resumen que Dinero, con el segmento en «Abibonos». Lista con nombre («Abibono (n)» o el escrito; el borrador muestra el número sugerido, I-29), fecha, total y Pastilla (Borrador / Entregado con candado). El ⓘ explica «Entrega al líder». Abrir una fila abre el Abibono (HU-PAN-DIN-04 si es borrador, HU-PAN-DIN-05 si está entregado).

Si las columnas de la lista no caben en la Fila de lista de la biblioteca (hoy sus tipos son cliente, abono y ejemplar), **se pide al dueño agregar el tipo «abibono» a la ficha** antes de programarla.

## Estados (stories)
Con borradores y entregados · ⓘ abierto · Vacío · Cargando · Sin conexión.

## Criterios de aceptación
- **CA-1.** **Dado** un Abibono confirmado sin título, **entonces** se ve «Abibono (3)» con la Pastilla «Entregado» con candado.
- **CA-2.** **Dado** un borrador sin número, **entonces** se ve el nombre sugerido y la Pastilla «Borrador» con borde punteado.
- **CA-3.** **Dado** ningún Abibono, **entonces** se ve el estado vacío del lienzo con «Entregar al líder».

## Cambios por iteración
- **2026-11-19 (al programarla; lienzo leído en `DineroEscritorio` y `DineroMovil`):**
  - **Pantalla en `/dinero/abibonos`** (`DepositsListScreen`): el mismo encabezado y resumen que Dinero (en escritorio arriba de la lista con su ⓘ; en móvil, el botón «Por entregar» y su hoja) con el segmento en «Abibonos», buscador, orden (fecha, total o nombre) y «Total abonado al líder» (solo Abibonos entregados, BR-DEP-11) con su ⓘ. La vista vive en la URL (`?orden=total-asc&q=oct`). Lo común con Abonos de clientes quedó en el gancho `useMoneyChrome` (segmento, resumen, hoja).
  - **Tabla como pieza del módulo (`DepositsTable`),** con el mismo criterio que decidió el dueño para los abonos (2026-11-19, HU-PAN-DIN-01): columnas del lienzo Nombre · Fecha · Total · Efectivo · Transferencia · Estado · Recibo; en móvil, filas de dos líneas. Se anota en el README para que el diseño agregue el tipo «abibono» a la Fila de lista.
  - **Estado:** Pastilla «Borrador» o «Entregado» con candado; el borrador sin número muestra «Abibono (n)» con el siguiente libre (I-29). Vacío con «Entregar al líder» (CA-3).
  - **Fuera / pendiente:** abrir una fila lleva al armazón de `/dinero/abibonos/[id]` hasta HU-PAN-DIN-04 (borrador) y HU-PAN-DIN-05 (entregado); en la pestaña de vistas solo hay «Todos», porque la barra de vista de la biblioteca exige pestañas.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
