# HU-PAN-DIN-02 · Detalle de un abono: cobrar y dar más plazo

> **Iteración 1** · **Nivel:** pantalla · **Código:** `PaymentDetailScreen` en `src/features/payments/screens/`; contenedor `src/app/(app)/dinero/abonos/[id]/page.tsx` · **Storybook:** `Pantallas/Dinero/Abono` · **Depende de:** HU-UI-29, HU-PAN-DIN-01 · **Back:** HU-ABO-05, HU-ABO-06, HU-ABO-07, HU-CLI-12 · **Diseño:** secciones «6 · Detalle de un abono», «7 · Abono abierto desde la ficha» y «8 · Abono: estados y acciones» (escritorio: Dinero-d-abono, -abono-al-dia, -cobrado, -entregado, -cobrar, -plazo, Dinero-d-cobrar, -cobrar-parcial, Ficha-abono-lateral, -centro, -pagina; móvil: Dinero-m-abono, -historial, -al-dia, -cobrado, -entregado, -cobrar, -plazo, Dinero-m-deslizar-cobrar, -deslizar-plazo, FichaMovil-abono) y la ficha `Lib-VentanaDetalle` (contenido «abono») · **Reglas:** BR-PAY-02, BR-PAY-04, BR-PAY-06, BR-PAY-13, AF-21, I-19

## Historia
**Como** colportor **quiero** abrir un abono, cobrarlo (completo o parcial) o darle más plazo **para** registrar lo que pasó en la visita en dos toques.

## Contrato que usa
`useCollectPayment` (con `collectShortfall` para el aviso de cobro parcial), `useReschedulePayment`, `useResolveScheduleExcess`, el detalle del cliente (`useCustomerDetail`) para el abono y su historial.

## Pantalla
`DetailTemplate` en `DetailWindow`:
- **Franja:** «Vencido hace 3 días», «Faltan 10 días», «05/11/2026 · 3 días tarde» o «A tiempo».
- **Isla 1 · identidad:** cliente, cuota «2/4», Pastilla y la acción principal **Cobrar** (solo si `can.collect`).
- **Isla 2 · datos:** fecha acordada, monto, método y Abibono (enlace si está entregado).
- **Isla 3 · historial.**
- **Más acciones:** «Dar más plazo».
- **Cobrar:** hoja (móvil) o panel (escritorio) con el monto (sugerido = acordado), el método (Transferencia por defecto) y la fecha.
  - Un monto menor muestra el aviso de **cobro parcial** del lienzo (`Dinero-d-cobrar-parcial`).
  - Un monto **mayor** abre el modal de abonos que no cuadran (AF-21, I-19), solo si el lienzo lo dibuja (FD-07); si no, queda fuera.
- **Dar más plazo:** nueva fecha (calendario, pieza de HU-PAN-CLI-05) y nota opcional; confirmación si pasa de 2 meses.
- **Desde la ficha:** el abono reemplaza el contenido de la ventana con «volver a la clienta».
- **Deslizar en móvil** (Cobrar a la izquierda, Más plazo a la derecha) sobre la fila de la lista de Dinero: pieza `SwipeRow` (compartida con HU-PAN-INV-01). Las mismas acciones existen en el detalle.

## Estados (stories)
Por cobrar vencido · Por cobrar al día · Cobrado · Entregado (bloqueado, con enlace a su Abibono) · Cobrar abierto · Cobro parcial · Dar más plazo abierto · Desde la ficha (lateral, centrada y página) · Móvil: página, hoja y deslizar.

## Criterios de aceptación
- **CA-1.** **Dado** un abono por cobrar de $65.000 vencido hace 3 días, **entonces** se ve la franja «Vencido hace 3 días» y «Cobrar» en la isla de identidad.
- **CA-2.** **Dado** «Cobrar» con $40.000 de $65.000, **entonces** se muestra el aviso de cobro parcial con la diferencia de $25.000 antes de confirmar.
- **CA-3.** **Dado** un cobro confirmado, **entonces** la Pastilla pasa a «Cobrado», aparece el Aviso «Abono cobrado · Deshacer» y Dinero se actualiza.
- **CA-4.** **Dado** un abono entregado, **entonces** no hay «Cobrar» ni «Dar más plazo», la Pastilla tiene candado y se ve el enlace a su Abibono.
- **CA-5.** **Dado** móvil, **cuando** deslizo un abono a la izquierda en la lista, **entonces** aparece «Cobrar» y lleva al mismo formulario.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Cobrar un abono, parcial, y prórroga» (TESTING.md, flujo 4) pasa.
