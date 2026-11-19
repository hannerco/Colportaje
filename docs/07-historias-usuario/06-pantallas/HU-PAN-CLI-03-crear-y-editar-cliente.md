# HU-PAN-CLI-03 · Crear cliente (ficha viva), guardar y descartar

> **Iteración 1** · **Nivel:** pantalla · **Código:** `NewCustomerScreen` en `src/features/customers/screens/`; contenedor `src/app/(app)/clientes/nuevo/page.tsx` · **Storybook:** `Pantallas/Clientes/Crear cliente` · **Depende de:** HU-PAN-CLI-02, HU-UI-09, HU-UI-24 · **Back:** HU-CLI-02, HU-CLI-03, HU-ABO-02, HU-ABO-03, HU-ABO-07, HU-ABO-09 (pendiente) · **Diseño:** secciones «3 · Crear cliente (llena)» y «4 · Crear cliente (vacía)» (escritorio: Crear-O5-escritorio, -guardar, -descartar, -vacio; móvil: Crear-O5-movil-1 a 5, -guardar, -descartar y vacía 1 a 5) · **Reglas:** BR-CUS-01, BR-CUS-11, BR-CUS-14, BR-PAY-01, BR-PAY-03, BR-PAY-04, BR-PAY-13, BR-PAY-15, ADR-0035, ADR-0038, ADR-0039

## Historia
**Como** colportor **quiero** crear un cliente en una sola ficha que se va llenando (nombre, teléfono, libro, cuota inicial, plan de abonos) y guardarla o descartarla **para** registrar una venta en la puerta de la casa sin pasos de más.

## Contrato que usa
- Crear y editar: `useCreateCustomer`, `useUpdateCustomer`, `usePossibleDuplicates`.
- Descartar: `useDiscardSummary`, `useDiscardNewCustomer`.
- Pagos: `useSetCreationDownPayment`; plan con `buildPaymentPlan` / `suggestFirstDueDate` (puros) y `useApplyPaymentPlan`.
- Alertas: `evaluateScheduleExcess` (puro) y `useResolveScheduleExcess`.
- Libros: los de HU-PAN-CLI-04.

## Pantalla
- Ficha viva tal como el lienzo: secciones en el orden del diseño, «Guardar cliente» como acción principal y «Descartar».
  - **Móvil:** una pantalla desplazable (las capturas «1 de 5 … 5 de 5» son posiciones del desplazamiento, no pasos).
  - **Escritorio:** pantalla completa con la ficha centrada.
- **Ficha vacía:** estado inicial con los campos vacíos y las sugerencias del diseño.
- **Guardar:** estado «al guardar» (botón cargando) y luego el Aviso de guardado; navega a la ficha.
- **Descartar:** `ConfirmDialog` con lo que se perderá, a partir de `useDiscardSummary` (FC-01), y el aviso si el descarte se rechaza porque un abono ya está en un Abibono.
- **Salir** por Volver, por la navegación o cerrando equivale a descartar (BR-CUS-14): se pregunta con el mismo diálogo.
- **Cuota inicial:** valor, método (Transferencia por defecto) y **fecha** (Hoy por defecto, no futura; HU-ABO-09, pendiente en el back; si aún no está, el campo se oculta).
- **Plan de abonos:** vista previa «Así quedan los abonos» calculada en el cliente; al cambiar la frecuencia, el valor o el primer abono, se recalcula (I-08). Un abono con fecha pasada muestra el aviso «Esta fecha ya pasó» y se permite (HU-ABO-08, I-33).
- **Posible duplicado:** aviso no bloqueante «¿Es la misma persona?», solo si el lienzo lo dibuja (FC-03). Si no, queda fuera.

## Piezas del módulo
Las que el lienzo dibuja y la biblioteca no tiene: el bloque «plan de abonos» (frecuencia, valor y lista previa). Se programa en `features/customers/components/` y se anota en el README.

## Estados (stories)
Vacía (escritorio y móvil) · Llena · Guardando · Descartar (diálogo) · Con abono de fecha pasada · Con alerta de sobrante (franja «Revisar») · Sin conexión (Guardar deshabilitado) · Error al guardar con Reintentar.

## No incluye
Selector de emoji (FC-02, sin diseño en la biblioteca: si el lienzo lo dibuja, va como pieza del módulo; si no, se omite); dirección y ubicación (HU-PAN-CLI-06); agregar libro (HU-PAN-CLI-04); cambiar la fecha de un abono (HU-PAN-CLI-05); modal de abonos que no cuadran (FC-05) si no está dibujado.

## Criterios de aceptación
- **CA-1.** **Dado** la ficha vacía, **cuando** escribo el nombre y pulso «Guardar cliente», **entonces** se crea el cliente (mismo `id` si reintento), aparece el Aviso de guardado y llego a su ficha.
- **CA-2.** **Dado** una ficha con 2 libros y 1 abono, **cuando** pulso Volver, **entonces** el diálogo dice «Se quitarán 2 libros y 1 abono» y, al confirmar, los libros vuelven a En físico.
- **CA-3.** **Dado** deuda $240.000, quincenal y $60.000 por abono, **entonces** la vista previa muestra 4 abonos en días 15 y 30 desde el siguiente día de pago; al cambiar a $80.000 muestra 3.
- **CA-4.** **Dado** que pongo un abono el 01/11/2026 con hoy 17/11/2026, **entonces** veo «Esta fecha ya pasó» y puedo guardar.
- **CA-5.** **Dado** sin conexión, **entonces** «Guardar cliente» está deshabilitado con «Necesita conexión».

## Cambios por iteración
- **2026-11-19 (al programarla; lienzo leído en `CrearV5`, `CrearV5Movil` y `CrearV5Vacio`):**
  - **Lo que entra:** nombre, la cuenta (saldo, abonado, deuda), «Información del cliente» con Teléfono, «Libros vendidos» (lista y total), cuota inicial (valor, fecha y medio) y el plan («Así quedan los abonos»). Escritorio: barra «Clientes / Nuevo cliente» con «Descartar» y «Guardar cliente», y dos columnas; móvil: «Descartar · Nuevo cliente» arriba y «Guardar cliente» abajo.
  - **«Guardar cliente»** abre la hoja «Resumen» del lienzo (libros, cuota inicial, saldo, abonos) y, al confirmar, lleva a la ficha. La lista de chequeo de la hoja (Información, Dirección, Factura, Visitas) no se pinta: esas secciones llegan con otras HU o no tienen HU.
  - **Quedan para otras HU:** agregar o quitar libros (HU-PAN-CLI-04), cambiar la fecha o el valor de un abono de la lista (HU-PAN-CLI-05), Dirección, mapa, Información e Imágenes (HU-PAN-CLI-06). Sin diseño o fuera: emoji (FC-02), posible duplicado (FC-03, no dibujado), modal de abonos que no cuadran (FC-05) y Visitas (FC-19).
  - **Factura:** el lienzo la dibuja en la ficha nueva (fotos, número y fecha), pero ninguna HU de pantalla la tiene asignada. Queda fuera; se anota en el README.
  - **Medio de pago y Frecuencia** usan la Selección (radio) de la biblioteca en vez de los botones segmentados del lienzo (manda la biblioteca).

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Nuevo cliente (ficha viva)» (TESTING.md, flujo 3) pasa en móvil y escritorio.
