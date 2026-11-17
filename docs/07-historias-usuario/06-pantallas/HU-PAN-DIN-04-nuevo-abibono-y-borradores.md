# HU-PAN-DIN-04 · Nuevo Abibono, borradores y confirmar

> **Iteración 1** · **Nivel:** pantalla · **Código:** `DepositEditorScreen` en `src/features/money/screens/`; contenedor `src/app/(app)/dinero/abibonos/[id]/page.tsx` (y `nuevo`) · **Storybook:** `Pantallas/Dinero/Nuevo Abibono` · **Depende de:** HU-PAN-DIN-03, HU-UI-27 · **Back:** HU-DIN-04, HU-DIN-05, HU-BASE-05 · **Diseño:** sección «4 · Nuevo Abibono» (escritorio: Dinero-d-nuevo, -nuevo-diferencia, -nuevo-listo, -abibono-centro, -abibono-pagina, -nuevo-error; borradores: Dinero-d-borrador, -borrar) y móvil «5 · Abibono: nuevo, borrador y entregado» (Dinero-m-nuevo, -nuevo-diferencia, -nuevo-listo, -nuevo-error, -borrador, -borrar) · **Reglas:** BR-DEP-03 a BR-DEP-10, BR-DEP-13, I-04, I-29, I-30, FD-10

## Historia
**Como** colportor **quiero** que la entrega al líder llegue precargada con lo cobrado, poder ajustar montos, subir la foto del recibo y explicar una diferencia **para** cuadrar con el líder sin hacer cuentas a mano.

## Contrato que usa
`useNewDepositProposal`, `recalcProposal` (puro), `useSaveDepositDraft`, `useDeposit`, `useAddDepositReceipt`, `useDeleteDepositReceipt`, `useDeleteDepositDraft`, `useConfirmDeposit`; fotos con `compressImage` / `useCreatePhoto` (HU-BASE-05).

## Pantalla
- En `DetailWindow` (escritorio: lateral, centrada o página, como los tableros del lienzo); en móvil, pantalla completa.
- **Precargado:** abonos cobrados libres por método, total, esperado, diferencia (faltante, sobrante o cero) y nota.
  - La nota es **obligatoria** si la diferencia no es 0.
  - **Recibo:** una o varias fotos.
  - Nombre sugerido «Abibono (n)» (I-29, I-30).
- **Listo para confirmar:** «Marcar como entregado» como acción principal, habilitada cuando hay recibo y, si hay diferencia, nota.
- **Error al subir la foto del recibo** (`Dinero-*-nuevo-error`): Franja con «Reintentar».
- **Borrador:** guardar sin confirmar; abrirlo, editarlo y **borrarlo** con `ConfirmDialog` de peligro (BR-DEP-10, I-04).
- La sección **Minibooks** del lienzo queda **oculta** hasta el módulo Minibooks (FD-10).

## Piezas del módulo
`ReceiptPhotos` (miniaturas, agregar, quitar), como el lienzo. Va en `features/money/components/` y se anota para subirla a la biblioteca (también la usarán facturas y fotos de información).

## Estados (stories)
Precargado sin recibo · Con diferencia (nota obligatoria) · Listo para confirmar · Error al subir el recibo · Centrada y página (escritorio) · Borrador abierto · Borrar borrador · Confirmando · Sin conexión.

## Criterios de aceptación
- **CA-1.** **Dado** $385.000 cobrados, **entonces** se precarga con $280.000 en efectivo y $105.000 en transferencia, total $385.000 y diferencia $0.
- **CA-2.** **Dado** que cambio el efectivo a $270.000, **entonces** la diferencia es −$10.000 (faltante) y «Marcar como entregado» queda deshabilitado hasta escribir una nota.
- **CA-3.** **Dado** sin foto de recibo, **entonces** «Marcar como entregado» está deshabilitado y explica que falta el recibo.
- **CA-4.** **Dado** un borrador, **cuando** elijo «Borrar» y confirmo, **entonces** desaparece de la lista con sus fotos y sus abonos vuelven a estar libres.
- **CA-5.** **Dado** la confirmación exitosa, **entonces** el Abibono queda «Entregado» con candado y Dinero muestra Por entregar $0.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Abibono completo» (TESTING.md, flujo 5) pasa.
