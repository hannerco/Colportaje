# HU-PAN-CLI-04 · Agregar libro, quitarlo y devolverlo

> **Iteración 1** · **Nivel:** pantalla · **Código:** `AddBookSheet` en `src/features/customers/screens/` · **Storybook:** `Pantallas/Clientes/Agregar libro` · **Depende de:** HU-PAN-CLI-02, HU-UI-27 · **Back:** HU-CLI-09, HU-CLI-10, HU-CLI-13 (pendiente), HU-INV-06 · **Diseño:** sección «5 · Agregar libro» (escritorio: Crear-libro-escritorio-buscar, -editando, -editado; móvil: Crear-libro-movil-buscar, -editando, -editado) · **Reglas:** BR-COPY-09, BR-PRC-*, ADR-0044, I-15, I-20

## Historia
**Como** colportor **quiero** elegir el ejemplar que le vendí a un cliente de entre los que tengo en físico, ajustar su precio y, si me equivoqué, quitarlo **para** que su cuenta quede bien.

## Contrato que usa
- Agregar: `useAssignableCopies`, `useAssignCopyToCustomer`.
- Quitar y devolver: `useRemoveCopyDuringCreation` (al crear), `useReturnCopyFromCustomer` (cliente guardado).
- Precio: `useAgreedPrice` (HU-INV-06).
- Fecha de venta: la acción de HU-CLI-13 cuando exista.

## Pantalla
- **Buscar:** lista de ejemplares en físico, con buscador; cada uno con portada, título, número y precio («ejemplares en físico», ADR-0044).
- **Tocar para seleccionar:** el ejemplar queda marcado y se puede ajustar el precio acordado (Campo moneda; el precio público se ve tachado si cambia).
- **De vuelta en la ficha:** el libro aparece en la sección Libros y la cuenta se recalcula.
- **Contenedor:** escritorio en la Ventana de detalle centrada; móvil en hoja o pantalla, como el lienzo.
- **Quitar un libro:**
  - durante la creación, quitar directo;
  - con el cliente guardado, «Devolver a inventario» con motivo (*El cliente lo devolvió* por defecto / *Me equivoqué de cliente o de registro*) y confirmación de que «los abonos y los Abibonos no cambian». Solo si el lienzo lo dibuja (FC-06); si no, queda fuera hasta su diseño.
- **Fecha de venta:** editable (no futura, no anterior al recibido; HU-CLI-13). Se muestra solo cuando el back esté listo.

## Estados (stories)
Buscar con resultados · Sin ejemplares en físico (EmptyState con enlace a «Agregar al inventario») · Seleccionado y editando precio · De vuelta en la ficha · Cliente archivado (no se puede agregar, I-15) · Sin conexión.

## No incluye
Agregar ejemplares nuevos al inventario (HU-PAN-INV-04).

## Criterios de aceptación
- **CA-1.** **Dado** 3 ejemplares de «Psiconutrición» en físico (#4, #6, #7), **cuando** busco «psico», **entonces** veo los tres con su número y precio.
- **CA-2.** **Dado** que elijo el #6 y cambio el precio de $98.000 a $93.000, **cuando** vuelvo a la ficha, **entonces** el libro aparece con $93.000, $98.000 tachado, y la deuda sube $93.000.
- **CA-3.** **Dado** un cliente archivado, **entonces** «Agregar libro» no está disponible y se explica que primero hay que restaurarlo.

## Cambios por iteración
- **2026-11-19 (al programarla; lienzo leído en `CrearV5Libro` y `CrearV5MovilLibro`):**
  - **Contenedor:** Ventana de detalle centrada en escritorio y hoja inferior en móvil, como dice la HU. El lienzo de escritorio lo dibuja como un panel debajo del buscador de la sección (la biblioteca no tiene ese panel; manda la biblioteca).
  - **Contenido del lienzo:** «Ejemplares en físico», buscador «Buscar libro o número», «N seleccionados» (con Quitar) y «Para seleccionar». Tocar uno lo vende de una vez (ficha viva).
  - **Precio acordado y fecha de venta** van en cada seleccionado (el lienzo no los dibuja; los pide la HU): Campo moneda con «antes $X» si cambia y Campo fecha «Vendido el» (HU-CLI-13 ya está en el back). Se escriben solos un momento después.
  - **Quitar** solo durante la creación y para los recién agregados en la hoja (sin motivo, HU-CLI-09 R4). **Devolver con motivo** a un cliente guardado (FC-06) no está dibujado: queda fuera.
  - En la ficha, la isla Libros se ve también en un prospecto sin libros, para poder agregarle uno.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
