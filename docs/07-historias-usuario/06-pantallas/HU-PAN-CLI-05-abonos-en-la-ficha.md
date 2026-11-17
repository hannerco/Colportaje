# HU-PAN-CLI-05 · Abonos en la ficha: cambiar fecha, registrar y programar

> **Iteración 1** · **Nivel:** pantalla · **Código:** piezas en `src/features/payments/components/` y `src/features/customers/screens/` · **Storybook:** `Pantallas/Clientes/Abonos` · **Depende de:** HU-PAN-CLI-02, HU-PAN-CLI-03 · **Back:** HU-ABO-02, HU-ABO-03, HU-ABO-04, HU-ABO-05, HU-ABO-07, HU-ABO-08 (pendiente) · **Diseño:** sección «6 · Cambiar fecha de abono» (escritorio: Crear-abono-escritorio-calendario, -cambiado; móvil: Crear-abono-movil-calendario, -cambiado) · **Reglas:** BR-PAY-01, BR-PAY-03, BR-PAY-04, BR-PAY-06, BR-PAY-11, BR-PAY-13, BR-PAY-15, BR-PAY-16, ADR-0045, ADR-0047, ADR-0049, I-08, I-26, I-33

## Historia
**Como** colportor **quiero** cambiar la fecha de un abono tocándola en un calendario, y registrar o programar abonos desde la ficha, **para** que el plan refleje lo que acordé con el cliente.

## Contrato que usa
`useCorrectScheduledDate` (durante la creación), `useReschedulePayment` (cliente guardado; prórroga), `useRegisterCollectedPayment`, `useScheduleSinglePayment`, `useApplyPaymentPlan`, `useUpdateScheduledAmount`, `useDeletePayment`, `useCancelScheduledPayments`, `useResolveScheduleExcess`.

## Pantalla
- **Cambiar fecha de abono** (dibujado en el lienzo):
  - calendario abierto sobre el abono (escritorio: menú flotante; móvil: hoja);
  - al elegir, la fecha cambia en la lista y se ve «fecha cambiada»;
  - durante la creación es **Corregir** (sin historial);
  - con el cliente guardado es **Prórroga**: confirmación si pasa de 2 meses (BR-PAY-06) y fecha original tachada.
- Solo se mueve ese abono (I-08). Una fecha pasada muestra el aviso «Esta fecha ya pasó» y se permite (I-33).
- **Registrar abono, programar abono, editar, borrar o cancelar:** se hacen solo si el lienzo los dibuja. Hoy no están dibujados (FC-09 a FC-12): **quedan fuera** de esta iteración y se listan al dueño.

## Piezas del módulo
`DatePickerCalendar` (calendario mensual con semana desde domingo, BR-GEN-07; hoy marcado; día elegido en acento), tal como el lienzo. Va en `features/payments/components/` y se anota para subirlo a la biblioteca.

## Estados (stories)
Calendario abierto · Fecha cambiada · Prórroga de más de 2 meses (confirmación) · Fecha pasada (aviso) · Sin conexión.

## No incluye
FC-09 (Registrar abono), FC-10 (Programar en cliente guardado), FC-11 (Editar, borrar o cancelar) y FC-12 (formulario de prórroga con nota) mientras no tengan pantalla.

## Criterios de aceptación
- **CA-1.** **Dado** un cliente en creación con un abono el 30/11/2026, **cuando** elijo el 05/12/2026 en el calendario, **entonces** solo ese abono cambia y no queda historial.
- **CA-2.** **Dado** un cliente guardado, **cuando** muevo un abono del 30/11/2026 al 15/02/2027, **entonces** se pide confirmación por pasar de 2 meses y, al confirmar, la fecha original se ve tachada.
- **CA-3.** **Dado** que elijo una fecha anterior a hoy, **entonces** veo «Esta fecha ya pasó» y puedo continuar.
- **CA-4.** **Dado** el calendario, **entonces** la semana empieza en domingo y se navega con las flechas del teclado.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Cobrar un abono, parcial, y prórroga» (TESTING.md, flujo 4) pasa en su parte de prórroga.
