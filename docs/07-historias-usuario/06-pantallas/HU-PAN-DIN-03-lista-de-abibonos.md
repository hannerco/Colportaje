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
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
