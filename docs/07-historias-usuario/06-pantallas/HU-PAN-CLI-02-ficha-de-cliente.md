# HU-PAN-CLI-02 · Ficha de cliente (consulta, archivar y restaurar)

> **Iteración 1** · **Nivel:** pantalla · **Código:** `CustomerDetailScreen` en `src/features/customers/screens/`; contenedor `src/app/(app)/clientes/[id]/page.tsx` · **Storybook:** `Pantallas/Clientes/Ficha` · **Depende de:** HU-UI-29, HU-PAN-CLI-01 · **Back:** HU-CLI-12, HU-CLI-11, HU-CLI-01, HU-CLI-08, HU-CLI-07 · **Diseño:** sección «2 · Ficha de cliente» (escritorio: Ficha-V1-centro, -lateral, -pagina; móvil: FichaMovil-inicio, -libros, -datos, -final) · **Reglas:** BR-CUS-04, BR-CUS-06, BR-CUS-09, BR-CUS-10, BR-PAY-13, BR-PAY-14, I-22, I-24, FT-04

## Historia
**Como** colportor **quiero** abrir un cliente y ver de un vistazo cuánto debe, sus libros, sus abonos y cómo contactarlo **para** atenderlo o cobrarle sin buscar en varios lugares.

## Contrato que usa
`useCustomerDetail(id)` (HU-CLI-12), `useArchivePreview` / `useArchiveCustomer` / `useRestoreCustomer` (HU-CLI-11), `useCustomerInfoPhotos`, `usePhotoUrl` (HU-CLI-07), `useCustomerInvoices` (HU-CLI-08).

## Pantalla
- **Escritorio:** dentro de `DetailWindow` (lateral, centrada o página, como en los tres tableros de la ficha); en página, en `/clientes/[id]`. **Móvil:** pantalla completa con Volver, desplazable como en las cuatro capturas (inicio, libros, datos, final).
- **Contenido:** el del lienzo, con piezas de la biblioteca:
  - identidad: avatar, nombre, estado, «Llamar» y «WhatsApp» (enlaces `tel:` y `wa.me`, I-22);
  - cuenta (saldo, abonado %, saldo a favor, sin programar, BR-CUS-10);
  - libros;
  - abonos (lista por fecha, I-24) y la sección plegable «Cancelados»;
  - información y dirección;
  - fotos y facturas.
- **Avisos de la cuenta:** las franjas «Aún no tiene libro» y «Lo programado supera el saldo · Revisar», según `notices`.
- **Más acciones:** Archivar (con `Dialog` que dice qué abonos programados se cancelarán, a partir de `useArchivePreview`) o Restaurar si está archivado.
- Las secciones de **Visitas** (FC-19) y **minibook por saldo a favor** (FC-20) **no se muestran** (pospuestas).
- Abrir un abono abre su detalle (HU-PAN-DIN-02) **reemplazando** el contenido de la ventana, con «volver a la clienta» (tablero «FichaMovil-abono»).

## Reglas de pantalla
- **R1.** La forma de la ventana es la recordada en el dispositivo (FT-04).
- **R2.** Los enlaces de contacto solo se muestran si hay teléfono.
- **R3.** Los botones que escriben se deshabilitan sin conexión.

## Estados (stories)
Cliente con deuda y abonos (Pagando) · Vencido · Saldado con saldo a favor · Prospecto (sin libros, franja «Aún no tiene libro») · Con alerta de sobrante · Archivado · Cargando · Sin conexión · Las tres formas de escritorio y la móvil.

## No incluye
- Editar datos, agregar o quitar libros, abonos, dirección y ubicación: HU-PAN-CLI-03 a 06.
- Lo que sigue sin diseño en `FALTA-CLIENTES.md`: FC-07 (nota «No hay reembolsos», si no está en el lienzo), FC-13, FC-15, FC-17 y FC-18. Cada uno entra cuando se diseñe.

## Criterios de aceptación
- **CA-1.** **Dado** un cliente con saldo $380.000 y abonado 40 %, **entonces** la isla de cuenta muestra esos valores y la Pastilla «Pagando».
- **CA-2.** **Dado** el teléfono 301 557 9032, **entonces** «WhatsApp» abre `https://wa.me/573015579032`.
- **CA-3.** **Dado** escritorio con la forma «Página» recordada, **cuando** abro otro cliente, **entonces** se abre como página con la ruta «Clientes / <nombre>».
- **CA-4.** **Dado** un cliente con 2 abonos programados, **cuando** elijo Archivar, **entonces** el diálogo dice que se cancelarán 2 abonos; al confirmar, aparece el Aviso «Cliente archivado» y la ficha muestra «Restaurar».
- **CA-5.** **Dado** un prospecto, **entonces** se ve la franja «Aún no tiene libro».

## Cambios por iteración
- **2026-11-18 (al programarla; diferencias con el lienzo, manda la biblioteca, 00-REGLAS-COMUNES-FRONT §1.2):**
  - **Cuatro islas** (límite de la Plantilla de detalle): identidad con la cuenta adentro (saldo, abonado, deuda total, saldo a favor, sin programar y «Abono vencido desde…»), Libros, Abonos y Datos, en una columna. El lienzo pone el saldo en una tarjeta aparte y, en escritorio, dos columnas (Datos a la derecha; en la ventana lateral, primero).
  - **No se muestran todavía** los botones que escriben y llegan con otras HU: «Registrar abono», «Programar abono» y «Cobrar» (HU-PAN-CLI-05, HU-PAN-DIN-02), «Quitar» y «Agregar libro del inventario» (HU-PAN-CLI-04), «Editar», el mapa y «Cambiar / Quitar» ubicación (HU-PAN-CLI-03 y 06) y «Agregar imagen». Tampoco «Revisar» del sobrante (abre el modal de HU-ABO-07, sin pantalla aún) ni Visitas (FC-19).
  - **Abrir un abono** (reemplazando la ventana) llega con HU-PAN-DIN-02.
  - **CA-5 sigue a BR-PAY-14:** «Aún no tiene libro» sale si el cliente tiene abonos y ningún libro (el back ya lo calcula así), no en todo prospecto.
  - **«Lo programado supera el saldo en $X»** lleva el monto, como en FLOWS.
- **2026-11-22 (#35, #34):** isla Abonos como el diseño aceptado: fecha (en rojo con «hace N días» si venció) · Pastilla · valor y medio de pago con ícono a la derecha; **Cobrar** en cada abono por cobrar (CollectPaymentDialog, con Deshacer) y **Programar abono** en la cabecera (`SchedulePaymentsDialog`: Plan sobre lo sin programar o Un abono, propuesta 7). El avatar abre el selector de emoji.
- **2026-11-22 (#53, #56):** cada libro vendido muestra su portada y «Vendido el …», que abre el calendario para corregir la fecha (`SoldDateDialog`, HU-CLI-13).

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Archivar y restaurar» (TESTING.md, flujo 14) pasa.
