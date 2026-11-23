# HU-PAN-INV-03 · Detalle de un ejemplar y sus acciones

> **Iteración 1** · **Nivel:** pantalla · **Código:** `CopyDetailScreen` en `src/features/inventory/screens/`; contenedor `src/app/(app)/inventario/ejemplares/[id]/page.tsx` · **Storybook:** `Pantallas/Inventario/Ejemplar` · **Depende de:** HU-UI-29, HU-PAN-INV-02 · **Back:** HU-INV-05, HU-INV-06, HU-INV-07, HU-INV-08, HU-INV-09 · **Diseño:** sección «3 · Ejemplar» (escritorio: Inv-d-ejemplar-vendido, -fisico, -acciones, -novedad, -eliminar, -devuelto, -perdido, -devuelto-deshacer y Inv-d-ej4-centro, -lateral, -pagina; móvil: Inv-m-ejemplar-*) y la ficha `Lib-VentanaDetalle` (contenido «ejemplar») · **Reglas:** BR-COPY-04, BR-COPY-11, BR-COPY-16, BR-COPY-17, BR-PRC-*, I-03

## Historia
**Como** colportor **quiero** ver todo de un ejemplar (precio, cliente, fechas e historial) y marcarlo con novedad, eliminarlo o devolverlo al líder, con la opción de deshacer, **para** corregir el inventario sin miedo a equivocarme.

## Contrato que usa
`useCopyDetail` (con `CopyCapabilities`), `useCopyHistory` (con `HistoryUndo`), `useAgreedPrice`, `useCopyIssueActions`, `useDeleteCopy`, `useReturnToLeader` (deshacer), `useReceivedDateOptions` y `useUpdateReceivedDate`.

## Pantalla
`DetailTemplate` dentro de `DetailWindow`:
- **Franja:** p. ej. «Vendido el 02/11/2026 · 13 días después de recibido».
- **Isla 1 · identidad:** portada, «Psiconutrición #6», Pastilla y cliente (enlace a su ficha).
- **Isla 2 · datos:** precio acordado editable (con el público tachado), diferencia, recibido el (editable, FI-05) y vendido el.
- **Isla 3 · historial:** con «Deshacer».
- **Más acciones** (según `CopyCapabilities`):
  - Marcar con novedad (nota obligatoria u opcional según el back);
  - Devolver al líder;
  - Abrir como página;
  - Eliminar (`ConfirmDialog` de peligro con nota).
- **Deshacer «Devuelto al líder»** pide una nota obligatoria (BR-COPY-16, `ConfirmDialog` con Campo).

## Estados (stories)
Vendido · En físico · Acciones abiertas · Marcar con novedad · Eliminar con nota · Devuelto al líder con Deshacer · Perdido con Deshacer en el historial · Deshacer devuelto con nota obligatoria · Lateral, centrada y página (escritorio) · Página y hoja (móvil).

## No incluye
FI-01 (devolver a inventario un ejemplar vendido desde aquí) si no está dibujado; FI-09 (minibooks).

## Criterios de aceptación
- **CA-1.** **Dado** el #6 vendido a $93.000 con público $98.000, **entonces** se ve «Precio acordado $93.000», «$98.000» tachado y «Diferencia −$5.000».
- **CA-2.** **Dado** un ejemplar en físico, **cuando** lo elimino con nota, **entonces** aparece el Aviso con «Deshacer» durante `undo.toastSeconds` y, al deshacer, vuelve a su estado anterior.
- **CA-3.** **Dado** un ejemplar devuelto al líder, **cuando** pulso «Deshacer» en el historial, **entonces** se pide una nota y no se puede confirmar sin ella.
- **CA-4.** **Dado** un ejemplar vendido, **entonces** «Eliminar» no aparece en Más acciones (según `CopyCapabilities`).

## Cambios por iteración
- **2026-11-19 (al programarla; lienzo leído en `InvEscritorio` e `InvMovil`, vistas ejemplar-*):**
  - **Pantalla:** `CopyDetailScreen` sobre la Plantilla de detalle (identidad, datos e historial); contenedor `/inventario/ejemplares/[id]` como página (la lista no abre la Ventana de detalle, ver INV-02). Si el ejemplar no carga, la ventana muestra «No se pudo cargar» con «Reintentar».
  - **Datos:** cliente (enlace a su ficha), precio acordado editable con el público tachado y «Diferencia −$5.000 · descuento», vendido el y recibido el. Un ejemplar en físico muestra «Precio» (el público copiado).
  - **Editar el precio y la fecha** usa diálogos de la biblioteca en lugar del campo en línea del lienzo: «Precio acordado» (campo de dinero y «Restaurar precio de inventario $98.000») y «Fecha de recibido» (Hoy, Ayer, Anteayer u otra fecha en el calendario de HU-PAN-CLI-05, nunca futura ni posterior a la venta).
  - **Más acciones:** el lienzo ofrece **Marcar con novedad** (nota obligatoria: sin ella el diálogo sigue abierto con «Escribe una nota») y **Eliminar** (nota opcional; Aviso con «Deshacer», vuelve a la lista). Según `CopyCapabilities`: un vendido no ofrece Eliminar (CA-4). **«Devolver al líder» no está aquí**: el lienzo lo trae en su propia pantalla por lotes (HU-PAN-INV-05), y «Abrir como página» es el selector de forma de la Ventana.
  - **Historial:** texto de cada evento desde `copy/es.ts`; «Deshacer» en la primera entrada si el back lo permite: Apareció / Perdido deshacen directo; «Devuelto al líder» pide la nota obligatoria (BR-COPY-16, CA-3).
  - **Sin la Franja** «Vendido el … · N días después de recibido» que dice la HU: el lienzo no la dibuja. Anterior / siguiente quedan deshabilitados (el detalle no conoce la lista).
  - **Fuera:** FI-01 (devolver al inventario un vendido, FI no dibujada), editar la fecha de venta (HU-CLI-13 en el back; el lienzo no la hace editable aquí), el modal de abonos que no cuadran tras bajar el precio (FC-05, no dibujado; la franja de la ficha del cliente ya avisa) y los minibooks (FI-09).
- **2026-11-22 (#29):** en escritorio, abrir una fila ya no va siempre a la página completa: abre la Ventana de detalle de la lista con la forma recordada (Lateral o Centrada), como Clientes; si la forma es Página, va a la página. Desde la página, elegir Lateral o Centrada vuelve a la lista con el registro abierto, en vez de cerrarlo. Story «… › Abrir en la Ventana».
- **2026-11-22 (#56):** «Vendido el» es editable (calendario, sin días futuros ni antes de recibido), como dibuja el lienzo.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
