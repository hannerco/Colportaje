# HU-CLI-09 · Agregar y quitar libros en la ficha

> **Épica:** Clientes · **Depende de:** HU-CLI-02, HU-INV-01, HU-ABO-07 · **Reglas:** BR-COPY-06/08/09, BR-CUS-02/16, BR-PAY-13 (disparador "edición de la ficha"), ADR-0026, ADR-0044, AF-114 · **Diseño:** "Agregar libro · escritorio · ejemplares en físico", "tocar para seleccionar", "de vuelta en la ficha"

## Historia
**Como** colportor que acaba de vender **quiero** buscar en mi inventario el ejemplar que le dejé al cliente y agregarlo a su ficha **para** que su deuda y mi inventario se actualicen en el momento.

## Contexto
- El buscador lista **cada ejemplar en físico**, ordenado por título y luego por el **más antiguo**; busca por título o número; **no muestra agotados** ni minibooks (ronda 26, ADR-0044).
- Al agregar, el ejemplar queda vendido con **precio acordado = su precio público copiado**; el precio se cambia luego en el ejemplar (HU-INV-06).
- **Quitar durante la creación** del cliente es un **error de captura**: el ejemplar vuelve a físico sin preguntar motivo ni abrir modal; solo se actualiza el aviso en línea de abonos que no cuadran (AF-114, ronda 22). **Quitar con el cliente ya guardado** es una devolución (HU-CLI-10). El front decide cuál llamar.

## Alcance
- **Incluye:** lectura de ejemplares asignables; asignar un ejemplar a un cliente; quitarlo durante la creación.
- **No incluye:** devolución con motivo (HU-CLI-10), minibooks.

## Contrato para el front
### Lecturas
- `useAssignableCopies({ search })` → `[{ copyId, titleName, number, price, imageUrl }]`: ejemplares `in_stock` de títulos no minibook, ordenados por título (español), recibido más antiguo, número e id; búsqueda por título normalizado o por número exacto (`7` o `#7`). `price` = precio público copiado del ejemplar.
### Acciones
- `assignCopyToCustomer(copyId, customerId)` → `Result<{ account: CustomerAccount }>` · errores: `COPY_NOT_IN_STOCK`, `COPY_IS_MINIBOOK`, `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `OFFLINE`.
- `removeCopyDuringCreation(copyId)` → `Result<{ account: CustomerAccount; excess: ExcessEvaluation | null }>` · errores: `COPY_NOT_SOLD`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** Solo ejemplares `in_stock` y no minibook DEBEN poder asignarse (BR-COPY-06).
- **R2.** Asignar DEBE dejar el ejemplar `sold` con el cliente, `sold_at = ahora`, `agreed_price = public_price_snapshot`, y registrar `sold`; en una transacción con el `updated_at` del cliente.
- **R3.** Asignar a un cliente archivado DEBE rechazarse (`CUSTOMER_ARCHIVED`; primero se restaura).
- **R4.** Quitar durante la creación DEBE devolver el ejemplar a `in_stock` (sin cliente, precio ni fecha de venta; `received_at` intacto) y registrar `returned` con motivo `wrong_registration` (AF-114).
- **R5.** Tras quitar, la respuesta DEBE traer la evaluación de abonos que no cuadran con disparador `form_edit` (presentación `banner`, nunca modal).
- **R6.** CUANDO dos personas intentan asignar el mismo ejemplar a la vez, solo una DEBE lograrlo; la otra recibe `COPY_NOT_IN_STOCK`.

## Criterios de aceptación
- **CA-1.** **Dado** "Bebidas saludables" #9 (recibido 30/10) y #10 (02/11), y "Psiconutrición" #7, **cuando** se listan, **entonces** el orden es Bebidas #9, Bebidas #10, Psiconutrición #7.
- **CA-2.** **Dado** la búsqueda "#10", **cuando** se lista, **entonces** solo aparece Bebidas saludables #10.
- **CA-3.** **Dado** Natalia (sin libros) y "Un corazón tranquilo #22" a 95.000, **cuando** se asigna, **entonces** el ejemplar está vendido a Natalia por 95.000, desaparece de los asignables y la deuda de Natalia es 95.000.
- **CA-4.** **Dado** Natalia con #22 durante la creación, **cuando** se quita, **entonces** el ejemplar vuelve a físico con su fecha de recibido original y la deuda vuelve a 0, sin motivo ni modal.
- **CA-5.** **Dado** Natalia con un libro de 180.000 y abonos programados por 140.000, **cuando** se quita un libro de 85.000 durante la creación, **entonces** `excess` trae el sobrante con presentación `banner` y orden "más lejano".
- **CA-6.** **Dado** un minibook en físico, **cuando** se intenta asignar, **entonces** `COPY_IS_MINIBOOK`.

## Casos borde y errores
- Agregar libros nunca genera `excess` (la deuda sube).

## Datos
Funciones SQL `assign_copy_to_customer(p_copy_id, p_customer_id)` y `return_copy_from_customer(p_copy_id, p_reason)` (esta última se comparte con HU-CLI-10).

## Cómo se verifica
- **Dominio:** orden y búsqueda de asignables.
- **Integración:** CA-3 a CA-6 y la concurrencia de R6.

## Terminado cuando
Se cumple §10 de las reglas comunes.
